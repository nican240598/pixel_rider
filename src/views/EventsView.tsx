import React, { useState } from 'react';
import { CrewEvent, User } from '../types';
import { Calendar, Plus, MapPin, Shield, Edit, Trash2, X, Compass, Sun, CloudRain, Maximize2, ExternalLink, Thermometer, Wind, UserCheck } from 'lucide-react';

interface EventsViewProps {
  currentUser: User;
  events: CrewEvent[];
  onAddEvent: (event: Omit<CrewEvent, 'id' | 'participants'>) => void;
  onEditEvent: (id: string, event: Partial<CrewEvent>) => void;
  onDeleteEvent: (id: string) => void;
  onToggleParticipation: (eventId: string) => void;
  onCalculateMeetingPoint: (event: CrewEvent) => void;
}

// Weather forecast calculation helper
export const getEventWeather = (location?: string, dateTimeStr?: string) => {
  if (!dateTimeStr) {
    return {
      temp: 22,
      condition: 'Sonnig',
      icon: Sun,
      text: '☀️ 22°C – Optimales Biker-Wetter!',
      badge: '☀️ 22°C (Kaiserwetter)',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300'
    };
  }

  const date = new Date(dateTimeStr);
  const month = date.getMonth();
  const day = date.getDate();
  const locHash = ((location || 'Motorrad-Treff').length * 11 + day * 17 + month * 23) % 100;

  let temp = 20;
  if (month >= 5 && month <= 8) temp = 21 + (locHash % 9); // Summer 21-29°C
  else if (month === 4 || month === 9) temp = 15 + (locHash % 7); // Spring/Autumn 15-21°C
  else temp = 9 + (locHash % 8); // Winter 9-16°C

  if (temp >= 22) {
    return {
      temp,
      condition: 'Kaiserwetter & Sonnenschein',
      icon: Sun,
      text: `☀️ ${temp}°C – Perfektes Biker-Wetter mit bester Sichte und trockenem Asphalt!`,
      badge: `☀️ ${temp}°C (Sonnig & Trocken)`,
      color: 'text-amber-400',
      bg: 'bg-amber-500/15 border-amber-500/40 text-amber-300'
    };
  } else if (temp >= 16) {
    return {
      temp,
      condition: 'Heiter bis leicht wolkig',
      icon: Sun,
      text: `⛅ ${temp}°C – Angenehme Fahrtemperatur, gute Straßenverhältnisse.`,
      badge: `⛅ ${temp}°C (Heiter & Angenehm)`,
      color: 'text-sky-300',
      bg: 'bg-sky-500/15 border-sky-500/40 text-sky-300'
    };
  } else if (locHash % 3 === 0) {
    return {
      temp,
      condition: 'Leichte Regenschauer möglich',
      icon: CloudRain,
      text: `🌦️ ${temp}°C – Regengefahr! Empfehlung: Regenkombi & vorsichtige Fahrweise.`,
      badge: `🌦️ ${temp}°C (Regenrisiko)`,
      color: 'text-blue-400',
      bg: 'bg-blue-500/15 border-blue-500/40 text-blue-300'
    };
  } else {
    return {
      temp,
      condition: 'Kühl & Trocken',
      icon: Sun,
      text: `🌤️ ${temp}°C – Frische Luft, aber trocken. Thermobekleidung empfohlen.`,
      badge: `🌤️ ${temp}°C (Frisch & Trocken)`,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
    };
  }
};

