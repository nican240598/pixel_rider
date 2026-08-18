import React, { useState, useEffect } from 'react';
import { AppView, User, CrewMember } from '../types';
import { 
  Home, 
  Calendar, 
  MapPin, 
  Wrench, 
  Menu, 
  X, 
  MessageSquare, 
  ShoppingBag, 
  Compass, 
  Users, 
  User as UserIcon, 
  ShieldAlert, 
  Bell, 
  LogOut, 
  ChevronRight,
  Scale
} from 'lucide-react';

interface MobileNavProps {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  currentUser?: User | null;
  crewMembers?: CrewMember[];
  allUsers?: any[];
  unreadAdminNotifs?: number;
  unreadUserNotifs?: number;
  onOpenUserNotifs?: () => void;
  onLogout?: () => void;
  onOpenProfileSection?: (section: 'name_profile' | 'credentials' | 'garage' | 'market' | 'tile_layout' | 'legal') => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  currentView,
  setCurrentView,
  currentUser,
  crewMembers = [],
  allUsers = [],
  unreadAdminNotifs = 0,
  unreadUserNotifs = 0,
  onOpenUserNotifs,
  onLogout,
  onOpenProfileSection,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Compute effective user profile picture with comprehensive fallbacks
  const userAvatar = currentUser?.avatar_url ||
    allUsers?.find((u) => u.username?.toLowerCase() === currentUser?.username?.toLowerCase())?.avatar_url ||
    crewMembers?.find((c) => c.name?.toLowerCase() === currentUser?.username?.toLowerCase())?.image_url ||
    (currentUser?.username?.toLowerCase() === 'nican' ? 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=1000' : '');

  // Close drawer on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  const handleNavClick = (view: AppView) => {
    setCurrentView(view);
    setIsMenuOpen(false);
  };

  const isMenuSectionActive = ['forum', 'market', 'gpx', 'profile', 'admin', 'privacy', 'impressum'].includes(currentView);
  const totalNotifications = unreadAdminNotifs + unreadUserNotifs;

  return (
    <>
      {/* Mobile Bottom Navigation Bar */}
      <nav 
        role="navigation" 
        aria-label="Mobile Hauptnavigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0e041d]/95 backdrop-blur-xl border-t border-amber-500/30 shadow-[0_-8px_30px_rgba(0,0,0,0.8)] pb-[max(env(safe-area-inset-bottom),8px)] pt-1.5 px-3 flex justify-around items-center select-none"
      >
        {/* 1. Home / Dashboard */}
        <button
          onClick={() => handleNavClick('dashboard')}
          aria-label="Dashboard aufrufen"
          aria-current={currentView === 'dashboard' ? 'page' : undefined}
          className={`flex-1 min-h-[50px] flex flex-col items-center justify-center gap-1 transition-all rounded-xl cursor-pointer border-0 bg-transparent active:scale-90 ${
            currentView === 'dashboard'
              ? 'text-amber-400 font-extrabold drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]'
              : 'text-slate-300 hover:text-white font-medium'
          }`}
        >
          <Home className={`w-5 h-5 transition-transform ${currentView === 'dashboard' ? 'scale-110 stroke-[2.5]' : ''}`} />
          <span className="text-[11px] tracking-wide leading-none">Home</span>
          {currentView === 'dashboard' && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#facc15] -mt-0.5" />
          )}
        </button>

