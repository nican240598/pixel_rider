import React, { useState, useEffect, useMemo } from 'react';
import { User, AppView, CrewEvent, RidePing, PingParticipantStatus } from '../types';
import {
  Calendar,
  Radio,
  Plus,
  Maximize2,
  Shield,
  MapPin,
  Sun,
  CloudRain,
  Compass,
  Trash2,
  Edit,
  X,
  Clock,
  Users,
  Check,
} from 'lucide-react';

interface ExclusiveEventsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  events?: CrewEvent[];
  pings?: RidePing[];
  initialFilter?: 'all' | 'events' | 'pings' | 'archive';
  onToggleParticipation?: (eventId: string) => Promise<void> | void;
  onTogglePingStatus?: (pingId: string, status: PingParticipantStatus) => Promise<void> | void;
  onDeletePing?: (pingId: string) => Promise<void> | void;
  onNavigate: (view: AppView, tab?: 'all' | 'events' | 'pings' | 'archive') => void;
  showAlert?: (title: string, message: string, type?: 'success' | 'warning' | 'danger') => void;
}

// Weather forecast helper matching EventsView
const getEventWeather = (location?: string, dateTimeStr?: string) => {
  if (!dateTimeStr) {
    return {
      temp: 22,
      condition: 'Sonnig',
      icon: Sun,
      text: '☀️ 22°C – Perfektes Biker-Wetter mit bester Sicht und trockenem Asphalt!',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
    };
  }

  const date = new Date(dateTimeStr);
  const month = date.getMonth();
  const day = date.getDate();
  const locHash = ((location || 'Motorrad-Treff').length * 11 + day * 17 + month * 23) % 100;

  let temp = 20;
  if (month >= 5 && month <= 8) temp = 21 + (locHash % 9);
  else if (month === 4 || month === 9) temp = 15 + (locHash % 7);
  else temp = 9 + (locHash % 8);

  if (temp >= 22) {
    return {
      temp,
      condition: 'Kaiserwetter & Sonnenschein',
      icon: Sun,
      text: `☀️ ${temp}°C – Perfektes Biker-Wetter mit bester Sicht und trockenem Asphalt!`,
      color: 'text-amber-400',
      bg: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
    };
  } else if (temp >= 16) {
    return {
      temp,
      condition: 'Heiter bis leicht wolkig',
      icon: Sun,
      text: `⛅ ${temp}°C – Angenehme Fahrtemperatur, gute Straßenverhältnisse.`,
      color: 'text-sky-300',
      bg: 'bg-sky-500/15 border-sky-500/40 text-sky-300',
    };
  } else if (locHash % 3 === 0) {
    return {
      temp,
      condition: 'Leichte Regenschauer möglich',
      icon: CloudRain,
      text: `🌦️ ${temp}°C – Regengefahr! Empfehlung: Regenkombi & vorsichtige Fahrweise.`,
      color: 'text-blue-400',
      bg: 'bg-blue-500/15 border-blue-500/40 text-blue-300',
    };
  } else {
    return {
      temp,
      condition: 'Kühl & Trocken',
      icon: Sun,
      text: `🌤️ ${temp}°C – Frische Luft, aber trocken. Thermobekleidung empfohlen.`,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
    };
  }
};

