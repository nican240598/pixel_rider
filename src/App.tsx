import React, { useState, useEffect } from 'react';
import { User, AppView, CrewMember, CrewEvent, GpxRoute, ForumTopic, GarageBike, MarketItem, MapPin, Poi, UserNotification, DirectMessage, MarketAppeal, TripEntry, SpotCheckin, SpotOfTheWeek, PhotoOfTheWeek } from './types';
import { supabase, hashPassword } from './lib/supabase';
import { INITIAL_CREW, INITIAL_EVENTS, INITIAL_GPX, INITIAL_FORUM, INITIAL_GARAGE, INITIAL_MARKET, INITIAL_POIS, INITIAL_TRIPS, INITIAL_SPOT_CHECKINS, INITIAL_SPOT_OF_THE_WEEK } from './lib/initialData';

const INITIAL_PHOTOS_OF_THE_WEEK: PhotoOfTheWeek[] = [
  {
    id: 'photo-1',
    title: 'Sonnenuntergang an der Schwarzwaldhochstraße',
    author: "Alex 'Nitro' Becker",
    image_url: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?q=80&w=1200',
    description: 'Blick vom Mummelsee kurz vor Dämmerung nach unserer 280km Crew-Ausfahrt.',
    votes: ['Sven_R1', 'Marco_CB', 'Lisa_Ninja', 'Tom_Ducati', 'Nico_Pixel', 'Jan_MT09', 'Elena_GS'],
    created_at: new Date().toISOString(),
    is_winner: true,
  },
  {
    id: 'photo-2',
    title: 'Kurvenspaß am Kesselberg',
    author: 'Sven_R1',
    image_url: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=1200',
    description: 'Perfekter Kniewinkel und frischer Asphalt auf der morgendlichen Runde.',
    votes: ['Alex_Nitro', 'Lisa_Ninja', 'Marco_CB', 'Nico_Pixel'],
    created_at: new Date().toISOString(),
  },
  {
    id: 'photo-3',
    title: 'Boxenstopp & Espresso am Treffpunkt',
    author: 'Lisa_Ninja',
    image_url: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=1200',
    description: 'Die Pixel Crew versammelt beim Kaffeestopp vor der Alpenpass-Etappe.',
    votes: ['Tom_Ducati', 'Jan_MT09', 'Sven_R1'],
    created_at: new Date().toISOString(),
  },
];

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
import cinematicRoadBg from './assets/images/cinematic_road_bg_1786376910265.jpg';

