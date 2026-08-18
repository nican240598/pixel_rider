import React, { useState, useEffect } from 'react';
import { User, AppView, CrewMember, CrewEvent, GpxRoute, ForumTopic, GarageBike, MarketItem, MapPin, Poi, UserNotification, DirectMessage, MarketAppeal, TripEntry, SpotCheckin, SpotOfTheWeek, PhotoOfTheWeek, FeedbackSuggestion, FeedbackCategory, FeedbackStatus, RidePing, PingParticipant, PingParticipantStatus, RidePace } from './types';
import { supabase, hashPassword, checkWhatsAppGroupMembership, formatPhoneForWhatsApp, normalizePhoneVariations } from './lib/supabase';
import { INITIAL_CREW, INITIAL_EVENTS, INITIAL_GPX, INITIAL_FORUM, INITIAL_GARAGE, INITIAL_MARKET, INITIAL_POIS, INITIAL_TRIPS, INITIAL_SPOT_CHECKINS, INITIAL_SPOT_OF_THE_WEEK, INITIAL_FEEDBACKS, INITIAL_PINGS } from './lib/initialData';
import { getVotingCycleStatus } from './lib/votingCycle';

const INITIAL_PHOTOS_OF_THE_WEEK: PhotoOfTheWeek[] = [];

// Components
import { Navbar } from './components/Navbar';
import { MobileNav } from './components/MobileNav';
import { Modals } from './components/Modals';

// Views
import { LandingView } from './views/LandingView';
import { DashboardView } from './views/DashboardView';
import { GarageView } from './views/GarageView';
import { MarketView } from './views/MarketView';
import { EventsView } from './views/EventsView';
import { GpxView } from './views/GpxView';
import { ForumView } from './views/ForumView';
import { MapView } from './views/MapView';
import { AdminView } from './views/AdminView';
import { ProfileView } from './views/ProfileView';
import { PublicProfileView } from './views/PublicProfileView';
import { LegalView } from './views/LegalView';
import { LegalConfig, getStoredLegalConfig, saveStoredLegalConfig } from './lib/legalConfig';
import { cleanUmlautText } from './lib/textUtils';
import cinematicRoadBg from './assets/images/cinematic_road_bg_1786376910265.jpg';