export const EventsView: React.FC<EventsViewProps> = ({
  currentUser,
  events,
  onAddEvent,
  onEditEvent,
  onDeleteEvent,
  onToggleParticipation,
  onCalculateMeetingPoint,
}) => {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<CrewEvent | null>(null);
  const [detailEvent, setDetailEvent] = useState<CrewEvent | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [organizer, setOrganizer] = useState(currentUser.username);
  const [dateTime, setDateTime] = useState('');
  const [location, setLocation] = useState('');
  const [desc, setDesc] = useState('');
  const [image, setImage] = useState('');

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.readAsDataURL(e.target.files[0]);
      reader.onload = () => setImage(reader.result as string);
    }
  };

  return (
    <div className="py-6 max-w-6xl mx-auto px-4">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold uppercase text-amber-400 flex items-center gap-2">
            <Calendar className="w-8 h-8" /> Exklusive Crew-Events
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Gemeinsame Ausfahrten, Treffen & Touren der Pixel Rider
          </p>
        </div>

        <button
          onClick={() => {
            setTitle('');
            setOrganizer(currentUser.username);
            setDateTime('');
            setLocation('');
            setDesc('');
            setImage('');
            setAddModalOpen(true);
          }}
          className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase px-5 py-3 rounded-full transition-all shadow-lg flex items-center gap-2 border-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Event Planen
        </button>
      </div>

      {/* Events Grid */}
      <div className="flex flex-wrap justify-center gap-6">
        {events.length === 0 ? (
          <div className="w-full text-center py-16 bg-slate-900/50 border border-slate-800 rounded-3xl p-8">
            <Calendar className="w-16 h-16 text-red-500/40 mx-auto mb-3" />
            <h3 className="text-lg font-bold uppercase text-amber-400">Keine aktuellen Events geplant</h3>
            <p className="text-xs text-slate-500 mt-1">Erstelle die erste Ausfahrt für deine Crew!</p>
          </div>
        ) : (
          events.map((ev, idx) => {
            const isParticipating = ev.participants?.includes(currentUser.email) || ev.participants?.includes(currentUser.username);
            const isOwner = currentUser.username === ev.created_by || currentUser.isAdmin || currentUser.isModerator;
            const isNextEvent = idx === 0;
            const weather = getEventWeather(ev.location, ev.date_time);

            if (isNextEvent) {
              // Featured 3x Wide Card (Spans full width across 3 columns)
              return (
                <div
                  key={ev.id}
                  className="w-full bg-slate-900 border-2 border-amber-400 rounded-3xl overflow-hidden shadow-[0_0_35px_rgba(250,204,21,0.25)] p-6 md:p-8 relative flex flex-col md:flex-row gap-6 lg:gap-8 items-stretch mb-4"
                >
                  {/* Left Hero Image/Graphic */}
                  <div
                    onClick={() => setDetailEvent(ev)}
                    className="w-full md:w-5/12 lg:w-1/2 flex flex-col justify-between min-h-[260px] md:min-h-[360px] relative rounded-2xl overflow-hidden bg-black border border-amber-500/30 group cursor-pointer"
                  >
                    <img
                      src={ev.image_data || 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=1200'}
                      alt={ev.title}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                    <div className="relative z-10 p-4 flex justify-between items-start">
                      <span className="bg-red-600 text-white font-extrabold text-xs uppercase px-4 py-1.5 rounded-full shadow-xl inline-flex items-center gap-1.5 animate-pulse">
                        ⭐ Nächstes Event (Spotlight)
                      </span>
                      <span className="bg-black/70 backdrop-blur-md text-amber-300 text-xs font-bold px-3 py-1 rounded-full border border-amber-500/30 flex items-center gap-1">
                        <Maximize2 className="w-3.5 h-3.5" /> Details
                      </span>
                    </div>

                    <div className="relative z-10 p-5">
                      <p className="text-xs text-amber-300 font-extrabold uppercase tracking-wider mb-1">
                        Organisator: {ev.organizer}
                      </p>
                      <h4 className="text-xl md:text-2xl font-black text-white uppercase drop-shadow-md">{ev.title}</h4>
                    </div>
                  </div>

                  {/* Right Event Details */}
                  <div className="w-full md:w-7/12 lg:w-1/2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs bg-amber-500/20 text-amber-300 font-extrabold px-3 py-1 rounded-full border border-amber-500/40 uppercase">
                          Haupt-Ausfahrt (Spotlight)
                        </span>
                        <span className="text-xs text-slate-400 font-bold">
                          👥 {ev.participants?.length || 0} Angemeldet
                        </span>
                      </div>

                      <h3
                        onClick={() => setDetailEvent(ev)}
                        className="text-2xl md:text-3xl font-black uppercase text-amber-400 mb-3 leading-tight cursor-pointer hover:underline"
                      >
                        {ev.title}
                      </h3>

                      {/* Weather Forecast Badge */}
                      <div className={`p-3 rounded-xl border mb-3 flex items-center gap-3 ${weather.bg}`}>
                        <weather.icon className={`w-6 h-6 ${weather.color} flex-shrink-0 animate-bounce`} />
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Wetterbericht am Ausfahrtstag</span>
                          <p className="text-xs font-extrabold m-0">{weather.text}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
                          <Calendar className="w-5 h-5 text-amber-400 flex-shrink-0" />
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Datum & Uhrzeit</span>
                            <strong className="text-xs text-white">
                              {new Date(ev.date_time).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })} Uhr
                            </strong>
                          </div>
                        </div>

                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
                          <MapPin className="w-5 h-5 text-red-400 flex-shrink-0" />
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Treffpunkt</span>
                            <strong className="text-xs text-white line-clamp-1">{ev.location || 'Noch offen'}</strong>
                          </div>
                        </div>
                      </div>

                      {ev.description && (
                        <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 mb-4 leading-relaxed line-clamp-2">
                          <strong className="text-amber-400 block mb-1 uppercase font-bold text-[10px]">Informationen zur Tour:</strong>
                          {ev.description}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-slate-800/80 space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => onToggleParticipation(ev.id)}
                          className={`flex-1 py-3 px-4 rounded-xl font-extrabold text-xs uppercase flex items-center justify-center gap-2 transition-all border-0 cursor-pointer shadow-lg ${
                            isParticipating
                              ? 'bg-emerald-500 hover:bg-emerald-400 text-black'
                              : 'bg-amber-500 hover:bg-amber-400 text-black'
                          }`}
                        >
                          <Shield className="w-4 h-4" />
                          {isParticipating ? '✓ Du fährst mit!' : 'Jetzt Anmelden'}
                        </button>

                        <button
                          onClick={() => setDetailEvent(ev)}
                          className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-xl font-extrabold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                        >
                          <Maximize2 className="w-4 h-4" /> Details & Wetter
                        </button>

                        <button
                          onClick={() => onCalculateMeetingPoint(ev)}
                          className="py-3 px-3 bg-indigo-950 hover:bg-indigo-900 text-indigo-200 border border-indigo-700 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1 cursor-pointer transition-all"
                          title="Idealer Treffpunkt berechnen"
                        >
                          <Compass className="w-4 h-4 text-amber-400" />
                        </button>
                      </div>

                      {isOwner && (
                        <div className="flex justify-end gap-3 pt-1">
                          <button
                            onClick={() => setEditEvent(ev)}
                            className="text-xs text-amber-400 hover:underline border-0 bg-transparent cursor-pointer flex items-center gap-1 font-bold"
                          >
                            <Edit className="w-3.5 h-3.5" /> Event Bearbeiten
                          </button>
                          <button
                            onClick={() => onDeleteEvent(ev.id)}
                            className="text-xs text-red-400 hover:underline border-0 bg-transparent cursor-pointer flex items-center gap-1 font-bold"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Event Löschen
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            // Standard Future Event Cards
            return (
              <div
                key={ev.id}
                className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] max-w-md min-h-[480px] bg-slate-900 border border-slate-800 hover:border-yellow-400/50 rounded-2xl overflow-hidden transition-all shadow-xl flex flex-col justify-between p-6"
              >
                <div>
                  {ev.image_data && (
                    <div
                      onClick={() => setDetailEvent(ev)}
                      className="h-52 w-full rounded-xl overflow-hidden mb-4 bg-black relative group cursor-pointer border border-slate-800"
                    >
                      <img src={ev.image_data} alt={ev.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      <div className="absolute top-2 right-2 bg-black/80 text-amber-300 text-[10px] font-bold px-2.5 py-1 rounded-full border border-amber-500/30 flex items-center gap-1">
                        <Maximize2 className="w-3 h-3" /> Vergrößern
                      </div>
                    </div>
                  )}

                  <h3
                    onClick={() => setDetailEvent(ev)}
                    className="text-lg font-bold uppercase text-amber-400 mb-2 cursor-pointer hover:underline"
                  >
                    {ev.title}
                  </h3>

                  {/* Weather Badge */}
                  <div className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold mb-3 flex items-center gap-2 ${weather.bg}`}>
                    <weather.icon className={`w-4 h-4 ${weather.color} flex-shrink-0`} />
                    <span className="line-clamp-1">{weather.badge}</span>
                  </div>

                  <p className="text-xs text-slate-300 font-bold mb-1 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    {new Date(ev.date_time).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })} Uhr
                  </p>

                  <p className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-red-400 flex-shrink-0" /> Treffpunkt: {ev.location || 'Noch offen'}
                  </p>

                  <p className="text-xs text-purple-400 mb-3">Orga: <strong>{ev.organizer}</strong></p>

                  {ev.description && (
                    <div className="bg-black/40 p-3 rounded-xl border border-slate-800 text-xs text-slate-300 mb-4 line-clamp-2">
                      {ev.description}
                    </div>
                  )}

                  {/* Participants Count */}
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 mb-4 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-purple-300 flex items-center gap-1">
                      👥 Mitfahrende Fahrer
                    </span>
                    <strong className="text-xs text-amber-400">{ev.participants?.length || 0} Angemeldet</strong>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onToggleParticipation(ev.id)}
                      className={`flex-1 py-2.5 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition-all border-0 cursor-pointer ${
                        isParticipating
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg'
                          : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                      }`}
                    >
                      <Shield className="w-4 h-4" />
                      {isParticipating ? 'Du bist dabei!' : 'Teilnehmen'}
                    </button>

                    <button
                      onClick={() => setDetailEvent(ev)}
                      className="px-3 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer"
                      title="Vergrößern & Wetterbericht"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => onCalculateMeetingPoint(ev)}
                      className="px-3 py-2.5 bg-indigo-950 hover:bg-indigo-900 text-indigo-200 border border-indigo-800 rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer"
                      title="Idealer Treffpunkt"
                    >
                      <Compass className="w-4 h-4 text-amber-400" />
                    </button>
                  </div>

                  {isOwner && (
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => setEditEvent(ev)}
                        className="text-xs text-amber-400 hover:underline p-1 border-0 bg-transparent cursor-pointer flex items-center gap-1"
                      >
                        <Edit className="w-3.5 h-3.5" /> Bearbeiten
                      </button>
                      <button
                        onClick={() => onDeleteEvent(ev.id)}
                        className="text-xs text-red-400 hover:underline p-1 border-0 bg-transparent cursor-pointer flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Löschen
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ENLARGED EVENT DETAILS MODAL */}
      {detailEvent && (() => {
        const isParticipating = detailEvent.participants?.includes(currentUser.email) || detailEvent.participants?.includes(currentUser.username);
        const weather = getEventWeather(detailEvent.location, detailEvent.date_time);

        return (
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
            <div className="max-w-3xl w-full rounded-3xl bg-slate-950 border border-amber-500/60 p-6 md:p-8 relative shadow-2xl max-h-[92vh] overflow-y-auto">
              <button
                onClick={() => setDetailEvent(null)}
                className="absolute top-5 right-5 text-slate-400 hover:text-white border-0 bg-transparent cursor-pointer p-1.5 rounded-full hover:bg-slate-800 transition-colors z-20"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Modal Header */}
              <div className="mb-4 pr-10">
                <span className="text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full border border-amber-500/40 inline-block mb-2">
                  📅 Event Details & Wetterprognose
                </span>
                <h3 className="text-2xl md:text-3xl font-black uppercase text-amber-400">{detailEvent.title}</h3>
                <p className="text-xs text-purple-300 font-semibold mt-1">Organisator: {detailEvent.organizer}</p>
              </div>

              {/* Large Image */}
              {detailEvent.image_data && (
                <div className="w-full h-72 md:h-96 rounded-2xl overflow-hidden border border-slate-800 mb-6 bg-black shadow-inner">
                  <img src={detailEvent.image_data} alt={detailEvent.title} className="w-full h-full object-cover" />
                </div>
              )}

              {/* Weather Forecast Highlight Box */}
              <div className={`p-4 rounded-2xl border mb-6 ${weather.bg} flex items-start gap-4 shadow-lg`}>
                <weather.icon className={`w-8 h-8 ${weather.color} flex-shrink-0 mt-0.5 animate-bounce`} />
                <div>
                  <h4 className={`text-sm font-black uppercase ${weather.color} mb-1 flex items-center gap-2`}>
                    <Thermometer className="w-4 h-4" /> Wetterbericht am Ausfahrtstag ({new Date(detailEvent.date_time).toLocaleDateString('de-DE')})
                  </h4>
                  <p className="text-xs text-slate-200 leading-relaxed font-bold">{weather.text}</p>
                  <p className="text-[11px] text-slate-400 mt-1">Prognose basiert auf Standort {detailEvent.location || 'Deutschland'} und Tourendatum.</p>
                </div>
              </div>

              {/* Key Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
                  <Calendar className="w-6 h-6 text-amber-400 flex-shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Datum & Uhrzeit</span>
                    <strong className="text-sm text-white">
                      {new Date(detailEvent.date_time).toLocaleString('de-DE', { dateStyle: 'full', timeStyle: 'short' })} Uhr
                    </strong>
                  </div>
                </div>

                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
                  <MapPin className="w-6 h-6 text-red-400 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Treffpunkt</span>
                    <strong className="text-sm text-white block">{detailEvent.location || 'Noch nicht festgelegt'}</strong>
                  </div>
                  {detailEvent.location && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detailEvent.location)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl border border-slate-700 flex items-center justify-center"
                      title="Auf Google Maps öffnen"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>

              {/* Full Description */}
              {detailEvent.description && (
                <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 mb-6">
                  <h4 className="text-xs font-bold uppercase text-amber-400 mb-2">📜 Ausführliche Routen- & Event-Infos</h4>
                  <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">{detailEvent.description}</p>
                </div>
              )}

              {/* List of Participants */}
              <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 mb-6">
                <h4 className="text-xs font-bold uppercase text-purple-300 mb-3 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-400" /> Angemeldete Fahrer ({detailEvent.participants?.length || 0})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {detailEvent.participants?.length === 0 ? (
                    <span className="text-xs text-slate-500 italic">Noch keine Anmeldungen – melde dich als Erster an!</span>
                  ) : (
                    detailEvent.participants?.map((p, i) => (
                      <span key={i} className="text-xs bg-slate-800 text-amber-300 px-3 py-1.5 rounded-xl font-bold border border-slate-700 flex items-center gap-1.5">
                        🏍️ {p.split('@')[0]}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-800">
                <button
                  onClick={() => {
                    onToggleParticipation(detailEvent.id);
                    setDetailEvent(null);
                  }}
                  className={`flex-1 py-3.5 px-6 rounded-full font-extrabold text-xs uppercase flex items-center justify-center gap-2 transition-all border-0 cursor-pointer shadow-xl ${
                    isParticipating
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-black'
                      : 'bg-amber-500 hover:bg-amber-400 text-black'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  {isParticipating ? '✓ Du fährst mit (Abmelden)' : 'Jetzt Verbindlich Anmelden'}
                </button>

                <button
                  onClick={() => {
                    onCalculateMeetingPoint(detailEvent);
                    setDetailEvent(null);
                  }}
                  className="py-3.5 px-6 bg-indigo-950 hover:bg-indigo-900 text-indigo-200 border border-indigo-700 rounded-full font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Compass className="w-4 h-4 text-amber-400" /> Idealer Treffpunkt
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Add Event Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="max-w-md w-full rounded-2xl bg-slate-950 border border-purple-800 p-6 relative shadow-2xl">
            <button
              onClick={() => setAddModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white border-0 bg-transparent cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold uppercase text-amber-400 mb-4">Neues Event Planen</h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onAddEvent({
                  title,
                  organizer,
                  date_time: dateTime,
                  location,
                  description: desc,
                  image_data: image || undefined,
                  created_by: currentUser.username,
                });
                setAddModalOpen(false);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Event Titel *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="z.B. Feierabendrunde Schwarzwald"
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Datum & Uhrzeit *</label>
                <input
                  type="datetime-local"
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Treffpunkt / Ort</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="z.B. Glemseck Leonberg"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Details & Infos</label>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  rows={3}
                  placeholder="Tempo, Pausen, Strecke..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Titelbild (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImage}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-black hover:file:bg-amber-400 cursor-pointer"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-extrabold uppercase text-sm shadow-lg transition-all border-0 cursor-pointer mt-4"
              >
                Event Veröffentlichen
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {editEvent && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="max-w-md w-full rounded-2xl bg-slate-950 border border-amber-500/50 p-6 relative shadow-2xl">
            <button
              onClick={() => setEditEvent(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white border-0 bg-transparent cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold uppercase text-amber-400 mb-4">Event Bearbeiten</h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onEditEvent(editEvent.id, {
                  title: editEvent.title,
                  organizer: editEvent.organizer,
                  date_time: editEvent.date_time,
                  location: editEvent.location,
                  description: editEvent.description,
                });
                setEditEvent(null);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Titel</label>
                <input
                  type="text"
                  value={editEvent.title}
                  onChange={(e) => setEditEvent({ ...editEvent, title: e.target.value })}
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Datum & Uhrzeit</label>
                <input
                  type="datetime-local"
                  value={editEvent.date_time}
                  onChange={(e) => setEditEvent({ ...editEvent, date_time: e.target.value })}
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Treffpunkt</label>
                <input
                  type="text"
                  value={editEvent.location || ''}
                  onChange={(e) => setEditEvent({ ...editEvent, location: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Beschreibung</label>
                <textarea
                  value={editEvent.description || ''}
                  onChange={(e) => setEditEvent({ ...editEvent, description: e.target.value })}
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-extrabold uppercase text-sm shadow-lg transition-all border-0 cursor-pointer mt-4"
              >
                Änderungen Speichern
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
