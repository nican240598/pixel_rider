import React from 'react';
import { AppView } from '../types';
import { Home, Users, Calendar, MapPin, User as UserIcon } from 'lucide-react';

interface MobileNavProps {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  onToggleCrewPanel: () => void;
  onToggleEventsPanel: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  currentView,
  setCurrentView,
  onToggleCrewPanel,
  onToggleEventsPanel,
}) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-[65px] bg-slate-950/95 backdrop-blur-lg border-t border-purple-900/50 flex justify-around items-center z-40 px-2">
      <button
        onClick={() => setCurrentView('dashboard')}
        className={`flex flex-col items-center gap-1 text-[10px] font-bold uppercase transition-colors bg-transparent border-0 cursor-pointer ${
          currentView === 'dashboard' ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Home className="w-5 h-5" />
        <span>Home</span>
      </button>

      <button
        onClick={onToggleCrewPanel}
        className="flex flex-col items-center gap-1 text-[10px] font-bold uppercase text-slate-400 hover:text-slate-200 transition-colors bg-transparent border-0 cursor-pointer"
      >
        <Users className="w-5 h-5" />
        <span>Crew</span>
      </button>

      <button
        onClick={onToggleEventsPanel}
        className="flex flex-col items-center gap-1 text-[10px] font-bold uppercase text-slate-400 hover:text-slate-200 transition-colors bg-transparent border-0 cursor-pointer"
      >
        <Calendar className="w-5 h-5" />
        <span>Events</span>
      </button>

      <button
        onClick={() => setCurrentView('map')}
        className={`flex flex-col items-center gap-1 text-[10px] font-bold uppercase transition-colors bg-transparent border-0 cursor-pointer ${
          currentView === 'map' ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <MapPin className="w-5 h-5" />
        <span>Map</span>
      </button>

      <button
        onClick={() => setCurrentView('profile')}
        className={`flex flex-col items-center gap-1 text-[10px] font-bold uppercase transition-colors bg-transparent border-0 cursor-pointer ${
          currentView === 'profile' ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <UserIcon className="w-5 h-5" />
        <span>Profil</span>
      </button>
    </div>
  );
};
