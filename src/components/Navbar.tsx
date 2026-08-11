import React, { useState } from 'react';
import { User, AppView, CrewEvent, UserNotification } from '../types';
import { Shield, Bell, User as UserIcon, LogOut, Grid, Wrench, MessageSquare, Calendar, MapPin, Radio, Users } from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  nextEvent: CrewEvent | null;
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
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  currentView,
  setCurrentView,
  nextEvent,
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
}) => {
  const [showOnlineDropdown, setShowOnlineDropdown] = useState(false);

  // Format countdown string for ticker
  const getTickerText = () => {
    if (!nextEvent) return 'Aktuell keine Events geplant';
    const evTime = new Date(nextEvent.date_time).getTime();
    const now = Date.now();
    const diff = evTime - now;
    if (diff <= 0) {
      return `LIVE: ${nextEvent.title} - LÄUFT JETZT!`;
    }
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / (1000 * 60)) % 60);
    const timeStr = `${d > 0 ? d + 'T ' : ''}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    return `NEXT RIDE: ${nextEvent.title} (START IN ${timeStr})`;
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

          {/* Event Liveticker (Center) */}
          <div className="hidden lg:flex flex-1 justify-center max-w-md mx-auto">
            <button
              onClick={() => setCurrentView('events')}
              className="bg-yellow-400/10 border border-yellow-400/80 rounded-full px-5 py-2 text-xs font-bold uppercase text-yellow-300 flex items-center gap-2 hover:bg-yellow-400/20 transition-all text-ellipsis overflow-hidden whitespace-nowrap cursor-pointer shadow-[0_0_15px_rgba(250,204,21,0.2)]"
            >
              <Radio className="w-4 h-4 text-yellow-400 animate-pulse flex-shrink-0" />
              <span className="truncate">{getTickerText()}</span>
            </button>
          </div>

          {/* Right Section: Badges, Profile & Logout */}
          <div className="flex items-center gap-4 ml-auto">
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
