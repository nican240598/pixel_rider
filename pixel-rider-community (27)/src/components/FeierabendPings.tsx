import React, { useState, useEffect } from 'react';
import { User, RidePing, RidePace, PingParticipantStatus } from '../types';
import { 
  Radio, 
  Zap, 
  Clock, 
  MapPin, 
  Flag, 
  Users, 
  Plus, 
  Check, 
  HelpCircle, 
  Trash2, 
  X, 
  Sparkles, 
  Compass, 
  Gauge, 
  AlertCircle,
  MessageSquare
} from 'lucide-react';
import { UserAvatar } from './UserAvatar';

interface FeierabendPingsProps {
  currentUser: User;
  pings: RidePing[];
  allUsers?: User[];
  onAddPing: (ping: Omit<RidePing, 'id' | 'created_at' | 'participants'>) => Promise<void> | void;
  onTogglePingStatus: (pingId: string, status: PingParticipantStatus) => Promise<void> | void;
  onDeletePing: (pingId: string) => Promise<void> | void;
  isCompact?: boolean; // For Dashboard view
  onNavigateToFull?: () => void;
}

export const FeierabendPings: React.FC<FeierabendPingsProps> = ({
  currentUser,
  pings = [],
  allUsers = [],
  onAddPing,
  onTogglePingStatus,
  onDeletePing,
  isCompact = false,
  onNavigateToFull
}) => {
  const [selectedPace, setSelectedPace] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [now, setNow] = useState<number>(Date.now());

  // Form states for 15-second fast creation
  const [title, setTitle] = useState('');
  const [meetingPoint, setMeetingPoint] = useState('');
  const [destination, setDestination] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [pace, setPace] = useState<RidePace>('Flott');
  const [maxParticipants, setMaxParticipants] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live timer tick for countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 15000); // update every 15s
    return () => clearInterval(timer);
  }, []);

  // Helper to pre-populate default start time (+45 minutes, rounded to 5 mins)
  const openCreateModal = () => {
    const defaultTime = new Date(Date.now() + 45 * 60 * 1000);
    defaultTime.setMinutes(Math.ceil(defaultTime.getMinutes() / 5) * 5);
    const localIso = new Date(defaultTime.getTime() - defaultTime.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);

    setTitle('');
    setMeetingPoint('');
    setDestination('');
    setDepartureTime(localIso);
    setPace('Flott');
    setMaxParticipants('');
    setNotes('');
    setIsModalOpen(true);
  };

  // Filter active pings: departure time >= now - 2 hours (auto-archiving)
  const activePings = pings.filter((ping) => {
    const depTime = new Date(ping.departure_time).getTime();
    return depTime >= now - 2 * 60 * 60 * 1000;
  }).sort((a, b) => new Date(a.departure_time).getTime() - new Date(b.departure_time).getTime());

  const filteredPings = selectedPace === 'all'
    ? activePings
    : activePings.filter((p) => p.pace === selectedPace);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !meetingPoint.trim() || !destination.trim() || !departureTime) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddPing({
        creator_username: currentUser.username,
        creator_avatar: currentUser.avatar_url,
        title: title.trim(),
        meeting_point: meetingPoint.trim(),
        destination: destination.trim(),
        departure_time: new Date(departureTime).toISOString(),
        pace,
        max_participants: maxParticipants ? parseInt(maxParticipants, 10) : null,
        notes: notes.trim() || undefined
      });
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error creating ping:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper for live countdown rendering
  const getCountdownInfo = (departureIso: string) => {
    const depTime = new Date(departureIso).getTime();
    const diffMs = depTime - now;
    const diffMins = Math.round(diffMs / 60000);

    if (diffMins > 60) {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return {
        text: `in ${hours} Std ${mins > 0 ? `${mins} Min` : ''}`,
        color: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        isLive: false
      };
    } else if (diffMins > 0) {
      return {
        text: `in ${diffMins} Min`,
        color: 'bg-red-500/20 text-red-300 border-red-500/50 animate-pulse',
        isLive: true
      };
    } else if (diffMins >= -120) {
      return {
        text: 'Unterwegs / Gestartet',
        color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        isLive: false
      };
    } else {
      return {
        text: 'Beendet',
        color: 'bg-slate-800 text-slate-400 border-slate-700',
        isLive: false
      };
    }
  };

  const getPaceBadge = (p: RidePace) => {
    switch (p) {
      case 'Gemütlich':
        return {
          label: '☕ Gemütlich',
          classes: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
        };
      case 'Flott':
        return {
          label: '⚡ Flott',
          classes: 'bg-amber-500/15 text-amber-300 border-amber-500/40'
        };
      case 'Sportlich':
        return {
          label: '🔥 Sportlich',
          classes: 'bg-red-500/20 text-red-400 border-red-500/40 font-black'
        };
    }
  };

  // Compact Mode for Dashboard
  if (isCompact) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 rounded-3xl p-5 md:p-6 transition-all shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <h3 className="text-base font-extrabold uppercase text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-amber-400" /> Feierabend-Pings
            </h3>
            <span className="bg-amber-500/20 text-amber-400 text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-500/30">
              {activePings.length} aktiv
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openCreateModal}
              className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 cursor-pointer shadow"
            >
              <Plus className="w-3.5 h-3.5" /> Ping
            </button>
            {onNavigateToFull && (
              <button
                onClick={onNavigateToFull}
                className="text-xs text-slate-400 hover:text-amber-400 font-bold transition-colors cursor-pointer"
              >
                Alle ansehen →
              </button>
            )}
          </div>
        </div>

        {activePings.length === 0 ? (
          <div className="text-center py-6 bg-slate-950/60 rounded-2xl border border-slate-800/80 p-4">
            <Radio className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-300">Heute noch keine Feierabendrunde gestartet</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Starte jetzt einen Ping für die Crew!</p>
            <button
              onClick={openCreateModal}
              className="mt-3 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer inline-flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" /> Schnelle Ausfahrt ankündigen
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {activePings.slice(0, 2).map((ping) => {
              const countdown = getCountdownInfo(ping.departure_time);
              const paceInfo = getPaceBadge(ping.pace);
              const goingCount = ping.participants.filter((p) => p.status === 'going').length;
              const myStatus = ping.participants.find((p) => p.username === currentUser.username)?.status;
              const depDate = new Date(ping.departure_time);
              const timeStr = depDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

              return (
                <div
                  key={ping.id}
                  className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${paceInfo.classes}`}>
                          {paceInfo.label}
                        </span>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${countdown.color}`}>
                          {countdown.text}
                        </span>
                      </div>
                      <h4 className="text-sm font-black text-white">{ping.title}</h4>
                    </div>
                    <span className="text-xs font-extrabold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg">
                      {timeStr} Uhr
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 mb-3 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/60">
                    <div className="truncate flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span className="truncate text-slate-300 font-semibold">{ping.meeting_point}</span>
                    </div>
                    <div className="truncate flex items-center gap-1.5">
                      <Flag className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate text-slate-300 font-semibold">{ping.destination}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                    <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      <strong className="text-emerald-400">{goingCount}</strong> dabei
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onTogglePingStatus(ping.id, 'going')}
                        className={`text-xs font-bold px-3 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                          myStatus === 'going'
                            ? 'bg-emerald-500 text-black shadow-md'
                            : 'bg-slate-800 hover:bg-emerald-600/30 text-slate-300 hover:text-emerald-400'
                        }`}
                      >
                        <Check className="w-3 h-3" /> {myStatus === 'going' ? 'Dabei ✓' : 'Mitfahren'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Full Feed View
  return (
    <div className="space-y-6">
      {/* Top Pace Filter & Actions Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 px-2 rounded-xl border border-slate-800 overflow-x-auto no-scrollbar touch-pan-x flex-nowrap scroll-smooth max-w-full">
          <button
            onClick={() => setSelectedPace('all')}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 whitespace-nowrap select-none border-0 ${
              selectedPace === 'all' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white bg-transparent'
            }`}
          >
            Alle ({activePings.length})
          </button>
          <button
            onClick={() => setSelectedPace('Gemütlich')}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 whitespace-nowrap select-none border-0 ${
              selectedPace === 'Gemütlich' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-cyan-300 bg-transparent'
            }`}
          >
            ☕ Gemütlich
          </button>
          <button
            onClick={() => setSelectedPace('Flott')}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 whitespace-nowrap select-none border-0 ${
              selectedPace === 'Flott' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-amber-300 bg-transparent'
            }`}
          >
            ⚡ Flott
          </button>
          <button
            onClick={() => setSelectedPace('Sportlich')}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 whitespace-nowrap select-none border-0 ${
              selectedPace === 'Sportlich' ? 'bg-red-500 text-white' : 'text-slate-400 hover:text-red-400 bg-transparent'
            }`}
          >
            🔥 Sportlich
          </button>
        </div>

        <button
          onClick={openCreateModal}
          className="bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-extrabold text-xs uppercase tracking-wider px-5 py-2.5 rounded-full transition-all shadow-[0_0_20px_rgba(250,204,21,0.25)] hover:shadow-[0_0_30px_rgba(250,204,21,0.5)] flex items-center justify-center gap-1.5 border-0 cursor-pointer shrink-0 self-stretch sm:self-auto"
        >
          <Zap className="w-3.5 h-3.5 fill-black" /> ⚡ Ping raushauen (15s)
        </button>
      </div>

      {/* Pings Grid */}
      {filteredPings.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-3xl p-8">
          <div className="w-16 h-16 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto mb-4 text-amber-400">
            <Radio className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold uppercase text-white mb-1">Keine aktiven Feierabend-Pings</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-6">
            Aktuell steht keine spontane Runde im Kalender. Nutze das schöne Wetter und lade die Crew zur Ausfahrt ein!
          </p>
          <button
            onClick={openCreateModal}
            className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase px-5 py-3 rounded-full transition-all shadow-lg inline-flex items-center gap-2 cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-black" /> Jetzt ersten Ping starten
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredPings.map((ping) => {
            const countdown = getCountdownInfo(ping.departure_time);
            const paceInfo = getPaceBadge(ping.pace);
            const goingList = ping.participants.filter((p) => p.status === 'going');
            const maybeList = ping.participants.filter((p) => p.status === 'maybe');
            const myParticipant = ping.participants.find((p) => p.username === currentUser.username);
            const myStatus = myParticipant?.status;
            const isCreator = ping.creator_username === currentUser.username || currentUser.isAdmin || currentUser.isModerator;
            
            const hasMax = Boolean(ping.max_participants);
            const slotsLeft = hasMax && ping.max_participants ? Math.max(0, ping.max_participants - goingList.length) : null;
            const isFull = hasMax && slotsLeft === 0 && myStatus !== 'going';

            const depDate = new Date(ping.departure_time);
            const isToday = depDate.toDateString() === new Date().toDateString();
            const dateLabel = isToday ? 'Heute' : depDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
            const timeLabel = depDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

            return (
              <div
                key={ping.id}
                className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-3xl p-6 transition-all duration-300 shadow-xl flex flex-col justify-between relative overflow-hidden group"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex justify-between items-start gap-3 mb-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`text-xs font-extrabold px-3 py-1 rounded-full border ${paceInfo.classes}`}>
                          {paceInfo.label}
                        </span>
                        <span className={`text-xs font-extrabold px-3 py-1 rounded-full border flex items-center gap-1.5 ${countdown.color}`}>
                          <Clock className="w-3.5 h-3.5" />
                          {countdown.text}
                        </span>
                      </div>
                      <h3 className="text-xl font-black uppercase text-white tracking-tight leading-snug">
                        {ping.title}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400 font-medium">
                        <UserAvatar
                          username={ping.creator_username}
                          avatarUrl={ping.creator_avatar}
                          allUsers={allUsers}
                          currentUser={currentUser}
                          size="xs"
                          bordered
                          borderColor="border-amber-400/50"
                        />
                        <span>von <strong className="text-amber-400">{ping.creator_username}</strong></span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-base font-black text-amber-400 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl">
                        {dateLabel}, {timeLabel} Uhr
                      </div>
                    </div>
                  </div>

                  {/* Route & Meeting Point Details */}
                  <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800/80 space-y-2.5 my-4">
                    <div className="flex items-start gap-2.5">
                      <MapPin className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Treffpunkt / Start</span>
                        <p className="text-xs font-bold text-white leading-tight">{ping.meeting_point}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 pt-2 border-t border-slate-900">
                      <Flag className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Ziel / Route</span>
                        <p className="text-xs font-bold text-white leading-tight">{ping.destination}</p>
                      </div>
                    </div>

                    {ping.notes && (
                      <div className="pt-2 border-t border-slate-900 flex items-start gap-2 text-slate-300">
                        <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-slate-300 italic">{ping.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Participant Badges / Avatars */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                        <Check className="w-3.5 h-3.5" /> {goingList.length} Dabei
                        {goingList.length > 0 && (
                          <span className="text-slate-400 text-[11px] ml-1">
                            ({goingList.map((g) => g.username).join(', ')})
                          </span>
                        )}
                      </span>

                      {maybeList.length > 0 && (
                        <span className="text-slate-400 font-medium flex items-center gap-1 bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-700/50">
                          <HelpCircle className="w-3 h-3 text-slate-400" /> {maybeList.length} Vielleicht
                        </span>
                      )}
                    </div>

                    {hasMax && (
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
                        isFull 
                          ? 'bg-red-500/20 text-red-300 border-red-500/30' 
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        {isFull ? 'Voll belegt' : `Noch ${slotsLeft} Plätze frei`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-4 border-t border-slate-800/80 flex items-center gap-2">
                  <button
                    onClick={() => onTogglePingStatus(ping.id, 'going')}
                    disabled={isFull}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      myStatus === 'going'
                        ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                        : 'bg-slate-800 hover:bg-emerald-500 hover:text-black text-white'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    {myStatus === 'going' ? 'Bin dabei ✓' : 'Bin dabei'}
                  </button>

                  <button
                    onClick={() => onTogglePingStatus(ping.id, 'maybe')}
                    className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      myStatus === 'maybe'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    <HelpCircle className="w-4 h-4" />
                    {myStatus === 'maybe' ? 'Vielleicht ✓' : 'Vielleicht'}
                  </button>

                  {isCreator && (
                    <button
                      onClick={() => onDeletePing(ping.id)}
                      title="Ausfahrt absagen & löschen"
                      className="p-2.5 bg-slate-800/60 hover:bg-red-500/20 hover:text-red-400 text-slate-400 rounded-xl transition border border-transparent hover:border-red-500/30 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: 15-Sekunden Express Feierabend-Ping */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-slate-900 border border-amber-400/40 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <Zap className="w-5 h-5 fill-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase text-white">Spontanen Ping senden</h3>
                  <p className="text-[11px] text-slate-400">In unter 15 Sekunden deine Feierabendrunde ankündigen</p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                  Motto / Titel der Ausfahrt *
                </label>
                <input
                  type="text"
                  required
                  placeholder="z.B. Feierabendrunde zum Johanniskreuz"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none transition"
                />
              </div>

              {/* Start & Destination */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-red-400" /> Treffpunkt *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="z.B. Aral Tankstelle Landau"
                    value={meetingPoint}
                    onChange={(e) => setMeetingPoint(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1 flex items-center gap-1">
                    <Flag className="w-3.5 h-3.5 text-amber-400" /> Zielort *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="z.B. Café Nicklis"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Departure Time & Pace */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-400" /> Abfahrtszeit *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1 flex items-center gap-1">
                    <Gauge className="w-3.5 h-3.5 text-cyan-400" /> Fahrstil / Pace *
                  </label>
                  <select
                    value={pace}
                    onChange={(e) => setPace(e.target.value as RidePace)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none transition"
                  >
                    <option value="Gemütlich">☕ Gemütlich (StVO & Cruisen)</option>
                    <option value="Flott">⚡ Flott (Zügig & Flüssig)</option>
                    <option value="Sportlich">🔥 Sportlich (Kurvenfokus)</option>
                  </select>
                </div>
              </div>

              {/* Optional Max Bikes & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                    Max. Bikes
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="30"
                    placeholder="Offen"
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none transition"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                    Kurze Notiz (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="z.B. Bitte vorher voll tanken!"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none transition"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 transition cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-amber-500 hover:bg-amber-400 text-black shadow-lg transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    'Wird gesendet...'
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-black" /> Ping rausschicken
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