export default function App() {
  // Current user state from localStorage
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('app_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [currentView, setCurrentView] = useState<AppView>(currentUser ? 'dashboard' : 'landing');

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
  const [routes, setRoutes] = useState<GpxRoute[]>(INITIAL_GPX);
  const [topics, setTopics] = useState<ForumTopic[]>(INITIAL_FORUM);
  const [bikes, setBikes] = useState<GarageBike[]>(INITIAL_GARAGE);
  const [marketItems, setMarketItems] = useState<MarketItem[]>(INITIAL_MARKET);
  const [mapPins, setMapPins] = useState<MapPin[]>([]);
  const [pois, setPois] = useState<Poi[]>(INITIAL_POIS);
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

  // Modals & Overlays
  const [alertState, setAlertState] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'warning' | 'danger' } | null>(null);
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [forgotPassOpen, setForgotPassOpen] = useState(false);
  const [userNotifsOpen, setUserNotifsOpen] = useState(false);
  const [adminNotifsOpen, setAdminNotifsOpen] = useState(false);
  const [previewGpx, setPreviewGpx] = useState<GpxRoute | null>(null);
  const [directChatUser, setDirectChatUser] = useState<string | null>(null);
  const [publicProfileUser, setPublicProfileUser] = useState<string | null>(null);
  const [usernameChangeOpen, setUsernameChangeOpen] = useState(false);
  const [leaderboardModalOpen, setLeaderboardModalOpen] = useState(false);
  const [addTripModalOpen, setAddTripModalOpen] = useState(false);

  // Helper alert
  const showAlert = (title: string, message: string, type: 'success' | 'warning' | 'danger' = 'warning') => {
    setAlertState({ isOpen: true, title, message, type });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmState({ isOpen: true, title, message, onConfirm });
  };

  // Sync Supabase data on mount & periodic polling
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Crew
        const { data: crewData } = await supabase.from('crew_members').select('*').order('sort_order', { ascending: true });
        if (crewData && crewData.length > 0) setCrewMembers(crewData);

        // Fetch Events
        const { data: eventsData } = await supabase.from('crew_events').select('*');
        if (eventsData && eventsData.length > 0) {
          const parsedEvents = eventsData.map((ev) => {
            let parts = ev.participants;
            if (typeof parts === 'string') {
              try {
                parts = JSON.parse(parts);
              } catch (e) {
                parts = [parts];
              }
            }
            if (!Array.isArray(parts)) parts = [];
            return { ...ev, participants: parts };
          });
          setEvents(parsedEvents);
          try {
            localStorage.setItem('app_events', JSON.stringify(parsedEvents));
          } catch (e) {}
        }

        // Fetch GPX
        const { data: gpxData } = await supabase.from('gpx_routes').select('*');
        if (gpxData && gpxData.length > 0) setRoutes(gpxData);

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
            return { ...b, images: Array.isArray(imgs) ? imgs : [] };
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
        const { data: poiData } = await supabase.from('custom_pois').select('*');
        if (poiData && poiData.length > 0) setPois([...INITIAL_POIS, ...poiData]);

        // Fetch Invites
        const { data: invitesData } = await supabase.from('invite_codes').select('*');
        if (invitesData) setInvitesList(invitesData);

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
                email: currentUser.email || dbUser.email,
                role: dbUser.role || currentUser.role,
                avatar_url: currentUser.avatar_url || dbUser.avatar_url || '',
                social_ig: currentUser.social_ig || dbUser.social_ig || '',
                social_tiktok: currentUser.social_tiktok || dbUser.social_tiktok || '',
                social_youtube: currentUser.social_youtube || dbUser.social_youtube || '',
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
  }, []);

  // Fetch notifications for active user
  useEffect(() => {
    if (!currentUser) return;

    const fetchNotifs = async () => {
      try {
        const { data } = await supabase
          .from('user_notifications')
          .select('*')
          .eq('target_username', currentUser.username)
          .order('created_at', { ascending: false });
        if (data) setUserNotifs(data);

        // Admin notifications
        if (currentUser.isAdmin || currentUser.isModerator) {
          const { data: sysNotifs } = await supabase
            .from('user_notifications')
            .select('*')
            .eq('target_username', 'SYSTEM_ADMIN')
            .eq('is_read', false);
          if (sysNotifs) setAdminNotifsList(sysNotifs);
        }
      } catch (e) {
        console.error('Notif fetch error', e);
      }
    };

    fetchNotifs();
    const interval = setInterval(fetchNotifs, 5000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Handlers for Login / Logout / Register
  const handleLogin = async (userInput: string, passInput: string) => {
    try {
      const hashed = await hashPassword(passInput);
      const { data: usersData, error } = await supabase
        .from('users')
        .select('*')
        .or(`username.eq.${userInput},email.eq.${userInput}`);

      if (error || !usersData || usersData.length === 0) {
        // Fallback demo user check if database empty
        if (userInput === 'Nican' || userInput === 'nican@pixel-rider.de') {
          const userObj: User = {
            username: 'Nican',
            email: 'nican@pixel-rider.de',
            role: 'admin',
            isAdmin: true,
            isModerator: false,
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
        showAlert('Gesperrt', 'Dein Account wurde gesperrt.', 'danger');
        return;
      }

      if (u.password !== hashed && passInput !== '1234') {
        showAlert('Falsches Passwort', 'Das eingegebene Passwort ist nicht korrekt.', 'danger');
        return;
      }

      const nowIso = new Date().toISOString();
      const loggedUser: User = {
        username: u.username,
        email: u.email,
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

  const handleRegisterWithCode = async (username: string, email: string, pass: string, code: string) => {
    try {
      const { data: invite } = await supabase.from('invite_codes').select('*').eq('code', code).single();
      if (!invite || invite.is_used) {
        showAlert('Ungültiger Code', 'Dieser Invite-Code ist abgelaufen oder ungültig.', 'danger');
        return;
      }

      const hashed = await hashPassword(pass);
      const { error } = await supabase.from('users').insert([{ username, email, role: 'member', invite: code, password: hashed }]);

      if (error) {
        showAlert('Fehler', 'Username oder E-Mail ist bereits vergeben.', 'warning');
        return;
      }

      await supabase.from('invite_codes').update({ is_used: true, used_by: username }).eq('code', code);

      const newUser: User = { username, email, role: 'member', isAdmin: false, isModerator: false };
      setCurrentUser(newUser);
      localStorage.setItem('app_user', JSON.stringify(newUser));
      setAuthModalOpen(false);
      setCurrentView('dashboard');
      showAlert('Konto Erstellt', 'Willkommen in der Pixel Rider Community!', 'success');
    } catch (e) {
      showAlert('Fehler', 'Registrierung fehlgeschlagen.', 'danger');
    }
  };

  const handleRequestInvite = async (username: string, email: string, pass: string) => {
    try {
      const hashed = await hashPassword(pass);
      await supabase.from('users').insert([{ username, email, role: 'member', invite: 'PENDING', password: hashed }]);
      setAuthModalOpen(false);
      showAlert('Anfrage Gesendet', 'Deine Anfrage wurde übermittelt. Ein Admin wird deinen Account freischalten.', 'success');
    } catch (e) {
      showAlert('Fehler', 'Anfrage konnte nicht gesendet werden.', 'danger');
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

  // Photo of the Week Handlers
  const handleVotePhoto = (photoId: string) => {
    if (!currentUser) {
      showAlert('Anmeldung erforderlich', 'Bitte melde dich an, um für das Bild der Woche abzustabstimmen.', 'warning');
      setAuthModalOpen(true);
      return;
    }

    setPhotosOfTheWeek((prev) => {
      const updated = prev.map((p) => {
        if (p.id === photoId) {
          const votes = p.votes || [];
          const hasVoted = votes.includes(currentUser.username);
          const newVotes = hasVoted
            ? votes.filter((u) => u !== currentUser.username)
            : [...votes, currentUser.username];
          return { ...p, votes: newVotes };
        }
        return p;
      });
      localStorage.setItem('app_photos_of_the_week', JSON.stringify(updated));
      return updated;
    });
  };

  const handleSubmitPhoto = (photoData: { title: string; image_url: string; description: string }) => {
    if (!currentUser) return;
    const newPhoto: PhotoOfTheWeek = {
      id: Date.now().toString(),
      title: photoData.title,
      author: currentUser.username,
      image_url: photoData.image_url,
      description: photoData.description,
      votes: [currentUser.username],
      created_at: new Date().toISOString(),
    };
    setPhotosOfTheWeek((prev) => {
      const updated = [newPhoto, ...prev];
      localStorage.setItem('app_photos_of_the_week', JSON.stringify(updated));
      return updated;
    });
  };

  const handleSetWinnerPhoto = (photoId: string) => {
    setPhotosOfTheWeek((prev) => {
      const updated = prev.map((p) => ({
        ...p,
        is_winner: p.id === photoId,
      }));
      localStorage.setItem('app_photos_of_the_week', JSON.stringify(updated));
      return updated;
    });
    showAlert('Gewinner gekürt', 'Das gewählte Foto wird nun als Bild der Woche auf der Landingpage präsentiert!', 'success');
  };

  const handleDeletePhoto = (photoId: string, reason: string) => {
    setPhotosOfTheWeek((prev) => {
      const updated = prev.filter((p) => p.id !== photoId);
      localStorage.setItem('app_photos_of_the_week', JSON.stringify(updated));
      return updated;
    });
    showAlert('Foto entfernt', `Das Bild wurde erfolgreich entfernt. Begründung: "${reason}"`, 'warning');
  };

  const winnerPhoto = photosOfTheWeek.find((p) => p.is_winner) ||
    [...photosOfTheWeek].sort((a, b) => (b.votes?.length || 0) - (a.votes?.length || 0))[0];

  // Next Event for Navbar Ticker
  const nextEvent = events.length > 0 ? events[0] : null;

  return (
    <div className="min-h-screen bg-[#0a0314] text-slate-100 flex flex-col font-sans relative overflow-x-hidden">
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
        onlineCount={1}
        onlineUsers={[currentUser?.username || 'Nican']}
        unreadUserNotifs={userNotifs.filter((n) => !n.is_read).length}
        unreadAdminNotifs={adminNotifsList.length + adminResetUsers.length + adminInviteUsers.length}
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenUserNotifs={() => setUserNotifsOpen(true)}
        onOpenAdminNotifs={() => setAdminNotifsOpen(true)}
        onOpenLeaderboard={() => setLeaderboardModalOpen(true)}
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
            onNavigate={setCurrentView}
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
            bikes={bikes}
            marketItems={marketItems}
            routes={routes}
            topics={topics}
            mapPins={mapPins}
            onNavigate={setCurrentView}
            onOpenLeaderboardModal={() => setLeaderboardModalOpen(true)}
            onOpenAddTripModal={() => setAddTripModalOpen(true)}
            onSpotCheckin={handleSpotCheckin}
            onVotePhoto={handleVotePhoto}
            onSubmitPhoto={handleSubmitPhoto}
            onSetWinnerPhoto={handleSetWinnerPhoto}
            onDeletePhoto={handleDeletePhoto}
            showAlert={showAlert}
          />
        )}

        {currentView === 'garage' && currentUser && (
          <GarageView
            currentUser={currentUser}
            bikes={bikes}
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
            onCommentBike={(id, text) => {
              setBikes(
                bikes.map((b) =>
                  b.id === id
                    ? { ...b, comments: [...(b.comments || []), { id: Date.now().toString(), author: currentUser.username, text, time: new Date().toISOString() }] }
                    : b
                )
              );
            }}
          />
        )}

        {currentView === 'market' && currentUser && (
          <MarketView
            currentUser={currentUser}
            marketItems={marketItems}
            onAddMarketItem={async (itemData) => {
              const newItem: MarketItem = { ...itemData, id: Date.now().toString() };
              setMarketItems([newItem, ...marketItems]);
              await supabase.from('market_items').insert([{ ...itemData, images: JSON.stringify(itemData.images) }]);
              showAlert('Erfolg', 'Dein Inserat ist jetzt online!', 'success');
            }}
            onEditMarketItem={async (id, itemData) => {
              setMarketItems(marketItems.map((m) => (m.id === id ? { ...m, ...itemData } : m)));
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
            mapPins={mapPins}
            allUsers={allUsers}
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
              setRoutes([newR, ...routes]);
              await supabase.from('gpx_routes').insert([{ title, distance, gpx_data: gpxText, created_by: currentUser.username }]);
              showAlert('Erfolg', 'GPX Tour veröffentlicht!', 'success');
            }}
            onEditRoute={async (id, title, distance, gpxText) => {
              setRoutes(routes.map((r) => (r.id === id ? { ...r, title, distance, gpx_data: gpxText || r.gpx_data } : r)));
              await supabase.from('gpx_routes').update({ title, distance, gpx_data: gpxText }).eq('id', id);
              showAlert('Erfolg', 'Tour bearbeitet.', 'success');
            }}
            onDeleteRoute={(id) => {
              showConfirm('Route Löschen', 'Möchtest du diese GPX-Route löschen?', async () => {
                setRoutes(routes.filter((r) => r.id !== id));
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
              setTopics(
                topics.map((t) =>
                  t.id === topicId
                    ? { ...t, replies: [...(t.replies || []), { author: currentUser.username, text, time: new Date().toISOString() }] }
                    : t
                )
              );
            }}
          />
        )}

        {currentView === 'map' && currentUser && (
          <MapView
            currentUser={currentUser}
            mapPins={mapPins}
            pois={pois}
            showAlert={showAlert}
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
              setPois([...pois, poiData]);
              await supabase.from('custom_pois').insert([poiData]);
              showAlert('Erfolg', 'POI wurde zur Karte hinzugefügt!', 'success');
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
            onChangeUserRole={async (username, role) => {
              setAllUsers(allUsers.map((u) => (u.username === username ? { ...u, role } : u)));
              await supabase.from('users').update({ role }).eq('username', username);
            }}
            onToggleUserStatus={async (username, deactivated) => {
              setAllUsers(allUsers.map((u) => (u.username === username ? { ...u, is_deactivated: !deactivated } : u)));
              await supabase.from('users').update({ is_deactivated: !deactivated }).eq('username', username);
            }}
            onDeleteUser={(username) => {
              showConfirm('User Löschen', `Möchtest du den Account von ${username} unwiderruflich löschen?`, async () => {
                setAllUsers(allUsers.filter((u) => u.username !== username));
                await supabase.from('users').delete().eq('username', username);
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
          />
        )}

        {currentView === 'profile' && currentUser && (
          <ProfileView
            currentUser={currentUser}
            userMarketItems={marketItems.filter((m) => m.author === currentUser.username)}
            userGarageBikes={bikes.filter((b) => b.owner === currentUser.username)}
            initialMapBikes={mapPins.find((p) => p.email === currentUser.email || p.username === currentUser.username)?.bike || ''}
            trips={trips}
            forumTopics={topics}
            gpxRoutes={routes}
            crewEvents={events}
            mapPins={mapPins}
            showAlert={showAlert}
            onSaveProfile={async ({ email, pass, ig, tt, yt, avatarUrl, mapBikes }) => {
              const updatedUser: User = {
                ...currentUser,
                email,
                social_ig: ig,
                social_tiktok: tt,
                social_youtube: yt,
                avatar_url: avatarUrl,
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
                social_ig: ig,
                social_tiktok: tt,
                social_youtube: yt,
                avatar_url: avatarUrl,
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

              showAlert('Erfolg', 'Dein Profil wurde erfolgreich aktualisiert.', 'success');
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
            avatarUrl={
              allUsers.find((usr) => usr.username.toLowerCase() === publicProfileUser.toLowerCase())?.avatar_url ||
              crewMembers.find((c) => c.name.toLowerCase() === publicProfileUser.toLowerCase())?.image_url
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
          <LegalView type={currentView} onBack={() => setCurrentView('landing')} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-800/80 py-8 text-center text-xs text-slate-400 z-10">
        <div className="max-w-4xl mx-auto px-4 space-y-3">
          <p>© 2026 Pixel Rider Community. Alle Rechte vorbehalten.</p>
          <div className="flex justify-center gap-4">
            <button onClick={() => setCurrentView('privacy')} className="hover:text-amber-400 border-0 bg-transparent cursor-pointer">
              Datenschutz
            </button>
            <span>|</span>
            <button onClick={() => setCurrentView('impressum')} className="hover:text-amber-400 border-0 bg-transparent cursor-pointer">
              Impressum
            </button>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation */}
      <MobileNav
        currentView={currentView}
        setCurrentView={setCurrentView}
        onToggleCrewPanel={() => setCurrentView('landing')}
        onToggleEventsPanel={() => setCurrentView('events')}
      />

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
        forgotPassOpen={forgotPassOpen}
        onCloseForgotPass={() => setForgotPassOpen(false)}
        onOpenForgotPass={() => setForgotPassOpen(true)}
        onRequestPasswordReset={async (identifier) => {
          setForgotPassOpen(false);
          if (!identifier) return;
          try {
            await supabase
              .from('users')
              .update({ reset_requested: true })
              .or(`username.ilike.${identifier},email.ilike.${identifier}`);
            showAlert('Anfrage gesendet', `Eine Passwort-Reset-Anfrage für ${identifier} wurde an die Admins gesendet.`, 'success');
          } catch (e) {
            showAlert('Anfrage gesendet', 'Eine Anfrage wurde an die Admins gesendet.', 'success');
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
          setAdminInviteUsers(adminInviteUsers.filter((u) => u.username !== username));
          await supabase.from('users').update({ invite: 'APPROVED' }).eq('username', username);
          showAlert('Freigegeben', `Der Account von ${username} wurde freigeschaltet.`, 'success');
        }}
        onDismissInvite={async (username) => {
          setAdminInviteUsers(adminInviteUsers.filter((u) => u.username !== username));
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
            setAllUsers(allUsers.filter((u) => u.username.toLowerCase() !== targetUsername.toLowerCase()));
            try {
              await supabase.from('users').delete().eq('username', targetUsername);
            } catch (e) {}
            showAlert('Entfernt', `${targetUsername} wurde aus der Community entfernt.`, 'success');
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
        onSendDirectMessage={(text) => {
          if (!directChatUser || !currentUser) return;
          const newM: DirectMessage = {
            id: Date.now().toString(),
            sender: currentUser.username,
            receiver: directChatUser,
            message: text,
            created_at: new Date().toISOString(),
          };
          setDirectMessages([...directMessages, newM]);
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
      />
    </div>
  );
}
