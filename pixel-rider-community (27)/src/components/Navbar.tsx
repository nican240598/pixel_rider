import React, { useState, useEffect, useRef } from 'react';
import { User, AppView, CrewEvent, TripEntry, CrewMember } from '../types';
import { 
  Shield, 
  Bell, 
  User as UserIcon, 
  LogOut, 
  Grid, 
  Wrench, 
  Calendar, 
  MapPin, 
  Radio, 
  Users, 
  Flame, 
  Trophy, 
  ShieldAlert, 
  ShoppingBag, 
  ChevronDown,
  Key,
  Sliders,
  Sparkles,
  ExternalLink,
  Scale
} from 'lucide-react';
import { getUserTotalKm, getUserStreakWeeks } from '../lib/challengeUtils';
import { UserAvatar } from './UserAvatar';

interface NavbarProps {
  currentUser: User | null;
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  nextEvent: CrewEvent | null;
  trips?: TripEntry[];
  crewMembers?: CrewMember[];
  allUsers?: any[];
  onlineCount: number;
  onlineUsers: string[];
  unreadUserNotifs: number;
  unreadAdminNotifs: number;
  onOpenAuth: () => void;
  onOpenUserNotifs: () => void;
  onOpenAdminNotifs: () => void;
  onOpenPublicProfile: (username: string) => void;
  onOpenDirectChat: (username: string) => void;
  onLogout: () => void;
  onOpenLeaderboard?: () => void;
  onOpenProfileSection?: (section: 'name_profile' | 'credentials' | 'garage' | 'market' | 'tile_layout' | 'legal') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  currentView,
  setCurrentView,
  nextEvent,
  trips = [],
  crewMembers = [],
  allUsers = [],
  onlineCount,
  onlineUsers,
  unreadUserNotifs,
  unreadAdminNotifs,
  onOpenAuth,
  onOpenUserNotifs,
  onOpenAdminNotifs,
  onOpenPublicProfile,
  onOpenDirectChat,
  onLogout,
  onOpenLeaderboard,
  onOpenProfileSection,
}) => {
  const [showOnlineDropdown, setShowOnlineDropdown] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const onlineDropdownRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click or Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowProfileMenu(false);
        setShowOnlineDropdown(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
      if (onlineDropdownRef.current && !onlineDropdownRef.current.contains(e.target as Node)) {
        setShowOnlineDropdown(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Compute User Streak (Feature C)
  const streakWeeks = currentUser ? getUserStreakWeeks(currentUser.username, trips) : 0;

  // Compute effective user profile picture with comprehensive fallbacks
  const userAvatar = currentUser?.avatar_url ||
    allUsers?.find((u) => u.username?.toLowerCase() === currentUser?.username?.toLowerCase())?.avatar_url ||
    crewMembers?.find((c) => c.name?.toLowerCase() === currentUser?.username?.toLowerCase())?.image_url ||
    (currentUser?.username?.toLowerCase() === 'nican' ? 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=1000' : '');

  const getDynamicHeaderPillText = () => {
    if (nextEvent) {
      const evDate = new Date(nextEvent.date_time);
      const dateStr = evDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
      return `📅 NEXT EVENT: ${nextEvent.title} (${dateStr} UHR)`;
    }
    return `📅 NÄCHSTE AUSFAHRT & CREW EVENTS`;
  };

  const handleProfileSubSectionNav = (section: 'name_profile' | 'credentials' | 'garage' | 'market' | 'tile_layout' | 'legal') => {
    setShowProfileMenu(false);
    if (onOpenProfileSection) {
      onOpenProfileSection(section);
    } else {
      setCurrentView('profile');
    }
  };

  return (
    <nav className="fixed top-0 left-0 w-full h-[70px] md:h-[75px] bg-[#0e041d]/95 backdrop-blur-md border-b-2 border-yellow-400/90 shadow-[0_4px_25px_rgba(250,204,21,0.15)] z-50 px-3 md:px-8 flex items-center justify-center md:justify-between">
      {/* Brand (full-width impact on mobile, left-aligned on desktop) */}
      <div className="w-full md:w-auto flex items-center justify-center md:justify-start h-full">
        <button
          onClick={() => setCurrentView('landing')}
          aria-label="Pixel Rider Startseite aufrufen"
          className="w-full md:w-auto h-full flex items-center justify-center md:justify-start py-2 text-2xl xs:text-3xl sm:text-3xl md:text-2xl font-black tracking-[0.18em] sm:tracking-[0.25em] md:tracking-wider uppercase hover:opacity-90 transition-opacity bg-transparent border-0 cursor-pointer text-center select-none"
        >
          <span className="bg-gradient-to-r from-purple-400 via-amber-400 to-yellow-300 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(250,204,21,0.55)] whitespace-nowrap">
            PIXEL RIDER
          </span>
        </button>
      </div>

      {currentUser ? (
        <div className="hidden md:flex items-center justify-between flex-1 ml-6 gap-4 min-w-0">
          {/* Main Navigation Links (Desktop Quick Access) */}
          <div className="hidden xl:flex items-center gap-1.5">
            <button
              onClick={() => setCurrentView('dashboard')}
              aria-label="Dashboard"
              aria-current={currentView === 'dashboard' ? 'page' : undefined}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors border-0 bg-transparent cursor-pointer min-h-[40px] ${
                currentView === 'dashboard' ? 'text-yellow-400 bg-purple-900/40 border border-yellow-400/30' : 'text-slate-300 hover:text-white hover:bg-purple-950/30'
              }`}
            >
              <Grid className="w-4 h-4" /> Dashboard
            </button>
            <button
              onClick={() => setCurrentView('garage')}
              aria-label="Garage"
              aria-current={currentView === 'garage' ? 'page' : undefined}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors border-0 bg-transparent cursor-pointer min-h-[40px] ${
                currentView === 'garage' ? 'text-yellow-400 bg-purple-900/40 border border-yellow-400/30' : 'text-slate-300 hover:text-white hover:bg-purple-950/30'
              }`}
            >
              <Wrench className="w-4 h-4" /> Garage
            </button>
            <button
              onClick={() => setCurrentView('events')}
              aria-label="Events"
              aria-current={currentView === 'events' ? 'page' : undefined}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors border-0 bg-transparent cursor-pointer min-h-[40px] ${
                currentView === 'events' ? 'text-yellow-400 bg-purple-900/40 border border-yellow-400/30' : 'text-slate-300 hover:text-white hover:bg-purple-950/30'
              }`}
            >
              <Calendar className="w-4 h-4" /> Events
            </button>
            <button
              onClick={() => setCurrentView('map')}
              aria-label="Karte"
              aria-current={currentView === 'map' ? 'page' : undefined}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors border-0 bg-transparent cursor-pointer min-h-[40px] ${
                currentView === 'map' ? 'text-yellow-400 bg-purple-900/40 border border-yellow-400/30' : 'text-slate-300 hover:text-white hover:bg-purple-950/30'
              }`}
            >
              <MapPin className="w-4 h-4" /> Map
            </button>
          </div>

          {/* Events Banner (Center Pill - Desktop) */}
          <div className="hidden xl:flex flex-1 justify-center max-w-sm mx-auto">
            <button
              onClick={() => setCurrentView('events')}
              className="border rounded-full px-4 py-1.5 text-xs font-black uppercase flex items-center gap-2 transition-all text-ellipsis overflow-hidden whitespace-nowrap cursor-pointer bg-amber-500/15 border-amber-400/80 text-amber-300 hover:bg-amber-500/25 shadow-[0_0_15px_rgba(245,158,11,0.25)] min-h-[38px]"
              title="Anstehende Events & Ausfahrten anzeigen"
            >
              <Calendar className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span className="truncate">{getDynamicHeaderPillText()}</span>
            </button>
          </div>

          {/* Right Section: Notification Bell, Online status, and User Profile Dropdown Menu */}
          <div className="flex items-center gap-2 md:gap-2.5 ml-auto shrink-0">
            
            {/* Shortcut: Anfragen & Freigaben für Admins / Moderatoren */}
            {(currentUser.isAdmin || currentUser.isModerator) && (
              <button
                onClick={() => setCurrentView('admin')}
                aria-label="Shortcut zu Anfragen & Freigaben"
                className={`hidden xl:flex relative px-3 py-1.5 rounded-full text-xs font-black uppercase items-center gap-1.5 border transition-all cursor-pointer min-h-[40px] ${
                  currentView === 'admin'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                    : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 hover:text-amber-200 border-amber-500/40 hover:border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.15)]'
                }`}
                title="Shortcut zu Anfragen & Freigaben"
              >
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Anfragen</span>
                {unreadAdminNotifs > 0 && (
                  <span className="bg-red-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none shadow-md">
                    {unreadAdminNotifs}
                  </span>
                )}
              </button>
            )}

            {/* User Bell */}
            <button
              onClick={onOpenUserNotifs}
              aria-label="Deine Benachrichtigungen"
              className="relative p-2.5 text-white hover:text-amber-300 bg-transparent border-0 cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full hover:bg-purple-900/30 transition-colors"
              title="Deine Benachrichtigungen"
            >
              <Bell className="w-5 h-5" />
              {unreadUserNotifs > 0 && (
                <span className="absolute top-1.5 right-1.5 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-md">
                  {unreadUserNotifs}
                </span>
              )}
            </button>

            {/* Online Indicator Dropdown Trigger */}
            <div className="relative hidden xl:block" ref={onlineDropdownRef}>
              <button
                onClick={() => setShowOnlineDropdown(!showOnlineDropdown)}
                aria-label="Online Status anzeigen"
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-purple-800 text-xs font-semibold text-slate-200 hover:border-amber-500 transition-colors cursor-pointer min-h-[40px]"
              >
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Online: <strong className="text-emerald-400">{onlineCount}</strong></span>
              </button>

              {/* Dropdown menu */}
              {showOnlineDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-950 border border-purple-800 rounded-xl shadow-2xl p-3 z-50">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                    <span className="text-xs font-bold uppercase text-amber-400 flex items-center gap-1">
                      <Radio className="w-3 h-3 text-emerald-400" /> Crew Online
                    </span>
                    <button
                      onClick={() => setShowOnlineDropdown(false)}
                      aria-label="Schließen"
                      className="text-slate-400 hover:text-white text-xs border-0 bg-transparent cursor-pointer p-1 min-h-[32px] min-w-[32px] flex items-center justify-center"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-1">
                    {onlineUsers.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-2">Niemand online</p>
                    ) : (
                      onlineUsers.map((uname) => (
                        <div
                          key={uname}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 hover:bg-slate-900 text-xs transition-colors"
                        >
                          <div
                            className="flex items-center gap-2 cursor-pointer truncate"
                            onClick={() => {
                              onOpenPublicProfile(uname);
                              setShowOnlineDropdown(false);
                            }}
                          >
                            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#22c55e]" />
                            <span className="font-semibold text-white truncate">{uname}</span>
                          </div>
                          {uname !== currentUser.username && (
                            <button
                              onClick={() => {
                                onOpenDirectChat(uname);
                                setShowOnlineDropdown(false);
                              }}
                              className="text-amber-400 hover:text-amber-300 p-1 border-0 bg-transparent cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                              title="Chat starten"
                            >
                              💬
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* PROFILE MENU DROPDOWN TRIGGER & FLYOUT */}
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                aria-label={`Profil-Menü für ${currentUser.username} öffnen`}
                aria-expanded={showProfileMenu}
                className={`flex items-center gap-2 font-bold text-xs uppercase px-3 py-1.5 rounded-full border transition-all cursor-pointer min-h-[40px] shadow-md select-none ${
                  showProfileMenu || currentView === 'profile'
                    ? 'bg-amber-400/20 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(250,204,21,0.25)]'
                    : 'bg-[#160a29] border-purple-800/80 text-slate-200 hover:border-amber-400/60 hover:text-amber-300'
                }`}
                title="Profil & Schnellzugriff-Menü öffnen"
              >
                <UserAvatar
                  username={currentUser.username}
                  avatarUrl={userAvatar}
                  currentUser={currentUser}
                  allUsers={allUsers}
                  size="xs"
                  bordered
                  borderColor="border-amber-400/70"
                />
                <span className="max-w-[85px] sm:max-w-[120px] truncate">
                  {currentUser.username}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-amber-400 transition-transform duration-200 ${showProfileMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* PROFILE DROPDOWN MENU */}
              {showProfileMenu && (
                <div 
                  className="absolute right-0 mt-2.5 w-72 sm:w-80 bg-[#120724] border-2 border-amber-400/80 rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.85)] p-3 z-50 animate-fadeIn backdrop-blur-xl"
                  role="menu"
                  aria-label="Profil Untermenü"
                >
                  {/* User Profile Header Card */}
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-purple-900/70 mb-2">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        username={currentUser.username}
                        avatarUrl={userAvatar}
                        currentUser={currentUser}
                        allUsers={allUsers}
                        size="md"
                        bordered
                        borderColor="border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-white font-black text-sm tracking-wide truncate flex items-center gap-1.5">
                          <span>@{currentUser.username}</span>
                        </div>
                        <div className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                          {currentUser.isAdmin ? (
                            <span className="text-red-400">👑 Admin</span>
                          ) : currentUser.isModerator ? (
                            <span className="text-yellow-400">🛡️ Moderator</span>
                          ) : (currentUser.role === 'ehren pixel' || (currentUser.role as string)?.toLowerCase().includes('ehren')) ? (
                            <span className="text-cyan-300 flex items-center gap-1 bg-cyan-950/80 border border-cyan-500/40 px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.3)]">
                              💎 Ehrenpixel
                            </span>
                          ) : (
                            <span className="text-amber-400">🏍️ Crew Member</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Unterpunkte des Profils */}
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 px-2.5 pt-1.5 pb-1">
                      <span>Profil & Einstellungen</span>
                    </div>

                    {/* Sub-item: Mein Profil & Daten */}
                    <button
                      onClick={() => handleProfileSubSectionNav('name_profile')}
                      className="w-full p-2.5 rounded-xl flex items-center justify-between text-left text-xs font-semibold text-slate-200 hover:text-white hover:bg-purple-950/70 border border-transparent hover:border-amber-400/40 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400 group-hover:bg-amber-500/25 group-hover:scale-105 transition-all">
                          <UserIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-white">Mein Profil & Socials</div>
                          <div className="text-[10px] text-slate-400">Name, Bild, Social Media & PixelMap</div>
                        </div>
                      </div>
                    </button>

                    {/* Sub-item: Meine Garage & Bikes */}
                    <button
                      onClick={() => handleProfileSubSectionNav('garage')}
                      className="w-full p-2.5 rounded-xl flex items-center justify-between text-left text-xs font-semibold text-slate-200 hover:text-white hover:bg-purple-950/70 border border-transparent hover:border-amber-400/40 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center text-yellow-400 group-hover:bg-amber-500/25 group-hover:scale-105 transition-all">
                          <Wrench className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-white">Meine Garage & Bikes</div>
                          <div className="text-[10px] text-slate-400">Eigene Motorräder & Umbauten</div>
                        </div>
                      </div>
                    </button>

                    {/* Sub-item: Meine Marktplatz-Inserate */}
                    <button
                      onClick={() => handleProfileSubSectionNav('market')}
                      className="w-full p-2.5 rounded-xl flex items-center justify-between text-left text-xs font-semibold text-slate-200 hover:text-white hover:bg-purple-950/70 border border-transparent hover:border-amber-400/40 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center text-emerald-400 group-hover:bg-amber-500/25 group-hover:scale-105 transition-all">
                          <ShoppingBag className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-white">Meine Marktplatz-Inserate</div>
                          <div className="text-[10px] text-slate-400">Eigene Angebote & Gesuche</div>
                        </div>
                      </div>
                    </button>

                    {/* Sub-item: Dashboard Kacheln anpassen */}
                    <button
                      onClick={() => handleProfileSubSectionNav('tile_layout')}
                      className="w-full p-2.5 rounded-xl flex items-center justify-between text-left text-xs font-semibold text-slate-200 hover:text-white hover:bg-purple-950/70 border border-transparent hover:border-amber-400/40 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center text-purple-400 group-hover:bg-amber-500/25 group-hover:scale-105 transition-all">
                          <Sliders className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-white">Dashboard Kacheln anpassen</div>
                          <div className="text-[10px] text-slate-400">Reihenfolge & Sichtbarkeit</div>
                        </div>
                      </div>
                    </button>

                    {/* Sub-item: Passwort & Sicherheit */}
                    <button
                      onClick={() => handleProfileSubSectionNav('credentials')}
                      className="w-full p-2.5 rounded-xl flex items-center justify-between text-left text-xs font-semibold text-slate-200 hover:text-white hover:bg-purple-950/70 border border-transparent hover:border-amber-400/40 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center text-rose-400 group-hover:bg-amber-500/25 group-hover:scale-105 transition-all">
                          <Key className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-white">Passwort & Sicherheit</div>
                          <div className="text-[10px] text-slate-400">Login, Telefon & Account</div>
                        </div>
                      </div>
                    </button>

                    {/* Sub-item: Anfragen & Freigaben (Admin / Mod) */}
                    {(currentUser.isAdmin || currentUser.isModerator) && (
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          setCurrentView('admin');
                        }}
                        className="w-full p-2.5 rounded-xl flex items-center justify-between text-left text-xs font-semibold text-amber-200 hover:text-white hover:bg-amber-950/50 border border-amber-500/30 hover:border-amber-400/70 transition-all cursor-pointer group shadow-[0_0_15px_rgba(245,158,11,0.08)]"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 group-hover:bg-amber-500/30 group-hover:scale-105 transition-all">
                            <ShieldAlert className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-amber-300 flex items-center gap-2">
                              <span>Anfragen & Freigaben</span>
                              {unreadAdminNotifs > 0 && (
                                <span className="bg-red-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                                  {unreadAdminNotifs}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-amber-200/70">Admin- & Freigabe-Cockpit</div>
                          </div>
                        </div>
                      </button>
                    )}

                    {/* Sub-item (Founder Only): Impressum & Datenschutz bearbeiten */}
                    {(currentUser.username?.toLowerCase() === 'nican' ||
                      currentUser.email?.toLowerCase() === 'nico.anschau98@gmail.com' ||
                      currentUser.role === 'founder' ||
                      currentUser.role === 'admin' ||
                      currentUser.isAdmin) && (
                      <button
                        onClick={() => handleProfileSubSectionNav('legal')}
                        className="w-full p-2.5 rounded-xl flex items-center justify-between text-left text-xs font-semibold text-amber-200 hover:text-white hover:bg-amber-950/50 border border-amber-500/30 hover:border-amber-400/70 transition-all cursor-pointer group shadow-[0_0_15px_rgba(245,158,11,0.08)]"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 group-hover:bg-amber-500/30 group-hover:scale-105 transition-all">
                            <Scale className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-amber-300">
                              <span>Impressum & Datenschutz</span>
                            </div>
                            <div className="text-[10px] text-amber-200/70">Rechtliche Texte direkt bearbeiten</div>
                          </div>
                        </div>
                      </button>
                    )}
                  </div>

                  {/* Actions & Links Divider */}
                  <div className="border-t border-purple-900/60 my-2 pt-2 space-y-1">
                    {/* View Public Profile */}
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        onOpenPublicProfile(currentUser.username);
                      }}
                      className="w-full p-2 rounded-xl flex items-center justify-between text-xs text-slate-300 hover:text-amber-300 hover:bg-slate-900/80 transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                        <span>Öffentliches Profil ansehen</span>
                      </span>
                    </button>

                    {/* Logout */}
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        onLogout();
                      }}
                      className="w-full p-2 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-red-300 hover:text-white bg-red-950/40 hover:bg-red-900/60 border border-red-900/60 transition-colors cursor-pointer mt-1"
                    >
                      <LogOut className="w-3.5 h-3.5 text-red-400" />
                      <span>Abmelden</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      ) : (
        <button
          onClick={onOpenAuth}
          aria-label="Login oder Registrierung öffnen"
          className="ml-auto bg-gradient-to-r from-purple-950 via-purple-800 to-amber-400 hover:from-purple-900 hover:to-amber-300 text-white font-black text-xs uppercase px-4 sm:px-5 py-2.5 rounded-full transition-all shadow-[0_0_20px_rgba(168,85,247,0.35)] border border-amber-400/50 cursor-pointer tracking-wider min-h-[44px] flex items-center"
        >
          Login / Registrieren
        </button>
      )}
    </nav>
  );
};
