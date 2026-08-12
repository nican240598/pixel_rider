import React, { useState, useEffect } from 'react';
import { User, AppView, CrewEvent, UserNotification, TripEntry } from '../types';
import { Shield, Bell, User as UserIcon, LogOut, Grid, Wrench, MessageSquare, Calendar, MapPin, Radio, Users, Flame, CloudSun, Trophy } from 'lucide-react';
import { getUserTotalKm, getUserRankBadge, getUserStreakWeeks } from '../lib/challengeUtils';

interface NavbarProps {
  currentUser: User | null;
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  nextEvent: CrewEvent | null;
  trips?: TripEntry[];
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
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  currentView,
  setCurrentView,
  nextEvent,
  trips = [],
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
}) => {
  const [showOnlineDropdown, setShowOnlineDropdown] = useState(false);
  const [weatherText, setWeatherText] = useState<string>('☀️ SA 22°C - CREW RIDE WETTER');

  // Compute User Rank & Streak (Feature C)
  const totalKm = currentUser ? getUserTotalKm(currentUser.username, trips) : 0;
  const rankBadge = getUserRankBadge(totalKm);
  const streakWeeks = currentUser ? getUserStreakWeeks(currentUser.username, trips) : 0;

  // Check if next event is within the next 48 hours (Feature D)
  const isEventInNext48h = (() => {
    if (!nextEvent || !nextEvent.date_time) return false;
    const evTime = new Date(nextEvent.date_time).getTime();
    const now = Date.now();
    const diff = evTime - now;
    return diff > 0 && diff <= 48 * 3600 * 1000;
  })();

  // Fetch Open-Meteo weekend weather if no event in next 48h
  useEffect(() => {
    let isMounted = true;
    async function fetchWeather() {
      try {
        // Stuttgart / Schwarzwald default region coords (48.7711, 9.0371)
        const res = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=48.7711&longitude=9.0371&daily=temperature_2m_max,weathercode&timezone=Europe%2FBerlin'
        );
        const data = await res.json();
        if (data?.daily?.temperature_2m_max?.[0] !== undefined) {
          const maxTemp = Math.round(data.daily.temperature_2m_max[0]);
          const code = data.daily.weathercode[0];
          let icon = '☀️';
          if (code >= 1 && code <= 3) icon = '🌤️';
          else if (code >= 45 && code <= 48) icon = '🌫️';
          else if (code >= 51 && code <= 67) icon = '🌧️';
          else if (code >= 80) icon = '🌩️';

          if (isMounted) {
            setWeatherText(`${icon} WOCHENENDE ${maxTemp}°C - PERFEKTES RIDE WETTER`);
          }
        }
      } catch (e) {
        // Fallback default
      }
    }
    fetchWeather();
    return () => {
      isMounted = false;
    };
  }, []);

  // Format dynamic ticker text for Events Banner
  const getDynamicHeaderPillText = () => {
    if (nextEvent) {
      const evDate = new Date(nextEvent.date_time);
      const dateStr = evDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
      return `📅 NEXT EVENT: ${nextEvent.title} (${dateStr} UHR)`;
    }
    return `📅 NÄCHSTE AUSFAHRT & CREW EVENTS`;
  };

  return (
    <nav className="fixed top-0 left-0 w-full h-[75px] bg-[#0e041d]/95 backdrop-blur-md border-b-2 border-yellow-400/90 shadow-[0_4px_25px_rgba(250,204,21,0.15)] z-50 px-4 md:px-8 flex items-center justify-between">
      {/* Brand */}
      <button
        onClick={() => setCurrentView('landing')}
        className="text-2xl font-black tracking-wider uppercase hover:opacity-90 transition-opacity bg-transparent border-0 cursor-pointer"
      >
        <span className="bg-gradient-to-r from-purple-800 via-purple-500 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(250,204,21,0.4)]">
          PIXEL RIDER
        </span>
      </button>

      {currentUser ? (
        <div className="flex items-center justify-between flex-1 ml-6 gap-4">
          {/* Main Navigation Links (Desktop) */}
          <div className="hidden xl:flex items-center gap-2">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors border-0 bg-transparent cursor-pointer ${
                currentView === 'dashboard' ? 'text-yellow-400 bg-purple-900/40 border border-yellow-400/30' : 'text-slate-300 hover:text-white hover:bg-purple-950/30'
              }`}
            >
              <Grid className="w-4 h-4" /> Dashboard
            </button>
            <button
              onClick={() => setCurrentView('garage')}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors border-0 bg-transparent cursor-pointer ${
                currentView === 'garage' ? 'text-yellow-400 bg-purple-900/40 border border-yellow-400/30' : 'text-slate-300 hover:text-white hover:bg-purple-950/30'
              }`}
            >
              <Wrench className="w-4 h-4" /> Garage
            </button>
            <button
              onClick={() => setCurrentView('forum')}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors border-0 bg-transparent cursor-pointer ${
                currentView === 'forum' ? 'text-yellow-400 bg-purple-900/40 border border-yellow-400/30' : 'text-slate-300 hover:text-white hover:bg-purple-950/30'
              }`}
            >
              <MessageSquare className="w-4 h-4" /> Forum
            </button>
            <button
              onClick={() => setCurrentView('events')}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors border-0 bg-transparent cursor-pointer ${
                currentView === 'events' ? 'text-yellow-400 bg-purple-900/40 border border-yellow-400/30' : 'text-slate-300 hover:text-white hover:bg-purple-950/30'
              }`}
            >
              <Calendar className="w-4 h-4" /> Events
            </button>
            <button
              onClick={() => setCurrentView('map')}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors border-0 bg-transparent cursor-pointer ${
                currentView === 'map' ? 'text-yellow-400 bg-purple-900/40 border border-yellow-400/30' : 'text-slate-300 hover:text-white hover:bg-purple-950/30'
              }`}
            >
              <MapPin className="w-4 h-4" /> Map
            </button>
          </div>

          {/* Events Banner (Center Pill) */}
          <div className="hidden lg:flex flex-1 justify-center max-w-md mx-auto">
            <button
              onClick={() => setCurrentView('events')}
              className="border rounded-full px-5 py-2 text-xs font-black uppercase flex items-center gap-2 transition-all text-ellipsis overflow-hidden whitespace-nowrap cursor-pointer bg-amber-500/20 border-amber-400 text-amber-300 hover:bg-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
              title="Anstehende Events & Ausfahrten anzeigen"
            >
              <Calendar className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span className="truncate">{getDynamicHeaderPillText()}</span>
            </button>
          </div>

          {/* Right Section: Profile & Logout */}
          <div className="flex items-center gap-2.5 md:gap-3.5 ml-auto">

            {/* Admin Bell */}
            {(currentUser.isAdmin || currentUser.isModerator) && (
              <button
                onClick={onOpenAdminNotifs}
                className="relative p-2 text-amber-400 hover:text-amber-300 bg-transparent border-0 cursor-pointer"
                title="Admin-Benachrichtigungen"
              >
                <Shield className="w-5 h-5" />
                {unreadAdminNotifs > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {unreadAdminNotifs}
                  </span>
                )}
              </button>
            )}

            {/* User Bell */}
            <button
              onClick={onOpenUserNotifs}
              className="relative p-2 text-white hover:text-amber-300 bg-transparent border-0 cursor-pointer"
              title="Deine Benachrichtigungen"
            >
              <Bell className="w-5 h-5" />
              {unreadUserNotifs > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {unreadUserNotifs}
                </span>
              )}
            </button>

            {/* Online Indicator Dropdown Trigger */}
            <div className="relative hidden md:block">
              <button
                onClick={() => setShowOnlineDropdown(!showOnlineDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-purple-800 text-xs font-semibold text-slate-200 hover:border-amber-500 transition-colors cursor-pointer"
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
                      className="text-slate-400 hover:text-white text-xs border-0 bg-transparent cursor-pointer"
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
                              className="text-amber-400 hover:text-amber-300 p-1 border-0 bg-transparent cursor-pointer"
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

            {/* Profile badge */}
            <button
              onClick={() => setCurrentView('profile')}
              className={`flex items-center gap-2 font-bold text-xs uppercase px-3 py-1.5 rounded-full border border-purple-800 bg-[#160a29] cursor-pointer ${
                currentUser.isAdmin ? 'text-red-400' : currentUser.isModerator ? 'text-yellow-400' : 'text-purple-300'
              }`}
              title="Profil bearbeiten"
            >
              {currentUser.avatar_url ? (
                <img src={currentUser.avatar_url} alt={currentUser.username} className="w-5 h-5 rounded-full object-cover border border-amber-400/60" />
              ) : (
                <UserIcon className="w-4 h-4" />
              )}
              <span>{currentUser.username}</span>
            </button>

            {/* Logout button */}
            <button
              onClick={onLogout}
              className="px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-red-400 bg-purple-950/60 hover:bg-purple-900/80 rounded-full border border-purple-800 transition-all flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={onOpenAuth}
          className="ml-auto bg-gradient-to-r from-purple-950 via-purple-800 to-amber-400 hover:from-purple-900 hover:to-amber-300 text-white font-black text-xs uppercase px-5 py-2.5 rounded-full transition-all shadow-[0_0_20px_rgba(168,85,247,0.35)] border border-amber-400/50 cursor-pointer tracking-wider"
        >
          Login / Registrieren
        </button>
      )}
    </nav>
  );
};