export const ExclusiveEventsModal: React.FC<ExclusiveEventsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  events = [],
  pings = [],
  initialFilter = 'events',
  onToggleParticipation,
  onTogglePingStatus,
  onDeletePing,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<'events' | 'pings'>('events');

  useEffect(() => {
    if (isOpen) {
      if (initialFilter === 'pings') {
        setActiveTab('pings');
      } else {
        setActiveTab('events');
      }
    }
  }, [isOpen, initialFilter]);

  const nowMs = Date.now();
  const activePings = useMemo(() => {
    return pings
      .filter((p) => new Date(p.departure_time).getTime() >= nowMs - 2 * 60 * 60 * 1000)
      .sort((a, b) => new Date(a.departure_time).getTime() - new Date(b.departure_time).getTime());
  }, [pings, nowMs]);

  const activeEvents = useMemo(() => {
    return events
      .filter((e) => {
        if (e.is_archived) return false;
        if (!e.date_time) return false;
        const t = new Date(e.date_time).getTime();
        return !isNaN(t) && nowMs - t <= 24 * 60 * 60 * 1000;
      })
      .sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime());
  }, [events, nowMs]);

  const getPingCountdown = (departureIso: string) => {
    const depTime = new Date(departureIso).getTime();
    const diffMs = depTime - nowMs;
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins > 60) {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `in ${hours}h ${mins > 0 ? `${mins}m` : ''}`;
    } else if (diffMins > 0) {
      return `in ${diffMins} Min`;
    } else if (diffMins >= -120) {
      return 'Gestartet';
    }
    return 'Vorbei';
  };

  if (!isOpen) return null;

  const isUserInEvent = (ev: CrewEvent) => {
    const arr = Array.isArray(ev.participants) ? ev.participants : [];
    return arr.some(
      (p) =>
        p === currentUser.email ||
        p === currentUser.username ||
        (currentUser.email && p.toLowerCase() === currentUser.email.toLowerCase()) ||
        (currentUser.username && p.toLowerCase() === currentUser.username.toLowerCase())
    );
  };

  return (
    <div
      id="exclusive-events-modal"
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="max-w-6xl w-full my-auto animate-fadeIn bg-slate-950/95 border border-slate-800/80 rounded-3xl p-5 sm:p-8 shadow-2xl space-y-6 text-left relative max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button Top Right */}
        <button
          id="close-events-modal-btn"
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 cursor-pointer transition-colors z-20"
          title="Schließen"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 🌟 Top Navigation Bar (Segmented Control & Action) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800/80 flex-shrink-0 pr-12 sm:pr-0">
          <div className="p-1 bg-[#120724]/90 border border-purple-800/70 rounded-2xl md:rounded-full shadow-lg flex items-center gap-1">
            {/* EXKLUSIVE EVENTS TAB */}
            <button
              id="modal-tab-events"
              type="button"
              onClick={() => setActiveTab('events')}
              className={`px-4 sm:px-5 py-2 rounded-xl md:rounded-full text-xs md:text-sm font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border-0 select-none min-h-[40px] ${
                activeTab === 'events'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                  : 'text-slate-300 hover:text-white hover:bg-purple-950/60 bg-transparent'
              }`}
            >
              <Calendar className="w-4 h-4 text-current" />
              <span>Exklusive Events</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-black ${
                activeTab === 'events' ? 'bg-black/25 text-black' : 'bg-purple-900/60 text-amber-300'
              }`}>
                {activeEvents.length}
              </span>
            </button>

            {/* FEIERABEND-PINGS TAB */}
            <button
              id="modal-tab-pings"
              type="button"
              onClick={() => setActiveTab('pings')}
              className={`px-4 sm:px-5 py-2 rounded-xl md:rounded-full text-xs md:text-sm font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border-0 select-none min-h-[40px] ${
                activeTab === 'pings'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                  : 'text-slate-300 hover:text-white hover:bg-purple-950/60 bg-transparent'
              }`}
            >
              <Radio className={`w-4 h-4 text-current ${activePings.length > 0 ? 'animate-pulse' : ''}`} />
              <span>Feierabend-Pings</span>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-black ${
                  activeTab === 'pings'
                    ? 'bg-black/25 text-black'
                    : activePings.length > 0
                    ? 'bg-red-600 text-white animate-pulse'
                    : 'bg-purple-900/60 text-amber-300'
                }`}
              >
                {activePings.length}
              </span>
            </button>
          </div>

          {/* + EVENT PLANEN (Yellow Pill Top Right) */}
          <div className="flex items-center gap-2.5">
            <button
              id="modal-plan-event-btn"
              type="button"
              onClick={() => {
                onClose();
                onNavigate('events', activeTab === 'pings' ? 'pings' : 'events');
              }}
              className="bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-black text-xs uppercase px-5 py-2.5 rounded-full transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center gap-2 border-0 cursor-pointer min-h-[40px]"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>{activeTab === 'events' ? 'Event Planen' : 'Ping Starten'}</span>
            </button>
          </div>
        </div>

        {/* Scrollable Container with all Planned Events in the exact Hero/Spotlight Card Style */}
        <div className="overflow-y-auto pr-1 space-y-6 flex-1 custom-scrollbar">
          {/* TAB 1: PLANNED CREW EVENTS (All Events in full Spotlight Style from Screenshot) */}
          {activeTab === 'events' && (
            <div className="space-y-6">
              {activeEvents.length === 0 ? (
                <div className="w-full text-center py-16 bg-slate-900/60 border border-slate-800 rounded-3xl p-8 space-y-3">
                  <Calendar className="w-16 h-16 text-amber-500/40 mx-auto" />
                  <h3 className="text-lg font-black uppercase text-amber-400">Keine aktuellen Events geplant</h3>
                  <p className="text-xs text-slate-400">Erstelle jetzt die erste offizielle Ausfahrt für deine Crew!</p>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigate('events', 'events');
                    }}
                    className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase rounded-xl cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Erste Ausfahrt eintragen
                  </button>
                </div>
              ) : (
                activeEvents.map((ev, idx) => {
                  const isParticipating = isUserInEvent(ev);
                  const weather = getEventWeather(ev.location, ev.date_time);
                  const partCount = Array.isArray(ev.participants) ? ev.participants.length : 0;
                  const isOwner =
                    currentUser.username === ev.author ||
                    currentUser.username === ev.organizer ||
                    currentUser.isAdmin ||
                    currentUser.isModerator;
                  const isFirst = idx === 0;

                  return (
                    <div
                      key={ev.id}
                      id={`event-card-${ev.id}`}
                      className="w-full bg-slate-900/90 border-2 border-amber-400 rounded-3xl overflow-hidden shadow-[0_0_35px_rgba(250,204,21,0.25)] p-6 md:p-8 relative flex flex-col md:flex-row gap-6 lg:gap-8 items-stretch transition-all"
                    >
                      {/* Left Hero Image/Graphic */}
                      <div
                        onClick={() => {
                          onClose();
                          onNavigate('events', 'events');
                        }}
                        className="w-full md:w-5/12 lg:w-1/2 flex flex-col justify-between min-h-[260px] md:min-h-[360px] relative rounded-2xl overflow-hidden bg-black border border-amber-500/30 group cursor-pointer"
                      >
                        <img
                          src={
                            ev.image_data ||
                            'https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=1200'
                          }
                          alt={ev.title}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                        {/* Top Badges on Image */}
                        <div className="relative z-10 p-4 flex justify-between items-start">
                          <span
                            className={`text-white font-black text-xs uppercase px-4 py-1.5 rounded-full shadow-xl inline-flex items-center gap-1.5 tracking-wide ${
                              isFirst ? 'bg-red-600 animate-pulse' : 'bg-amber-600'
                            }`}
                          >
                            ⭐ {isFirst ? 'NÄCHSTES EVENT (SPOTLIGHT)' : `AUSFAHRT #${idx + 1}`}
                          </span>
                          <span className="bg-black/70 backdrop-blur-md text-amber-300 text-xs font-black px-3 py-1 rounded-full border border-amber-500/30 flex items-center gap-1">
                            <Maximize2 className="w-3.5 h-3.5" /> Details
                          </span>
                        </div>

                        {/* Bottom Image Info */}
                        <div className="relative z-10 p-5">
                          <p className="text-xs text-amber-300 font-black uppercase tracking-wider mb-1">
                            ORGANISATOR: {ev.organizer || ev.author || 'Crew'}
                          </p>
                          <h4 className="text-xl md:text-2xl font-black text-white uppercase drop-shadow-md tracking-wide">
                            {ev.title}
                          </h4>
                        </div>
                      </div>

                      {/* Right Event Details */}
                      <div className="w-full md:w-7/12 lg:w-1/2 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs bg-amber-500/20 text-amber-300 font-black px-3 py-1 rounded-full border border-amber-500/40 uppercase tracking-wide">
                              {isFirst ? 'HAUPT-AUSFAHRT (SPOTLIGHT)' : 'CREW-AUSFAHRT'}
                            </span>
                            <span className="text-xs text-purple-300/90 font-black flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-purple-400" />
                              {partCount} {partCount === 1 ? 'Angemeldet' : 'Angemeldet'}
                            </span>
                          </div>

                          <h3
                            onClick={() => {
                              onClose();
                              onNavigate('events', 'events');
                            }}
                            className="text-2xl md:text-3xl font-black uppercase text-amber-400 mb-3 leading-tight tracking-wide cursor-pointer hover:underline"
                          >
                            {ev.title}
                          </h3>

                          {/* Weather Forecast Badge */}
                          <div className={`p-3.5 rounded-xl border mb-3 flex items-center gap-3 ${weather.bg}`}>
                            <weather.icon className={`w-6 h-6 ${weather.color} flex-shrink-0 animate-bounce`} />
                            <div>
                              <span className="text-[10px] uppercase font-black text-slate-400 block tracking-wider">
                                WETTERBERICHT AM AUSFAHRTSTAG
                              </span>
                              <p className="text-xs font-black m-0 leading-snug">{weather.text}</p>
                            </div>
                          </div>

                          {/* 2 Detail Info Boxes */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
                              <Calendar className="w-5 h-5 text-amber-400 flex-shrink-0" />
                              <div>
                                <span className="text-[10px] text-slate-400 uppercase font-black block tracking-wider">
                                  DATUM & UHRZEIT
                                </span>
                                <strong className="text-xs text-white font-bold">
                                  {ev.date_time
                                    ? `${new Date(ev.date_time).toLocaleDateString('de-DE', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                      })}, ${new Date(ev.date_time).toLocaleTimeString('de-DE', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })} Uhr`
                                    : 'Noch offen'}
                                </strong>
                              </div>
                            </div>

                            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
                              <MapPin className="w-5 h-5 text-red-400 flex-shrink-0" />
                              <div>
                                <span className="text-[10px] text-slate-400 uppercase font-black block tracking-wider">
                                  TREFFPUNKT
                                </span>
                                <strong className="text-xs text-white font-bold line-clamp-1">
                                  {ev.location || 'Noch offen'}
                                </strong>
                              </div>
                            </div>
                          </div>

                          {/* Tour Description Box */}
                          {ev.description && (
                            <div className="bg-slate-950/90 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 mb-4 leading-relaxed line-clamp-2">
                              <strong className="text-amber-400 block mb-1 uppercase font-black text-[10px] tracking-wider">
                                INFORMATIONEN ZUR TOUR:
                              </strong>
                              {ev.description}
                            </div>
                          )}
                        </div>

                        {/* Actions Bottom */}
                        <div className="pt-3 border-t border-slate-800/80 space-y-2">
                          <div className="flex flex-wrap gap-2">
                            {/* Green / Amber Participate Button */}
                            {onToggleParticipation && (
                              <button
                                type="button"
                                onClick={() => onToggleParticipation(ev.id)}
                                className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 transition-all border-0 cursor-pointer shadow-lg tracking-wider ${
                                  isParticipating
                                    ? 'bg-emerald-500 hover:bg-emerald-400 text-black'
                                    : 'bg-amber-500 hover:bg-amber-400 text-black'
                                }`}
                              >
                                <Shield className="w-4 h-4 stroke-[2.5]" />
                                {isParticipating ? '✓ DU FÄHRST MIT!' : 'JETZT ANMELDEN'}
                              </button>
                            )}

                            {/* Details & Wetter Button */}
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onNavigate('events', 'events');
                              }}
                              className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-xl font-black text-xs uppercase flex items-center gap-1.5 cursor-pointer transition-all tracking-wider"
                            >
                              <Maximize2 className="w-4 h-4" /> Details & Wetter
                            </button>

                            {/* Compass Button */}
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onNavigate('events', 'events');
                              }}
                              className="py-3 px-3 bg-indigo-950 hover:bg-indigo-900 text-indigo-200 border border-indigo-700 rounded-xl font-black text-xs flex items-center justify-center gap-1 cursor-pointer transition-all"
                              title="Treffpunkt & Navigation öffnen"
                            >
                              <Compass className="w-4 h-4 text-amber-400" />
                            </button>
                          </div>

                          {/* Owner Edit / Delete Links */}
                          {isOwner && (
                            <div className="flex justify-end gap-4 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onNavigate('events', 'events');
                                }}
                                className="text-xs text-amber-400 hover:underline border-0 bg-transparent cursor-pointer flex items-center gap-1 font-bold"
                              >
                                <Edit className="w-3.5 h-3.5" /> Event Bearbeiten
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: FEIERABEND PINGS (Red / Rush Style) */}
          {activeTab === 'pings' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-red-400">
                    ⚡ Spontane Feierabend-Runden & Live-Pings ({pings.length})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigate('events', 'pings');
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Plus className="w-3.5 h-3.5" /> Ping Erstellen
                </button>
              </div>

              {pings.length === 0 ? (
                <div className="bg-slate-900/60 p-8 rounded-3xl border border-dashed border-red-500/20 text-center space-y-2">
                  <Radio className="w-10 h-10 text-red-500/40 mx-auto" />
                  <p className="text-sm font-black text-white uppercase">Keine aktiven Feierabend-Pings</p>
                  <p className="text-xs text-slate-400">
                    Starte spontan eine Ausfahrt für heute Nachmittag oder den Feierabend und lade deine Crew ein!
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigate('events', 'pings');
                    }}
                    className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase rounded-xl cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Spontane Runde starten
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {pings.map((ping) => {
                    const userStatus = ping.participants?.find(
                      (p) => p.username.toLowerCase() === currentUser.username.toLowerCase()
                    )?.status;
                    const goingCount = (ping.participants || []).filter((p) => p.status === 'going').length;
                    const maybeCount = (ping.participants || []).filter((p) => p.status === 'maybe').length;
                    const countdown = getPingCountdown(ping.departure_time);
                    const isCreator = ping.creator_username.toLowerCase() === currentUser.username.toLowerCase();

                    return (
                      <div
                        key={ping.id}
                        className="bg-slate-900/90 hover:bg-slate-900 border-2 border-red-500/30 hover:border-red-400/80 p-4 rounded-2xl transition-all flex flex-col justify-between text-left relative overflow-hidden shadow-lg group"
                      >
                        <div className="space-y-3">
                          {/* Badges */}
                          <div className="flex items-center justify-between gap-1.5">
                            <span
                              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${
                                ping.pace === 'Sportlich'
                                  ? 'bg-red-500/20 text-red-300 border-red-500/40'
                                  : ping.pace === 'Flott'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              }`}
                            >
                              {ping.pace}
                            </span>
                            <span className="font-mono font-bold text-[10px] text-red-300 bg-red-950/90 px-2 py-0.5 rounded-lg border border-red-500/40 flex items-center gap-1 shadow-sm">
                              <Clock className="w-2.5 h-2.5 animate-pulse text-red-400" />
                              {countdown}
                            </span>
                          </div>

                          {/* Title & Creator */}
                          <div>
                            <h4 className="text-sm font-black uppercase text-white group-hover:text-red-300 transition-colors truncate">
                              {ping.title}
                            </h4>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-1 truncate">
                              {ping.creator_avatar ? (
                                <img
                                  src={ping.creator_avatar}
                                  alt={ping.creator_username}
                                  className="w-4 h-4 rounded-full object-cover border border-slate-700"
                                />
                              ) : (
                                <span className="w-4 h-4 rounded-full bg-slate-800 text-[9px] flex items-center justify-center font-bold text-slate-300">
                                  {ping.creator_username.charAt(0).toUpperCase()}
                                </span>
                              )}
                              <span className="truncate">@{ping.creator_username}</span>
                            </div>
                          </div>

                          {/* Route details */}
                          <div className="bg-slate-950/90 p-2.5 rounded-xl border border-slate-800 text-[11px] space-y-1.5">
                            <div className="flex items-center gap-2 text-slate-200 truncate">
                              <MapPin className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                              <span className="truncate font-medium">Treffpunkt: {ping.meeting_point}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400 truncate">
                              <Compass className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                              <span className="truncate">Ziel: {ping.destination}</span>
                            </div>
                          </div>

                          {ping.description && (
                            <p className="text-[11px] text-slate-300 italic line-clamp-2 leading-relaxed">
                              "{ping.description}"
                            </p>
                          )}
                        </div>

                        {/* Actions Footer */}
                        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1 text-[11px] text-slate-300 font-bold">
                            <Users className="w-3.5 h-3.5 text-red-400" />
                            <span>
                              {goingCount} dabei{maybeCount > 0 ? ` · ${maybeCount}?` : ''}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onTogglePingStatus && onTogglePingStatus(ping.id, 'going')}
                              className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase flex items-center gap-1 transition cursor-pointer border ${
                                userStatus === 'going'
                                  ? 'bg-emerald-500 text-black border-emerald-400 shadow-sm'
                                  : 'bg-slate-950 text-slate-300 hover:text-white border-slate-800 hover:border-emerald-500/50'
                              }`}
                            >
                              <Check className="w-3 h-3" />
                              <span>{userStatus === 'going' ? 'Dabei' : 'Mitfahren'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => onTogglePingStatus && onTogglePingStatus(ping.id, 'maybe')}
                              className={`px-2 py-1 rounded-xl text-[10px] font-black transition cursor-pointer border ${
                                userStatus === 'maybe'
                                  ? 'bg-amber-500 text-black border-amber-400 shadow-sm'
                                  : 'bg-slate-950 text-slate-400 hover:text-white border-slate-800 hover:border-amber-500/50'
                              }`}
                              title="Unsicher / Vielleicht"
                            >
                              ?
                            </button>

                            {(isCreator || currentUser.isAdmin) && onDeletePing && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm('Feierabend-Ping wirklich löschen?')) {
                                    onDeletePing(ping.id);
                                  }
                                }}
                                className="p-1.5 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-400 border border-red-500/30 text-[10px] transition cursor-pointer"
                                title="Ping löschen"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