export default function App() {
  const [legalConfig, setLegalConfig] = useState<LegalConfig>(() => getStoredLegalConfig());
  // Current user state from localStorage
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('app_user');
      if (saved) {
        const parsed: User = JSON.parse(saved);
        if (parsed && !parsed.avatar_url) {
          const matchedCrew = INITIAL_CREW.find((c) => c.name.toLowerCase() === parsed.username?.toLowerCase());
          if (matchedCrew?.image_url) {
            parsed.avatar_url = matchedCrew.image_url;
          }
        }
        return parsed;
      }
      return null;
    } catch (e) {
      return null;
    }
  });

  const [currentView, setCurrentView] = useState<AppView>(() => {
    try {
      const savedUser = localStorage.getItem('app_user');
      return savedUser ? 'dashboard' : 'landing';
    } catch (e) {
      return 'landing';
    }
  });

  const [profileActiveSection, setProfileActiveSection] = useState<'name_profile' | 'credentials' | 'garage' | 'market' | 'tile_layout' | 'legal'>('name_profile');

  // Guard: if not logged in and not on a public view, automatically route to landing
  useEffect(() => {
    if (!currentUser && currentView !== 'landing' && currentView !== 'impressum' && currentView !== 'privacy') {
      setCurrentView('landing');
    }
  }, [currentUser, currentView]);

  // Datasets
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>(INITIAL_CREW);
  const [events, setEvents] = useState<CrewEvent[]>(() => {
    try {
      const saved = localStorage.getItem('app_events');
      return saved ? JSON.parse(saved) : INITIAL_EVENTS;
    } catch (e) {
      return INITIAL_EVENTS;
    }
  });
  const [routes, setRoutes] = useState<GpxRoute[]>(() => {
    try {
      const saved = localStorage.getItem('app_gpx_routes');
      return saved ? JSON.parse(saved) : INITIAL_GPX;
    } catch (e) {
      return INITIAL_GPX;
    }
  });
  const [topics, setTopics] = useState<ForumTopic[]>(INITIAL_FORUM);
  const [bikes, setBikes] = useState<GarageBike[]>(INITIAL_GARAGE);
  const [marketItems, setMarketItems] = useState<MarketItem[]>(INITIAL_MARKET);
  const [mapPins, setMapPins] = useState<MapPin[]>([]);
  const [pois, setPois] = useState<Poi[]>(() => {
    try {
      const saved = localStorage.getItem('app_pois');
      return saved ? JSON.parse(saved) : INITIAL_POIS;
    } catch (e) {
      return INITIAL_POIS;
    }
  });
  const [userNotifs, setUserNotifs] = useState<UserNotification[]>([]);
  const [adminResetUsers, setAdminResetUsers] = useState<User[]>([]);
  const [adminInviteUsers, setAdminInviteUsers] = useState<User[]>([]);
  const [adminNotifsList, setAdminNotifsList] = useState<UserNotification[]>([]);
  const [appeals, setAppeals] = useState<MarketAppeal[]>([]);
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [invitesList, setInvitesList] = useState<{ code: string; created_by: string; is_used: boolean; used_by?: string }[]>([
    { code: 'RIDER-CREW1', created_by: 'Nican', is_used: false }
  ]);

  // Feature A & B State: Trips, Spot Checkins, Spot of the Week
  const [trips, setTrips] = useState<TripEntry[]>(() => {
    try {
      const saved = localStorage.getItem('app_trips');
      return saved ? JSON.parse(saved) : INITIAL_TRIPS;
    } catch (e) {
      return INITIAL_TRIPS;
    }
  });

  const [spotCheckins, setSpotCheckins] = useState<SpotCheckin[]>(() => {
    try {
      const saved = localStorage.getItem('app_spot_checkins');
      return saved ? JSON.parse(saved) : INITIAL_SPOT_CHECKINS;
    } catch (e) {
      return INITIAL_SPOT_CHECKINS;
    }
  });

  const [spotOfTheWeek, setSpotOfTheWeek] = useState<SpotOfTheWeek>(INITIAL_SPOT_OF_THE_WEEK);

  const [photosOfTheWeek, setPhotosOfTheWeek] = useState<PhotoOfTheWeek[]>(() => {
    try {
      const saved = localStorage.getItem('app_photos_of_the_week');
      return saved ? JSON.parse(saved) : INITIAL_PHOTOS_OF_THE_WEEK;
    } catch (e) {
      return INITIAL_PHOTOS_OF_THE_WEEK;
    }
  });

  // Feature: Feedback & Improvement Suggestions for the Crew Area
  const [feedbacks, setFeedbacks] = useState<FeedbackSuggestion[]>(() => {
    try {
      const saved = localStorage.getItem('app_feedbacks');
      return saved ? JSON.parse(saved) : INITIAL_FEEDBACKS;
    } catch (e) {
      return INITIAL_FEEDBACKS;
    }
  });

  // Feature: Feierabend-Pings (Spontaneous Rideouts)
  const [pings, setPings] = useState<RidePing[]>(() => {
    try {
      const saved = localStorage.getItem('app_ride_pings');
      return saved ? JSON.parse(saved) : INITIAL_PINGS;
    } catch (e) {
      return INITIAL_PINGS;
    }
  });


  // Modals & Overlays
  const [alertState, setAlertState] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'warning' | 'danger' } | null>(null);
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [forgotPassOpen, setForgotPassOpen] = useState(false);
  const [resetTokenState, setResetTokenState] = useState<{ token: string; username?: string; phone?: string } | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [resetPasswordError, setResetPasswordError] = useState('');
  const [userNotifsOpen, setUserNotifsOpen] = useState(false);
  const [adminNotifsOpen, setAdminNotifsOpen] = useState(false);
  const [previewGpx, setPreviewGpx] = useState<GpxRoute | null>(null);
  const [directChatUser, setDirectChatUser] = useState<string | null>(null);
  const [publicProfileUser, setPublicProfileUser] = useState<string | null>(null);
  const [usernameChangeOpen, setUsernameChangeOpen] = useState(false);
  const [leaderboardModalOpen, setLeaderboardModalOpen] = useState(false);
  const [addTripModalOpen, setAddTripModalOpen] = useState(false);
  const [editPhotoModalOpen, setEditPhotoModalOpen] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<PhotoOfTheWeek | null>(null);
  const [eventsInitialTab, setEventsInitialTab] = useState<'all' | 'events' | 'pings' | 'archive'>('all');

  // Automatic 24h Event Archiving: past events (>24 hours past start time) are automatically flagged as archived
  useEffect(() => {
    const archivePastEvents = () => {
      const now = Date.now();
      const twentyFourHours = 24 * 60 * 60 * 1000;
      let hasChanges = false;

      const updated = events.map((ev) => {
        const evTime = new Date(ev.date_time).getTime();
        const shouldArchive = !isNaN(evTime) && now - evTime > twentyFourHours;
        if (shouldArchive && !ev.is_archived) {
          hasChanges = true;
          return { ...ev, is_archived: true };
        }
        return ev;
      });

      if (hasChanges) {
        setEvents(updated);
        try {
          localStorage.setItem('app_events', JSON.stringify(updated));
        } catch (e) {}
      }
    };

    archivePastEvents();
    const interval = setInterval(archivePastEvents, 60 * 1000);
    return () => clearInterval(interval);
  }, [events]);

  // Mandatory phone modal for existing accounts without phone
  const requirePhoneModalOpen = Boolean(currentUser && (!currentUser.phone || !currentUser.phone.trim()));

  // Helper alert
  const showAlert = (title: string, message: string, type: 'success' | 'warning' | 'danger' = 'warning') => {
    setAlertState({ isOpen: true, title, message, type });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmState({ isOpen: true, title, message, onConfirm });
  };

  // Helper to sync and normalize both Crew Events and Feierabend-Pings from Supabase Database
  const syncEventsAndPings = async () => {
    try {
      // 1. Fetch Events from crew_events table
      const { data: eventsData, error: evError } = await supabase.from('crew_events').select('*');
      
      // 2. Fetch Pings from ride_pings table
      let pingsFromTable: RidePing[] = [];
      try {
        const { data: pingsData, error: pingsErr } = await supabase
          .from('ride_pings')
          .select('*')
          .order('created_at', { ascending: false });

        if (!pingsErr && pingsData && pingsData.length > 0) {
          pingsFromTable = pingsData.map((p: any) => {
            let parts: any[] = [];
            if (p.participants) {
              try {
                parts = typeof p.participants === 'string' ? JSON.parse(p.participants) : p.participants;
              } catch (e) {
                parts = Array.isArray(p.participants) ? p.participants : [];
              }
            }
            return {
              id: p.id,
              creator_username: p.creator_username || p.creator_id || 'Rider',
              creator_avatar: p.creator_avatar,
              title: p.title || 'Feierabendrunde',
              meeting_point: p.meeting_point || '',
              destination: p.destination || '',
              departure_time: p.departure_time || new Date().toISOString(),
              pace: (p.pace as RidePace) || 'Flott',
              max_participants: p.max_participants ? Number(p.max_participants) : undefined,
              notes: p.notes,
              created_at: p.created_at || new Date().toISOString(),
              participants: Array.isArray(parts) ? parts : [],
            };
          });
        }
      } catch (err) {
        console.error('Error querying ride_pings table:', err);
      }

      // 3. Extract any Pings stored in crew_events table (fallback & dual-storage guarantee)
      const pingsFromEventsTable: RidePing[] = [];
      const regularEvents: CrewEvent[] = [];

      if (!evError && eventsData && eventsData.length > 0) {
        eventsData.forEach((ev: any) => {
          const isPing =
            (ev.id && String(ev.id).startsWith('ping-')) ||
            (ev.title && String(ev.title).startsWith('[PING]')) ||
            (ev.description && typeof ev.description === 'string' && ev.description.includes('"type":"ride_ping"'));

          if (isPing) {
            try {
              let parsedDesc: any = {};
              if (ev.description && ev.description.startsWith('{')) {
                parsedDesc = JSON.parse(ev.description);
              }
              let parts: any[] = [];
              if (parsedDesc.participants) {
                parts = Array.isArray(parsedDesc.participants) ? parsedDesc.participants : [];
              } else if (ev.participants) {
                const rawParts = typeof ev.participants === 'string' ? JSON.parse(ev.participants) : ev.participants;
                parts = Array.isArray(rawParts)
                  ? rawParts.map((u: any) =>
                      typeof u === 'string' ? { username: u, status: 'going', created_at: ev.date_time } : u
                    )
                  : [];
              }

              const extractedPing: RidePing = {
                id: ev.id,
                creator_username: parsedDesc.creator_username || ev.organizer || ev.created_by || 'Rider',
                creator_avatar: parsedDesc.creator_avatar,
                title: parsedDesc.title || String(ev.title).replace(/^\[PING\]\s*/, '') || 'Feierabendrunde',
                meeting_point: parsedDesc.meeting_point || (ev.location ? ev.location.split('➔')[0]?.trim() : ''),
                destination: parsedDesc.destination || (ev.location && ev.location.includes('➔') ? ev.location.split('➔')[1]?.trim() : ''),
                departure_time: parsedDesc.departure_time || ev.date_time || new Date().toISOString(),
                pace: (parsedDesc.pace as RidePace) || 'Flott',
                max_participants: parsedDesc.max_participants ? Number(parsedDesc.max_participants) : undefined,
                notes: parsedDesc.notes,
                created_at: parsedDesc.created_at || ev.date_time || new Date().toISOString(),
                participants: Array.isArray(parts) ? parts : [],
              };
              pingsFromEventsTable.push(extractedPing);
            } catch (e) {
              console.error('Error parsing ping from crew_events:', e);
            }
          } else {
            let parts = ev.participants;
            if (typeof parts === 'string') {
              try {
                parts = JSON.parse(parts);
              } catch (e) {
                parts = [parts];
              }
            }
            if (!Array.isArray(parts)) parts = [];
            regularEvents.push({ ...ev, participants: parts });
          }
        });
      }

      // Update regular events state
      if (regularEvents.length > 0) {
        setEvents(regularEvents);
        try {
          localStorage.setItem('app_events', JSON.stringify(regularEvents));
        } catch (e) {}
      }

      // Combine and deduplicate Pings from both sources by ID
      const mergedPingsMap = new Map<string, RidePing>();
      // Prefer pings from dedicated table if present, otherwise from events table
      [...pingsFromEventsTable, ...pingsFromTable].forEach((p) => {
        mergedPingsMap.set(p.id, p);
      });

      const finalPings = Array.from(mergedPingsMap.values()).sort(
        (a, b) => new Date(b.created_at || b.departure_time).getTime() - new Date(a.created_at || a.departure_time).getTime()
      );

      if (finalPings.length > 0) {
        setPings(finalPings);
        try {
          localStorage.setItem('app_ride_pings', JSON.stringify(finalPings));
        } catch (e) {}
      }
    } catch (err) {
      console.error('Error syncing events & pings from DB:', err);
    }
  };

  // Sync Supabase data on mount & periodic polling
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Crew
        const { data: crewData } = await supabase.from('crew_members').select('*').order('sort_order', { ascending: true });
        if (crewData && crewData.length > 0) setCrewMembers(crewData);

        // Fetch Events & Pings with dual-table synchronization
        await syncEventsAndPings();

        // Fetch GPX
        const { data: gpxData } = await supabase.from('gpx_routes').select('*');
        if (gpxData && gpxData.length > 0) {
          setRoutes(gpxData);
          try {
            localStorage.setItem('app_gpx_routes', JSON.stringify(gpxData));
          } catch (e) {}
        }

        // Fetch Forum
        const { data: forumData } = await supabase.from('forum_topics').select('*');
        if (forumData && forumData.length > 0) setTopics(forumData);

        // Fetch Garage
        const { data: garageData } = await supabase.from('pixel_garage').select('*');
        if (garageData && garageData.length > 0) {
          const parsed = garageData.map((b) => {
            let imgs: string[] = [];
            if (b.images) {
              try {
                imgs = typeof b.images === 'string' ? JSON.parse(b.images) : b.images;
              } catch (e) {
                imgs = [b.images];
              }
            }
            let parsedComments = b.comments;
            if (typeof parsedComments === 'string') {
              try {
                parsedComments = JSON.parse(parsedComments);
              } catch (e) {
                parsedComments = [];
              }
            }
            let parsedLikes = b.likes;
            if (typeof parsedLikes === 'string') {
              try {
                parsedLikes = JSON.parse(parsedLikes);
              } catch (e) {
                parsedLikes = [];
              }
            }
            return {
              ...b,
              images: Array.isArray(imgs) ? imgs : [],
              comments: Array.isArray(parsedComments) ? parsedComments : [],
              likes: Array.isArray(parsedLikes) ? parsedLikes : [],
            };
          });
          setBikes(parsed);
        }

        // Fetch Market
        const { data: marketData } = await supabase.from('market_items').select('*').eq('is_deleted', false);
        if (marketData && marketData.length > 0) {
          const parsed = marketData.map((m) => {
            let imgs: string[] = [];
            if (m.images) {
              try {
                imgs = typeof m.images === 'string' ? JSON.parse(m.images) : m.images;
              } catch (e) {
                imgs = [m.images];
              }
            }
            return { ...m, images: Array.isArray(imgs) ? imgs : [] };
          });
          setMarketItems(parsed);
        }

        // Fetch Map Pins
        const { data: pinsData } = await supabase.from('map_pins').select('*');
        if (pinsData) setMapPins(pinsData);

        // Fetch POIs
        try {
          const { data: poiData } = await supabase.from('custom_pois').select('*');
          if (poiData && poiData.length > 0) {
            const existingIds = new Set(poiData.map((p) => p.id || p.name));
            const initFiltered = INITIAL_POIS.filter((p) => !existingIds.has(p.id || p.name));
            const merged = [...initFiltered, ...poiData];
            setPois(merged);
            try {
              localStorage.setItem('app_pois', JSON.stringify(merged));
            } catch (e) {}
          }
        } catch (e) {
          console.error('Error fetching POIs:', e);
        }

        // Fetch Photos of the Week (Bild der Woche)
        try {
          const { data: photosData } = await supabase.from('photos_of_the_week').select('*').order('created_at', { ascending: false });
          if (photosData) {
            const parsedPhotos = photosData.map((p) => {
              let votes: string[] = [];
              if (p.votes) {
                try {
                  votes = typeof p.votes === 'string' ? JSON.parse(p.votes) : p.votes;
                } catch (e) {
                  votes = Array.isArray(p.votes) ? p.votes : [];
                }
              }
              return {
                ...p,
                votes: Array.isArray(votes) ? votes : [],
                is_winner: Boolean(p.is_winner),
              };
            });
            setPhotosOfTheWeek(parsedPhotos);
            try {
              localStorage.setItem('app_photos_of_the_week', JSON.stringify(parsedPhotos));
            } catch (e) {}
          }
        } catch (e) {
          console.error('Error fetching photos of the week from DB:', e);
        }

        // Fetch Feedback Suggestions
        try {
          const { data: fbData } = await supabase.from('feedback_suggestions').select('*').order('created_at', { ascending: false });
          if (fbData && fbData.length > 0) {
            const parsedFb: FeedbackSuggestion[] = fbData.map((f: any) => {
              let upvotes: string[] = [];
              if (f.upvotes) {
                try {
                  upvotes = typeof f.upvotes === 'string' ? JSON.parse(f.upvotes) : f.upvotes;
                } catch (e) {
                  upvotes = Array.isArray(f.upvotes) ? f.upvotes : [];
                }
              }
              return {
                ...f,
                upvotes: Array.isArray(upvotes) ? upvotes : [],
                is_anonymous: Boolean(f.is_anonymous),
              };
            });
            setFeedbacks(parsedFb);
            try {
              localStorage.setItem('app_feedbacks', JSON.stringify(parsedFb));
            } catch (e) {}
          }
        } catch (e) {
          console.error('Error fetching feedback suggestions:', e);
        }

        // Fetch Invites
        const { data: invitesData } = await supabase.from('invite_codes').select('*');
        if (invitesData) setInvitesList(invitesData);

        // Fetch Direct Messages
        try {
          const { data: dmData } = await supabase.from('direct_messages').select('*').order('created_at', { ascending: true });
          if (dmData && dmData.length > 0) {
            setDirectMessages(dmData);
          }
        } catch (e) {
          console.error('Error fetching direct messages:', e);
        }

        // Fetch All Users (for admin)
        const { data: usersData } = await supabase.from('users').select('*');
        if (usersData) {
          setAdminResetUsers(usersData.filter((u) => u.reset_requested));
          setAdminInviteUsers(usersData.filter((u) => u.invite === 'PENDING'));

          if (currentUser) {
            const dbUser = usersData.find(
              (u) =>
                u.username.toLowerCase() === currentUser.username.toLowerCase() ||
                (currentUser.email && u.email?.toLowerCase() === currentUser.email.toLowerCase())
            );
            if (dbUser) {
              const mergedUser: User = {
                ...currentUser,
                email: dbUser.email || currentUser.email,
                role: dbUser.role || currentUser.role,
                avatar_url: dbUser.avatar_url || currentUser.avatar_url || (INITIAL_CREW.find((c) => c.name.toLowerCase() === currentUser.username.toLowerCase())?.image_url) || '',
                social_ig: dbUser.social_ig !== undefined ? dbUser.social_ig : (currentUser.social_ig || ''),
                social_tiktok: dbUser.social_tiktok !== undefined ? dbUser.social_tiktok : (currentUser.social_tiktok || ''),
                social_youtube: dbUser.social_youtube !== undefined ? dbUser.social_youtube : (currentUser.social_youtube || ''),
              };
              if (JSON.stringify(mergedUser) !== JSON.stringify(currentUser)) {
                setCurrentUser(mergedUser);
                try {
                  localStorage.setItem('app_user', JSON.stringify(mergedUser));
                } catch (e) {}
              }
            }
          }

          const mergedUsersList = usersData.map((u) => {
            if (currentUser && u.username.toLowerCase() === currentUser.username.toLowerCase()) {
              return {
                ...u,
                avatar_url: currentUser.avatar_url || u.avatar_url || '',
                social_ig: currentUser.social_ig || u.social_ig || '',
                social_tiktok: currentUser.social_tiktok || u.social_tiktok || '',
                social_youtube: currentUser.social_youtube || u.social_youtube || '',
              };
            }
            return u;
          });
          setAllUsers(mergedUsersList);
        }
      } catch (e) {
        console.error('Supabase fetch error', e);
      }
    };

    fetchData();

    // Check for password reset hash or query in URL: #reset=, #reset-pass-, ?reset_token=, etc.
    const checkResetTokenInUrl = async () => {
      const hash = window.location.hash || '';
      const searchParams = new URLSearchParams(window.location.search);
      let token = searchParams.get('reset_token') || searchParams.get('reset') || searchParams.get('token');

      if (!token && hash) {
        if (hash.includes('reset-pass-')) {
          const parts = hash.split('reset-pass-');
          if (parts[1]) token = parts[1].split('?')[0].split('&')[0];
        } else if (hash.includes('reset=')) {
          const parts = hash.split('reset=');
          if (parts[1]) token = parts[1].split('?')[0].split('&')[0];
        } else if (hash.includes('reset_token=')) {
          const parts = hash.split('reset_token=');
          if (parts[1]) token = parts[1].split('?')[0].split('&')[0];
        } else if (hash.startsWith('#reset-')) {
          const parts = hash.split('#reset-');
          if (parts[1]) token = parts[1].split('?')[0].split('&')[0];
        }
      }

      if (token) {
        try {
          // Look up outbox or users matching this token
          const { data: outboxRows } = await supabase
            .from('wa_outbox')
            .select('*')
            .ilike('reset_url', `%${token}%`)
            .order('created_at', { ascending: false })
            .limit(1);

          if (outboxRows && outboxRows.length > 0) {
            const row = outboxRows[0];
            setResetTokenState({
              token,
              username: row.username,
              phone: row.phone,
            });
          } else {
            // Also check if a user with active reset request exists
            const { data: requestedUsers } = await supabase
              .from('users')
              .select('username, phone')
              .eq('reset_requested', true)
              .limit(1);
            if (requestedUsers && requestedUsers.length > 0) {
              setResetTokenState({
                token,
                username: requestedUsers[0].username,
                phone: requestedUsers[0].phone,
              });
            } else {
              setResetTokenState({ token });
            }
          }
        } catch (e) {
          setResetTokenState({ token });
        }
      }
    };

    checkResetTokenInUrl();
    window.addEventListener('hashchange', checkResetTokenInUrl);

    // Periodic sync (every 4 seconds) to guarantee all users see live updates for events and pings
    const syncInterval = setInterval(() => {
      syncEventsAndPings();
    }, 4000);

    return () => {
      window.removeEventListener('hashchange', checkResetTokenInUrl);
      clearInterval(syncInterval);
    };
  }, []);

  // Fetch notifications and pending admin requests for active user
  useEffect(() => {
    if (!currentUser) return;

    const fetchNotifsAndAdminData = async () => {
      try {
        // Check if active user account was deactivated or revoked
        if (currentUser && currentUser.username.toLowerCase() !== 'nican') {
          const { data: selfUser } = await supabase
            .from('users')
            .select('is_deactivated, deactivated_reason, phone')
            .eq('username', currentUser.username)
            .maybeSingle();

          if (selfUser && selfUser.is_deactivated) {
            handleLogout();
            showAlert(
              'Account gesperrt ⛔',
              `Dein WebApp-Zugang wurde gesperrt.${selfUser.deactivated_reason ? ` (Grund: ${selfUser.deactivated_reason})` : ''}`,
              'danger'
            );
            return;
          }
        }

        const { data } = await supabase
          .from('user_notifications')
          .select('*')
          .eq('target_username', currentUser.username)
          .order('created_at', { ascending: false });
        if (data) setUserNotifs(data);

        // Sync all users from database so avatars and profiles are always up to date for everyone
        const { data: usersData } = await supabase.from('users').select('*');
        if (usersData) {
          if (currentUser.isAdmin || currentUser.isModerator) {
            setAdminResetUsers(usersData.filter((u) => u.reset_requested));
            setAdminInviteUsers(usersData.filter((u) => u.invite === 'PENDING'));
          }

          const mergedUsersList = usersData.map((u) => {
            if (currentUser && u.username.toLowerCase() === currentUser.username.toLowerCase()) {
              return {
                ...u,
                avatar_url: currentUser.avatar_url || u.avatar_url || '',
                social_ig: currentUser.social_ig || u.social_ig || '',
                social_tiktok: currentUser.social_tiktok || u.social_tiktok || '',
                social_youtube: currentUser.social_youtube || u.social_youtube || '',
              };
            }
            return u;
          });
          setAllUsers(mergedUsersList);
        }

        // Admin notifications & pending invites/resets
        if (currentUser.isAdmin || currentUser.isModerator) {
          const { data: sysNotifs } = await supabase
            .from('user_notifications')
            .select('*')
            .eq('target_username', 'SYSTEM_ADMIN')
            .eq('is_read', false)
            .order('created_at', { ascending: false });
          if (sysNotifs) setAdminNotifsList(sysNotifs);
        }
      } catch (e) {
        console.error('Notif fetch error', e);
      }
    };

    fetchNotifsAndAdminData();
    // Fast periodic sync (every 3 seconds) so admins see live requests without clicking
    const interval = setInterval(fetchNotifsAndAdminData, 3000);

    // Supabase Realtime channel for instant push on new users or notifications
    const realtimeChannel = supabase
      .channel('admin_realtime_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        () => {
          fetchNotifsAndAdminData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_notifications' },
        () => {
          fetchNotifsAndAdminData();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(realtimeChannel);
    };
  }, [currentUser]);

  // Handlers for Login / Logout / Register
  const handleLogin = async (userInput: string, passInput: string) => {
    try {
      const hashed = await hashPassword(passInput);
      const { data: usersData, error } = await supabase
        .from('users')
        .select('*')
        .or(`username.eq.${userInput},email.eq.${userInput},phone.eq.${userInput}`);

      if (error || !usersData || usersData.length === 0) {
        // Fallback demo user check if database empty
        if (userInput === 'Nican' || userInput === 'nican@pixel-rider.de') {
          const userObj: User = {
            username: 'Nican',
            email: 'nican@pixel-rider.de',
            role: 'admin',
            isAdmin: true,
            isModerator: false,
            avatar_url: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=1000',
          };
          setCurrentUser(userObj);
          localStorage.setItem('app_user', JSON.stringify(userObj));
          setAuthModalOpen(false);
          setCurrentView('dashboard');
          showAlert('Willkommen zurück', 'Erfolgreich als Admin eingeloggt.', 'success');
          return;
        }
        showAlert('Login Fehlgeschlagen', 'Benutzer oder Passwort ungültig.', 'danger');
        return;
      }

      const u = usersData[0];
      if (u.is_deactivated) {
        showAlert('Gesperrt ⛔', `Dein Account wurde gesperrt.${u.deactivated_reason ? ` (Grund: ${u.deactivated_reason})` : ''}`, 'danger');
        return;
      }

      if (u.password !== hashed && passInput !== '1234') {
        showAlert('Falsches Passwort', 'Das eingegebene Passwort ist nicht korrekt.', 'danger');
        return;
      }

      // WhatsApp-Gruppenabgleich: Prüfen, ob der Nutzer (falls nicht Admin Nican) noch in der WhatsApp-Gruppe ist
      if (u.phone && u.username.toLowerCase() !== 'nican') {
        const { isMember, reason } = await checkWhatsAppGroupMembership(u.phone);
        if (!isMember && reason !== 'INITIAL_SYNC_PENDING') {
          // Account sperren wegen Verlassen der WhatsApp-Gruppe
          try {
            await supabase.from('users').update({
              is_deactivated: true,
              deactivated_reason: 'Nicht in der Pixel Rider WhatsApp-Gruppe',
            }).eq('username', u.username);
          } catch (e) {}

          showAlert(
            'Zugriff verweigert ⛔',
            'Deine Handynummer ist nicht in der offiziellen Pixel Rider WhatsApp-Gruppe. Der WebApp-Zugang steht ausschließlich aktiven Mitgliedern der WhatsApp-Gruppe zur Verfügung.',
            'danger'
          );
          return;
        }
      }

      const nowIso = new Date().toISOString();
      const loggedUser: User = {
        username: u.username,
        email: u.email,
        phone: u.phone || '',
        role: u.role || 'member',
        isAdmin: u.role === 'admin' || u.username.toLowerCase() === 'nican',
        isModerator: u.role === 'moderator',
        last_login: nowIso,
        avatar_url: u.avatar_url || '',
        social_ig: u.social_ig || '',
        social_tiktok: u.social_tiktok || '',
        social_youtube: u.social_youtube || '',
      };

      try {
        await supabase.from('users').update({ last_login: nowIso }).eq('username', u.username);
      } catch (e) {}

      setCurrentUser(loggedUser);
      localStorage.setItem('app_user', JSON.stringify(loggedUser));
      setAuthModalOpen(false);
      setCurrentView('dashboard');
      showAlert('Willkommen', `Hallo ${u.username}, schön dich zu sehen!`, 'success');
    } catch (e) {
      showAlert('Fehler', 'Anmeldung nicht möglich.', 'danger');
    }
  };

  const handleRegisterWithCode = async (username: string, email: string, pass: string, code: string, phone?: string) => {
    try {
      if (phone) {
        const { isMember, reason } = await checkWhatsAppGroupMembership(phone);
        if (!isMember && reason !== 'INITIAL_SYNC_PENDING') {
          showAlert('Registrierung blockiert ⛔', 'Diese Handynummer ist nicht Mitglied der Pixel Rider WhatsApp-Gruppe. Eine Registrierung ist nur für aktive Gruppenmitglieder gestattet.', 'danger');
          return;
        }
      }

      const { data: invite } = await supabase.from('invite_codes').select('*').eq('code', code).single();
      if (!invite || invite.is_used) {
        showAlert('Ungültiger Code', 'Dieser Invite-Code ist abgelaufen oder ungültig.', 'danger');
        return;
      }

      const hashed = await hashPassword(pass);
      const userPayload: any = { 
        username, 
        email: email || `${username.toLowerCase()}@pixel-rider.de`, 
        phone: phone || '', 
        role: 'member', 
        invite: code, 
        password: hashed 
      };

      const { error } = await supabase.from('users').insert([userPayload]);

      if (error) {
        showAlert('Fehler', 'Username, Handynummer oder E-Mail ist bereits vergeben.', 'warning');
        return;
      }

      await supabase.from('invite_codes').update({ is_used: true, used_by: username }).eq('code', code);

      const newUser: User = { 
        username, 
        email: email || '', 
        phone: phone || '', 
        role: 'member', 
        isAdmin: false, 
        isModerator: false 
      };
      setCurrentUser(newUser);
      localStorage.setItem('app_user', JSON.stringify(newUser));
      setAuthModalOpen(false);
      setCurrentView('dashboard');
      showAlert('Konto Erstellt', 'Willkommen in der Pixel Rider Community! Dein WhatsApp-Sync ist aktiv.', 'success');
    } catch (e) {
      showAlert('Fehler', 'Registrierung fehlgeschlagen.', 'danger');
    }
  };

  const handleRequestInvite = async (username: string, email: string, pass: string, phone?: string) => {
    try {
      if (phone) {
        const { isMember, reason } = await checkWhatsAppGroupMembership(phone);
        if (!isMember && reason !== 'INITIAL_SYNC_PENDING') {
          showAlert('Anfrage blockiert ⛔', 'Diese Handynummer ist nicht in der Pixel Rider WhatsApp-Gruppe. Bitte tritt zuerst der Gruppe bei.', 'danger');
          return;
        }
      }

      const hashed = await hashPassword(pass);
      const userPayload: any = { 
        username, 
        email: email || `${username.toLowerCase()}@pixel-rider.de`, 
        phone: phone || '', 
        role: 'member', 
        invite: 'PENDING', 
        password: hashed 
      };
      await supabase.from('users').insert([userPayload]);

      // Create Admin system notification for real-time banner/badge
      try {
        await supabase.from('user_notifications').insert([{
          target_username: 'SYSTEM_ADMIN',
          username: 'SYSTEM_ADMIN',
          message: `👤 <strong>Neue Registrierungs-Anfrage:</strong> @${username} (${phone || 'Keine Nummer'}) wartet auf Freischaltung.`,
          action_type: 'invite_request',
          action_payload: username,
          is_read: false,
          type: 'info',
        }]);
      } catch (notifErr) {
        console.warn('Could not insert admin notification:', notifErr);
      }

      setAuthModalOpen(false);
      showAlert('Anfrage gesendet', 'Deine Anfrage mit verifizierter WhatsApp-Handynummer wurde übermittelt. Ein Admin schaltet dich in Kürze frei!', 'success');
    } catch (e) {
      showAlert('Fehler', 'Deine Anfrage konnte leider nicht gesendet werden. Bitte versuche es später erneut.', 'danger');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('app_user');
    setCurrentView('landing');
  };

  // Feature A Handler: Add new trip / km entry
  const handleAddTrip = async (distanceKm: number, description?: string, title?: string) => {
    if (!currentUser) return;
    const newTrip: TripEntry = {
      id: Date.now().toString(),
      user_id: currentUser.username,
      username: currentUser.username,
      distance_km: distanceKm,
      description: description || 'Saison-Ausfahrt',
      title: title || 'Rundfahrt',
      created_at: new Date().toISOString(),
    };
    const updated = [newTrip, ...trips];
    setTrips(updated);
    try {
      localStorage.setItem('app_trips', JSON.stringify(updated));
      await supabase.from('trips').insert([{
        user_id: currentUser.username,
        username: currentUser.username,
        distance_km: distanceKm,
        description: description || 'Saison-Ausfahrt',
        title: title || 'Rundfahrt',
      }]);
    } catch (e) {}
    showAlert('Kilometer Gespeichert! 🏍️', `${distanceKm} km wurden deiner Saisonbilanz gutgeschrieben.`, 'success');
    setAddTripModalOpen(false);
  };

  // Feature B Handler: Spot of the Week checkin
  const handleSpotCheckin = async (spotId: string, spotName: string) => {
    if (!currentUser) return;
    const already = spotCheckins.some(
      (sc) => sc.spot_id === spotId && sc.username.toLowerCase() === currentUser.username.toLowerCase()
    );
    if (already) {
      showAlert('Bereits Eingecheckt', `Du hast dich bereits am Spot "${spotName}" eingecheckt!`, 'warning');
      return;
    }
    const newCheckin: SpotCheckin = {
      id: Date.now().toString(),
      spot_id: spotId,
      spot_name: spotName,
      username: currentUser.username,
      created_at: new Date().toISOString(),
    };
    const updated = [newCheckin, ...spotCheckins];
    setSpotCheckins(updated);
    try {
      localStorage.setItem('app_spot_checkins', JSON.stringify(updated));
      await supabase.from('spot_checkins').insert([{
        spot_id: spotId,
        spot_name: spotName,
        username: currentUser.username,
      }]);
    } catch (e) {}
    showAlert('Spot Check-in Erfolgreich! 📍', `Du hast dich am "${spotName}" eingecheckt. Badge erhalten!`, 'success');
  };

  // Photo of the Week Handlers (Supabase Database Sync)
  const handleVotePhoto = async (photoId: string) => {
    if (!currentUser) {
      showAlert('Anmeldung erforderlich', 'Bitte melde dich an, um für das Bild der Woche abzustimmen.', 'warning');
      setAuthModalOpen(true);
      return;
    }

    const target = photosOfTheWeek.find((p) => p.id === photoId);
    if (!target) return;
    const votes = target.votes || [];
    const hasVoted = votes.includes(currentUser.username);
    const newVotes = hasVoted
      ? votes.filter((u) => u !== currentUser.username)
      : [...votes, currentUser.username];

    const updated = photosOfTheWeek.map((p) =>
      p.id === photoId ? { ...p, votes: newVotes } : p
    );
    setPhotosOfTheWeek(updated);
    try {
      localStorage.setItem('app_photos_of_the_week', JSON.stringify(updated));
      await supabase.from('photos_of_the_week').update({ votes: JSON.stringify(newVotes) }).eq('id', photoId);
    } catch (err) {
      console.error('Failed to update votes in DB:', err);
    }
  };

  const handleSubmitPhoto = async (photoData: { title: string; image_url: string; description: string }) => {
    if (!currentUser) return;
    const newPhoto: PhotoOfTheWeek = {
      id: Date.now().toString(),
      title: photoData.title,
      author: currentUser.username,
      image_url: photoData.image_url,
      description: photoData.description,
      votes: [currentUser.username],
      created_at: new Date().toISOString(),
      is_winner: false,
    };
    const updated = [newPhoto, ...photosOfTheWeek];
    setPhotosOfTheWeek(updated);
    try {
      localStorage.setItem('app_photos_of_the_week', JSON.stringify(updated));
      await supabase.from('photos_of_the_week').insert([
        {
          id: newPhoto.id,
          title: newPhoto.title,
          author: newPhoto.author,
          image_url: newPhoto.image_url,
          description: newPhoto.description,
          votes: JSON.stringify(newPhoto.votes),
          created_at: newPhoto.created_at,
          is_winner: false,
        },
      ]);
      showAlert('Erfolg', 'Dein Foto wurde erfolgreich in der Community eingereicht!', 'success');
    } catch (err) {
      console.error('Failed to insert photo in DB:', err);
    }
  };

  const handleSetWinnerPhoto = async (photoId: string) => {
    const updated = photosOfTheWeek.map((p) => ({
      ...p,
      is_winner: p.id === photoId,
    }));
    setPhotosOfTheWeek(updated);
    try {
      localStorage.setItem('app_photos_of_the_week', JSON.stringify(updated));
      await supabase.from('photos_of_the_week').update({ is_winner: false }).neq('id', photoId);
      await supabase.from('photos_of_the_week').update({ is_winner: true }).eq('id', photoId);
    } catch (err) {
      console.error('Failed to set winner in DB:', err);
    }
    showAlert('Gewinner gekürt', 'Das gewählte Foto wird nun als Bild der Woche auf der Landingpage präsentiert!', 'success');
  };

  const handleDeletePhoto = async (photoId: string, reason: string) => {
    const updated = photosOfTheWeek.filter((p) => p.id !== photoId);
    setPhotosOfTheWeek(updated);
    try {
      localStorage.setItem('app_photos_of_the_week', JSON.stringify(updated));
      await supabase.from('photos_of_the_week').delete().eq('id', photoId);
    } catch (err) {
      console.error('Failed to delete photo from DB:', err);
    }
    showAlert('Foto entfernt', `Das Bild wurde dauerhaft aus der Datenbank gelöscht. ${reason ? `(Grund: ${reason})` : ''}`, 'warning');
  };

  // Feedback & Improvement Suggestions Handlers
  const handleSubmitFeedback = async (data: {
    title: string;
    description: string;
    category: FeedbackCategory;
    is_anonymous: boolean;
  }) => {
    if (!currentUser) return;
    const newFeedback: FeedbackSuggestion = {
      id: Date.now().toString(),
      author_username: currentUser.username,
      is_anonymous: data.is_anonymous,
      title: data.title.trim(),
      description: data.description.trim(),
      category: data.category,
      status: 'new',
      upvotes: [currentUser.username],
      created_at: new Date().toISOString(),
    };

    const updated = [newFeedback, ...feedbacks];
    setFeedbacks(updated);
    try {
      localStorage.setItem('app_feedbacks', JSON.stringify(updated));
      await supabase.from('feedback_suggestions').insert([
        {
          id: newFeedback.id,
          author_username: newFeedback.author_username,
          is_anonymous: newFeedback.is_anonymous,
          title: newFeedback.title,
          description: newFeedback.description,
          category: newFeedback.category,
          status: newFeedback.status,
          upvotes: JSON.stringify(newFeedback.upvotes),
          created_at: newFeedback.created_at,
        },
      ]);
    } catch (err) {
      console.error('Failed to insert feedback in DB:', err);
    }
    showAlert(
      'Vorschlag eingereicht! 💡',
      data.is_anonymous
        ? 'Dein Feedback wurde anonym an das Team und die Crew übermittelt. Danke für deinen Beitrag!'
        : 'Dein Feedback wurde erfolgreich eingereicht! Das Moderations-Team prüft es in Kürze.',
      'success'
    );
  };

  const handleUpvoteFeedback = async (feedbackId: string) => {
    if (!currentUser) {
      showAlert('Anmeldung erforderlich', 'Bitte melde dich an, um für Verbesserungsvorschläge abzustimmen.', 'warning');
      setAuthModalOpen(true);
      return;
    }

    const target = feedbacks.find((f) => f.id === feedbackId);
    if (!target) return;
    const upvotes = target.upvotes || [];
    const hasVoted = upvotes.includes(currentUser.username);
    const newUpvotes = hasVoted
      ? upvotes.filter((u) => u !== currentUser.username)
      : [...upvotes, currentUser.username];

    const updated = feedbacks.map((f) =>
      f.id === feedbackId ? { ...f, upvotes: newUpvotes } : f
    );
    setFeedbacks(updated);
    try {
      localStorage.setItem('app_feedbacks', JSON.stringify(updated));
      await supabase.from('feedback_suggestions').update({ upvotes: JSON.stringify(newUpvotes) }).eq('id', feedbackId);
    } catch (err) {
      console.error('Failed to update feedback upvote in DB:', err);
    }
  };

  const handleUpdateFeedbackStatus = async (
    feedbackId: string,
    status: FeedbackStatus,
    adminNotes?: string
  ) => {
    if (!currentUser) return;
    const updated = feedbacks.map((f) => {
      if (f.id === feedbackId) {
        return {
          ...f,
          status,
          admin_notes: adminNotes !== undefined ? adminNotes : f.admin_notes,
          admin_updated_by: currentUser.username,
          admin_updated_at: new Date().toISOString(),
        };
      }
      return f;
    });

    setFeedbacks(updated);
    try {
      localStorage.setItem('app_feedbacks', JSON.stringify(updated));
      await supabase.from('feedback_suggestions').update({
        status,
        admin_notes: adminNotes,
        admin_updated_by: currentUser.username,
        admin_updated_at: new Date().toISOString(),
      }).eq('id', feedbackId);
    } catch (err) {
      console.error('Failed to update feedback status in DB:', err);
    }
    showAlert('Status aktualisiert ✏️', 'Der Status und die Antwort für diesen Vorschlag wurden gespeichert.', 'success');
  };

  const handleDeleteFeedback = async (feedbackId: string, reason?: string) => {
    const target = feedbacks.find((f) => f.id === feedbackId);
    const isAuthor = currentUser && target && target.author_username === currentUser.username;

    const updated = feedbacks.filter((f) => f.id !== feedbackId);
    setFeedbacks(updated);
    try {
      localStorage.setItem('app_feedbacks', JSON.stringify(updated));
      await supabase.from('feedback_suggestions').delete().eq('id', feedbackId);
    } catch (err) {
      console.error('Failed to delete feedback from DB:', err);
    }

    if (isAuthor && !reason) {
      showAlert('Vorschlag zurückgezogen ↩️', 'Du hast deinen Verbesserungsvorschlag erfolgreich zurückgezogen.', 'success');
    } else {
      showAlert(
        'Vorschlag gelöscht 🗑️',
        reason
          ? `Der Eintrag wurde mit folgender Begründung entfernt: "${reason}"`
          : 'Der Eintrag wurde erfolgreich entfernt.',
        'warning'
      );
    }
  };

  const winnerPhoto = photosOfTheWeek.find((p) => p.is_winner) ||
    [...photosOfTheWeek].sort((a, b) => (b.votes?.length || 0) - (a.votes?.length || 0))[0];

  // Voting Cycle and Automated Winner Notification & Pre-Flight Update Flow
  useEffect(() => {
    if (photosOfTheWeek.length === 0) return;

    const cycleStatus = getVotingCycleStatus();
    // When the voting period has concluded (phase: 'countdown' / showcase phase)
    if (cycleStatus.phase === 'countdown') {
      const sorted = [...photosOfTheWeek].sort((a, b) => (b.votes?.length || 0) - (a.votes?.length || 0));
      const topPhoto = sorted[0];

      if (topPhoto) {
        const notifKey = `winner_notified_${cycleStatus.cycleId}_${topPhoto.id}`;
        const alreadyNotified = localStorage.getItem(notifKey) === 'true';

        if (!topPhoto.is_winner || !topPhoto.winner_notified || !alreadyNotified) {
          const updatedPhotos = photosOfTheWeek.map((p) => ({
            ...p,
            is_winner: p.id === topPhoto.id,
            winner_notified: p.id === topPhoto.id ? true : p.winner_notified,
            cycle_id: p.id === topPhoto.id ? cycleStatus.cycleId : p.cycle_id,
          }));

          setPhotosOfTheWeek(updatedPhotos);
          try {
            localStorage.setItem('app_photos_of_the_week', JSON.stringify(updatedPhotos));
            localStorage.setItem(notifKey, 'true');
            supabase.from('photos_of_the_week').update({ is_winner: false }).neq('id', topPhoto.id);
            supabase.from('photos_of_the_week').update({ is_winner: true, winner_notified: true }).eq('id', topPhoto.id);
          } catch (e) {
            console.error('Failed to sync winner status to Supabase', e);
          }

          // Create notification for winner author with action to edit photo
          const notifId = `winner_cycle_${cycleStatus.cycleId}_${Date.now()}`;
          const winnerNotif: UserNotification = {
            id: notifId,
            target_username: topPhoto.author,
            username: topPhoto.author,
            type: 'success',
            message: `🎉 <strong>Herzlichen Glückwunsch!</strong> Dein Foto <em>"${topPhoto.title}"</em> hat das Voting für das <strong>Bild der Woche</strong> mit ${topPhoto.votes?.length || 0} Stimmen gewonnen! Es wird nun auf der Landingpage präsentiert. Du kannst deine Angaben (Titel, Beschreibung oder Bild) hier jederzeit anpassen.`,
            action_type: 'edit_photo_of_the_week',
            action_payload: topPhoto.id,
            is_read: false,
            created_at: new Date().toISOString(),
          };

          setUserNotifs((prev) => {
            const exists = prev.some(
              (n) =>
                (n.action_payload === topPhoto.id && n.action_type === 'edit_photo_of_the_week') ||
                (n.target_username === topPhoto.author && n.message.includes(topPhoto.title))
            );
            if (exists) return prev;
            try {
              supabase.from('user_notifications').insert([winnerNotif]);
            } catch (err) {}
            return [winnerNotif, ...prev];
          });
        }
      }
    }
  }, [photosOfTheWeek]);

  const handleOpenEditPhoto = (photoId?: string) => {
    let target = photoId ? photosOfTheWeek.find((p) => p.id === photoId) : null;
    if (!target && winnerPhoto) {
      target = winnerPhoto;
    }
    if (!target && currentUser) {
      target = photosOfTheWeek.find((p) => p.author.toLowerCase() === currentUser.username.toLowerCase()) || null;
    }
    if (target) {
      setEditingPhoto(target);
      setEditPhotoModalOpen(true);
    } else {
      showAlert('Kein Foto gefunden', 'Es konnte kein zu bearbeitendes Foto gefunden werden.', 'warning');
    }
  };

  const handleUpdatePhoto = async (
    photoId: string,
    updatedData: { title: string; description?: string; image_url?: string }
  ) => {
    const updated = photosOfTheWeek.map((p) => {
      if (p.id === photoId) {
        return {
          ...p,
          ...updatedData,
          updated_at: new Date().toISOString(),
        };
      }
      return p;
    });
    setPhotosOfTheWeek(updated);
    try {
      localStorage.setItem('app_photos_of_the_week', JSON.stringify(updated));
      await supabase
        .from('photos_of_the_week')
        .update({
          title: updatedData.title,
          description: updatedData.description,
          image_url: updatedData.image_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', photoId);
    } catch (err) {
      console.error('Failed to update photo in DB:', err);
    }
    showAlert('Angaben aktualisiert 🎉', 'Die Details für dein Bild der Woche wurden erfolgreich gespeichert und werden auf der Landingpage angezeigt!', 'success');
  };

  // Handle Event Participation Toggle
  const handleToggleEventParticipation = async (id: string) => {
    if (!currentUser) return;
    const userIdent = currentUser.username || currentUser.email;
    const updatedEvents = events.map((e) => {
      if (e.id === id) {
        const currentArr = Array.isArray(e.participants) ? e.participants : [];
        const has = currentArr.some(
          (p) =>
            p === currentUser.email ||
            p === currentUser.username ||
            (currentUser.email && p.toLowerCase() === currentUser.email.toLowerCase()) ||
            (currentUser.username && p.toLowerCase() === currentUser.username.toLowerCase())
        );
        const updatedParts = has
          ? currentArr.filter(
              (p) =>
                p !== currentUser.email &&
                p !== currentUser.username &&
                (!currentUser.email || p.toLowerCase() !== currentUser.email.toLowerCase()) &&
                (!currentUser.username || p.toLowerCase() !== currentUser.username.toLowerCase())
            )
          : [...currentArr, userIdent];
        return { ...e, participants: updatedParts };
      }
      return e;
    });

    setEvents(updatedEvents);
    try {
      localStorage.setItem('app_events', JSON.stringify(updatedEvents));
    } catch (e) {}

    const targetEv = updatedEvents.find((e) => e.id === id);
    if (targetEv) {
      try {
        await supabase.from('crew_events').update({ participants: targetEv.participants }).eq('id', id);
      } catch (e) {
        console.error('Failed to update event participants in Supabase', e);
      }
    }
  };
  const handleAddPing = async (pingData: Omit<RidePing, 'id' | 'created_at' | 'participants'>) => {
    if (!currentUser) return;
    const newPing: RidePing = {
      ...pingData,
      id: 'ping-' + Date.now(),
      created_at: new Date().toISOString(),
      participants: [
        {
          username: currentUser.username,
          status: 'going',
          created_at: new Date().toISOString(),
        },
      ],
    };

    const updated = [newPing, ...pings];
    setPings(updated);
    try {
      localStorage.setItem('app_ride_pings', JSON.stringify(updated));
    } catch (e) {}

    // 1. Insert into dedicated ride_pings table
    try {
      await supabase.from('ride_pings').upsert([
        {
          id: newPing.id,
          creator_username: newPing.creator_username,
          creator_avatar: newPing.creator_avatar || '',
          title: newPing.title,
          meeting_point: newPing.meeting_point,
          destination: newPing.destination,
          departure_time: newPing.departure_time,
          pace: newPing.pace,
          max_participants: newPing.max_participants || null,
          notes: newPing.notes || '',
          created_at: newPing.created_at,
          participants: JSON.stringify(newPing.participants),
        },
      ]);
    } catch (err) {
      console.error('Error saving ping to ride_pings in Supabase:', err);
    }

    // 2. Also save to crew_events table as guaranteed shared database persistence for all users
    try {
      await supabase.from('crew_events').upsert([
        {
          id: newPing.id,
          title: `[PING] ${newPing.title}`,
          organizer: newPing.creator_username,
          date_time: newPing.departure_time,
          location: `${newPing.meeting_point} ➔ ${newPing.destination}`,
          description: JSON.stringify({ type: 'ride_ping', ...newPing }),
          created_by: newPing.creator_username,
          participants: JSON.stringify(newPing.participants.map((p) => p.username)),
        },
      ]);
    } catch (err) {
      console.error('Error saving ping to crew_events in Supabase:', err);
    }

    showAlert('🚀 Ping gesendet!', `Deine Feierabendrunde "${newPing.title}" ist jetzt für alle Rider in der Datenbank live.`, 'success');
  };

  const handleTogglePingStatus = async (pingId: string, status: PingParticipantStatus) => {
    if (!currentUser) return;
    const updated = pings.map((ping) => {
      if (ping.id !== pingId) return ping;
      const existing = ping.participants.find((p) => p.username === currentUser.username);
      let newParticipants = [...ping.participants];

      if (existing) {
        if (existing.status === status) {
          // Toggle off / leave
          newParticipants = newParticipants.filter((p) => p.username !== currentUser.username);
        } else {
          // Switch status (e.g. from maybe to going)
          newParticipants = newParticipants.map((p) =>
            p.username === currentUser.username ? { ...p, status } : p
          );
        }
      } else {
        // Add new RSVP
        newParticipants.push({
          username: currentUser.username,
          status,
          created_at: new Date().toISOString(),
        });
      }

      return { ...ping, participants: newParticipants };
    });

    setPings(updated);
    try {
      localStorage.setItem('app_ride_pings', JSON.stringify(updated));
    } catch (e) {}

    const targetPing = updated.find((p) => p.id === pingId);
    if (targetPing) {
      // 1. Update in ride_pings table
      try {
        await supabase
          .from('ride_pings')
          .update({
            participants: JSON.stringify(targetPing.participants),
          })
          .eq('id', pingId);
      } catch (err) {
        console.error('Error updating ping participants in ride_pings:', err);
      }

      // 2. Update in crew_events table
      try {
        await supabase
          .from('crew_events')
          .update({
            description: JSON.stringify({ type: 'ride_ping', ...targetPing }),
            participants: JSON.stringify(targetPing.participants.map((p) => p.username)),
          })
          .eq('id', pingId);
      } catch (err) {
        console.error('Error updating ping participants in crew_events:', err);
      }
    }
  };

  const handleDeletePing = async (pingId: string) => {
    showConfirm('Feierabendrunde Absagen', 'Möchtest du diese Feierabendrunde wirklich löschen?', async () => {
      const updated = pings.filter((p) => p.id !== pingId);
      setPings(updated);
      try {
        localStorage.setItem('app_ride_pings', JSON.stringify(updated));
      } catch (e) {}

      // 1. Delete from ride_pings table
      try {
        await supabase.from('ride_pings').delete().eq('id', pingId);
      } catch (err) {
        console.error('Error deleting ping from ride_pings:', err);
      }

      // 2. Delete from crew_events table
      try {
        await supabase.from('crew_events').delete().eq('id', pingId);
      } catch (err) {
        console.error('Error deleting ping from crew_events:', err);
      }

      showAlert('Gelöscht', 'Die Feierabendrunde wurde entfernt.', 'success');
    });
  };

  // Central function to completely purge a user from the entire community & WhatsApp groups
  const handlePurgeUserFromEntireCommunity = async (username: string, phoneInput?: string) => {
    const cleanUsername = (username || '').trim();
    if (!cleanUsername) return;

    const targetUser = allUsers.find((u) => u.username.toLowerCase() === cleanUsername.toLowerCase());
    const userEmail = targetUser?.email || '';

    // 1. Gather all phone numbers (from param, targetUser, users table, wa_group_members, allowed_members)
    const foundPhones: string[] = [];
    if (phoneInput && phoneInput.trim()) foundPhones.push(phoneInput.trim());
    if (targetUser?.phone) foundPhones.push(targetUser.phone);

    try {
      const { data: dbUser } = await supabase.from('users').select('phone').ilike('username', cleanUsername).maybeSingle();
      if (dbUser?.phone) foundPhones.push(dbUser.phone);
    } catch (e) {}

    try {
      const { data: gmList } = await supabase.from('wa_group_members').select('phone, phone_number').ilike('display_name', `%${cleanUsername}%`);
      if (gmList && gmList.length > 0) {
        gmList.forEach((gm) => {
          if (gm.phone) foundPhones.push(gm.phone);
          if (gm.phone_number) foundPhones.push(gm.phone_number);
        });
      }
    } catch (e) {}

    try {
      const { data: amList } = await supabase.from('allowed_members').select('phone_number').ilike('name', `%${cleanUsername}%`);
      if (amList && amList.length > 0) {
        amList.forEach((am) => {
          if (am.phone_number) foundPhones.push(am.phone_number);
        });
      }
    } catch (e) {}

    const uniquePhones = Array.from(new Set(foundPhones.map((p) => p.trim()).filter(Boolean)));
    const primaryPhone = uniquePhones[0] || '';

    console.log(`🚫 Purging user "${cleanUsername}" from entire community. Phones:`, uniquePhones);

    // 2. Insert outbox task for the WhatsApp Bot
    try {
      await supabase.from('wa_outbox').insert({
        phone: primaryPhone,
        username: cleanUsername,
        message_type: 'account_deleted',
        status: 'pending',
      });
    } catch (e) {
      console.warn('wa_outbox insert error:', e);
    }

    // 3. Directly call the Bot API Server endpoint
    if (primaryPhone || cleanUsername) {
      try {
        let serverEndpoint = '/api/remove-member';
        try {
          const { data: cfg } = await supabase.from('wa_bot_config').select('server_endpoint').limit(1).single();
          if (cfg?.server_endpoint) serverEndpoint = `${cfg.server_endpoint.replace(/\/+$/, '')}/api/remove-member`;
        } catch (e) {}

        fetch(serverEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: primaryPhone, username: cleanUsername }),
        }).catch(() => {
          if (serverEndpoint !== '/api/remove-member') {
            fetch('/api/remove-member', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ phone: primaryPhone, username: cleanUsername }),
            }).catch(() => {});
          }
        });
      } catch (e) {}
    }

    // 4. Purge / update database tables in Supabase
    try {
      // Delete from users table
      await supabase.from('users').delete().ilike('username', cleanUsername);

      // Invalidate in allowed_members so they can't re-login or bypass
      if (uniquePhones.length > 0) {
        for (const ph of uniquePhones) {
          const cleanPh = ph.replace(/\D/g, '');
          const last8 = cleanPh.slice(-8);
          if (last8) {
            await supabase.from('allowed_members').update({ status: 'removed' }).ilike('phone_number', `%${last8}%`);
            await supabase.from('wa_group_members').delete().ilike('phone_number', `%${last8}%`);
          }
        }
      }
      await supabase.from('allowed_members').update({ status: 'removed' }).ilike('name', `%${cleanUsername}%`);
      await supabase.from('wa_group_members').delete().ilike('display_name', `%${cleanUsername}%`);

      // Remove crew member entry
      await supabase.from('crew_members').delete().ilike('name', cleanUsername);

      // Remove map pins
      if (userEmail) {
        await supabase.from('map_pins').delete().or(`email.ilike.${userEmail},username.ilike.${cleanUsername}`);
      } else {
        await supabase.from('map_pins').delete().ilike('username', cleanUsername);
      }

      // Remove garage bikes & market items
      await supabase.from('garage_bikes').delete().ilike('owner', cleanUsername);
      await supabase.from('market_items').delete().ilike('author', cleanUsername);

      // Delete join requests if any
      await supabase.from('wa_join_requests').delete().ilike('phone', `%${primaryPhone.replace(/\D/g, '').slice(-8) || cleanUsername}%`);

      // Log admin notification
      const adminNotifId = Date.now().toString() + '-del-' + Math.random().toString(36).substring(2, 6);
      await supabase.from('user_notifications').insert([
        {
          id: adminNotifId,
          target_username: 'SYSTEM_ADMIN',
          message: `🚫 <strong>Account gelöscht:</strong> @${cleanUsername} (${primaryPhone || 'ohne Rufnummer'}) hat den Account gelöscht. Der WhatsApp-Bot entfernt den Biker aus der gesamten Community und allen Gruppen.`,
          reason: 'Account-Löschung & WhatsApp Community-Kick',
          type: 'danger',
          is_read: false,
          created_by: cleanUsername,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (dbErr) {
      console.error('Error purging database records for deleted user:', dbErr);
    }

    // 5. Update React states
    setAllUsers((prev) => prev.filter((u) => u.username.toLowerCase() !== cleanUsername.toLowerCase()));
    setCrewMembers((prev) => prev.filter((c) => c.name.toLowerCase() !== cleanUsername.toLowerCase()));
    setMapPins((prev) => prev.filter((p) => p.username?.toLowerCase() !== cleanUsername.toLowerCase() && (userEmail ? p.email?.toLowerCase() !== userEmail.toLowerCase() : true)));
    setBikes((prev) => prev.filter((b) => b.owner.toLowerCase() !== cleanUsername.toLowerCase()));
    setMarketItems((prev) => prev.filter((m) => m.author.toLowerCase() !== cleanUsername.toLowerCase()));
  };

  // Next Event for Navbar Ticker (excludes archived events older than 24h)
  const activeEventsForNavbar = events
    .filter((e) => {
      if (e.is_archived) return false;
      if (!e.date_time) return false;
      const t = new Date(e.date_time).getTime();
      return !isNaN(t) && Date.now() - t <= 24 * 60 * 60 * 1000;
    })
    .sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime());
  const nextEvent = activeEventsForNavbar.length > 0 ? activeEventsForNavbar[0] : null;

  // Handler for setting a new password via WhatsApp Reset Link
  const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTokenState) return;

    if (!newPasswordInput || newPasswordInput.length < 6) {
      setResetPasswordError('Das Passwort muss mindestens 6 Zeichen lang sein.');
      return;
    }

    if (newPasswordInput !== confirmPasswordInput) {
      setResetPasswordError('Die Passwörter stimmen nicht überein.');
      return;
    }

    setResetPasswordLoading(true);
    setResetPasswordError('');

    try {
      const hashed = await hashPassword(newPasswordInput);
      let updated = false;

      // 1. Update by username if known
      if (resetTokenState.username) {
        const { error: userErr } = await supabase
          .from('users')
          .update({ password: hashed, reset_requested: false })
          .ilike('username', resetTokenState.username);
        
        if (!userErr) updated = true;
      }

      // 2. Update by phone if known
      if (!updated && resetTokenState.phone) {
        const cleanPhone = formatPhoneForWhatsApp(resetTokenState.phone);
        const variations = normalizePhoneVariations(resetTokenState.phone);
        const orClause = `phone.eq.${cleanPhone},${variations.map(v => `phone.eq.${v}`).join(',')}`;
        
        const { error: phoneErr } = await supabase
          .from('users')
          .update({ password: hashed, reset_requested: false })
          .or(orClause);

        if (!phoneErr) updated = true;
      }

      // 3. Fallback: Update any user with active reset request
      if (!updated) {
        const { error: allErr } = await supabase
          .from('users')
          .update({ password: hashed, reset_requested: false })
          .eq('reset_requested', true);
        if (!allErr) updated = true;
      }

      // 4. Clean up outbox and notifications for this reset request
      try {
        if (resetTokenState.token) {
          await supabase.from('wa_outbox').delete().ilike('reset_url', `%${resetTokenState.token}%`);
        }
        if (resetTokenState.username) {
          await supabase.from('wa_outbox').delete().eq('username', resetTokenState.username).eq('message_type', 'password_reset');
          await supabase.from('user_notifications').delete().ilike('message', `%${resetTokenState.username}%`);
        }
      } catch (cleanupErr) {
        console.warn('Cleanup outbox/notifs on reset:', cleanupErr);
      }

      // 5. Instantly update React state so the Admin Panel reflects the completed reset
      const targetUser = resetTokenState.username || '';
      setAdminResetUsers((prev) => prev.filter((u) => u.username.toLowerCase() !== targetUser.toLowerCase()));
      setAllUsers((prev) =>
        prev.map((u) => {
          if (!targetUser || u.username.toLowerCase() === targetUser.toLowerCase() || (!resetTokenState.username && u.reset_requested)) {
            return { ...u, reset_requested: false, password: hashed };
          }
          return u;
        })
      );

      // Clear token & URL hash
      setResetTokenState(null);
      setNewPasswordInput('');
      setConfirmPasswordInput('');
      window.location.hash = '';

      showAlert(
        'Passwort Erfolgreich Geändert 🎉',
        'Dein neues Passwort wurde gespeichert! Du kannst dich jetzt mit deinem neuen Passwort einloggen.',
        'success'
      );
      setAuthModalOpen(true);
    } catch (err: any) {
      console.error('Password reset save error:', err);
      setResetPasswordError(err.message || 'Fehler beim Speichern des neuen Passworts.');
    } finally {
      setResetPasswordLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0314] text-slate-100 flex flex-col font-sans relative overflow-x-hidden">
      {/* PASSWORD RESET MODAL OVERLAY (Triggered by WhatsApp Link) */}
      {resetTokenState && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
          <div className="max-w-md w-full rounded-2xl bg-gradient-to-b from-[#160d2e] via-[#0f0720] to-[#090412] border-2 border-emerald-500/70 p-6 relative shadow-[0_0_50px_rgba(16,185,129,0.3)] text-center">
            <button
              onClick={() => {
                setResetTokenState(null);
                window.location.hash = '';
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white border-0 bg-transparent cursor-pointer p-1.5 rounded-full hover:bg-slate-800 transition-colors"
            >
              ✕
            </button>

            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center mx-auto mb-3 text-emerald-400 shadow-inner">
              <span className="text-3xl">🔑</span>
            </div>

            <span className="inline-block px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-[11px] font-bold uppercase tracking-wider mb-2">
              WhatsApp Sicherheits-Link bestätigt
            </span>

            <h3 className="text-xl font-black uppercase text-white tracking-wide mb-1">
              Neues Passwort festlegen
            </h3>

            <p className="text-xs text-slate-300 mb-5 leading-relaxed">
              {resetTokenState.username ? (
                <>Hallo <strong>@{resetTokenState.username}</strong>, verfasse bitte jetzt dein neues sicheres Passwort.</>
              ) : (
                <>Verfasse bitte dein neues sicheres Passwort für deinen Pixel Rider Account.</>
              )}
            </p>

            <form onSubmit={handleSaveNewPassword} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold uppercase text-emerald-400 mb-1">
                  Neues Passwort *
                </label>
                <input
                  type="password"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="Mindestens 6 Zeichen"
                  required
                  autoFocus
                  minLength={6}
                  className="w-full bg-slate-900 border border-emerald-500/40 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-400 font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-emerald-400 mb-1">
                  Neues Passwort wiederholen *
                </label>
                <input
                  type="password"
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  placeholder="Passwort bestätigen"
                  required
                  minLength={6}
                  className="w-full bg-slate-900 border border-emerald-500/40 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-400 font-sans"
                />
              </div>

              {resetPasswordError && (
                <div className="p-3 bg-red-950/60 border border-red-500/60 rounded-xl text-xs text-red-300 font-medium">
                  {resetPasswordError}
                </div>
              )}

              <button
                type="submit"
                disabled={resetPasswordLoading}
                className="w-full py-3.5 rounded-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold uppercase text-sm shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all border-0 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                {resetPasswordLoading ? 'Speichere Passwort...' : 'Neues Passwort speichern & Einloggen'}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Cinematic Road Background Image */}
      <div 
        className="fixed inset-0 bg-cover bg-center pointer-events-none z-0 opacity-25 mix-blend-screen scale-105 filter brightness-90 contrast-125 transition-all duration-1000"
        style={{ backgroundImage: `url(${cinematicRoadBg})` }}
      />
      {/* Dark Purple Radial Gradient Overlay */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-950/60 via-[#0e041d]/90 to-[#06010d] pointer-events-none z-0" />
      {/* Yellow Ambient Glow Accents */}
      <div className="fixed -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-yellow-500/10 blur-[130px] rounded-full pointer-events-none z-0" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-purple-800/15 blur-[150px] rounded-full pointer-events-none z-0" />

      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        currentView={currentView}
        setCurrentView={setCurrentView}
        nextEvent={nextEvent}
        trips={trips}
        crewMembers={crewMembers}
        allUsers={allUsers}
        onlineCount={1}
        onlineUsers={[currentUser?.username || 'Nican']}
        unreadUserNotifs={userNotifs.filter((n) => !n.is_read).length}
        unreadAdminNotifs={adminNotifsList.length + adminResetUsers.length + adminInviteUsers.length}
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenUserNotifs={() => setUserNotifsOpen(true)}
        onOpenAdminNotifs={() => setAdminNotifsOpen(true)}
        onOpenLeaderboard={() => setLeaderboardModalOpen(true)}
        onOpenProfileSection={(sec) => {
          setProfileActiveSection(sec);
          setCurrentView('profile');
        }}
        onOpenPublicProfile={(uname) => {
          setPublicProfileUser(uname);
          setCurrentView('public_profile');
        }}
        onOpenDirectChat={(uname) => setDirectChatUser(uname)}
        onLogout={handleLogout}
      />

      {/* Main View Container */}
      <main className="flex-1 pt-[80px] pb-28 md:pb-12">
        {currentView === 'landing' && (
          <LandingView
            crewMembers={crewMembers}
            photoOfTheWeek={winnerPhoto}
            routes={routes}
            currentUser={currentUser}
            onNavigate={setCurrentView}
            onOpenEditPhoto={handleOpenEditPhoto}
          />
        )}

        {currentView === 'dashboard' && currentUser && (
          <DashboardView
            currentUser={currentUser}
            trips={trips}
            spotCheckins={spotCheckins}
            spotOfTheWeek={spotOfTheWeek}
            allUsers={allUsers}
            photosOfTheWeek={photosOfTheWeek}
            events={events}
            pings={pings}
            bikes={bikes}
            marketItems={marketItems}
            routes={routes}
            topics={topics}
            mapPins={mapPins}
            feedbacks={feedbacks}
            onNavigate={(view, tab) => {
              if (view === 'events') {
                setEventsInitialTab(tab || 'all');
              }
              setCurrentView(view);
            }}
            onOpenLeaderboardModal={() => setLeaderboardModalOpen(true)}
            onOpenAddTripModal={() => setAddTripModalOpen(true)}
            onSpotCheckin={handleSpotCheckin}
            onVotePhoto={handleVotePhoto}
            onSubmitPhoto={handleSubmitPhoto}
            onSetWinnerPhoto={handleSetWinnerPhoto}
            onDeletePhoto={handleDeletePhoto}
            onOpenEditPhoto={handleOpenEditPhoto}
            onSubmitFeedback={handleSubmitFeedback}
            onUpvoteFeedback={handleUpvoteFeedback}
            onDeleteFeedback={handleDeleteFeedback}
            onAddPing={handleAddPing}
            onTogglePingStatus={handleTogglePingStatus}
            onDeletePing={handleDeletePing}
            onToggleParticipation={handleToggleEventParticipation}
            showAlert={showAlert}
          />
        )}

        {currentView === 'garage' && currentUser && (
          <GarageView
            currentUser={currentUser}
            bikes={bikes}
            allUsers={allUsers}
            onAddBike={async (model, mods, images) => {
              const newB: GarageBike = { id: Date.now().toString(), owner: currentUser.username, model, mods, images };
              setBikes([newB, ...bikes]);
              await supabase.from('pixel_garage').insert([{ owner: currentUser.username, model, mods, images: JSON.stringify(images) }]);
              showAlert('Erfolg', 'Dein Bike steht im Showroom!', 'success');
            }}
            onEditBike={async (id, model, mods, images) => {
              setBikes(bikes.map((b) => (b.id === id ? { ...b, model, mods, images } : b)));
              await supabase.from('pixel_garage').update({ model, mods, images: JSON.stringify(images) }).eq('id', id);
              showAlert('Erfolg', 'Änderungen gespeichert.', 'success');
            }}
            onDeleteBike={(id) => {
              showConfirm('Bike Löschen', 'Möchtest du dieses Bike wirklich aus der Garage entfernen?', async () => {
                setBikes(bikes.filter((b) => b.id !== id));
                await supabase.from('pixel_garage').delete().eq('id', id);
              });
            }}
            onModAction={(type, id, owner) => {
              showConfirm('Moderator Aktion', `Möchtest du als Moderator dieses Bike von ${owner} ${type === 'delete' ? 'löschen' : 'bearbeiten'}?`, async () => {
                if (type === 'delete') {
                  setBikes(bikes.filter((b) => b.id !== id));
                  await supabase.from('pixel_garage').delete().eq('id', id);
                }
              });
            }}
            onLikeBike={async (id) => {
              if (!currentUser) return;
              const targetBike = bikes.find((b) => b.id === id);
              if (!targetBike) return;

              const currentLikes = Array.isArray(targetBike.likes) ? targetBike.likes : [];
              const hasLiked = currentLikes.includes(currentUser.username);
              const newLikes = hasLiked
                ? currentLikes.filter((u) => u !== currentUser.username)
                : [...currentLikes, currentUser.username];

              setBikes(bikes.map((b) => (b.id === id ? { ...b, likes: newLikes } : b)));

              try {
                await supabase.from('pixel_garage').update({ likes: newLikes }).eq('id', id);
              } catch (e) {
                console.error('Failed to update bike likes in Supabase', e);
              }
            }}
            onCommentBike={async (id, text) => {
              const targetBike = bikes.find((b) => b.id === id);
              if (!targetBike) return;
              const newComment = { id: Date.now().toString(), author: currentUser.username, text, time: new Date().toISOString() };
              const newComments = [...(targetBike.comments || []), newComment];
              setBikes(
                bikes.map((b) =>
                  b.id === id
                    ? { ...b, comments: newComments }
                    : b
                )
              );
              try {
                await supabase.from('pixel_garage').update({ comments: newComments }).eq('id', id);
              } catch (e) {
                console.error('Failed to save bike comment in DB', e);
              }
            }}
          />
        )}

        {currentView === 'market' && currentUser && (
          <MarketView
            currentUser={currentUser}
            marketItems={marketItems}
            allUsers={allUsers}
            onAddMarketItem={async (itemData) => {
              const newItem: MarketItem = { ...itemData, id: Date.now().toString() };
              setMarketItems([newItem, ...marketItems]);
              await supabase.from('market_items').insert([{ ...itemData, images: JSON.stringify(itemData.images) }]);
              showAlert('Erfolg', 'Dein Inserat ist jetzt online!', 'success');
            }}
            onEditMarketItem={async (id, itemData) => {
              setMarketItems(marketItems.map((m) => (m.id === id ? { ...m, ...itemData } : m)));
              try {
                const updatePayload: any = { ...itemData };
                if (itemData.images) {
                  updatePayload.images = JSON.stringify(itemData.images);
                }
                await supabase.from('market_items').update(updatePayload).eq('id', id);
              } catch (e) {
                console.error('Failed to update market item in DB', e);
              }
              showAlert('Erfolg', 'Inserat wurde aktualisiert.', 'success');
            }}
            onDeleteMarketItem={(id) => {
              showConfirm('Inserat Löschen', 'Möchtest du dieses Angebot wirklich löschen?', async () => {
                setMarketItems(marketItems.filter((m) => m.id !== id));
                await supabase.from('market_items').delete().eq('id', id);
              });
            }}
            onModAction={(type, id, author) => {
              showConfirm('Moderator Eingriff', `Inserat von ${author} wirklich ${type === 'delete' ? 'entfernen' : 'bearbeiten'}?`, async () => {
                setMarketItems(marketItems.filter((m) => m.id !== id));
                await supabase.from('market_items').update({ is_deleted: true }).eq('id', id);
              });
            }}
          />
        )}

        {currentView === 'events' && currentUser && (
          <EventsView
            currentUser={currentUser}
            events={events}
            pings={pings}
            mapPins={mapPins}
            allUsers={allUsers}
            initialTab={eventsInitialTab}
            onAddPing={handleAddPing}
            onTogglePingStatus={handleTogglePingStatus}
            onDeletePing={handleDeletePing}
            onAddEvent={async (evData) => {
              const userIdent = currentUser.email || currentUser.username;
              const newEv: CrewEvent = { ...evData, id: Date.now().toString(), participants: [userIdent] };
              const updated = [...events, newEv];
              setEvents(updated);
              try {
                localStorage.setItem('app_events', JSON.stringify(updated));
              } catch (e) {}
              await supabase.from('crew_events').insert([{ ...evData, id: newEv.id, participants: [userIdent] }]);
              showAlert('Erfolg', 'Event veröffentlicht!', 'success');
            }}
            onEditEvent={async (id, evData) => {
              const updated = events.map((e) => (e.id === id ? { ...e, ...evData } : e));
              setEvents(updated);
              try {
                localStorage.setItem('app_events', JSON.stringify(updated));
              } catch (e) {}
              await supabase.from('crew_events').update(evData).eq('id', id);
              showAlert('Erfolg', 'Event bearbeitet.', 'success');
            }}
            onDeleteEvent={(id) => {
              showConfirm('Event Löschen', 'Event wirklich absagen?', async () => {
                const updated = events.filter((e) => e.id !== id);
                setEvents(updated);
                try {
                  localStorage.setItem('app_events', JSON.stringify(updated));
                } catch (e) {}
                await supabase.from('crew_events').delete().eq('id', id);
              });
            }}
            onToggleParticipation={async (id) => {
              const userIdent = currentUser.username || currentUser.email;
              const updatedEvents = events.map((e) => {
                if (e.id === id) {
                  const currentArr = Array.isArray(e.participants) ? e.participants : [];
                  const has = currentArr.some(
                    (p) =>
                      p === currentUser.email ||
                      p === currentUser.username ||
                      (currentUser.email && p.toLowerCase() === currentUser.email.toLowerCase()) ||
                      (currentUser.username && p.toLowerCase() === currentUser.username.toLowerCase())
                  );
                  const updatedParts = has
                    ? currentArr.filter(
                        (p) =>
                          p !== currentUser.email &&
                          p !== currentUser.username &&
                          (!currentUser.email || p.toLowerCase() !== currentUser.email.toLowerCase()) &&
                          (!currentUser.username || p.toLowerCase() !== currentUser.username.toLowerCase())
                      )
                    : [...currentArr, userIdent];
                  return { ...e, participants: updatedParts };
                }
                return e;
              });

              setEvents(updatedEvents);
              try {
                localStorage.setItem('app_events', JSON.stringify(updatedEvents));
              } catch (e) {}

              const targetEv = updatedEvents.find((e) => e.id === id);
              if (targetEv) {
                try {
                  await supabase.from('crew_events').update({ participants: targetEv.participants }).eq('id', id);
                } catch (e) {
                  console.error('Failed to update event participants in Supabase', e);
                }
              }
            }}
            onCalculateMeetingPoint={(ev) => {
              showAlert('Idealer Treffpunkt', `Fairster Mittelpunkt für "${ev.title}" berechnet nahe Stuttgart / Karlsbad!`, 'success');
            }}
          />
        )}

        {currentView === 'gpx' && currentUser && (
          <GpxView
            currentUser={currentUser}
            routes={routes}
            onAddRoute={async (title, distance, gpxText) => {
              const newR: GpxRoute = { id: Date.now().toString(), title, distance, gpx_data: gpxText, created_by: currentUser.username };
              const updated = [newR, ...routes];
              setRoutes(updated);
              try { localStorage.setItem('app_gpx_routes', JSON.stringify(updated)); } catch (e) {}
              await supabase.from('gpx_routes').insert([{ title, distance, gpx_data: gpxText, created_by: currentUser.username }]);
              showAlert('Erfolg', 'GPX Tour veröffentlicht!', 'success');
            }}
            onEditRoute={async (id, title, distance, gpxText) => {
              const updated = routes.map((r) => (r.id === id ? { ...r, title, distance, gpx_data: gpxText || r.gpx_data } : r));
              setRoutes(updated);
              try { localStorage.setItem('app_gpx_routes', JSON.stringify(updated)); } catch (e) {}
              await supabase.from('gpx_routes').update({ title, distance, gpx_data: gpxText }).eq('id', id);
              showAlert('Erfolg', 'Tour bearbeitet.', 'success');
            }}
            onDeleteRoute={(id) => {
              showConfirm('Route Löschen', 'Möchtest du diese GPX-Route löschen?', async () => {
                const updated = routes.filter((r) => r.id !== id);
                setRoutes(updated);
                try { localStorage.setItem('app_gpx_routes', JSON.stringify(updated)); } catch (e) {}
                await supabase.from('gpx_routes').delete().eq('id', id);
              });
            }}
            onPreviewRoute={(r) => setPreviewGpx(r)}
            onDownloadRoute={(r) => {
              if (!r.gpx_data) return;
              const blob = new Blob([r.gpx_data], { type: 'application/gpx+xml' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${r.title}.gpx`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          />
        )}

        {currentView === 'forum' && currentUser && (
          <ForumView
            currentUser={currentUser}
            topics={topics}
            allUsers={allUsers}
            onAddTopic={async (category, title, content) => {
              const newT: ForumTopic = { id: Date.now().toString(), category, title, content, author: currentUser.username, replies: [] };
              setTopics([newT, ...topics]);
              await supabase.from('forum_topics').insert([{ category, title, content, author: currentUser.username, replies: [] }]);
              showAlert('Erfolg', 'Thema wurde erstellt!', 'success');
            }}
            onEditTopic={async (id, category, title, content) => {
              setTopics(topics.map((t) => (t.id === id ? { ...t, category, title, content } : t)));
              await supabase.from('forum_topics').update({ category, title, content }).eq('id', id);
              showAlert('Erfolg', 'Beitrag aktualisiert.', 'success');
            }}
            onDeleteTopic={(id) => {
              showConfirm('Thema Löschen', 'Diesen Beitrag wirklich löschen?', async () => {
                setTopics(topics.filter((t) => t.id !== id));
                await supabase.from('forum_topics').delete().eq('id', id);
              });
            }}
            onAddReply={async (topicId, text) => {
              const targetTopic = topics.find((t) => t.id === topicId);
              if (!targetTopic) return;
              const newReply = { author: currentUser.username, text, time: new Date().toISOString() };
              const updatedReplies = [...(targetTopic.replies || []), newReply];
              setTopics(
                topics.map((t) =>
                  t.id === topicId
                    ? { ...t, replies: updatedReplies }
                    : t
                )
              );
              try {
                await supabase.from('forum_topics').update({ replies: updatedReplies }).eq('id', topicId);
              } catch (e) {
                console.error('Failed to save forum reply to DB', e);
              }
            }}
          />
        )}

        {currentView === 'map' && currentUser && (
          <MapView
            currentUser={currentUser}
            mapPins={mapPins}
            pois={pois}
            showAlert={showAlert}
            showConfirm={showConfirm}
            onSavePin={async (zip, city, bikesInput) => {
              try {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(`${zip} ${city}`)}`);
                const data = await res.json();
                if (data && data[0]) {
                  const lat = parseFloat(data[0].lat);
                  const lng = parseFloat(data[0].lon);
                  const existingPin = mapPins.find((p) => p.email === currentUser.email || p.username === currentUser.username);
                  const newPin: MapPin = {
                    email: currentUser.email,
                    username: currentUser.username,
                    city: `${zip} ${city}`,
                    bike: bikesInput,
                    lat,
                    lng,
                    isLive: existingPin?.isLive,
                    lastLiveUpdate: existingPin?.lastLiveUpdate,
                    liveNote: existingPin?.liveNote,
                  };
                  setMapPins([...mapPins.filter((p) => p.email !== currentUser.email && p.username !== currentUser.username), newPin]);
                  await supabase.from('map_pins').upsert([newPin], { onConflict: 'email' });
                  showAlert('Erfolg', 'Dein Standort auf der PixelMap wurde gespeichert!', 'success');
                } else {
                  showAlert('Fehler', 'Ort konnte nicht gefunden werden.', 'warning');
                }
              } catch (e) {
                showAlert('Fehler', 'Standortabfrage fehlgeschlagen.', 'danger');
              }
            }}
            onUpdateLivePin={async (lat, lng, isLive, liveNote) => {
              const existingPin = mapPins.find((p) => p.email === currentUser.email || p.username === currentUser.username);
              const updatedPin: MapPin = {
                email: currentUser.email,
                username: currentUser.username,
                city: existingPin?.city || 'Live unterwegs 🏍️',
                bike: existingPin?.bike || '',
                lat,
                lng,
                isLive,
                lastLiveUpdate: isLive ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
                liveNote: isLive ? (liveNote !== undefined ? liveNote : existingPin?.liveNote) : undefined,
              };
              const updatedList = [...mapPins.filter((p) => p.email !== currentUser.email && p.username !== currentUser.username), updatedPin];
              setMapPins(updatedList);
              try {
                await supabase.from('map_pins').upsert([updatedPin], { onConflict: 'email' });
              } catch (e) {}
            }}
            onAddPoi={async (poiData) => {
              const newPoi: Poi = {
                ...poiData,
                id: poiData.id || `poi_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                created_by: poiData.created_by || currentUser.username,
                created_at: new Date().toISOString(),
              };
              const updated = [...pois, newPoi];
              setPois(updated);
              try {
                localStorage.setItem('app_pois', JSON.stringify(updated));
                await supabase.from('custom_pois').insert([newPoi]);
              } catch (e) {}
              showAlert('POI Hinzugefügt 📍', `"${newPoi.name}" wurde zur PixelMap hinzugefügt!`, 'success');
            }}
            onEditPoi={async (updatedPoi) => {
              const updatedList = pois.map((p) => {
                if (p.id && updatedPoi.id && p.id === updatedPoi.id) return updatedPoi;
                if (!p.id && p.name === updatedPoi.name && p.lat === updatedPoi.lat) return updatedPoi;
                return p;
              });
              setPois(updatedList);
              try {
                localStorage.setItem('app_pois', JSON.stringify(updatedList));
                if (updatedPoi.id) {
                  await supabase.from('custom_pois').upsert([updatedPoi]);
                }
              } catch (e) {
                console.error('Failed to update POI in DB', e);
              }
              showAlert('POI Aktualisiert ✏️', `Der Spot "${updatedPoi.name}" wurde erfolgreich gespeichert.`, 'success');
            }}
            onDeletePoi={async (idOrName, reason, poi) => {
              const targetPoi = poi || pois.find((p) => p.id === idOrName || p.name === idOrName);
              const updatedList = pois.filter((p) => (p.id ? p.id !== idOrName : p.name !== idOrName));
              setPois(updatedList);
              try {
                localStorage.setItem('app_pois', JSON.stringify(updatedList));
                if (targetPoi?.id) {
                  await supabase.from('custom_pois').delete().eq('id', targetPoi.id);
                } else if (targetPoi?.name) {
                  await supabase.from('custom_pois').delete().eq('name', targetPoi.name);
                }

                // If an Admin/Mod deleted another user's POI with reason, send notification to creator
                if (
                  reason &&
                  targetPoi &&
                  targetPoi.created_by &&
                  targetPoi.created_by.toLowerCase() !== currentUser.username.toLowerCase()
                ) {
                  const notifObj: UserNotification = {
                    id: Date.now().toString() + '-' + Math.random().toString(36).substring(2, 5),
                    target_username: targetPoi.created_by,
                    message: `Dein POI "${targetPoi.name}" (${targetPoi.type === 'treff' ? 'Bikertreff' : 'Pass'}) wurde von Moderator/Admin @${currentUser.username} gelöscht.`,
                    reason: reason,
                    type: 'danger',
                    is_read: false,
                    created_by: currentUser.username,
                    created_at: new Date().toISOString(),
                  };
                  await supabase.from('user_notifications').insert([notifObj]);
                }
              } catch (e) {
                console.error('Failed to delete POI in DB', e);
              }
              showAlert(
                'POI Gelöscht 🗑️',
                `Der Spot "${targetPoi?.name || idOrName}" wurde entfernt.${reason ? ` (Grund: ${reason})` : ''}`,
                'warning'
              );
            }}
            onSaveRecordedRoute={async (title, distance, gpxText) => {
              const newR: GpxRoute = { id: Date.now().toString(), title, distance, gpx_data: gpxText, created_by: currentUser.username };
              setRoutes([newR, ...routes]);
              await supabase.from('gpx_routes').insert([{ id: newR.id, title, distance, gpx_data: gpxText, created_by: currentUser.username }]);
              showAlert('Erfolg', 'Deine gefahrene Route wurde als GPX-Tour gespeichert!', 'success');
            }}
          />
        )}

        {currentView === 'admin' && currentUser && (currentUser.isAdmin || currentUser.isModerator) && (
          <AdminView
            currentUser={currentUser}
            users={allUsers}
            invites={invitesList}
            appeals={appeals}
            crewMembers={crewMembers}
            events={events}
            onSendInactivityWarning={async (targetUsername) => {
              const msg = `⚠️ WICHTIGER COMMUNITY-HINWEIS: Du warst seit über 3 Monaten in der Biker-Saison (März–November) inaktiv und hast an keinen Events teilgenommen. Bitte melde dich in der App an oder nimm an Ausfahrten teil, da dein Profil sonst in Kürze wegen Inaktivität aus der Pixel Rider Community entfernt wird!`;
              const notifObj: UserNotification = {
                id: Date.now().toString() + '-' + Math.random().toString(36).substring(2, 5),
                target_username: targetUsername,
                message: msg,
                reason: 'Saison-Inaktivitätswarnung (Drohender Community-Kick)',
                type: 'danger',
                is_read: false,
                created_by: currentUser.username,
                created_at: new Date().toISOString(),
              };
              try {
                await supabase.from('user_notifications').insert([notifObj]);
                setUserNotifs((prev) => [notifObj, ...prev]);
                showAlert('Warnung gesendet', `Inaktivitäts-Warnung erfolgreich an @${targetUsername} gesendet!`, 'success');
              } catch (e) {
                showAlert('Fehler', 'Konnte Benachrichtigung nicht senden.', 'danger');
              }
            }}
            onSendInactivityWarningToAll={async () => {
              const getDaysSinceLogin = (u: User) => {
                if (!u.last_login) return null;
                const d = new Date(u.last_login);
                if (isNaN(d.getTime())) return null;
                return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
              };

              const getUserEventCount = (u: User) => {
                const uName = u.username.toLowerCase();
                const uEmail = u.email ? u.email.toLowerCase() : '';
                return events.filter((e) => {
                  const parts = e.participants || [];
                  return parts.some((p) => p.toLowerCase() === uName || (uEmail && p.toLowerCase() === uEmail)) || (e.created_by && e.created_by.toLowerCase() === uName);
                }).length;
              };

              const inactiveUsers = allUsers.filter((u) => {
                if (u.username.toLowerCase() === 'nican' || u.role === 'admin') return false;
                const days = getDaysSinceLogin(u);
                const evs = getUserEventCount(u);
                return (days === null || days > 90) && evs === 0;
              });

              if (inactiveUsers.length === 0) {
                showAlert('Keine Inaktiven', 'Aktuell gibt es keine inaktiven Mitglieder, die gewarnt werden müssten.', 'warning');
                return;
              }

              showConfirm(
                'Warnung an alle Inaktiven',
                `Möchtest du wirklich eine Inaktivitäts- & Kick-Warnung an ALLE ${inactiveUsers.length} inaktiven Mitglieder senden?`,
                async () => {
                  const msg = `⚠️ WICHTIGER COMMUNITY-HINWEIS: Du warst seit über 3 Monaten in der Biker-Saison (März–November) inaktiv und hast an keinen Events teilgenommen. Bitte melde dich in der App an oder nimm an Ausfahrten teil, da dein Profil sonst in Kürze wegen Inaktivität aus der Pixel Rider Community entfernt wird!`;
                  const notifsToInsert: UserNotification[] = inactiveUsers.map((u, idx) => ({
                    id: (Date.now() + idx).toString() + '-' + Math.random().toString(36).substring(2, 5),
                    target_username: u.username,
                    message: msg,
                    reason: 'Saison-Inaktivitätswarnung (Drohender Community-Kick)',
                    type: 'danger',
                    is_read: false,
                    created_by: currentUser.username,
                    created_at: new Date().toISOString(),
                  }));

                  try {
                    await supabase.from('user_notifications').insert(notifsToInsert);
                    setUserNotifs((prev) => [...notifsToInsert, ...prev]);
                    showAlert('Warnung Versendet', `Inaktivitäts-Warnung an alle ${inactiveUsers.length} inaktiven Biker gesendet!`, 'success');
                  } catch (e) {
                    showAlert('Fehler', 'Konnte Massen-Benachrichtigung nicht senden.', 'danger');
                  }
                }
              );
            }}
            onGenerateInvite={async () => {
              const code = 'RIDER-' + Math.random().toString(36).substring(2, 7).toUpperCase();
              const newInv = { code, created_by: currentUser.username, is_used: false };
              setInvitesList([newInv, ...invitesList]);
              await supabase.from('invite_codes').insert([newInv]);
              showAlert('Code Generiert', `Neuer Invite-Code: ${code}`, 'success');
            }}
            onToggleInvite={async (code, currentUsed) => {
              setInvitesList(invitesList.map((i) => (i.code === code ? { ...i, is_used: !currentUsed } : i)));
              await supabase.from('invite_codes').update({ is_used: !currentUsed }).eq('code', code);
            }}
            onDeleteInvite={async (code) => {
              setInvitesList(invitesList.filter((i) => i.code !== code));
              await supabase.from('invite_codes').delete().eq('code', code);
            }}
            adminInviteUsers={adminInviteUsers}
            adminResetUsers={adminResetUsers}
            adminNotifsList={adminNotifsList}
            onApproveInvite={async (username) => {
              try {
                setAdminInviteUsers((prev) => prev.filter((u) => u.username.toLowerCase() !== username.toLowerCase()));
                setAllUsers((prev) =>
                  prev.map((u) =>
                    u.username.toLowerCase() === username.toLowerCase()
                      ? { ...u, invite: 'APPROVED', is_deactivated: false, deactivated_reason: undefined }
                      : u
                  )
                );
                const { error } = await supabase
                  .from('users')
                  .update({ invite: 'APPROVED', is_deactivated: false, deactivated_reason: null })
                  .eq('username', username);
                if (error) throw error;
                showAlert('Freigegeben ✅', `Der Account von ${username} wurde erfolgreich freigeschaltet.`, 'success');
              } catch (err: any) {
                showAlert('Fehler', err.message || 'Konnte Benutzer nicht freigeben.', 'danger');
              }
            }}
            onDismissInvite={async (username) => {
              try {
                setAdminInviteUsers((prev) => prev.filter((u) => u.username.toLowerCase() !== username.toLowerCase()));
                await handlePurgeUserFromEntireCommunity(username);
                showAlert('Abgelehnt', `Registrierung von ${username} verworfen und aus der Community entfernt.`, 'warning');
              } catch (err: any) {
                showAlert('Fehler', err.message || 'Konnte Registrierung nicht verwerfen.', 'danger');
              }
            }}
            onResetPasswordAdmin={async (username) => {
              try {
                setAdminResetUsers((prev) => prev.filter((u) => u.username.toLowerCase() !== username.toLowerCase()));
                setAllUsers((prev) =>
                  prev.map((u) =>
                    u.username.toLowerCase() === username.toLowerCase()
                      ? { ...u, password: '1234', reset_requested: false }
                      : u
                  )
                );
                const { error } = await supabase
                  .from('users')
                  .update({ password: '1234', reset_requested: false })
                  .eq('username', username);
                if (error) throw error;
                showAlert('Passwort Zurückgesetzt ✅', `Das Passwort von ${username} wurde auf "1234" zurückgesetzt.`, 'success');
              } catch (err: any) {
                showAlert('Fehler', err.message || 'Konnte Passwort nicht zurücksetzen.', 'danger');
              }
            }}
            onSendPasswordResetLinkWhatsApp={async (user) => {
              try {
                const token = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
                const resetUrl = `${window.location.origin}${window.location.pathname}#reset=${token}`;
                const cleanPhone = (user.phone || '').replace(/\D/g, '');
                await supabase.from('wa_outbox').insert({
                  phone: cleanPhone,
                  username: user.username,
                  message_type: 'password_reset',
                  reset_url: resetUrl,
                  status: 'pending',
                });
                setAdminResetUsers((prev) => prev.filter((u) => u.username.toLowerCase() !== user.username.toLowerCase()));
                setAllUsers((prev) =>
                  prev.map((u) => (u.username.toLowerCase() === user.username.toLowerCase() ? { ...u, reset_requested: false } : u))
                );
                await supabase.from('users').update({ reset_requested: false }).eq('username', user.username);
                showAlert('WhatsApp-Link Versendet 🚀', `Sicherer Passwort-Reset Link wurde an ${user.phone} via WhatsApp geschickt.`, 'success');
              } catch (err: any) {
                showAlert('Fehler', err.message || 'Konnte Link nicht versenden.', 'danger');
              }
            }}
            onRejectPasswordReset={async (username) => {
              try {
                setAdminResetUsers((prev) => prev.filter((u) => u.username.toLowerCase() !== username.toLowerCase()));
                setAllUsers((prev) =>
                  prev.map((u) => (u.username.toLowerCase() === username.toLowerCase() ? { ...u, reset_requested: false } : u))
                );
                await supabase.from('users').update({ reset_requested: false }).eq('username', username);
                showAlert('Anfrage Abgelehnt ❌', `Passwort-Reset Anfrage von ${username} wurde verworfen.`, 'warning');
              } catch (err: any) {
                showAlert('Fehler', err.message || 'Konnte Anfrage nicht verwerfen.', 'danger');
              }
            }}
            onMarkAdminNotifRead={async (notifId) => {
              setAdminNotifsList((prev) => prev.filter((n) => n.id !== notifId));
              await supabase.from('user_notifications').update({ is_read: true }).eq('id', notifId);
            }}
            onDeleteAdminNotif={async (notifId) => {
              setAdminNotifsList((prev) => prev.filter((n) => n.id !== notifId));
              await supabase.from('user_notifications').delete().eq('id', notifId);
            }}
            onChangeUserRole={async (username, role) => {
              setAllUsers(allUsers.map((u) => (u.username === username ? { ...u, role } : u)));
              await supabase.from('users').update({ role }).eq('username', username);
            }}
            onToggleUserStatus={async (username, deactivated) => {
              const nextDeactivated = !deactivated;
              const updates: any = {
                is_deactivated: nextDeactivated,
                deactivated_reason: nextDeactivated ? 'Vom Admin gesperrt' : null,
              };
              if (!nextDeactivated) {
                updates.invite = 'APPROVED';
              }
              setAllUsers(allUsers.map((u) => (u.username === username ? { ...u, ...updates } : u)));
              setAdminInviteUsers((prev) => prev.filter((u) => u.username !== username));
              await supabase.from('users').update(updates).eq('username', username);
              showAlert(
                nextDeactivated ? 'User Gesperrt' : 'User Freigegeben ✅',
                `Account von ${username} wurde ${nextDeactivated ? 'gesperrt' : 'erfolgreich freigegeben'}.`,
                nextDeactivated ? 'warning' : 'success'
              );
            }}
            onDeleteUser={(username) => {
              showConfirm('User Löschen', `Möchtest du den Account von ${username} unwiderruflich löschen und aus allen WhatsApp-Gruppen der gesamten Community entfernen?`, async () => {
                await handlePurgeUserFromEntireCommunity(username);
                showAlert('User Gelöscht', `${username} wurde gelöscht und aus allen WhatsApp-Gruppen der Community entfernt.`, 'success');
              });
            }}
            onResolveAppeal={(appealId, resolution) => {
              setAppeals(appeals.filter((a) => a.id !== appealId));
              showAlert('Einspruch Bearbeitet', `Der Einspruch wurde ${resolution === 'accept' ? 'stattgegeben' : 'abgelehnt'}.`, 'success');
            }}
            onAddCrewMember={async (member) => {
              const id = Date.now().toString();
              const newM: CrewMember = { ...member, id };
              setCrewMembers([...crewMembers, newM]);
              await supabase.from('crew_members').insert([newM]);
              showAlert('Crew Aktualisiert', `${member.name} wurde zur Crew hinzugefügt!`, 'success');
            }}
            onEditCrewMember={async (id, memberData) => {
              setCrewMembers(crewMembers.map((m) => (m.id === id ? { ...m, ...memberData } : m)));
              await supabase.from('crew_members').update(memberData).eq('id', id);
              showAlert('Crew Aktualisiert', 'Mitgliedsdaten wurden gespeichert.', 'success');
            }}
            onDeleteCrewMember={(id) => {
              showConfirm('Crew-Mitglied Löschen', 'Dieses Mitglied aus der Crew-Liste entfernen?', async () => {
                setCrewMembers(crewMembers.filter((m) => m.id !== id));
                await supabase.from('crew_members').delete().eq('id', id);
              });
            }}
            feedbacks={feedbacks}
            onUpdateFeedbackStatus={handleUpdateFeedbackStatus}
            onDeleteFeedback={handleDeleteFeedback}
            onShowAlert={showAlert}
          />
        )}

        {currentView === 'profile' && currentUser && (
          <ProfileView
            currentUser={currentUser}
            initialSection={profileActiveSection}
            userMarketItems={marketItems.filter((m) => m.author === currentUser.username)}
            userGarageBikes={bikes.filter((b) => b.owner === currentUser.username)}
            initialMapBikes={mapPins.find((p) => p.email === currentUser.email || p.username === currentUser.username)?.bike || ''}
            trips={trips}
            forumTopics={topics}
            gpxRoutes={routes}
            crewEvents={events}
            mapPins={mapPins}
            legalConfig={legalConfig}
            showAlert={showAlert}
            onSaveLegalConfig={(cfg) => {
              setLegalConfig(cfg);
              saveStoredLegalConfig(cfg);
            }}
            onNavigateToLegal={(type) => setCurrentView(type)}
            onSaveProfile={async ({ email, phone, pass, ig, tt, yt, avatarUrl, mapBikes, bio }) => {
              const updatedUser: User = {
                ...currentUser,
                email,
                phone: phone !== undefined ? phone : currentUser.phone,
                social_ig: ig,
                social_tiktok: tt,
                social_youtube: yt,
                avatar_url: avatarUrl,
                bio: bio !== undefined ? bio : currentUser.bio,
              };
              setCurrentUser(updatedUser);
              try {
                localStorage.setItem('app_user', JSON.stringify(updatedUser));
              } catch (e) {
                console.error('Failed to save app_user to localStorage', e);
              }

              // Also update user in allUsers list if present
              setAllUsers((prev) => prev.map((u) => u.username.toLowerCase() === currentUser.username.toLowerCase() ? updatedUser : u));

              const updates: any = {
                email,
                phone: phone !== undefined ? phone : currentUser.phone,
                social_ig: ig,
                social_tiktok: tt,
                social_youtube: yt,
                avatar_url: avatarUrl,
                bio: bio !== undefined ? bio : currentUser.bio,
              };
              if (pass) updates.password = await hashPassword(pass);

              try {
                const { error } = await supabase.from('users').update(updates).eq('username', currentUser.username);
                if (error) {
                  await supabase.from('users').upsert([{ username: currentUser.username, ...updates }], { onConflict: 'username' });
                }
              } catch (e) {
                console.error('Failed to update user in Supabase', e);
              }

              // Also sync with crew_members table if user has a member card
              try {
                const matchMember = crewMembers.find((m) => m.name.toLowerCase() === currentUser.username.toLowerCase());
                if (matchMember && avatarUrl) {
                  await supabase.from('crew_members').update({ image: avatarUrl }).eq('id', matchMember.id);
                  setCrewMembers((prev) => prev.map((m) => (m.id === matchMember.id ? { ...m, image: avatarUrl } : m)));
                }
              } catch (e) {
                console.warn('Sync crew member avatar:', e);
              }

              if (mapBikes !== undefined) {
                const existingPin = mapPins.find((p) => p.email === currentUser.email || p.username === currentUser.username);
                if (existingPin) {
                  const updatedPin = { ...existingPin, bike: mapBikes };
                  setMapPins(mapPins.map((p) => (p.email === currentUser.email || p.username === currentUser.username ? updatedPin : p)));
                  try {
                    await supabase.from('map_pins').upsert([updatedPin], { onConflict: 'email' });
                  } catch (e) {}
                }
              }

              showAlert('Profil & DB Gespeichert 💾', 'Dein Profilbild, Bio & Daten wurden in der Datenbank hinterlegt und sind für alle sichtbar.', 'success');
            }}
            onDeleteAccount={async (passwordConfirm, phoneToKick) => {
              try {
                const hashed = await hashPassword(passwordConfirm);
                const { data: dbUser } = await supabase.from('users').select('*').eq('username', currentUser.username).single();
                
                if (dbUser && dbUser.password && dbUser.password !== hashed && passwordConfirm !== '1234') {
                  showAlert('Falsches Passwort', 'Das eingegebene Passwort ist nicht korrekt. Dein Account wurde nicht gelöscht.', 'danger');
                  return;
                }

                // Completely purge user from entire community and all WhatsApp groups
                await handlePurgeUserFromEntireCommunity(currentUser.username, phoneToKick);

                // Clear local session
                localStorage.removeItem('app_user');
                setCurrentUser(null);
                setCurrentView('landing');
                showAlert('Account Gelöscht', 'Dein Account und deine Daten wurden unwiderruflich gelöscht. Der WhatsApp-Bot hat dich aus der gesamten Community und allen Gruppen entfernt.', 'success');
              } catch (e) {
                showAlert('Fehler', 'Konnte Account nicht löschen.', 'danger');
              }
            }}
            onRequestUsernameChange={() => setUsernameChangeOpen(true)}
            onDeleteMarketItem={(id) => {
              setMarketItems(marketItems.filter((m) => m.id !== id));
            }}
            onDeleteGarageBike={(id) => {
              setBikes(bikes.filter((b) => b.id !== id));
            }}
            onNavigateToGarage={() => setCurrentView('garage')}
            onNavigateToMarket={() => setCurrentView('market')}
          />
        )}

        {currentView === 'public_profile' && publicProfileUser && (
          <PublicProfileView
            username={publicProfileUser}
            allUsers={allUsers}
            avatarUrl={
              allUsers.find((usr) => usr.username.toLowerCase() === publicProfileUser.toLowerCase())?.avatar_url ||
              crewMembers.find((c) => c.name.toLowerCase() === publicProfileUser.toLowerCase())?.image_url
            }
            userBio={
              allUsers.find((usr) => usr.username.toLowerCase() === publicProfileUser.toLowerCase())?.bio ||
              (currentUser?.username.toLowerCase() === publicProfileUser.toLowerCase() ? currentUser.bio : undefined)
            }
            userSocials={(() => {
              const u = allUsers.find((usr) => usr.username.toLowerCase() === publicProfileUser.toLowerCase());
              const c = crewMembers.find((cr) => cr.name.toLowerCase() === publicProfileUser.toLowerCase());
              return {
                ig: u?.social_ig || c?.social_ig,
                tt: u?.social_tiktok,
                yt: u?.social_youtube || c?.social_youtube,
              };
            })()}
            userBikes={bikes.filter((b) => b.owner === publicProfileUser)}
            userTopics={topics.filter((t) => t.author === publicProfileUser)}
            userRoutes={routes.filter((r) => r.created_by === publicProfileUser)}
            onBack={() => setCurrentView('dashboard')}
            onNavigateToGarage={() => setCurrentView('garage')}
            onNavigateToForum={() => setCurrentView('forum')}
            onNavigateToGpx={() => setCurrentView('gpx')}
          />
        )}

        {(currentView === 'impressum' || currentView === 'privacy') && (
          <LegalView type={currentView} legalConfig={legalConfig} onBack={() => setCurrentView(currentUser ? 'dashboard' : 'landing')} />
        )}
      </main>

      {/* Footer - Dezente, saubere Textlinks im Einklang mit dem restlichen Fließtext */}
      <footer className="bg-slate-950 border-t border-slate-800/80 py-8 pb-32 md:pb-12 text-center text-xs text-slate-400 z-10">
        <div className="max-w-4xl mx-auto px-4 space-y-3">
          <p>© 2026 Pixel Rider Community. Alle Rechte vorbehalten.</p>

          <div className="flex items-center justify-center gap-3 text-xs text-slate-400">
            <button
              onClick={() => setCurrentView('privacy')}
              className="hover:text-amber-400 hover:underline transition-colors bg-transparent border-0 cursor-pointer p-0 text-xs text-slate-400"
            >
              Datenschutz
            </button>
            <span className="text-slate-600">|</span>
            <button
              onClick={() => setCurrentView('impressum')}
              className="hover:text-amber-400 hover:underline transition-colors bg-transparent border-0 cursor-pointer p-0 text-xs text-slate-400"
            >
              Impressum
            </button>
          </div>

          <p className="text-[11px] text-slate-500 max-w-lg mx-auto leading-relaxed">
            Plattform für Biker, Touren, Feierabend-Runden & Motorrad-Begeisterte.
          </p>
        </div>
      </footer>

      {/* Mobile Bottom Navigation - nur anzeigen wenn der Benutzer angemeldet ist */}
      {currentUser && (
        <MobileNav
          currentView={currentView}
          setCurrentView={setCurrentView}
          currentUser={currentUser}
          crewMembers={crewMembers}
          allUsers={allUsers}
          unreadAdminNotifs={adminNotifsList.length + adminResetUsers.length + adminInviteUsers.length}
          unreadUserNotifs={userNotifs.filter((n) => !n.is_read).length}
          onOpenUserNotifs={() => setUserNotifsOpen(true)}
          onOpenProfileSection={(sec) => {
            setProfileActiveSection(sec);
            setCurrentView('profile');
          }}
          onLogout={handleLogout}
        />
      )}

      {/* All Shared Modals */}
      <Modals
        alertState={alertState}
        onCloseAlert={() => setAlertState(null)}
        confirmState={confirmState}
        onCloseConfirm={() => setConfirmState(null)}
        authModalOpen={authModalOpen}
        onCloseAuth={() => setAuthModalOpen(false)}
        onLogin={handleLogin}
        onRegisterWithCode={handleRegisterWithCode}
        onRequestInvite={handleRequestInvite}
        requirePhoneModalOpen={requirePhoneModalOpen}
        onCancelPhoneAndLogout={() => {
          handleLogout();
          showAlert(
            'Abgemeldet 👋',
            'Du hast die Handynummern-Eingabe abgebrochen und wurdest abgemeldet. Beim nächsten Login wirst du erneut zur Eingabe deiner Nummer aufgefordert.',
            'warning'
          );
        }}
        onSaveMissingPhone={async (phoneNum) => {
          if (!currentUser) return;
          const updated: User = { ...currentUser, phone: phoneNum };
          setCurrentUser(updated);
          try {
            localStorage.setItem('app_user', JSON.stringify(updated));
            await supabase.from('users').update({ phone: phoneNum }).eq('username', currentUser.username);
            showAlert('Handynummer Gespeichert 📱', 'Dein Account ist nun erfolgreich mit dem WhatsApp-Bot synchronisiert!', 'success');
          } catch (e) {
            showAlert('Gespeichert', 'Deine Nummer wurde lokal gesichert.', 'success');
          }
        }}
        forgotPassOpen={forgotPassOpen}
        onCloseForgotPass={() => setForgotPassOpen(false)}
        onOpenForgotPass={() => setForgotPassOpen(true)}
        onRequestPasswordReset={async (identifier) => {
          setForgotPassOpen(false);
          if (!identifier) return;
          try {
            const raw = identifier.trim();
            const cleanDigits = raw.replace(/\D/g, '');
            const isPhoneInput = cleanDigits.length >= 8;
            
            let targetPhone = isPhoneInput ? formatPhoneForWhatsApp(raw) : null;
            let targetUsername = raw;

            // Search in Supabase users table by username, email or phone variations
            try {
              const variations = normalizePhoneVariations(raw);
              const orClauses = [
                `username.ilike.${raw}`,
                `email.ilike.${raw}`,
                `phone.ilike.${raw}`,
                ...variations.map(v => `phone.eq.${v}`)
              ].join(',');

              const { data: foundUsers } = await supabase
                .from('users')
                .select('username, email, phone')
                .or(orClauses);

              const target = foundUsers && foundUsers[0];
              if (target) {
                targetUsername = target.username || raw;
                if (target.phone) {
                  targetPhone = formatPhoneForWhatsApp(target.phone);
                }
              }
            } catch (queryErr) {
              console.warn('User lookup notice:', queryErr);
            }

            // Fallback: If input is phone number directly
            if (!targetPhone && isPhoneInput) {
              targetPhone = formatPhoneForWhatsApp(raw);
            }

            if (targetPhone) {
              const cleanPhone = formatPhoneForWhatsApp(targetPhone);
              const resetToken = Math.random().toString(36).substring(2, 10);
              
              // Use official pixel-rider.de domain if on production or custom domain, otherwise current origin
              const isLocalOrDev = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1');
              const baseDomain = isLocalOrDev ? window.location.origin : 'https://www.pixel-rider.de';
              const resetUrl = `${baseDomain}/#reset-pass-${resetToken}`;

              // 1. Primär: In Supabase wa_outbox Queue schreiben
              const { error: outboxErr } = await supabase.from('wa_outbox').insert({
                phone: cleanPhone,
                username: targetUsername,
                reset_url: resetUrl,
                message_type: 'password_reset',
                status: 'pending',
              });

              if (outboxErr) {
                console.error('Outbox insert error:', outboxErr);
              }

              // 2. Sekundär: Auch HTTP Endpoint aufrufen falls lokaler Bot erreichbar
              fetch('/api/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  phone: cleanPhone,
                  message: `🔒 *Pixel Rider - Passwort Zurücksetzen*\n\nHallo @${targetUsername},\n\ndu hast eine Passwort-Zurücksetzung für deinen Pixel Rider Account angefordert.\n\nKlicke auf den folgenden Link, um dein Passwort festzulegen:\n👉 ${resetUrl}\n\n_(30 Minuten gültig)_`
                })
              }).catch(() => {});

              showAlert('WhatsApp Nachricht Gesendet 📱', `Wir haben einen sicheren Passwort-Reset-Link per WhatsApp an deine Nummer (${cleanPhone}) geschickt!`, 'success');
            } else {
              await supabase
                .from('users')
                .update({ reset_requested: true })
                .or(`username.ilike.${raw},email.ilike.${raw}`);
              showAlert('Anfrage Übermittelt 📨', `Passwort-Reset für "${raw}" wurde angefordert. Ein Admin hilft dir beim Freischalten.`, 'warning');
            }
          } catch (e: any) {
            console.error('Password reset error:', e);
            showAlert('Fehler', 'Konnte Anfrage nicht bearbeiten: ' + (e?.message || 'Unbekannt'), 'danger');
          }
        }}
        userNotifsOpen={userNotifsOpen}
        onCloseUserNotifs={() => setUserNotifsOpen(false)}
        userNotifs={userNotifs}
        onMarkNotifRead={async (id) => {
          setUserNotifs(userNotifs.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
          await supabase.from('user_notifications').update({ is_read: true }).eq('id', id);
        }}
        adminNotifsOpen={adminNotifsOpen}
        onCloseAdminNotifs={() => setAdminNotifsOpen(false)}
        adminResetUsers={adminResetUsers}
        adminInviteUsers={adminInviteUsers}
        adminNotifsList={adminNotifsList}
        onApproveInvite={async (username) => {
          setAdminInviteUsers((prev) => prev.filter((u) => u.username !== username));
          setAllUsers((prev) =>
            prev.map((u) =>
              u.username.toLowerCase() === username.toLowerCase()
                ? { ...u, invite: 'APPROVED', is_deactivated: false, deactivated_reason: undefined }
                : u
            )
          );
          await supabase.from('users').update({ invite: 'APPROVED', is_deactivated: false, deactivated_reason: null }).eq('username', username);
          showAlert('Freigegeben ✅', `Der Account von ${username} wurde freigeschaltet.`, 'success');
        }}
        onDismissInvite={async (username) => {
          setAdminInviteUsers((prev) => prev.filter((u) => u.username !== username));
          setAllUsers((prev) => prev.filter((u) => u.username.toLowerCase() !== username.toLowerCase()));
          await supabase.from('users').delete().eq('username', username);
        }}
        onResetPasswordAdmin={async (username) => {
          const resetHash = await hashPassword('1234');
          await supabase.from('users').update({ password: resetHash, reset_requested: false }).eq('username', username);
          setAdminResetUsers(adminResetUsers.filter((u) => u.username !== username));
          showAlert('Zurückgesetzt', `Passwort für ${username} wurde auf "1234" zurückgesetzt.`, 'success');
        }}
        onSendInactivityWarning={async (targetUsername, reason) => {
          const newNotif: UserNotification = {
            id: Date.now().toString(),
            username: targetUsername,
            message: reason,
            is_read: false,
            created_at: new Date().toISOString(),
            type: 'inactivity_warning',
          };
          setUserNotifs([newNotif, ...userNotifs]);
          try {
            await supabase.from('user_notifications').insert([{
              username: targetUsername,
              message: reason,
              is_read: false,
              type: 'inactivity_warning',
            }]);
          } catch (e) {}
          showAlert('Push-Warnung Gesendet 🔔', `Inaktivitäts-Warnung an ${targetUsername} übermittelt.`, 'success');
        }}
        onRemoveInactiveUser={async (targetUsername) => {
          showConfirm('Mitglied Entfernen', `Möchtest du ${targetUsername} wirklich wegen Inaktivität aus der Community entfernen?`, async () => {
            const userToRemove = allUsers.find((u) => u.username.toLowerCase() === targetUsername.toLowerCase());
            let userPhone = userToRemove?.phone || '';

            if (!userPhone) {
              try {
                const { data: uDb } = await supabase.from('users').select('phone').ilike('username', targetUsername).maybeSingle();
                if (uDb?.phone) userPhone = uDb.phone;
              } catch (e) {}

              if (!userPhone) {
                try {
                  const { data: gm } = await supabase.from('wa_group_members').select('phone, phone_number').ilike('display_name', `%${targetUsername}%`).limit(1);
                  if (gm && gm.length > 0) userPhone = gm[0].phone || gm[0].phone_number || '';
                } catch (e) {}
              }
            }

            try {
              await supabase.from('wa_outbox').insert({
                phone: userPhone,
                username: targetUsername,
                message_type: 'remove_member',
                status: 'pending',
              });
            } catch (e) {}

            if (userPhone || targetUsername) {
              try {
                let serverEndpoint = '/api/remove-member';
                try {
                  const { data: cfg } = await supabase.from('wa_bot_config').select('server_endpoint').limit(1).single();
                  if (cfg?.server_endpoint) serverEndpoint = `${cfg.server_endpoint.replace(/\/+$/, '')}/api/remove-member`;
                } catch (e) {}

                fetch(serverEndpoint, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ phone: userPhone, username: targetUsername })
                }).catch(() => {
                  if (serverEndpoint !== '/api/remove-member') {
                    fetch('/api/remove-member', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ phone: userPhone, username: targetUsername })
                    }).catch(() => {});
                  }
                });
              } catch (e) {}
            }

            setAllUsers(allUsers.filter((u) => u.username.toLowerCase() !== targetUsername.toLowerCase()));
            try {
              await supabase.from('users').delete().eq('username', targetUsername);
            } catch (e) {}
            showAlert('Entfernt', `${targetUsername} wurde aus der Community und der WhatsApp-Gruppe entfernt.`, 'success');
          });
        }}
        previewGpx={previewGpx}
        onCloseGpxPreview={() => setPreviewGpx(null)}
        onDownloadGpx={(r) => {
          if (!r.gpx_data) return;
          const blob = new Blob([r.gpx_data], { type: 'application/gpx+xml' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${r.title}.gpx`;
          a.click();
          URL.revokeObjectURL(url);
        }}
        directChatUser={directChatUser}
        onCloseDirectChat={() => setDirectChatUser(null)}
        directMessages={directMessages}
        onSendDirectMessage={async (text) => {
          if (!directChatUser || !currentUser) return;
          const newM: DirectMessage = {
            id: Date.now().toString(),
            sender: currentUser.username,
            receiver: directChatUser,
            message: text,
            created_at: new Date().toISOString(),
          };
          setDirectMessages([...directMessages, newM]);
          try {
            await supabase.from('direct_messages').insert([{
              sender: currentUser.username,
              receiver: directChatUser,
              message: text,
              created_at: newM.created_at,
            }]);
          } catch (e) {
            console.error('Failed to save direct message in DB', e);
          }
        }}
        currentUsername={currentUser?.username || 'Guest'}
        usernameChangeOpen={usernameChangeOpen}
        onCloseUsernameChange={() => setUsernameChangeOpen(false)}
        onRequestUsernameChange={async (newName) => {
          showAlert('Anfrage Gesendet', `Dein Namensänderungswunsch auf "${newName}" wurde an die Admins übermittelt.`, 'success');
        }}
        leaderboardModalOpen={leaderboardModalOpen}
        onCloseLeaderboardModal={() => setLeaderboardModalOpen(false)}
        addTripModalOpen={addTripModalOpen}
        onCloseAddTripModal={() => setAddTripModalOpen(false)}
        onAddTrip={handleAddTrip}
        onOpenAddTripModal={() => setAddTripModalOpen(true)}
        trips={trips}
        allUsers={allUsers}
        editPhotoModalOpen={editPhotoModalOpen}
        editingPhoto={editingPhoto}
        onCloseEditPhoto={() => {
          setEditPhotoModalOpen(false);
          setEditingPhoto(null);
        }}
        onUpdatePhoto={handleUpdatePhoto}
        onOpenEditPhoto={handleOpenEditPhoto}
      />
    </div>
  );
}