        {/* 2. Events */}
        <button
          onClick={() => handleNavClick('events')}
          aria-label="Events und Ausfahrten aufrufen"
          aria-current={currentView === 'events' ? 'page' : undefined}
          className={`flex-1 min-h-[50px] flex flex-col items-center justify-center gap-1 transition-all rounded-xl cursor-pointer border-0 bg-transparent active:scale-90 ${
            currentView === 'events'
              ? 'text-amber-400 font-extrabold drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]'
              : 'text-slate-300 hover:text-white font-medium'
          }`}
        >
          <Calendar className={`w-5 h-5 transition-transform ${currentView === 'events' ? 'scale-110 stroke-[2.5]' : ''}`} />
          <span className="text-[11px] tracking-wide leading-none">Events</span>
          {currentView === 'events' && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#facc15] -mt-0.5" />
          )}
        </button>

        {/* 3. PixelMap (GPS & Treffpunkte) */}
        <button
          onClick={() => handleNavClick('map')}
          aria-label="PixelMap Karte aufrufen"
          aria-current={currentView === 'map' ? 'page' : undefined}
          className={`flex-1 min-h-[50px] flex flex-col items-center justify-center gap-1 transition-all rounded-xl cursor-pointer border-0 bg-transparent active:scale-90 ${
            currentView === 'map'
              ? 'text-amber-400 font-extrabold drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]'
              : 'text-slate-300 hover:text-white font-medium'
          }`}
        >
          <MapPin className={`w-5 h-5 transition-transform ${currentView === 'map' ? 'scale-110 stroke-[2.5]' : ''}`} />
          <span className="text-[11px] tracking-wide leading-none">Karte</span>
          {currentView === 'map' && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#facc15] -mt-0.5" />
          )}
        </button>

        {/* 4. Garage */}
        <button
          onClick={() => handleNavClick('garage')}
          aria-label="Pixel Garage aufrufen"
          aria-current={currentView === 'garage' ? 'page' : undefined}
          className={`flex-1 min-h-[50px] flex flex-col items-center justify-center gap-1 transition-all rounded-xl cursor-pointer border-0 bg-transparent active:scale-90 ${
            currentView === 'garage'
              ? 'text-amber-400 font-extrabold drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]'
              : 'text-slate-300 hover:text-white font-medium'
          }`}
        >
          <Wrench className={`w-5 h-5 transition-transform ${currentView === 'garage' ? 'scale-110 stroke-[2.5]' : ''}`} />
          <span className="text-[11px] tracking-wide leading-none">Garage</span>
          {currentView === 'garage' && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#facc15] -mt-0.5" />
          )}
        </button>

        {/* 5. Menü (More Drawer Trigger) */}
        <button
          onClick={() => setIsMenuOpen(true)}
          aria-label="Erweitertes Menü öffnen"
          aria-expanded={isMenuOpen}
          className={`flex-1 min-h-[50px] flex flex-col items-center justify-center gap-1 relative transition-all rounded-xl cursor-pointer border-0 bg-transparent active:scale-90 ${
            isMenuSectionActive || isMenuOpen
              ? 'text-amber-400 font-extrabold drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]'
              : 'text-slate-300 hover:text-white font-medium'
          }`}
        >
          <div className="relative">
            <Menu className={`w-5 h-5 transition-transform ${isMenuSectionActive || isMenuOpen ? 'scale-110 stroke-[2.5]' : ''}`} />
            {totalNotifications > 0 && (
              <span className="absolute -top-1 -right-2 bg-red-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-lg border border-slate-950">
                {totalNotifications > 9 ? '9+' : totalNotifications}
              </span>
            )}
          </div>
          <span className="text-[11px] tracking-wide leading-none">Menü</span>
          {isMenuSectionActive && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#facc15] -mt-0.5" />
          )}
        </button>
      </nav>

      {/* Accessible Mobile Menu Sheet / Drawer Backdrop */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm transition-opacity animate-fadeIn md:hidden"
          onClick={() => setIsMenuOpen(false)}
          role="presentation"
        >
          {/* Drawer Container */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Pixel Rider Menü"
            className="fixed bottom-0 left-0 right-0 max-h-[85vh] bg-[#120724] border-t-2 border-amber-400 rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-purple-900/60 bg-slate-950/80">
              <div 
                onClick={() => handleNavClick('profile')}
                className="flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity"
              >
                <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400 font-bold overflow-hidden shrink-0">
                  {userAvatar ? (
                    <img src={userAvatar} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <UserIcon className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="text-white font-extrabold text-sm tracking-wide flex items-center gap-1.5">
                    <span>@{currentUser?.username || 'Biker'}</span>
                    <span className="text-[10px] text-amber-400 font-normal">➔ Profil</span>
                  </div>
                  <div className="text-[10px] text-amber-300 uppercase font-semibold">
                    {currentUser?.isAdmin ? '👑 Administrator' : currentUser?.isModerator ? '🛡️ Moderator' : '🏍️ Crew Member'}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsMenuOpen(false)}
                aria-label="Menü schließen"
                className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white active:scale-95 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Navigation Grid & List */}
            <div className="p-4 overflow-y-auto space-y-3 pb-[max(env(safe-area-inset-bottom),24px)]">
              {/* Admin Shortcut Banner (if admin/moderator) */}
              {(currentUser?.isAdmin || currentUser?.isModerator) && (
                <button
                  onClick={() => handleNavClick('admin')}
                  className={`w-full min-h-[50px] p-3.5 rounded-2xl flex items-center justify-between gap-3 border transition-all cursor-pointer ${
                    currentView === 'admin'
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                      : 'bg-gradient-to-r from-amber-950/60 to-purple-950/60 hover:from-amber-900/60 hover:to-purple-900/60 text-amber-300 border-amber-500/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center">
                      <ShieldAlert className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-extrabold uppercase">Anfragen & Freigaben</div>
                      <div className="text-[10px] text-amber-200/80">Zentrales Admin-Cockpit</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadAdminNotifs > 0 && (
                      <span className="bg-red-600 text-white text-xs font-black px-2 py-0.5 rounded-full shadow-md">
                        {unreadAdminNotifs} neu
                      </span>
                    )}
                    <ChevronRight className="w-5 h-5 opacity-70" />
                  </div>
                </button>
              )}

              {/* Navigation Items Grid */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                {/* Forum */}
                <button
                  onClick={() => handleNavClick('forum')}
                  className={`min-h-[56px] p-3 rounded-xl flex items-center gap-3 border transition-all cursor-pointer ${
                    currentView === 'forum'
                      ? 'bg-amber-500/25 border-amber-400 text-amber-300'
                      : 'bg-slate-900/90 border-purple-900/50 text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <MessageSquare className="w-5 h-5 text-purple-400 shrink-0" />
                  <div className="text-left leading-tight">
                    <div className="text-xs font-bold">Forum</div>
                    <div className="text-[10px] text-slate-400">Community Chat</div>
                  </div>
                </button>

                {/* Marktplatz */}
                <button
                  onClick={() => handleNavClick('market')}
                  className={`min-h-[56px] p-3 rounded-xl flex items-center gap-3 border transition-all cursor-pointer ${
                    currentView === 'market'
                      ? 'bg-amber-500/25 border-amber-400 text-amber-300'
                      : 'bg-slate-900/90 border-purple-900/50 text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <ShoppingBag className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div className="text-left leading-tight">
                    <div className="text-xs font-bold">Marktplatz</div>
                    <div className="text-[10px] text-slate-400">Bikes & Teile</div>
                  </div>
                </button>

                {/* GPX Touren */}
                <button
                  onClick={() => handleNavClick('gpx')}
                  className={`min-h-[56px] p-3 rounded-xl flex items-center gap-3 border transition-all cursor-pointer ${
                    currentView === 'gpx'
                      ? 'bg-amber-500/25 border-amber-400 text-amber-300'
                      : 'bg-slate-900/90 border-purple-900/50 text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Compass className="w-5 h-5 text-cyan-400 shrink-0" />
                  <div className="text-left leading-tight">
                    <div className="text-xs font-bold">GPX Touren</div>
                    <div className="text-[10px] text-slate-400">Routen & Tracks</div>
                  </div>
                </button>

                {/* Crew & Landing */}
                <button
                  onClick={() => handleNavClick('landing')}
                  className={`min-h-[56px] p-3 rounded-xl flex items-center gap-3 border transition-all cursor-pointer ${
                    currentView === 'landing'
                      ? 'bg-amber-500/25 border-amber-400 text-amber-300'
                      : 'bg-slate-900/90 border-purple-900/50 text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Users className="w-5 h-5 text-yellow-400 shrink-0" />
                  <div className="text-left leading-tight">
                    <div className="text-xs font-bold">Crew Übersicht</div>
                    <div className="text-[10px] text-slate-400">Member Cards</div>
                  </div>
                </button>
              </div>

              {/* User Profile & Actions */}
              <div className="border-t border-purple-900/50 pt-3 space-y-2">
                <button
                  onClick={() => handleNavClick('profile')}
                  className={`w-full min-h-[48px] p-3 rounded-xl flex items-center justify-between border transition-all cursor-pointer ${
                    currentView === 'profile'
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'bg-slate-900/80 border-slate-800 text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <UserIcon className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold">Mein Profil & Einstellungen</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>

                {/* Founder Only: Impressum & Datenschutz bearbeiten */}
                {currentUser &&
                  (currentUser.username?.toLowerCase() === 'nican' ||
                    currentUser.email?.toLowerCase() === 'nico.anschau98@gmail.com' ||
                    currentUser.role === 'founder' ||
                    currentUser.role === 'admin' ||
                    currentUser.isAdmin) && (
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        if (onOpenProfileSection) {
                          onOpenProfileSection('legal');
                        } else {
                          setCurrentView('profile');
                        }
                      }}
                      className="w-full min-h-[48px] p-3 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/40 text-amber-300 flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <Scale className="w-4 h-4 text-amber-400" />
                        <div className="text-left">
                          <div className="text-xs font-bold">
                            <span>Impressum & Datenschutz</span>
                          </div>
                          <div className="text-[10px] text-amber-200/70">Rechtliche Texte direkt bearbeiten</div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-amber-400/80" />
                    </button>
                  )}

                {onOpenUserNotifs && (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenUserNotifs();
                    }}
                    className="w-full min-h-[48px] p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-200 hover:bg-slate-800 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Bell className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-bold">Benachrichtigungen</span>
                    </div>
                    {unreadUserNotifs > 0 && (
                      <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {unreadUserNotifs}
                      </span>
                    )}
                  </button>
                )}

                {onLogout && (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full min-h-[48px] p-3 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 text-red-300 hover:text-red-100 flex items-center justify-center gap-2 font-bold text-xs transition-colors cursor-pointer mt-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Abmelden</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
