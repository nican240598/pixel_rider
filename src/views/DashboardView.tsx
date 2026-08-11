import React from 'react';
import { User, AppView } from '../types';
import { Map, MessageSquare, Calendar, MapPin, Wrench, ShoppingBag, Shield, Users } from 'lucide-react';

interface DashboardViewProps {
  currentUser: User;
  onNavigate: (view: AppView) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ currentUser, onNavigate }) => {
  return (
    <div className="py-6 max-w-6xl mx-auto px-4">
      <h2 className="text-3xl font-extrabold uppercase text-center mb-8">
        Crew <span className="text-[#c5a01a]">Area</span>
      </h2>

      {/* Admin Highlight Banner */}
      {(currentUser.isAdmin || currentUser.isModerator) && (
        <div
          onClick={() => onNavigate('admin')}
          className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-amber-500/20 via-purple-900/30 to-slate-900 border border-amber-500/50 hover:border-amber-400 transition-all cursor-pointer shadow-xl flex flex-col md:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500 text-black rounded-2xl">
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold uppercase text-amber-400">Admin & Moderator Center</h3>
              <p className="text-xs text-slate-300">
                Verwalte Invite-Codes, Mitglieder-Rechte und verwalte Einsprüche.
              </p>
            </div>
          </div>
          <button className="px-5 py-2 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase shadow-md border-0 cursor-pointer">
            Verwaltung Öffnen
          </button>
        </div>
      )}

      {/* Grid of Feature Cards */}
      <div className="flex flex-wrap justify-center gap-6">
        <div
          onClick={() => onNavigate('gpx')}
          className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] max-w-md min-h-[160px] bg-slate-900/90 border border-slate-800 p-8 rounded-2xl hover:border-yellow-400/60 transition-all cursor-pointer group shadow-lg flex items-center gap-5"
        >
          <div className="p-4 bg-yellow-400/10 text-yellow-400 rounded-xl group-hover:scale-110 transition-transform flex-shrink-0">
            <Map className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold uppercase text-white group-hover:text-yellow-400 transition-colors">
              GPX-Ausfahrten
            </h3>
            <p className="text-xs text-purple-200/80 mt-1.5 leading-relaxed">
              Routen entdecken und Tagestouren mit der Crew teilen.
            </p>
          </div>
        </div>

        <div
          onClick={() => onNavigate('forum')}
          className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] max-w-md min-h-[160px] bg-slate-900/90 border border-slate-800 p-8 rounded-2xl hover:border-yellow-400/60 transition-all cursor-pointer group shadow-lg flex items-center gap-5"
        >
          <div className="p-4 bg-purple-500/10 text-purple-400 rounded-xl group-hover:scale-110 transition-transform flex-shrink-0">
            <MessageSquare className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold uppercase text-white group-hover:text-yellow-400 transition-colors">
              Wissensaustausch
            </h3>
            <p className="text-xs text-purple-200/80 mt-1.5 leading-relaxed">
              Technische Fragen, Schrauber-Hilfe und Tourentipps im Forum.
            </p>
          </div>
        </div>

        <div
          onClick={() => onNavigate('events')}
          className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] max-w-md min-h-[160px] bg-slate-900/90 border border-slate-800 p-8 rounded-2xl hover:border-yellow-400/60 transition-all cursor-pointer group shadow-lg flex items-center gap-5"
        >
          <div className="p-4 bg-red-500/10 text-red-400 rounded-xl group-hover:scale-110 transition-transform flex-shrink-0">
            <Calendar className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold uppercase text-white group-hover:text-yellow-400 transition-colors">
              Exklusive Events
            </h3>
            <p className="text-xs text-purple-200/80 mt-1.5 leading-relaxed">
              Plane Ausfahrten und trage dich in Teilnehmerlisten ein.
            </p>
          </div>
        </div>

        <div
          onClick={() => onNavigate('map')}
          className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] max-w-md min-h-[160px] bg-slate-900/90 border border-slate-800 p-8 rounded-2xl hover:border-yellow-400/60 transition-all cursor-pointer group shadow-lg flex items-center gap-5"
        >
          <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-xl group-hover:scale-110 transition-transform flex-shrink-0">
            <MapPin className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold uppercase text-white group-hover:text-yellow-400 transition-colors">
              PixelMap
            </h3>
            <p className="text-xs text-purple-200/80 mt-1.5 leading-relaxed">
              Finde andere Pixel Rider in deiner Region & Entdecke POIs.
            </p>
          </div>
        </div>

        <div
          onClick={() => onNavigate('garage')}
          className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] max-w-md min-h-[160px] bg-slate-900/90 border border-slate-800 p-8 rounded-2xl hover:border-yellow-400/60 transition-all cursor-pointer group shadow-lg flex items-center gap-5"
        >
          <div className="p-4 bg-yellow-400/10 text-yellow-400 rounded-xl group-hover:scale-110 transition-transform flex-shrink-0">
            <Wrench className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold uppercase text-white group-hover:text-yellow-400 transition-colors">
              Pixel Garage
            </h3>
            <p className="text-xs text-purple-200/80 mt-1.5 leading-relaxed">
              Zeige dein Bike und entdecke die Umbauten der Crew.
            </p>
          </div>
        </div>

        <div
          onClick={() => onNavigate('market')}
          className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] max-w-md min-h-[160px] bg-slate-900/90 border border-slate-800 p-8 rounded-2xl hover:border-yellow-400/60 transition-all cursor-pointer group shadow-lg flex items-center gap-5"
        >
          <div className="p-4 bg-blue-500/10 text-blue-400 rounded-xl group-hover:scale-110 transition-transform flex-shrink-0">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold uppercase text-white group-hover:text-yellow-400 transition-colors">
              Flohmarkt
            </h3>
            <p className="text-xs text-purple-200/80 mt-1.5 leading-relaxed">
              Fahrzeuge, Teile und Kleidung kaufen und verkaufen.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
