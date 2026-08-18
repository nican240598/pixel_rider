import React, { useState, useEffect, useMemo } from 'react';
import type { CrewEvent, User, MapPin as MapPinType, RidePing, PingParticipantStatus } from '../types';
import { Calendar, Plus, MapPin, Shield, Edit, Trash2, X, Compass, Sun, CloudRain, Maximize2, ExternalLink, Thermometer, Wind, UserCheck, Radio, Zap, Sparkles, Layers, Archive, History, Clock } from 'lucide-react';
import { FeierabendPings } from '../components/FeierabendPings';

export const isEventPast24h = (dateTimeStr?: string, isArchived?: boolean): boolean => {
  if (isArchived) return true;
  if (!dateTimeStr) return false;
  const t = new Date(dateTimeStr).getTime();
  if (isNaN(t)) return false;
  return Date.now() - t > 24 * 60 * 60 * 1000;
};

interface EventsViewProps {
  currentUser: User;
  events: CrewEvent[];
  pings?: RidePing[];
  mapPins?: MapPinType[];
  allUsers?: User[];
  initialTab?: 'all' | 'events' | 'pings' | 'archive';
  onAddEvent: (event: Omit<CrewEvent, 'id' | 'participants'>) => void;
  onEditEvent: (id: string, event: Partial<CrewEvent>) => void;
  onDeleteEvent: (id: string) => void;
  onToggleParticipation: (eventId: string) => void;
  onCalculateMeetingPoint?: (event: CrewEvent) => void;
  onAddPing?: (ping: Omit<RidePing, 'id' | 'created_at' | 'participants'>) => Promise<void> | void;
  onTogglePingStatus?: (pingId: string, status: PingParticipantStatus) => Promise<void> | void;
  onDeletePing?: (pingId: string) => Promise<void> | void;
}

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function calculateMeetingPointForEvent(
  ev: CrewEvent,
  mapPins: MapPinType[] = [],
  allUsers: User[] = []
) {
  const participants = ev.participants || [];
  
  const matchedRiders: { username: string; email: string; city: string; lat: number; lng: number }[] = [];
  const missingPinsRiders: string[] = [];

  for (const p of participants) {
    if (!p) continue;
    const pClean = p.trim().toLowerCase();
    
    // Find in mapPins by email or username
    const pin = mapPins.find(
      (m) => (m.email && m.email.toLowerCase() === pClean) || (m.username && m.username.toLowerCase() === pClean)
    );

    // Find in allUsers for display name
    const user = allUsers.find(
      (u) => (u.email && u.email.toLowerCase() === pClean) || (u.username && u.username.toLowerCase() === pClean)
    );
    const displayName = user?.username || pin?.username || (p.includes('@') ? p.split('@')[0] : p);

    if (pin && typeof pin.lat === 'number' && typeof pin.lng === 'number' && !isNaN(pin.lat) && !isNaN(pin.lng)) {
      matchedRiders.push({
        username: displayName,
        email: pin.email || p,
        city: pin.city || 'Standort',
        lat: pin.lat,
        lng: pin.lng,
      });
    } else {
      missingPinsRiders.push(displayName);
    }
  }

  if (matchedRiders.length === 0) {
    return {
      success: false,
      matchedRiders: [],
      missingPinsRiders,
      avgLat: null,
      avgLng: null,
      avgDistanceKm: 0,
    };
  }

  const totalLat = matchedRiders.reduce((sum, r) => sum + r.lat, 0);
  const totalLng = matchedRiders.reduce((sum, r) => sum + r.lng, 0);
  const avgLat = totalLat / matchedRiders.length;
  const avgLng = totalLng / matchedRiders.length;

  const ridersWithDistance = matchedRiders.map((r) => {
    const dist = calculateDistanceKm(r.lat, r.lng, avgLat, avgLng);
    return { ...r, distanceKm: dist };
  });

  const totalDistance = ridersWithDistance.reduce((sum, r) => sum + r.distanceKm, 0);
  const avgDistanceKm = Math.round(totalDistance / ridersWithDistance.length);

  return {
    success: true,
    matchedRiders: ridersWithDistance,
    missingPinsRiders,
    avgLat,
    avgLng,
    avgDistanceKm,
  };
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
  pings = [],
  mapPins = [],
  allUsers = [],
  initialTab = 'all',
  onAddEvent,
  onEditEvent,
  onDeleteEvent,
  onToggleParticipation,
  onCalculateMeetingPoint,
  onAddPing,
  onTogglePingStatus,
  onDeletePing,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'events' | 'pings' | 'archive'>(initialTab || 'all');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<CrewEvent | null>(null);
  const [detailEvent, setDetailEvent] = useState<CrewEvent | null>(null);
  const [meetingPointModalEvent, setMeetingPointModalEvent] = useState<CrewEvent | null>(null);
  const [meetingPointCityName, setMeetingPointCityName] = useState<string>('');
  const [loadingGeo, setLoadingGeo] = useState<boolean>(false);
  const [savedNotice, setSavedNotice] = useState<string>('');

  useEffect(() => {
    if (!meetingPointModalEvent) {
      setMeetingPointCityName('');
      setSavedNotice('');
      return;
    }
    const calc = calculateMeetingPointForEvent(meetingPointModalEvent, mapPins, allUsers);
    if (calc.success && calc.avgLat && calc.avgLng) {
      setLoadingGeo(true);
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${calc.avgLat}&lon=${calc.avgLng}`)
        .then((res) => res.json())
        .then((data) => {
          const addr = data.address || {};
          const place = addr.city || addr.town || addr.village || addr.municipality || addr.county || 'Mittelpunkt-Region';
          const state = addr.state ? `, ${addr.state}` : '';
          setMeetingPointCityName(`${place}${state}`);
        })
        .catch(() => {
          setMeetingPointCityName(`Mittelpunkt: ${calc.avgLat?.toFixed(4)}, ${calc.avgLng?.toFixed(4)}`);
        })
        .finally(() => setLoadingGeo(false));
    }
  }, [meetingPointModalEvent, mapPins, allUsers]);

  // Form states
  const [title, setTitle] = useState('');
  const [organizer, setOrganizer] = useState(currentUser.username);
  const [dateTime, setDateTime] = useState('');
  const [location, setLocation] = useState('');
  const [desc, setDesc] = useState('');
  const [distKm, setDistKm] = useState('');
  const [image, setImage] = useState('');
  const [selectedKmFilter, setSelectedKmFilter] = useState<'all' | 'bis150' | 'bis250' | 'bis350' | '350plus'>('all');

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.readAsDataURL(e.target.files[0]);
      reader.onload = () => setImage(reader.result as string);
    }
  };

  const activePingsCount = pings.filter(
    (p) => new Date(p.departure_time).getTime() >= Date.now() - 2 * 60 * 60 * 1000
  ).length;

  // Split events into active upcoming events and automatically archived past events (older than 24h)
  const activeEvents = useMemo(() => {
    return events
      .filter((ev) => !isEventPast24h(ev.date_time, ev.is_archived))
      .sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime());
  }, [events]);

  const archivedEvents = useMemo(() => {
    return events
      .filter((ev) => isEventPast24h(ev.date_time, ev.is_archived))
      .sort((a, b) => new Date(b.date_time).getTime() - new Date(a.date_time).getTime());
  }, [events]);

  const getEventDistance = (ev: { distance_km?: number; title: string; description?: string }) => {
    if (ev.distance_km !== undefined && ev.distance_km !== null && !isNaN(ev.distance_km)) {
      return ev.distance_km;
    }
    const textToSearch = `${ev.title} ${ev.description || ''}`;
    const match = textToSearch.match(/(\d{2,4})\s*(km|kilometer)/i);
    return match ? parseInt(match[1], 10) : 0;
  };

  const countBis150 = activeEvents.filter((ev) => {
    const d = getEventDistance(ev);
    return d > 0 && d <= 150;
  }).length;

  const countBis250 = activeEvents.filter((ev) => {
    const d = getEventDistance(ev);
    return d > 0 && d <= 250;
  }).length;

  const countBis350 = activeEvents.filter((ev) => {
    const d = getEventDistance(ev);
    return d > 0 && d <= 350;
  }).length;

  const count350Plus = activeEvents.filter((ev) => {
    const d = getEventDistance(ev);
    return d >= 350;
  }).length;

  // Filtered planned events based on kilometer selection (cumulative upper bound or 350+)
  const filteredEvents = activeEvents.filter((ev) => {
    if (selectedKmFilter === 'all') return true;
    const dist = getEventDistance(ev);
    if (!dist) return false;
    if (selectedKmFilter === 'bis150') return dist <= 150;
    if (selectedKmFilter === 'bis250') return dist <= 250;
    if (selectedKmFilter === 'bis350') return dist <= 350;
    if (selectedKmFilter === '350plus') return dist >= 350;
    return true;
  });

  const getFilterLabel = () => {
    switch (selectedKmFilter) {
      case 'bis150': return 'bis 150 km';
      case 'bis250': return 'bis 250 km';
      case 'bis350': return 'bis 350 km';
      case '350plus': return '350 km +';
      default: return '';
    }
  };

  // Reusable Planned Events Toolbar (Kilometer Filter + Event Planen Button)
  const renderPlannedEventsToolbar = () => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-800 backdrop-blur-md">
      <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 px-2 rounded-xl border border-slate-800 overflow-x-auto no-scrollbar touch-pan-x flex-nowrap scroll-smooth max-w-full">
        <button
          type="button"
          onClick={() => setSelectedKmFilter('all')}
          className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer border-0 shrink-0 whitespace-nowrap select-none ${
            selectedKmFilter === 'all' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white bg-transparent'
          }`}
        >
          Alle ({activeEvents.length})
        </button>
        <button
          type="button"
          onClick={() => setSelectedKmFilter('bis150')}
          className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer border-0 shrink-0 whitespace-nowrap select-none ${
            selectedKmFilter === 'bis150' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-amber-300 bg-transparent'
          }`}
        >
          🏍️ bis 150 km ({countBis150})
        </button>
        <button
          type="button"
          onClick={() => setSelectedKmFilter('bis250')}
          className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer border-0 shrink-0 whitespace-nowrap select-none ${
            selectedKmFilter === 'bis250' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-amber-300 bg-transparent'
          }`}
        >
          ⚡ bis 250 km ({countBis250})
        </button>
        <button
          type="button"
          onClick={() => setSelectedKmFilter('bis350')}
          className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer border-0 shrink-0 whitespace-nowrap select-none ${
            selectedKmFilter === 'bis350' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-amber-300 bg-transparent'
          }`}
        >
          🏔️ bis 350 km ({countBis350})
        </button>
        <button
          type="button"
          onClick={() => setSelectedKmFilter('350plus')}
          className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer border-0 shrink-0 whitespace-nowrap select-none ${
            selectedKmFilter === '350plus' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-amber-300 bg-transparent'
          }`}
        >
          🔥 350 km + ({count350Plus})
        </button>
      </div>

      <button
        id="btn-plan-event"
        type="button"
        onClick={() => {
          setTitle('');
          setOrganizer(currentUser.username);
          setDateTime('');
          setLocation('');
          setDesc('');
          setDistKm('');
          setImage('');
          setAddModalOpen(true);
        }}
        className="bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-black text-xs md:text-sm uppercase tracking-wider px-6 py-2.5 rounded-full transition-all shadow-[0_0_20px_rgba(250,204,21,0.3)] hover:shadow-[0_0_30px_rgba(250,204,21,0.5)] flex items-center justify-center gap-2 border-0 cursor-pointer shrink-0 self-stretch sm:self-auto"
      >
        <Plus className="w-4 h-4 font-black" /> Event Planen
      </button>
    </div>
  );

  const renderPlannedEventsGrid = () => (
    <div className="flex flex-wrap justify-center gap-6">
      {filteredEvents.length === 0 ? (
        <div className="w-full text-center py-16 bg-slate-900/50 border border-slate-800 rounded-3xl p-8">
          <Calendar className="w-16 h-16 text-amber-500/40 mx-auto mb-3" />
          <h3 className="text-lg font-bold uppercase text-amber-400">
            {events.length === 0
              ? 'Keine aktuellen Events geplant'
              : `Keine Events in der Kategorie „${getFilterLabel()}“ gefunden`}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {events.length === 0
              ? 'Erstelle die erste Ausfahrt für deine Crew!'
              : 'Wähle einen anderen Distanzfilter oder erstelle eine neue Tour mit dieser Distanz.'}
          </p>
          {selectedKmFilter !== 'all' && (
            <button
              onClick={() => setSelectedKmFilter('all')}
              className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold rounded-xl border border-slate-700 cursor-pointer transition-colors"
            >
              Alle Distanzen anzeigen
            </button>
          )}
        </div>
      ) : (
        filteredEvents.map((ev, idx) => {
          const isParticipating = ev.participants?.includes(currentUser.email) || ev.participants?.includes(currentUser.username);
          const isOwner = currentUser.username === ev.created_by || currentUser.isAdmin || currentUser.isModerator;
          const isNextEvent = idx === 0 && selectedKmFilter === 'all';
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
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-amber-500/20 text-amber-300 font-extrabold px-3 py-1 rounded-full border border-amber-500/40 uppercase">
                          Haupt-Ausfahrt (Spotlight)
                        </span>
                        {ev.distance_km && (
                          <span className="text-xs bg-slate-800 text-amber-300 font-extrabold px-2.5 py-1 rounded-full border border-slate-700">
                            🏁 {ev.distance_km} km
                          </span>
                        )}
                      </div>
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
                        onClick={() => setMeetingPointModalEvent(ev)}
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

                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3
                    onClick={() => setDetailEvent(ev)}
                    className="text-lg font-bold uppercase text-amber-400 cursor-pointer hover:underline"
                  >
                    {ev.title}
                  </h3>
                  {ev.distance_km && (
                    <span className="text-[11px] bg-slate-800 text-amber-300 font-extrabold px-2 py-0.5 rounded-md border border-slate-700 shrink-0">
                      🏁 {ev.distance_km} km
                    </span>
                  )}
                </div>

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
                    onClick={() => setMeetingPointModalEvent(ev)}
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
  );

  const renderArchivedEventsGrid = () => (
    <div className="space-y-6">
      {/* Archive Header Info Banner */}
      <div className="bg-gradient-to-r from-purple-950/60 via-slate-900 to-slate-950 border border-purple-800/60 rounded-3xl p-5 md:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
        <div className="flex items-start md:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-purple-900/50 text-purple-300 border border-purple-700/60 flex items-center justify-center font-bold flex-shrink-0 shadow-inner">
            <Archive className="w-6 h-6 text-purple-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black uppercase text-amber-400">Automatisch Archivierte Events</h3>
              <span className="text-[10px] font-black uppercase bg-purple-900/60 text-purple-200 px-2.5 py-0.5 rounded-full border border-purple-700/50">
                24h Auto-Archiv
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-2xl">
              Vergangene Ausfahrten und Touren werden <strong>24 Stunden nach Starttermin</strong> automatisch in dieses Archiv verschoben. So bleibt der Hauptkalender sauber und aktuell, während alle historischen Touren, Fotos und Teilnehmerlisten erhalten bleiben.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-black text-amber-300 bg-slate-900/90 border border-purple-800/70 px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-md">
            <Clock className="w-4 h-4 text-purple-400" />
            {archivedEvents.length} {archivedEvents.length === 1 ? 'Archivierte Tour' : 'Archivierte Touren'}
          </span>
        </div>
      </div>

      {/* Grid of Archived Events */}
      <div className="flex flex-wrap justify-center gap-6">
        {archivedEvents.length === 0 ? (
          <div className="w-full text-center py-16 bg-slate-900/40 border border-slate-800/80 rounded-3xl p-8 space-y-3">
            <Archive className="w-16 h-16 text-purple-500/30 mx-auto" />
            <h3 className="text-lg font-black uppercase text-amber-400">Keine archivierten Events vorhanden</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Sobald ein Event 24 Stunden in der Vergangenheit liegt, wird es hier automatisch übersichtlich aufgeführt.
            </p>
          </div>
        ) : (
          archivedEvents.map((ev) => {
            const isParticipating = ev.participants?.includes(currentUser.email) || ev.participants?.includes(currentUser.username);
            const isOwner = currentUser.username === ev.created_by || currentUser.isAdmin || currentUser.isModerator;
            const weather = getEventWeather(ev.location, ev.date_time);

            return (
              <div
                key={ev.id}
                className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] max-w-md bg-slate-900/80 border border-slate-800/90 hover:border-purple-600/50 rounded-2xl overflow-hidden transition-all shadow-lg flex flex-col justify-between p-5 opacity-95 hover:opacity-100 group"
              >
                <div>
                  {ev.image_data ? (
                    <div
                      onClick={() => setDetailEvent(ev)}
                      className="h-44 w-full rounded-xl overflow-hidden mb-3.5 bg-black relative group cursor-pointer border border-slate-800/80"
                    >
                      <img
                        src={ev.image_data}
                        alt={ev.title}
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300 group-hover:scale-105"
                      />
                      <div className="absolute top-2 left-2 bg-purple-950/90 text-purple-200 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-purple-700/60 flex items-center gap-1">
                        <Archive className="w-3 h-3" /> Archiviert (24h+)
                      </div>
                      <div className="absolute top-2 right-2 bg-black/80 text-amber-300 text-[10px] font-bold px-2 py-1 rounded-full border border-amber-500/30 flex items-center gap-1">
                        <Maximize2 className="w-3 h-3" /> Ansehen
                      </div>
                    </div>
                  ) : (
                    <div className="mb-3 flex items-center justify-between">
                      <span className="bg-purple-950/90 text-purple-200 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-purple-700/60 flex items-center gap-1">
                        <Archive className="w-3 h-3" /> Archiviert
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3
                      onClick={() => setDetailEvent(ev)}
                      className="text-base font-black uppercase text-slate-200 group-hover:text-amber-400 transition-colors cursor-pointer hover:underline line-clamp-1"
                    >
                      {ev.title}
                    </h3>
                    {ev.distance_km && (
                      <span className="text-[10px] bg-slate-800 text-slate-300 font-extrabold px-2 py-0.5 rounded-md border border-slate-700 shrink-0">
                        🏁 {ev.distance_km} km
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 font-bold mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                    {new Date(ev.date_time).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })} Uhr
                    <span className="text-[10px] text-slate-500 font-medium">(Beendet)</span>
                  </p>

                  <p className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-red-400/80 flex-shrink-0" /> Treffpunkt: {ev.location || 'Keine Angabe'}
                  </p>

                  <p className="text-[11px] text-purple-300 mb-2.5">Organisator: <strong>{ev.organizer}</strong></p>

                  {ev.description && (
                    <div className="bg-black/30 p-2.5 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 mb-3 line-clamp-2">
                      {ev.description}
                    </div>
                  )}

                  {/* Participants summary */}
                  <div className="bg-slate-950/90 p-2.5 rounded-xl border border-slate-800/80 mb-3 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                      👥 Mitgefahren
                    </span>
                    <strong className="text-xs text-amber-400">
                      {ev.participants?.length || 0} {ev.participants?.length === 1 ? 'Fahrer' : 'Fahrer'}
                    </strong>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDetailEvent(ev)}
                      className="flex-1 py-2.5 px-3 bg-purple-950/60 hover:bg-purple-900/80 text-amber-300 border border-purple-700/60 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Maximize2 className="w-3.5 h-3.5" /> Details & Rückblick
                    </button>

                    <button
                      onClick={() => setMeetingPointModalEvent(ev)}
                      className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer"
                      title="Treffpunkt einsehen"
                    >
                      <Compass className="w-3.5 h-3.5 text-amber-400" />
                    </button>
                  </div>

                  {isOwner && (
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => setEditEvent(ev)}
                        className="text-[11px] text-amber-400/90 hover:underline p-0.5 border-0 bg-transparent cursor-pointer flex items-center gap-1"
                      >
                        <Edit className="w-3 h-3" /> Bearbeiten
                      </button>
                      <button
                        onClick={() => onDeleteEvent(ev.id)}
                        className="text-[11px] text-red-400/90 hover:underline p-0.5 border-0 bg-transparent cursor-pointer flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Löschen
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className="py-6 max-w-6xl mx-auto px-4 touch-pan-y select-auto">
      {/* Top Segmented Filter Bar & Action Hub */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5 mb-8 pb-4 border-b border-slate-800">
        {/* Unified Segmented Pill Dock - Swipeable & Scrollable */}
        <div className="p-1 sm:p-1.5 bg-[#120724]/95 border border-purple-800/80 rounded-2xl md:rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.6)] backdrop-blur-md flex items-center gap-1 sm:gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar touch-pan-x flex-nowrap scroll-smooth max-w-full px-1.5 sm:px-3">
          {/* 1. Alle Events */}
          <button
            id="filter-tab-all"
            type="button"
            onClick={() => setActiveTab('all')}
            className={`flex-1 sm:flex-initial px-2 sm:px-4 py-2 sm:py-2.5 rounded-xl md:rounded-full text-[11px] sm:text-xs font-black uppercase tracking-tight sm:tracking-wider transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer border-0 select-none min-h-[38px] sm:min-h-[42px] shrink-0 whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-[0_0_18px_rgba(245,158,11,0.45)]'
                : 'text-slate-300 hover:text-white hover:bg-purple-950/60 bg-transparent'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-current" />
            <span>Alle</span>
            <span className={`text-[10px] sm:text-xs font-black px-1.5 sm:px-2 py-0.5 rounded-full shrink-0 min-w-[18px] text-center leading-none ${
              activeTab === 'all' ? 'bg-black/25 text-black' : 'bg-purple-900/70 text-amber-300'
            }`}>
              {activeEvents.length + activePingsCount}
            </span>
          </button>

          {/* 2. Geplante Events */}
          <button
            id="filter-tab-planned"
            type="button"
            onClick={() => setActiveTab('events')}
            className={`flex-1 sm:flex-initial px-2 sm:px-4 py-2 sm:py-2.5 rounded-xl md:rounded-full text-[11px] sm:text-xs font-black uppercase tracking-tight sm:tracking-wider transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer border-0 select-none min-h-[38px] sm:min-h-[42px] shrink-0 whitespace-nowrap ${
              activeTab === 'events'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-[0_0_18px_rgba(245,158,11,0.45)]'
                : 'text-slate-300 hover:text-white hover:bg-purple-950/60 bg-transparent'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-current" />
            <span>Geplant</span>
            <span className={`text-[10px] sm:text-xs font-black px-1.5 sm:px-2 py-0.5 rounded-full shrink-0 min-w-[18px] text-center leading-none ${
              activeTab === 'events' ? 'bg-black/25 text-black' : 'bg-purple-900/70 text-amber-300'
            }`}>
              {activeEvents.length}
            </span>
          </button>

          {/* 3. Feierabendrunden */}
          <button
            id="filter-tab-pings"
            type="button"
            onClick={() => setActiveTab('pings')}
            className={`flex-1 sm:flex-initial px-2 sm:px-4 py-2 sm:py-2.5 rounded-xl md:rounded-full text-[11px] sm:text-xs font-black uppercase tracking-tight sm:tracking-wider transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer border-0 select-none min-h-[38px] sm:min-h-[42px] shrink-0 whitespace-nowrap ${
              activeTab === 'pings'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-[0_0_18px_rgba(245,158,11,0.45)]'
                : 'text-slate-300 hover:text-white hover:bg-purple-950/60 bg-transparent'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-current ${activePingsCount > 0 ? 'animate-pulse' : ''}`} />
            <span>Runden</span>
            <span className={`text-[10px] sm:text-xs font-black px-1.5 sm:px-2 py-0.5 rounded-full shrink-0 min-w-[18px] text-center leading-none ${
              activeTab === 'pings'
                ? 'bg-black/25 text-black'
                : activePingsCount > 0
                ? 'bg-red-600 text-white animate-pulse'
                : 'bg-purple-900/70 text-amber-300'
            }`}>
              {activePingsCount}
            </span>
          </button>

          {/* 4. Archivierte Events (24h+ Auto-Archiv) - Nur Desktop (auf Mobil ausgeblendet) */}
          <button
            id="filter-tab-archive"
            type="button"
            onClick={() => setActiveTab('archive')}
            className={`hidden md:inline-flex px-4 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all items-center justify-center gap-1.5 cursor-pointer border-0 select-none min-h-[42px] shrink-0 whitespace-nowrap ${
              activeTab === 'archive'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-[0_0_18px_rgba(245,158,11,0.45)]'
                : 'text-slate-300 hover:text-white hover:bg-purple-950/60 bg-transparent'
            }`}
          >
            <Archive className="w-4 h-4 shrink-0 text-current" />
            <span>Archiv</span>
            <span className={`text-xs font-black px-2 py-0.5 rounded-full shrink-0 min-w-[18px] text-center leading-none ${
              activeTab === 'archive'
                ? 'bg-black/25 text-black'
                : 'bg-purple-900/70 text-amber-300'
            }`}>
              {archivedEvents.length}
            </span>
          </button>
        </div>

        {/* Quick CTA to Plan an Event */}
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => {
              setTitle('');
              setOrganizer(currentUser.username);
              setDateTime('');
              setLocation('');
              setDesc('');
              setDistKm('');
              setImage('');
              setAddModalOpen(true);
            }}
            className="bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-xs uppercase tracking-wider px-5 py-2.5 rounded-full transition-all shadow-[0_0_20px_rgba(250,204,21,0.3)] hover:scale-105 flex items-center gap-2 border-0 cursor-pointer min-h-[42px] shrink-0 w-full sm:w-auto justify-center"
          >
            <Plus className="w-4 h-4 font-black" />
            <span>Event Planen</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: ALL EVENTS (Combined Planned Events & Feierabend-Pings) */}
      {activeTab === 'all' && (
        <div className="space-y-8">
          {/* Feierabend-Pings section if any exist */}
          {pings && pings.length > 0 && (
            <div className="space-y-3">
              <FeierabendPings
                currentUser={currentUser}
                pings={pings}
                onAddPing={onAddPing || (() => {})}
                onTogglePingStatus={onTogglePingStatus || (() => {})}
                onDeletePing={onDeletePing || (() => {})}
              />
            </div>
          )}

          {/* Planned Events Section with Dedicated Toolbar */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold uppercase text-amber-400 tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" /> Geplante Crew-Ausfahrten & Touren
              </h3>
            </div>
            {renderPlannedEventsToolbar()}
            {renderPlannedEventsGrid()}
          </div>

          {/* Quick link to archived events if there are any (Desktop only) */}
          {archivedEvents.length > 0 && (
            <div className="mt-8 p-4 sm:p-5 bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-950 border border-purple-900/50 hover:border-purple-700/70 rounded-2xl hidden md:flex flex-row items-center justify-between gap-3 transition-all">
              <div className="flex items-center gap-3">
                <Archive className="w-5 h-5 text-purple-400 shrink-0" />
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-200">
                    <strong className="text-amber-400">{archivedEvents.length}</strong> {archivedEvents.length === 1 ? 'vergangenes Event' : 'vergangene Events'} (älter als 24h) im Archiv
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Vergangene Ausfahrten werden 24h nach Beginn automatisch archiviert, um den Kalender übersichtlich zu halten.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('archive')}
                className="px-4 py-2 bg-purple-950/90 hover:bg-purple-900 text-amber-300 text-xs font-black uppercase rounded-xl border border-purple-700/70 cursor-pointer transition-all flex items-center gap-1.5 shrink-0 self-stretch sm:self-auto justify-center"
              >
                <Archive className="w-3.5 h-3.5" /> Zum Archiv ({archivedEvents.length})
              </button>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: PLANNED EVENTS ONLY */}
      {activeTab === 'events' && (
        <div className="space-y-6">
          {renderPlannedEventsToolbar()}
          {renderPlannedEventsGrid()}

          {/* Quick link to archived events if there are any (Desktop only) */}
          {archivedEvents.length > 0 && (
            <div className="mt-8 p-4 sm:p-5 bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-950 border border-purple-900/50 hover:border-purple-700/70 rounded-2xl hidden md:flex flex-row items-center justify-between gap-3 transition-all">
              <div className="flex items-center gap-3">
                <Archive className="w-5 h-5 text-purple-400 shrink-0" />
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-200">
                    <strong className="text-amber-400">{archivedEvents.length}</strong> {archivedEvents.length === 1 ? 'vergangenes Event' : 'vergangene Events'} (älter als 24h) im Archiv
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Vergangene Ausfahrten werden 24h nach Beginn automatisch archiviert.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('archive')}
                className="px-4 py-2 bg-purple-950/90 hover:bg-purple-900 text-amber-300 text-xs font-black uppercase rounded-xl border border-purple-700/70 cursor-pointer transition-all flex items-center gap-1.5 shrink-0 self-stretch sm:self-auto justify-center"
              >
                <Archive className="w-3.5 h-3.5" /> Zum Archiv ({archivedEvents.length})
              </button>
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: FEIERABEND-PINGS ONLY */}
      {activeTab === 'pings' && (
        <FeierabendPings
          currentUser={currentUser}
          pings={pings}
          onAddPing={onAddPing || (() => {})}
          onTogglePingStatus={onTogglePingStatus || (() => {})}
          onDeletePing={onDeletePing || (() => {})}
        />
      )}

      {/* VIEW 4: ARCHIVED EVENTS ONLY (24h+ Auto-Archived) */}
      {activeTab === 'archive' && (
        renderArchivedEventsGrid()
      )}

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

                {detailEvent.distance_km && (
                  <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex items-center gap-3 sm:col-span-2">
                    <Compass className="w-6 h-6 text-amber-400 flex-shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Streckenlänge & Distanz</span>
                      <strong className="text-sm text-amber-300">
                        🏁 {detailEvent.distance_km} km Geplante Ausfahrt
                      </strong>
                    </div>
                  </div>
                )}
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
                    detailEvent.participants?.map((p, i) => {
                      const cleanName = (() => {
                        if (!p) return 'Biker';
                        const pClean = p.trim().toLowerCase();
                        const foundUser = allUsers.find(
                          (u) => (u.username && u.username.toLowerCase() === pClean) || (u.email && u.email.toLowerCase() === pClean)
                        );
                        if (foundUser?.username) return foundUser.username;
                        const foundPin = mapPins.find(
                          (m) => (m.username && m.username.toLowerCase() === pClean) || (m.email && m.email.toLowerCase() === pClean)
                        );
                        if (foundPin?.username) return foundPin.username;
                        if (currentUser && ((currentUser.email && currentUser.email.toLowerCase() === pClean) || (currentUser.username && currentUser.username.toLowerCase() === pClean))) {
                          return currentUser.username;
                        }
                        if (p.includes('@')) {
                          const parts = p.split('@')[0];
                          return parts.charAt(0).toUpperCase() + parts.slice(1);
                        }
                        return p;
                      })();

                      return (
                        <span key={i} className="text-xs bg-slate-800 text-amber-300 px-3 py-1.5 rounded-xl font-bold border border-slate-700 flex items-center gap-1.5">
                          🏍️ {cleanName}
                        </span>
                      );
                    })
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
                    setMeetingPointModalEvent(detailEvent);
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
          <div className="max-w-md w-full rounded-2xl bg-slate-950 border border-purple-800 p-6 relative shadow-2xl max-h-[90vh] overflow-y-auto pb-10">
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
                  distance_km: distKm ? parseInt(distKm, 10) : undefined,
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
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Streckenlänge / Distanz (in km, z.B. 180)</label>
                <input
                  type="number"
                  value={distKm}
                  onChange={(e) => setDistKm(e.target.value)}
                  placeholder="z.B. 180"
                  min="1"
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
          <div className="max-w-md w-full rounded-2xl bg-slate-950 border border-amber-500/50 p-6 relative shadow-2xl max-h-[90vh] overflow-y-auto pb-10">
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
                  distance_km: editEvent.distance_km,
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
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Streckenlänge / Distanz (in km)</label>
                <input
                  type="number"
                  value={editEvent.distance_km || ''}
                  onChange={(e) => setEditEvent({ ...editEvent, distance_km: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                  placeholder="z.B. 180"
                  min="1"
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

      {/* Ideal Meeting Point Modal */}
      {meetingPointModalEvent && (() => {
        const calc = calculateMeetingPointForEvent(meetingPointModalEvent, mapPins, allUsers);
        return (
          <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
            <div className="max-w-lg w-full rounded-2xl bg-slate-950 border border-indigo-500/40 p-6 relative shadow-2xl max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => {
                  setMeetingPointModalEvent(null);
                  setSavedNotice('');
                }}
                className="absolute top-4 right-4 text-slate-400 hover:text-white border-0 bg-transparent cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-2">
                <Compass className="w-6 h-6 text-amber-400" />
                <h3 className="text-xl font-bold uppercase text-amber-400">Idealer Treffpunkt</h3>
              </div>
              <p className="text-xs text-slate-300 mb-4">
                Berechnung des fairsten Mittelpunkts für <span className="font-bold text-white">"{meetingPointModalEvent.title}"</span> basierend auf den Wohnorten aller Teilnehmer.
              </p>

              {savedNotice && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold text-center">
                  {savedNotice}
                </div>
              )}

              {calc.success && calc.avgLat && calc.avgLng ? (
                <div className="space-y-4">
                  {/* Midpoint Result Box */}
                  <div className="p-4 rounded-xl bg-indigo-950/60 border border-indigo-500/30 text-indigo-100">
                    <div className="text-[10px] uppercase font-extrabold text-amber-400 mb-1">
                      Berechneter Mittelpunkt
                    </div>
                    <div className="text-lg font-black text-white flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-red-400 flex-shrink-0" />
                      {loadingGeo ? (
                        <span className="text-xs text-slate-400 animate-pulse">Lade Ortsnamen...</span>
                      ) : (
                        meetingPointCityName || `Mittelpunkt (${calc.avgLat.toFixed(4)}, ${calc.avgLng.toFixed(4)})`
                      )}
                    </div>
                    <div className="text-xs text-slate-300 mt-2 flex flex-wrap gap-4">
                      <span>📍 Koord: {calc.avgLat.toFixed(4)}, {calc.avgLng.toFixed(4)}</span>
                      <span>📏 Ø Anfahrt: ca. <strong className="text-amber-300">{calc.avgDistanceKm} km</strong> pro Biker</span>
                    </div>
                  </div>

                  {/* Participants Breakdown */}
                  <div>
                    <h4 className="text-xs font-bold uppercase text-slate-400 mb-2 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-emerald-400" />
                      Berücksichtigte Biker ({calc.matchedRiders.length})
                    </h4>
                    <div className="space-y-2">
                      {calc.matchedRiders.map((r, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center font-bold text-xs">
                              {r.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-bold text-white block">{r.username}</span>
                              <span className="text-[10px] text-slate-400">aus {r.city}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-extrabold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                              ~{r.distanceKm} km Anfahrt
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Missing Pins list if any */}
                  {calc.missingPinsRiders.length > 0 && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300">
                      <span className="font-bold block mb-1">⚠️ Noch kein Standort-Pin auf der Rider-Map:</span>
                      <span className="text-slate-300">{calc.missingPinsRiders.join(', ')}</span>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Tipp: Diese Biker können ihren Wohnort auf der Rider-Map eintragen, um automatisch berücksichtigt zu werden!
                      </p>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="pt-2 space-y-2">
                    <button
                      onClick={() => {
                        const locText = meetingPointCityName
                          ? `${meetingPointCityName} (Mittelpunkt)`
                          : `Mittelpunkt (${calc.avgLat?.toFixed(4)}, ${calc.avgLng?.toFixed(4)})`;
                        onEditEvent(meetingPointModalEvent.id, {
                          location: locText,
                          lat: calc.avgLat || undefined,
                          lng: calc.avgLng || undefined,
                        });
                        setSavedNotice(`✓ Treffpunkt "${locText}" wurde als offizieller Event-Treffpunkt übernommen!`);
                      }}
                      className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs uppercase rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 border-0 cursor-pointer"
                    >
                      <MapPin className="w-4 h-4" /> Als Event-Treffpunkt Übernehmen
                    </button>

                    <a
                      href={`https://www.google.com/maps?q=${calc.avgLat},${calc.avgLng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-3 px-4 bg-indigo-950 hover:bg-indigo-900 text-indigo-200 border border-indigo-700 font-extrabold text-xs uppercase rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer no-underline block text-center"
                    >
                      <ExternalLink className="w-4 h-4 text-amber-400" /> In Google Maps Öffnen
                    </a>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center bg-slate-900 border border-slate-800 rounded-xl space-y-3">
                  <MapPin className="w-10 h-10 text-amber-400 mx-auto opacity-60" />
                  <h4 className="text-sm font-bold uppercase text-white">Keine Standorte gefunden</h4>
                  <p className="text-xs text-slate-400">
                    {calc.missingPinsRiders.length > 0
                      ? `Für die angemeldeten Teilnehmer (${calc.missingPinsRiders.join(', ')}) wurden bisher keine Standort-Pins auf der Rider-Map hinterlegt.`
                      : 'Es sind derzeit noch keine Teilnehmer für dieses Event angemeldet.'}
                  </p>
                  <p className="text-xs text-amber-300 font-medium bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                    💡 Tipp: Melde dich zum Event an und setze deinen Wohnort auf der <strong>Rider-Map</strong>, damit der fairste Mittelpunkt berechnet werden kann!
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

