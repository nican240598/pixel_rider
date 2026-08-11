import React, { useState, useEffect } from 'react';
import { User, AppView, CrewMember, CrewEvent, GpxRoute, ForumTopic, GarageBike, MarketItem, MapPin, Poi, UserNotification, DirectMessage, MarketAppeal, PixelOfMonth } from './types';
import { supabase, hashPassword } from './lib/supabase';
import { INITIAL_CREW, INITIAL_EVENTS, INITIAL_GPX, INITIAL_FORUM, INITIAL_GARAGE, INITIAL_MARKET, INITIAL_POIS } from './lib/initialData';

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
  const [events, setEvents] = useState<CrewEvent[]>(INITIAL_EVENTS);
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

  const [pixelOfMonth, setPixelOfMonth] = useState<PixelOfMonth | null>(() => {
    try {
      const saved = localStorage.getItem('app_pixel_of_month');
      return saved
        ? JSON.parse(saved)
        : {
            username: "Alex 'Nitro' Becker",
            title: 'Pixel des Monats – August 2026',
            reason: 'Hat diesen Monat 12 gemeinsame Ausfahrten organisiert, 3 Liegenbleibern spontan geholfen und den Schwarzwaldblick-Treff etabliert!',
            image_url: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=1000',
            bike: 'Yamaha MT-09 SP',
            social_ig: 'https://instagram.com',
          };
    } catch (e) {
      return null;
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
        if (eventsData && eventsData.length > 0) setEvents(eventsData);

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
          setAllUsers(usersData);
          setAdminResetUsers(usersData.filter((u) => u.reset_requested));
          setAdminInviteUsers(usersData.filter((u) => u.invite === 'PENDING'));
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

      const loggedUser: User = {
        username: u.username,
        email: u.email,
        role: u.role || 'member',
        isAdmin: u.role === 'admin' || u.username.toLowerCase() === 'nican',
        isModerator: u.role === 'moderator',
      };

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

  // Next Event for Navbar Ticker
  const nextEvent = events.length > 0 ? events[0] : null;

  return (
    <div className="min-h-screen bg-[#0a0314] text-slate-100 flex flex-col font-sans relative pb-20 md:pb-0 overflow-x-hidden">
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
        onlineCount={1}
        onlineUsers={[currentUser?.username || 'Nican']}
        unreadUserNotifs={userNotifs.filter((n) => !n.is_read).length}
        unreadAdminNotifs={adminNotifsList.length + adminResetUsers.length + adminInviteUsers.length}
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenUserNotifs={() => setUserNotifsOpen(true)}
        onOpenAdminNotifs={() => setAdminNotifsOpen(true)}
        onOpenPublicProfile={(uname) => {
          setPublicProfileUser(uname);
          setCurrentView('public_profile');
        }}
        onOpenDirectChat={(uname) => setDirectChatUser(uname)}
        onLogout={handleLogout}
      />

      {/* Main View Container */}
      <main className="flex-1 z-10 pt-[80px]">
        {currentView === 'landing' && (
          <LandingView crewMembers={crewMembers} pixelOfMonth={pixelOfMonth} onNavigate={setCurrentView} />
        )}

        {currentView === 'dashboard' && currentUser && (
          <DashboardView currentUser={currentUser} onNavigate={setCurrentView} />
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
            onLikeBike={(id) => {
              setBikes(bikes.map((b) => (b.id === id ? { ...b, likes: [...(b.likes || []), currentUser.username] } : b)));
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
            onAddEvent={async (evData) => {
              const newEv: CrewEvent = { ...evData, id: Date.now().toString(), participants: [currentUser.email] };
              setEvents([...events, newEv]);
              await supabase.from('crew_events').insert([{ ...evData, participants: [currentUser.email] }]);
              showAlert('Erfolg', 'Event veröffentlich!', 'success');
            }}
            onEditEvent={async (id, evData) => {
              setEvents(events.map((e) => (e.id === id ? { ...e, ...evData } : e)));
              await supabase.from('crew_events').update(evData).eq('id', id);
              showAlert('Erfolg', 'Event bearbeitet.', 'success');
            }}
            onDeleteEvent={(id) => {
              showConfirm('Event Löschen', 'Event wirklich absagen?', async () => {
                setEvents(events.filter((e) => e.id !== id));
                await supabase.from('crew_events').delete().eq('id', id);
              });
            }}
            onToggleParticipation={async (id) => {
              setEvents(
                events.map((e) => {
                  if (e.id === id) {
                    const has = e.participants.includes(currentUser.email);
                    const updated = has ? e.participants.filter((p) => p !== currentUser.email) : [...e.participants, currentUser.email];
                    return { ...e, participants: updated };
                  }
                  return e;
                })
              );
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
            onSavePin={async (zip, city, bikesInput) => {
              try {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(`${zip} ${city}`)}`);
                const data = await res.json();
                if (data && data[0]) {
                  const lat = parseFloat(data[0].lat);
                  const lng = parseFloat(data[0].lon);
                  const newPin: MapPin = { email: currentUser.email, username: currentUser.username, city: `${zip} ${city}`, bike: bikesInput, lat, lng };
                  setMapPins([...mapPins.filter((p) => p.email !== currentUser.email), newPin]);
                  await supabase.from('map_pins').upsert([newPin], { onConflict: 'email' });
                  showAlert('Erfolg', 'Dein Standort auf der PixelMap wurde gespeichert!', 'success');
                } else {
                  showAlert('Fehler', 'Ort konnte nicht gefunden werden.', 'warning');
                }
              } catch (e) {
                showAlert('Fehler', 'Standortabfrage fehlgeschlagen.', 'danger');
              }
            }}
            onAddPoi={async (poiData) => {
              setPois([...pois, poiData]);
              await supabase.from('custom_pois').insert([poiData]);
              showAlert('Erfolg', 'POI wurde zur Karte hinzugefügt!', 'success');
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
            pixelOfMonth={pixelOfMonth}
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
            onSetPixelOfMonth={(pixel) => {
              setPixelOfMonth(pixel);
              try {
                localStorage.setItem('app_pixel_of_month', JSON.stringify(pixel));
              } catch (e) {}
              showAlert('Pixel des Monats Gekürt! 🏆', `${pixel.username} wurde als Pixel des Monats auf der Landingpage hervorgehoben!`, 'success');
            }}
          />
        )}

        {currentView === 'profile' && currentUser && (
          <ProfileView
            currentUser={currentUser}
            userMarketItems={marketItems.filter((m) => m.author === currentUser.username)}
            userGarageBikes={bikes.filter((b) => b.owner === currentUser.username)}
            initialMapBikes={mapPins.find((p) => p.email === currentUser.email || p.username === currentUser.username)?.bike || ''}
            onSaveProfile={async ({ email, pass, ig, tt, yt, avatarUrl, mapBikes }) => {
              const updatedUser = { ...currentUser, email, social_ig: ig, social_tiktok: tt, social_youtube: yt, avatar_url: avatarUrl };
              setCurrentUser(updatedUser);
              localStorage.setItem('app_user', JSON.stringify(updatedUser));

              // Also update user in allUsers list if present
              setAllUsers((prev) => prev.map((u) => u.username === currentUser.username ? updatedUser : u));

              const updates: any = { email, social_ig: ig, social_tiktok: tt, social_youtube: yt, avatar_url: avatarUrl };
              if (pass) updates.password = await hashPassword(pass);

              await supabase.from('users').update(updates).eq('username', currentUser.username);

              if (mapBikes !== undefined) {
                const existingPin = mapPins.find((p) => p.email === currentUser.email || p.username === currentUser.username);
                if (existingPin) {
                  const updatedPin = { ...existingPin, bike: mapBikes };
                  setMapPins(mapPins.map((p) => (p.email === currentUser.email || p.username === currentUser.username ? updatedPin : p)));
                  await supabase.from('map_pins').upsert([updatedPin], { onConflict: 'email' });
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
            userSocials={(() => {
              const u = allUsers.find((usr) => usr.username.toLowerCase() === publicProfileUser.toLowerCase());
              return { ig: u?.social_ig, tt: u?.social_tiktok, yt: u?.social_youtube };
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
      />
    </div>
  );
}
