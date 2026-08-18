import React, { useState, useEffect, useMemo } from 'react';
import { User, AppView, TripEntry, SpotCheckin, SpotOfTheWeek, PhotoOfTheWeek, TileConfig, CrewEvent, GarageBike, MarketItem, GpxRoute, ForumTopic, MapPin as MapPinType, FeedbackSuggestion, FeedbackCategory, RidePing, PingParticipantStatus } from '../types';
import { Map, MessageSquare, Calendar, MapPin, Wrench, ShoppingBag, Shield, Camera, ThumbsUp, Plus, Check, Trophy, X, Upload, Trash2, LayoutGrid, Users, ArrowRight, ChevronRight, Tag, Clock, Timer, Sparkles, Lightbulb, Edit, Compass, Route, Shuffle, Navigation, Radio, Zap } from 'lucide-react';
import { getSavedTileLayout } from '../lib/tileUtils';
import { getVotingCycleStatus, CycleStatus } from '../lib/votingCycle';
import { FeedbackBoard } from '../components/FeedbackBoard';
import { FeierabendPings } from '../components/FeierabendPings';
import { ExclusiveEventsModal } from '../components/ExclusiveEventsModal';
import { UserRoleBadge } from '../components/UserRoleBadge';
import { UserAvatar } from '../components/UserAvatar';

interface DashboardViewProps {
  currentUser: User;
  trips?: TripEntry[];
  spotCheckins?: SpotCheckin[];
  spotOfTheWeek?: SpotOfTheWeek;
  allUsers?: User[];
  photosOfTheWeek?: PhotoOfTheWeek[];
  events?: CrewEvent[];
  pings?: RidePing[];
  bikes?: GarageBike[];
  marketItems?: MarketItem[];
  routes?: GpxRoute[];
  topics?: ForumTopic[];
  mapPins?: MapPinType[];
  feedbacks?: FeedbackSuggestion[];
  onNavigate: (view: AppView, tab?: 'all' | 'events' | 'pings' | 'archive') => void;
  onOpenLeaderboardModal?: () => void;
  onOpenAddTripModal?: () => void;
  onSpotCheckin?: (spotId: string, spotName: string) => void;
  onVotePhoto?: (photoId: string) => void;
  onSubmitPhoto?: (photoData: { title: string; image_url: string; description: string }) => void;
  onSetWinnerPhoto?: (photoId: string) => void;
  onDeletePhoto?: (photoId: string, reason: string) => void;
  onOpenEditPhoto?: (photoId?: string) => void;
  onSubmitFeedback?: (data: { title: string; description: string; category: FeedbackCategory; is_anonymous: boolean }) => void;
  onUpvoteFeedback?: (feedbackId: string) => void;
  onDeleteFeedback?: (feedbackId: string, reason?: string) => void;
  onAddPing?: (ping: Omit<RidePing, 'id' | 'created_at' | 'participants'>) => Promise<void> | void;
  onTogglePingStatus?: (pingId: string, status: PingParticipantStatus) => Promise<void> | void;
  onDeletePing?: (pingId: string) => Promise<void> | void;
  onToggleParticipation?: (eventId: string) => Promise<void> | void;
  showAlert?: (title: string, message: string, type?: 'success' | 'warning' | 'danger') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  allUsers = [],
  photosOfTheWeek = [],
  events = [],
  pings = [],
  bikes = [],
  marketItems = [],
  routes = [],
  topics = [],
  mapPins = [],
  feedbacks = [],
  onNavigate,
  onVotePhoto,
  onSubmitPhoto,
  onSetWinnerPhoto,
  onDeletePhoto,
  onOpenEditPhoto,
  onSubmitFeedback,
  onUpvoteFeedback,
  onDeleteFeedback,
  onAddPing,
  onTogglePingStatus,
  onDeletePing,
  onToggleParticipation,
  showAlert,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newImage, setNewImage] = useState('');

  const [dashboardTiles, setDashboardTiles] = useState<TileConfig[]>(() => getSavedTileLayout());
  const [cycleStatus, setCycleStatus] = useState<CycleStatus>(() => getVotingCycleStatus());
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isPhotoVotingModalOpen, setIsPhotoVotingModalOpen] = useState(false);
  const [isEventsModalOpen, setIsEventsModalOpen] = useState(false);
  const [eventsFilter, setEventsFilter] = useState<'all' | 'events' | 'pings'>('all');
  const [eventSearchQuery, setEventSearchQuery] = useState('');
  const [rotatingPhotoIndex, setRotatingPhotoIndex] = useState(0);
  const [rotatingGpxIndex, setRotatingGpxIndex] = useState(0);

  const activeEventsCount = useMemo(() => {
    const now = Date.now();
    return events.filter((e) => {
      if (e.is_archived) return false;
      if (!e.date_time) return false;
      const t = new Date(e.date_time).getTime();
      return !isNaN(t) && now - t <= 24 * 60 * 60 * 1000;
    }).length;
  }, [events]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCycleStatus(getVotingCycleStatus());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (photosOfTheWeek.length <= 1) return;
    const interval = setInterval(() => {
      setRotatingPhotoIndex((prev) => {
        let next = Math.floor(Math.random() * photosOfTheWeek.length);
        if (next === prev && photosOfTheWeek.length > 1) {
          next = (prev + 1) % photosOfTheWeek.length;
        }
        return next;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [photosOfTheWeek.length]);

  useEffect(() => {
    if (routes.length <= 1) return;
    const interval = setInterval(() => {
      setRotatingGpxIndex((prev) => (prev + 1) % routes.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [routes.length]);

  // Helper to render mini SVG track representation for GPX
  const renderSvgTrack = (gpxData?: string, width = 200, height = 110) => {
    if (!gpxData) return null;
    try {
      const xml = new DOMParser().parseFromString(gpxData, 'text/xml');
      const trkpts = xml.getElementsByTagName('trkpt');
      if (trkpts.length < 2) return null;

      let minLat = Infinity,
        maxLat = -Infinity,
        minLon = Infinity,
        maxLon = -Infinity;
      const points: { lat: number; lon: number }[] = [];

      for (let i = 0; i < trkpts.length; i++) {
        const lat = parseFloat(trkpts[i].getAttribute('lat') || '');
        const lon = parseFloat(trkpts[i].getAttribute('lon') || trkpts[i].getAttribute('lng') || '');
        if (!isNaN(lat) && !isNaN(lon)) {
          points.push({ lat, lon });
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
          if (lon < minLon) minLon = lon;
          if (lon > maxLon) maxLon = lon;
        }
      }

      if (points.length < 2) return null;

      const latRange = maxLat - minLat || 0.0001;
      const lonRange = maxLon - minLon || 0.0001;
      const w = width,
        h = height,
        pad = 12;

      let d = '';
      points.forEach((p, idx) => {
        const x = pad + ((p.lon - minLon) / lonRange) * (w - pad * 2);
        const y = h - (pad + ((p.lat - minLat) / latRange) * (h - pad * 2));
        d += idx === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
      });

      return (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full">
          <path
            d={d}
            fill="none"
            stroke="#facc15"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {points.length > 0 && (
            <circle
              cx={pad + ((points[0].lon - minLon) / lonRange) * (w - pad * 2)}
              cy={h - (pad + ((points[0].lat - minLat) / latRange) * (h - pad * 2))}
              r="3.5"
              fill="#22c55e"
              stroke="#0f172a"
              strokeWidth="1.5"
            />
          )}
          {points.length > 1 && (
            <circle
              cx={pad + ((points[points.length - 1].lon - minLon) / lonRange) * (w - pad * 2)}
              cy={h - (pad + ((points[points.length - 1].lat - minLat) / latRange) * (h - pad * 2))}
              r="3.5"
              fill="#ef4444"
              stroke="#0f172a"
              strokeWidth="1.5"
            />
          )}
        </svg>
      );
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    const refreshTiles = () => {
      setDashboardTiles(getSavedTileLayout());
    };
    refreshTiles();
    window.addEventListener('storage', refreshTiles);
    return () => window.removeEventListener('storage', refreshTiles);
  }, []);

  // Moderation state
  const [deleteModalPhoto, setDeleteModalPhoto] = useState<PhotoOfTheWeek | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        if (showAlert) showAlert('Datei zu groß', 'Das Bild darf maximal 5 MB groß sein.', 'danger');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      if (showAlert) showAlert('Fehlender Titel', 'Bitte gib einen Titel für dein Foto ein.', 'warning');
      return;
    }
    if (!newImage) {
      if (showAlert) showAlert('Kein Foto gewährt', 'Bitte lade ein Bild hoch oder gib eine Bild-URL an.', 'warning');
      return;
    }

    if (onSubmitPhoto) {
      onSubmitPhoto({
        title: newTitle.trim(),
        image_url: newImage,
        description: newDescription.trim(),
      });
    }

    setNewTitle('');
    setNewDescription('');
    setNewImage('');
    setShowAddModal(false);
    if (showAlert) showAlert('Erfolgreich eingereicht!', 'Dein Foto nimmt jetzt am Crew-Voting für das Bild der Woche teil.', 'success');
  };

  // Determine top voted photo or explicit winner
  const currentWinner = photosOfTheWeek.find((p) => p.is_winner) ||
    [...photosOfTheWeek].sort((a, b) => (b.votes?.length || 0) - (a.votes?.length || 0))[0];

  // Count active spontaneous evening rounds (pings)
  const nowMs = Date.now();
  const activePingsList = pings.filter(
    (p) => new Date(p.departure_time).getTime() >= nowMs - 2 * 60 * 60 * 1000
  );
  const activePingsCount = activePingsList.length;

  return (
    <div className="py-6 max-w-6xl mx-auto px-4 space-y-8">
      {/* Title Header */}
      <h2 className="text-3xl font-extrabold uppercase text-center tracking-wider">
        Crew <span className="text-amber-400">Area</span>
      </h2>

      {/* Admin Highlight Banner */}
      {(currentUser.isAdmin || currentUser.isModerator) && (
        <div
          onClick={() => onNavigate('admin')}
          className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/20 via-purple-900/30 to-slate-900 border border-amber-500/50 hover:border-amber-400 transition-all cursor-pointer shadow-xl flex flex-col md:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500 text-black rounded-2xl">
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold uppercase text-amber-400">Admin & Moderator Center</h3>
              <p className="text-xs text-slate-300">
                Verwalte Invite-Codes, Mitglieder-Rechte und Inaktivitätswarnungen.
              </p>
            </div>
          </div>
          <button className="px-5 py-2 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase shadow-md border-0 cursor-pointer">
            Verwaltung Öffnen
          </button>
        </div>
      )}

      {/* Grid of Standard Navigation Cards */}
      <div className="flex flex-wrap justify-center gap-6">
        {dashboardTiles
          .filter((t) => t.visible)
          .map((tile) => {
            const isExpanded = tile.colSpan >= 2 || tile.minHeight >= 220;

            const getColClass = (colSpan: number) => {
              if (colSpan === 1) return 'w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] max-w-md';
              if (colSpan === 2) return 'w-full lg:w-[calc(66.666%-12px)] max-w-2xl';
              return 'w-full max-w-full';
            };

            const renderIcon = (name: string) => {
              switch (name) {
                case 'Map': return <Map className="w-8 h-8" />;
                case 'MessageSquare': return <MessageSquare className="w-8 h-8" />;
                case 'Calendar': return <Calendar className="w-8 h-8" />;
                case 'MapPin': return <MapPin className="w-8 h-8" />;
                case 'Wrench': return <Wrench className="w-8 h-8" />;
                case 'ShoppingBag': return <ShoppingBag className="w-8 h-8" />;
                case 'Camera': return <Camera className="w-8 h-8" />;
                case 'Lightbulb': return <Lightbulb className="w-8 h-8" />;
                default: return <LayoutGrid className="w-8 h-8" />;
              }
            };

            const renderTilePreviews = () => {
              const count = tile.colSpan === 3 ? 3 : 2;

              if (tile.id === 'photo_of_week') {
                if (photosOfTheWeek.length === 0) {
                  return (
                    <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
                      <span>Noch keine Fotos eingereicht</span>
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        Erstes Foto einreichen <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  );
                }

                const activePhoto = photosOfTheWeek[rotatingPhotoIndex % photosOfTheWeek.length] || currentWinner;
                const totalVotes = activePhoto.votes?.length || 0;
                const isLeader = currentWinner?.id === activePhoto.id;

                return (
                  <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3">
                    {/* Voting Countdown Banner */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-300 font-extrabold text-[11px] shadow-sm">
                        <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse flex-shrink-0" />
                        <span className="truncate">
                          {cycleStatus.phase === 'voting' ? 'Voting bis So.:' : 'Neuer Zyklus:'}
                        </span>
                        <span className="font-mono font-black text-yellow-300 bg-black/60 px-2 py-0.5 rounded border border-amber-400/30 text-[11px]">
                          {cycleStatus.formattedCountdown}
                        </span>
                      </div>
                      <span className="text-[11px] font-extrabold text-amber-400 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform flex-shrink-0">
                        Voten <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>

                    {/* Preview box */}
                    <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800/90 hover:border-amber-400/50 transition-all text-left space-y-2">
                      {/* Rotating Photo Frame */}
                      <div className="relative w-full h-32 rounded-xl overflow-hidden bg-black flex-shrink-0 border border-amber-500/30 group-hover:border-amber-400/60 shadow-md">
                        <img
                          src={activePhoto.image_url}
                          alt={activePhoto.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent" />
                        
                        {isLeader && (
                          <div className="absolute top-2 left-2 bg-amber-500 text-black font-black text-[9px] uppercase px-2 py-0.5 rounded-md shadow flex items-center gap-1 border border-amber-300">
                            <Trophy className="w-3 h-3 fill-black" /> #1 Favorit
                          </div>
                        )}

                        <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-amber-300 font-extrabold text-[9px] px-2 py-0.5 rounded-md border border-amber-500/30">
                          {photosOfTheWeek.length > 1 ? `Foto ${(rotatingPhotoIndex % photosOfTheWeek.length) + 1}/${photosOfTheWeek.length}` : '1 Foto'}
                        </div>

                        <div className="absolute bottom-1.5 left-2 right-2 text-[11px] font-bold text-white truncate flex items-center justify-between">
                          <span className="truncate flex items-center gap-1">
                            <span>@{activePhoto.author}</span>
                            <UserRoleBadge username={activePhoto.author} allUsers={allUsers} currentUser={currentUser} size="xs" />
                          </span>
                          <span className="bg-black/70 px-1.5 py-0.5 rounded text-[10px] text-amber-300 font-black flex items-center gap-1">
                            <ThumbsUp className="w-2.5 h-2.5 text-amber-400" /> {totalVotes}
                          </span>
                        </div>
                      </div>

                      {/* Photo Info */}
                      <div className="min-w-0 w-full">
                        <h4 className="text-xs font-extrabold text-white truncate">{activePhoto.title}</h4>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {activePhoto.description ? `"${activePhoto.description}"` : 'Community Bike-Voting'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }

              if (tile.id === 'events') {
                const nowMs = Date.now();
                const activeEventsList = events
                  .filter((e) => {
                    if (e.is_archived) return false;
                    if (!e.date_time) return false;
                    const t = new Date(e.date_time).getTime();
                    return !isNaN(t) && nowMs - t <= 24 * 60 * 60 * 1000;
                  })
                  .sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime());
                const upcomingEvents = activeEventsList.slice(0, 3);
                const activePings = pings
                  .filter((p) => new Date(p.departure_time).getTime() >= nowMs - 2 * 60 * 60 * 1000)
                  .sort((a, b) => new Date(a.departure_time).getTime() - new Date(b.departure_time).getTime());
                const displayPings = activePings.slice(0, 3);

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

                return (
                  <div className="space-y-4 mt-4 pt-4 border-t border-slate-800/80">
                    {/* Section 1: Feierabend-Pings (bis zu 3 Stück) */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase tracking-wider text-red-400 bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/30 inline-flex items-center gap-1.5 shadow-sm">
                            <Radio className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                            ⚡ Feierabend-Pings ({activePings.length})
                          </span>
                        </div>
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigate('events');
                          }}
                          className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer transition group/btn"
                        >
                          Alle Pings / Neuer Ping <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                        </span>
                      </div>

                      {displayPings.length === 0 ? (
                        <div className="bg-slate-950/80 p-3 rounded-2xl border border-dashed border-slate-800/90 hover:border-red-500/40 transition flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-400 border border-red-500/30 flex items-center justify-center font-bold text-xs flex-shrink-0">
                              <Radio className="w-4 h-4 animate-pulse text-red-400" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-white">Keine aktiven Feierabend-Pings</h4>
                              <p className="text-[11px] text-slate-400">Starte jetzt spontan eine Runde für heute Nachmittag/Abend!</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigate('events');
                            }}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-extrabold text-[11px] rounded-xl transition shadow flex items-center gap-1 cursor-pointer flex-shrink-0"
                          >
                            <Zap className="w-3.5 h-3.5" /> Ping starten
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {displayPings.map((ping) => {
                            const userStatus = ping.participants?.find((p) => p.username.toLowerCase() === currentUser.username.toLowerCase())?.status;
                            const goingCount = (ping.participants || []).filter((p) => p.status === 'going').length;
                            const maybeCount = (ping.participants || []).filter((p) => p.status === 'maybe').length;
                            const countdown = getPingCountdown(ping.departure_time);

                            return (
                              <div
                                key={ping.id}
                                className="bg-slate-950/90 p-3 rounded-2xl border border-red-500/30 hover:border-red-400/60 transition-all flex flex-col justify-between text-left relative overflow-hidden group shadow-md"
                              >
                                <div className="space-y-2">
                                  {/* Header with Pace & Countdown */}
                                  <div className="flex items-center justify-between gap-1.5">
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${
                                      ping.pace === 'Sportlich'
                                        ? 'bg-red-500/20 text-red-300 border-red-500/40'
                                        : ping.pace === 'Flott'
                                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                    }`}>
                                      {ping.pace}
                                    </span>
                                    <span className="font-mono font-bold text-[10px] text-red-300 bg-red-950/70 px-2 py-0.5 rounded border border-red-500/40 flex items-center gap-1">
                                      <Clock className="w-2.5 h-2.5 animate-pulse text-red-400" />
                                      {countdown}
                                    </span>
                                  </div>

                                  {/* Title & Creator */}
                                  <div>
                                    <h4 className="text-xs font-black text-white truncate">{ping.title}</h4>
                                    <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5 truncate">
                                      <UserAvatar
                                        username={ping.creator_username}
                                        avatarUrl={ping.creator_avatar}
                                        allUsers={allUsers}
                                        currentUser={currentUser}
                                        size="xs"
                                        bordered
                                        borderColor="border-amber-400/60"
                                      />
                                      <span className="truncate">@{ping.creator_username}</span>
                                    </div>
                                  </div>

                                  {/* Route info */}
                                  <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800/80 text-[10px] space-y-1">
                                    <div className="flex items-center gap-1.5 text-slate-300 truncate">
                                      <MapPin className="w-3 h-3 text-red-400 flex-shrink-0" />
                                      <span className="truncate">{ping.meeting_point}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-slate-400 truncate">
                                      <Compass className="w-3 h-3 text-amber-400 flex-shrink-0" />
                                      <span className="truncate">Ziel: {ping.destination}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Action / RSVP Buttons */}
                                <div className="mt-2.5 pt-2 border-t border-slate-900 flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                                    <Users className="w-3 h-3 text-red-400" />
                                    <span>{goingCount} dabei{maybeCount > 0 ? ` · ${maybeCount}?` : ''}</span>
                                  </div>

                                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      type="button"
                                      onClick={() => onTogglePingStatus && onTogglePingStatus(ping.id, 'going')}
                                      title={userStatus === 'going' ? 'Du bist dabei' : 'Als "Dabei" eintragen'}
                                      className={`px-2 py-1 rounded-lg text-[10px] font-extrabold flex items-center gap-1 transition cursor-pointer border ${
                                        userStatus === 'going'
                                          ? 'bg-emerald-500 text-black border-emerald-400 shadow-sm'
                                          : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800 hover:border-emerald-500/50'
                                      }`}
                                    >
                                      <Check className="w-3 h-3" /> {userStatus === 'going' ? 'Dabei' : 'Mit?'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onTogglePingStatus && onTogglePingStatus(ping.id, 'maybe')}
                                      title={userStatus === 'maybe' ? 'Du bist vielleicht dabei' : 'Als "Vielleicht" eintragen'}
                                      className={`px-1.5 py-1 rounded-lg text-[10px] font-extrabold flex items-center transition cursor-pointer border ${
                                        userStatus === 'maybe'
                                          ? 'bg-amber-500 text-black border-amber-400 shadow-sm'
                                          : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800 hover:border-amber-500/50'
                                      }`}
                                    >
                                      ?
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Section 2: Geplante Offizielle Crew-Events */}
                    <div className="pt-2 border-t border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-slate-300 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-amber-400" /> Geplante Crew-Ausfahrten & Termine
                        </span>
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigate('events');
                          }}
                          className="text-amber-400 font-bold text-[11px] flex items-center gap-0.5 cursor-pointer hover:underline"
                        >
                          Event-Kalender <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>

                      {upcomingEvents.length === 0 ? (
                        <div className="text-xs text-slate-400 flex items-center justify-between py-1">
                          <span>Keine weiteren offiziellen Events eingetragen</span>
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigate('events');
                            }}
                            className="text-amber-400 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            Event planen <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {upcomingEvents.map((ev) => (
                            <div
                              key={ev.id}
                              className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80 flex items-center gap-3 hover:border-red-500/50 transition-all text-left"
                            >
                              {ev.image_data ? (
                                <img src={ev.image_data} alt={ev.title} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-slate-800" />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 flex items-center justify-center font-black text-xs flex-shrink-0">
                                  <Calendar className="w-4 h-4" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <span className="text-[9px] font-extrabold uppercase text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20 inline-block">
                                  {ev.date_time ? ev.date_time.substring(0, 10) : 'Anstehend'}
                                </span>
                                <h4 className="text-xs font-bold text-white truncate mt-0.5">{ev.title}</h4>
                                <p className="text-[10px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                                  <Users className="w-3 h-3 text-slate-500" /> {ev.participants?.length || 0} Rider
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              if (tile.id === 'garage') {
                const sampleBikes = bikes.slice(0, count);
                if (sampleBikes.length === 0) {
                  return (
                    <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
                      <span>Noch keine Bikes im Showroom</span>
                      <span className="text-amber-400 font-bold flex items-center gap-1">Bike eintragen <ChevronRight className="w-3 h-3" /></span>
                    </div>
                  );
                }
                return (
                  <div className={`mt-4 pt-4 border-t border-slate-800/80 ${tile.colSpan === 1 ? 'grid grid-cols-1 gap-2.5' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'}`}>
                    {sampleBikes.map((b) => (
                      <div
                        key={b.id}
                        className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 flex items-center gap-3 hover:border-amber-400/50 transition-all text-left"
                      >
                        {b.images?.[0] ? (
                          <img src={b.images[0]} alt={b.model} className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-slate-800" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-amber-400/10 text-amber-400 border border-amber-400/30 flex items-center justify-center flex-shrink-0">
                            <Wrench className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-extrabold text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 inline-block truncate max-w-full">
                            @{b.owner}
                          </span>
                          <h4 className="text-xs font-bold text-white truncate mt-0.5">{b.model}</h4>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">
                            {b.mods ? b.mods.split('\n')[0] : 'Custom Bike'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              }

              if (tile.id === 'market') {
                const activeMarket = marketItems.filter((m) => !m.is_deleted).slice(0, count);
                if (activeMarket.length === 0) {
                  return (
                    <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
                      <span>Keine aktuellen Flohmarkt-Inserate</span>
                      <span className="text-amber-400 font-bold flex items-center gap-1">Inserat erstellen <ChevronRight className="w-3 h-3" /></span>
                    </div>
                  );
                }
                return (
                  <div className={`mt-4 pt-4 border-t border-slate-800/80 ${tile.colSpan === 1 ? 'grid grid-cols-1 gap-2.5' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'}`}>
                    {activeMarket.map((item) => (
                      <div
                        key={item.id}
                        className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 flex items-center gap-3 hover:border-blue-400/50 transition-all text-left"
                      >
                        {item.images?.[0] ? (
                          <img src={item.images[0]} alt={item.item_name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-slate-800" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                            <ShoppingBag className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-extrabold text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 truncate">
                              {item.category || 'Teile'}
                            </span>
                            <span className="text-xs font-black text-amber-400 flex-shrink-0">
                              {item.price} €
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-white truncate mt-0.5">{item.item_name}</h4>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5 flex items-center gap-1">
                            <span>von {item.author}</span>
                            <UserRoleBadge username={item.author} allUsers={allUsers} currentUser={currentUser} size="xs" />
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              }

              if (tile.id === 'gpx') {
                if (routes.length === 0) {
                  return (
                    <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
                      <span>Noch keine Touren eingereicht</span>
                      <span className="text-yellow-400 font-bold flex items-center gap-1">
                        Erste GPX-Route hochladen <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  );
                }

                const activeRoute = routes[rotatingGpxIndex % routes.length];
                return (
                  <div className="mt-4 pt-4 border-t border-slate-800/80">
                    <div className={`flex ${tile.colSpan === 1 ? 'flex-col' : 'flex-col sm:flex-row'} items-center gap-3.5 bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800/90 hover:border-yellow-400/50 transition-all text-left`}>
                      {/* Interactive Rotating Track Frame */}
                      <div className={`relative ${tile.colSpan === 1 ? 'w-full h-28' : 'w-full sm:w-44 h-32'} rounded-xl overflow-hidden bg-slate-950 flex-shrink-0 border border-yellow-500/30 group-hover:border-yellow-400/60 shadow-md p-2 flex items-center justify-center`}>
                        {renderSvgTrack(activeRoute.gpx_data, 160, 100) || (
                          <div className="flex flex-col items-center justify-center text-slate-500 text-xs gap-1">
                            <Map className="w-8 h-8 text-yellow-400/50" />
                            <span>GPS-Strecke</span>
                          </div>
                        )}
                        <div className="absolute top-2 left-2 bg-yellow-500 text-black font-black text-[9px] uppercase px-2 py-0.5 rounded-md shadow flex items-center gap-1 border border-yellow-300">
                          <Compass className="w-3 h-3" /> GPX Track
                        </div>
                        <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-yellow-300 font-extrabold text-[9px] px-2 py-0.5 rounded-md border border-yellow-500/30">
                          {routes.length > 1 ? `Tour ${(rotatingGpxIndex % routes.length) + 1}/${routes.length}` : '1 Tour'}
                        </div>
                        <div className="absolute bottom-1.5 left-2 right-2 text-[11px] font-bold text-white truncate flex items-center justify-between bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded">
                          <span className="text-slate-300 text-[10px] truncate">@{activeRoute.created_by}</span>
                          <span className="text-yellow-400 font-black font-mono text-[10px]">{activeRoute.distance} km</span>
                        </div>
                      </div>

                      {/* Rotating GPX Info */}
                      <div className="min-w-0 flex-1 w-full space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/30 inline-flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-yellow-400 animate-spin" /> Rotation
                          </span>
                          <span className="text-xs font-black text-yellow-300 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800 flex items-center gap-1">
                            <Route className="w-3 h-3 text-yellow-400" /> {activeRoute.distance} km
                          </span>
                        </div>

                        <h4 className="text-sm font-extrabold text-white truncate">{activeRoute.title}</h4>
                        <p className="text-xs text-slate-400 truncate">
                          Erstellt von <span className="text-yellow-400 font-semibold">@{activeRoute.created_by}</span>
                        </p>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-900/80 text-xs">
                          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-yellow-500/15 border border-yellow-400/50 text-yellow-300 font-extrabold text-[11px]">
                            <Navigation className="w-3 h-3 text-yellow-400 animate-pulse flex-shrink-0" />
                            <span>GPX Strecke</span>
                          </div>
                          <span className="text-yellow-400 font-extrabold flex items-center gap-0.5 text-xs group-hover:translate-x-0.5 transition-transform cursor-pointer">
                            Öffnen <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              if (tile.id === 'forum') {
                const sampleTopics = topics.slice(0, count);
                if (sampleTopics.length === 0) return null;
                return (
                  <div className={`mt-4 pt-4 border-t border-slate-800/80 ${tile.colSpan === 1 ? 'grid grid-cols-1 gap-2.5' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'}`}>
                    {sampleTopics.map((t) => (
                      <div
                        key={t.id}
                        className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 flex items-center gap-3 hover:border-purple-400/50 transition-all text-left"
                      >
                        <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                          <MessageSquare className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-extrabold text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20 inline-block truncate max-w-full">
                            {t.category}
                          </span>
                          <h4 className="text-xs font-bold text-white truncate mt-0.5">{t.title}</h4>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5 flex items-center gap-1">
                            <span>{t.replies?.length || 0} Antworten · @{t.author}</span>
                            <UserRoleBadge username={t.author} allUsers={allUsers} currentUser={currentUser} size="xs" />
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              }

              if (tile.id === 'map') {
                const samplePins = mapPins.slice(0, count);
                if (samplePins.length === 0) return null;
                return (
                  <div className={`mt-4 pt-4 border-t border-slate-800/80 ${tile.colSpan === 1 ? 'grid grid-cols-1 gap-2.5' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'}`}>
                    {samplePins.map((p, idx) => (
                      <div
                        key={p.id || idx}
                        className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 flex items-center gap-3 hover:border-emerald-400/50 transition-all text-left"
                      >
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-extrabold text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 inline-block truncate max-w-full">
                            {p.city || 'Rider Spot'}
                          </span>
                          <h4 className="text-xs font-bold text-white truncate mt-0.5">@{p.username}</h4>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">{p.bike || 'Pixel Rider'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              }

              if (tile.id === 'feedback') {
                const sampleFeedbacks = feedbacks.slice(0, count);
                if (sampleFeedbacks.length === 0) {
                  return (
                    <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
                      <span>Keine aktuellen Vorschläge</span>
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        Idee einreichen <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  );
                }
                return (
                  <div className={`mt-4 pt-4 border-t border-slate-800/80 ${tile.colSpan === 1 ? 'grid grid-cols-1 gap-2.5' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'}`}>
                    {sampleFeedbacks.map((f) => (
                      <div
                        key={f.id}
                        className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 flex items-center gap-3 hover:border-amber-400/50 transition-all text-left"
                      >
                        <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                          <Lightbulb className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[9px] font-extrabold uppercase text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 truncate">
                              {f.category ? f.category : 'Vorschlag'}
                            </span>
                            <span className="text-[10px] font-black text-amber-400 flex items-center gap-0.5 flex-shrink-0">
                              <ThumbsUp className="w-2.5 h-2.5" /> {f.upvotes?.length || 0}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-white truncate mt-0.5">{f.title}</h4>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">
                            {f.is_anonymous ? 'Anonym' : `@${f.author_username}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              }

              return null;
            };

            return (
              <div
                key={tile.id}
                onClick={() => {
                  if (tile.id === 'feedback') {
                    setIsFeedbackModalOpen(true);
                  } else if (tile.id === 'photo_of_week') {
                    setIsPhotoVotingModalOpen(true);
                  } else if (tile.id === 'events') {
                    onNavigate('events', 'all');
                  } else if (tile.viewTarget) {
                    onNavigate(tile.viewTarget);
                  }
                }}
                style={{ minHeight: `${tile.minHeight}px` }}
                className={`bg-slate-900/90 border border-slate-800 p-6 md:p-8 rounded-2xl hover:border-yellow-400/60 transition-all cursor-pointer group shadow-lg flex flex-col justify-between ${getColClass(
                  tile.colSpan
                )}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-5">
                    <div
                      className={`p-4 rounded-xl group-hover:scale-110 transition-transform flex-shrink-0 relative ${tile.bgIconClass}`}
                    >
                      {renderIcon(tile.iconName)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-bold uppercase text-white group-hover:text-yellow-400 transition-colors">
                          {tile.title}
                        </h3>
                      </div>
                      <p className="text-xs text-purple-200/80 mt-1 leading-relaxed">
                        {tile.subtitle}
                      </p>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="hidden sm:flex items-center gap-1 text-xs font-bold text-slate-400 group-hover:text-amber-400 transition-colors flex-shrink-0">
                      Öffnen <ChevronRight className="w-4 h-4" />
                    </div>
                  )}
                </div>

                {isExpanded ? (
                  renderTilePreviews()
                ) : tile.id === 'photo_of_week' ? (
                  photosOfTheWeek.length > 0 ? (
                    <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center gap-3">
                      <img
                        src={(photosOfTheWeek[rotatingPhotoIndex % photosOfTheWeek.length] || currentWinner).image_url}
                        alt="Vorschau"
                        className="w-12 h-10 rounded-lg object-cover border border-amber-500/40 flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-amber-300 truncate flex items-center gap-1">
                            <span>@{(photosOfTheWeek[rotatingPhotoIndex % photosOfTheWeek.length] || currentWinner).author}</span>
                            <UserRoleBadge username={(photosOfTheWeek[rotatingPhotoIndex % photosOfTheWeek.length] || currentWinner).author} allUsers={allUsers} currentUser={currentUser} size="xs" />
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            {(photosOfTheWeek[rotatingPhotoIndex % photosOfTheWeek.length] || currentWinner).votes?.length || 0} Stimmen
                          </span>
                        </div>
                        <p className="text-[11px] font-bold text-white truncate">
                          {(photosOfTheWeek[rotatingPhotoIndex % photosOfTheWeek.length] || currentWinner).title}
                        </p>
                        <div className="mt-1">
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/40 px-1.5 py-0.5 rounded shadow-sm">
                            <Clock className="w-2.5 h-2.5 text-amber-400 animate-pulse" />
                            <span>Voting bis So. 20:00:</span>
                            <strong className="text-yellow-300 font-mono">{cycleStatus.formattedCountdown}</strong>
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                      <span>Noch keine Fotos eingereicht</span>
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        Mitmachen <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  )
                ) : tile.id === 'gpx' ? (
                  routes.length > 0 ? (
                    (() => {
                      const activeRoute = routes[rotatingGpxIndex % routes.length];
                      return (
                        <div className="mt-4 pt-4 border-t border-slate-800/80 flex-1 flex flex-col justify-between">
                          <div className="bg-slate-950/90 p-3 rounded-2xl border border-slate-800/90 group-hover:border-yellow-400/40 transition-all text-left space-y-2.5">
                            {/* Track Preview Header & Visualizer in Free Area */}
                            <div className="relative w-full h-28 rounded-xl overflow-hidden bg-slate-950 border border-yellow-500/30 flex items-center justify-center p-2">
                              {renderSvgTrack(activeRoute.gpx_data, 220, 100) || (
                                <div className="flex flex-col items-center justify-center text-slate-500 text-xs gap-1">
                                  <Map className="w-8 h-8 text-yellow-400/50" />
                                  <span>GPS-Strecke</span>
                                </div>
                              )}
                              <div className="absolute top-2 left-2 bg-yellow-500 text-black font-black text-[9px] uppercase px-2 py-0.5 rounded-md shadow flex items-center gap-1 border border-yellow-300">
                                <Compass className="w-3 h-3" /> GPX Track
                              </div>
                              <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-yellow-300 font-extrabold text-[9px] px-2 py-0.5 rounded-md border border-yellow-500/30">
                                {routes.length > 1 ? `Tour ${(rotatingGpxIndex % routes.length) + 1}/${routes.length}` : '1 Tour'}
                              </div>
                              <div className="absolute bottom-1.5 left-2 right-2 text-[11px] font-bold text-white truncate flex items-center justify-between bg-black/75 backdrop-blur-sm px-2 py-0.5 rounded">
                                <span className="text-slate-300 text-[10px] truncate">@{activeRoute.created_by}</span>
                                <span className="text-yellow-400 font-black font-mono text-[10px]">{activeRoute.distance} km</span>
                              </div>
                            </div>

                            {/* Tour Details */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[9px] font-black uppercase tracking-wider text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/30 inline-flex items-center gap-1">
                                  <Sparkles className="w-2.5 h-2.5 text-yellow-400 animate-spin" /> Zufalls-Tour
                                </span>
                                <span className="text-[10px] font-black text-yellow-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1">
                                  <Route className="w-3 h-3 text-yellow-400" /> {activeRoute.distance} km
                                </span>
                              </div>
                              <h4 className="text-xs font-extrabold text-white truncate">{activeRoute.title}</h4>
                            </div>

                            {/* Tour CTA */}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-xs">
                              <span className="text-[10px] text-slate-400 font-medium">Community GPX-Route</span>
                              <span className="text-yellow-400 font-extrabold flex items-center gap-0.5 text-xs group-hover:translate-x-0.5 transition-transform">
                                Tour ansehen <ChevronRight className="w-3.5 h-3.5" />
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                      <span>Noch keine Touren hinterlegt</span>
                      <span className="text-yellow-400 font-bold flex items-center gap-1">
                        GPX hochladen <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  )
                ) : tile.id === 'events' ? (
                  <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2.5 text-left">
                    <div className="grid grid-cols-2 gap-2.5">
                      {/* Normale geplante Events (Goldene Zahl) -> Öffnet Events Seite */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate('events', 'events');
                        }}
                        className="bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 border border-amber-500/30 hover:border-amber-400/70 rounded-2xl p-2.5 flex items-center justify-between transition-all cursor-pointer text-left group/btn shadow-sm"
                      >
                        <div className="min-w-0">
                          <span className="text-[10px] text-amber-300 font-extrabold uppercase block tracking-wider truncate group-hover/btn:text-amber-200">
                            Events
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium truncate block">
                            Geplant
                          </span>
                        </div>
                        <div className="text-2xl font-black text-amber-400 font-mono drop-shadow-[0_0_8px_rgba(251,191,36,0.3)] pl-1 group-hover/btn:scale-105 transition-transform">
                          {activeEventsCount}
                        </div>
                      </button>

                      {/* Feierabend-Pings / Spontane Ausfahrten (Rote Zahl) -> Öffnet Feierabend-Pings Tab */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate('events', 'pings');
                        }}
                        className="bg-red-500/10 hover:bg-red-500/20 active:scale-95 border border-red-500/30 hover:border-red-400/70 rounded-2xl p-2.5 flex items-center justify-between transition-all cursor-pointer text-left group/btn shadow-sm"
                      >
                        <div className="min-w-0">
                          <span className="text-[10px] text-red-400 font-extrabold uppercase block tracking-wider flex items-center gap-1 truncate group-hover/btn:text-red-300">
                            {activePingsList.length > 0 && (
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                            )}
                            Feierabend-Pings
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium truncate block">
                            {activePingsList.length > 0 ? 'Live aktiv' : 'Spontan'}
                          </span>
                        </div>
                        <div className={`text-2xl font-black font-mono pl-1 group-hover/btn:scale-105 transition-transform ${activePingsList.length > 0 ? 'text-red-500 animate-pulse drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]' : 'text-red-400/80'}`}>
                          {activePingsList.length}
                        </div>
                      </button>
                    </div>

                    {/* Footer Quick Status & Action */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                      <span className="truncate">
                        {activeEventsCount > 0
                          ? `${activeEventsCount} ${activeEventsCount === 1 ? 'Event' : 'Events'} im Kalender`
                          : activePingsList.length > 0
                          ? `${activePingsList.length} Spontan-Runde aktiv`
                          : 'Keine Termine offen'}
                      </span>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate('events', 'events');
                        }}
                        className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 flex-shrink-0 group-hover:translate-x-0.5 transition-transform cursor-pointer"
                      >
                        Übersicht <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
      </div>

      {/* 📸 BILD DER WOCHE VOTING & GALERIE MODAL */}
      {isPhotoVotingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="max-w-5xl w-full my-auto animate-fadeIn bg-slate-950 border-2 border-amber-500/60 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-left relative">
            <button
              onClick={() => setIsPhotoVotingModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 cursor-pointer transition-colors"
              title="Schließen"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5 pr-14 sm:pr-20">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="p-3.5 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex-shrink-0">
                  <Camera className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl sm:text-2xl font-black uppercase text-white tracking-wide">
                      Bild der Woche
                    </h3>
                    <span className="text-amber-400 text-xs px-2.5 py-0.5 bg-amber-500/20 border border-amber-500/40 rounded-full font-bold">
                      Crew Vote
                    </span>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/20 border-2 border-amber-400 text-amber-300 text-xs font-black shadow-[0_0_15px_rgba(245,158,11,0.25)]">
                      <Timer className="w-4 h-4 text-amber-400 animate-pulse flex-shrink-0" />
                      <span className="text-amber-200">
                        {cycleStatus.phase === 'voting' ? 'Voting bis So. 20:00:' : 'Neuer Zyklus in:'}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-black/80 text-yellow-300 font-mono font-black tracking-wider border border-amber-400/50 shadow-inner">
                        {cycleStatus.formattedCountdown}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    Stimme für dein Lieblingsfoto ab! Das Foto mit den meisten Stimmen wird automatisch auf der Landingpage gefeatured.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2.5 mr-2 sm:mr-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase shadow-lg border-0 cursor-pointer flex items-center justify-center gap-2 transition-all hover:scale-105 flex-shrink-0"
              >
                <Plus className="w-4 h-4" /> Foto einreichen
              </button>
            </div>

            {/* Winner info banner if current user is author of the winning photo */}
            {currentWinner && currentWinner.author.toLowerCase() === currentUser.username.toLowerCase() && (
              <div className="bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-purple-900/30 border border-amber-500/50 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-black flex items-center justify-center flex-shrink-0 font-black shadow-md">
                    🏆
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-amber-300 uppercase">Gratulation! Dein Foto ist Bild der Woche</h4>
                    <p className="text-xs text-slate-300">Du kannst Titel und Beschreibung vor und während der Anzeige auf der Landingpage verfeinern.</p>
                  </div>
                </div>
                {onOpenEditPhoto && (
                  <button
                    onClick={() => onOpenEditPhoto(currentWinner.id)}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase shadow-md cursor-pointer border-0 flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Edit className="w-3.5 h-3.5" /> Angaben jetzt anpassen
                  </button>
                )}
              </div>
            )}

            {/* Photo Grid */}
            {photosOfTheWeek.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
                  <Camera className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-white uppercase">Noch keine Fotos eingereicht</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Sei der Erste im aktuellen Zyklus! Reiche ein Foto deines Motorrads oder deiner Tour ein und lass die Crew abstimmen.
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="mt-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase cursor-pointer border-0 shadow-md inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Jetzt erstes Foto einreichen
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-h-[60vh] overflow-y-auto pr-1">
                {photosOfTheWeek.map((photo) => {
                  const votesList = photo.votes || [];
                  const hasVoted = votesList.includes(currentUser.username);
                  const isWinner = currentWinner?.id === photo.id;
                  const isAuthor = currentUser.username.toLowerCase() === photo.author.toLowerCase();
                  const canDelete = currentUser.isAdmin || currentUser.isModerator || isAuthor;

                  return (
                    <div
                      key={photo.id}
                      className={`bg-slate-900/90 rounded-2xl border ${
                        isWinner ? 'border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)]' : 'border-slate-800'
                      } overflow-hidden flex flex-col justify-between transition-all hover:border-slate-700`}
                    >
                      <div>
                        <div className="relative h-48 bg-black overflow-hidden group">
                          <img
                            src={photo.image_url}
                            alt={photo.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />

                          {isWinner && (
                            <div className="absolute top-3 left-3 bg-amber-500 text-black font-black text-[10px] uppercase px-3 py-1 rounded-full shadow-lg flex items-center gap-1 border border-amber-300">
                              <Trophy className="w-3.5 h-3.5 fill-black" /> landingpage #1
                            </div>
                          )}

                          <div className="absolute bottom-2 left-3 right-3 text-xs font-bold text-white truncate flex items-center gap-1.5">
                            <span>@{photo.author}</span>
                            <UserRoleBadge username={photo.author} allUsers={allUsers} currentUser={currentUser} size="xs" />
                          </div>
                        </div>

                        <div className="p-4 space-y-2">
                          <h4 className="text-sm font-extrabold text-white uppercase line-clamp-1">{photo.title}</h4>
                          {photo.description && (
                            <p className="text-xs text-slate-300 line-clamp-2 italic">"{photo.description}"</p>
                          )}
                        </div>
                      </div>

                      <div className="p-4 pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                        <button
                          onClick={() => onVotePhoto && onVotePhoto(photo.id)}
                          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all border cursor-pointer ${
                            hasVoted
                              ? 'bg-amber-500 text-black border-amber-400 shadow-md scale-105'
                              : 'bg-slate-950 text-slate-300 border-slate-800 hover:text-amber-400 hover:border-amber-500/40'
                          }`}
                        >
                          {hasVoted ? <Check className="w-4 h-4" /> : <ThumbsUp className="w-4 h-4" />}
                          <span>{hasVoted ? 'Gestimmt' : 'Stimme abgeben'}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] ${hasVoted ? 'bg-black/30 text-black' : 'bg-slate-800 text-amber-400'}`}>
                            {votesList.length}
                          </span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          {(isAuthor || currentUser.isAdmin) && onOpenEditPhoto && (
                            <button
                              onClick={() => onOpenEditPhoto(photo.id)}
                              className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1"
                              title="Foto-Angaben bearbeiten"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {(currentUser.isAdmin || currentUser.isModerator) && !photo.is_winner && (
                            <button
                              onClick={() => onSetWinnerPhoto && onSetWinnerPhoto(photo.id)}
                              className="px-2 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold uppercase transition-all cursor-pointer"
                              title="Als offizielles Bild der Woche festlegen"
                            >
                              👑 #1 Kürung
                            </button>
                          )}

                          {canDelete && (
                            <button
                              onClick={() => {
                                if (isAuthor && !currentUser.isAdmin && !currentUser.isModerator) {
                                  if (window.confirm('Möchtest du dein eingereichtes Foto wirklich löschen?')) {
                                    if (onDeletePhoto) onDeletePhoto(photo.id, 'Vom Ersteller gelöscht');
                                  }
                                } else {
                                  setDeleteModalPhoto(photo);
                                  setDeleteReason('');
                                }
                              }}
                              className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-400 border border-red-500/30 text-[10px] font-bold uppercase transition-all cursor-pointer"
                              title={isAuthor ? 'Eigenes Foto löschen' : 'Foto mit Begründung entfernen (Mod/Admin)'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
        </div>
      )}

      {/* CREW FEEDBACK & IMPROVEMENT BOARD MODAL */}
      {isFeedbackModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="max-w-4xl w-full my-auto animate-fadeIn">
            <FeedbackBoard
              currentUser={currentUser}
              feedbacks={feedbacks}
              allUsers={allUsers}
              onSubmitFeedback={onSubmitFeedback || (() => {})}
              onUpvoteFeedback={onUpvoteFeedback || (() => {})}
              onDeleteFeedback={onDeleteFeedback}
              onNavigateToAdmin={() => {
                setIsFeedbackModalOpen(false);
                onNavigate('admin');
              }}
              showAlert={showAlert}
              isModalMode={true}
              onCloseModal={() => setIsFeedbackModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Modal: Delete Photo with Mandatory Reason (Admins / Moderators) */}
      {deleteModalPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/60 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative space-y-4">
            <button
              onClick={() => setDeleteModalPhoto(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full cursor-pointer border-0"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 text-red-400">
              <div className="p-3 bg-red-500/20 rounded-2xl border border-red-500/40">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase text-white">Foto Entfernen</h3>
                <p className="text-xs text-slate-400">Moderationsentscheidung für @{deleteModalPhoto.author}</p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center gap-3">
              <img src={deleteModalPhoto.image_url} alt={deleteModalPhoto.title} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">{deleteModalPhoto.title}</p>
                <p className="text-[11px] text-slate-400">Eingereicht von @{deleteModalPhoto.author}</p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!deleteReason.trim()) return;
                if (onDeletePhoto) {
                  onDeletePhoto(deleteModalPhoto.id, deleteReason.trim());
                }
                setDeleteModalPhoto(null);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                  Begründung für die Entfernung *
                </label>
                <textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="z.B. Kein Motorradbezug / Unangemessener Inhalt / Verstoß gegen Community-Regeln..."
                  rows={3}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalPhoto(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase cursor-pointer border-0"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={!deleteReason.trim()}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-extrabold text-xs uppercase cursor-pointer border-0 shadow-lg flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" /> Foto Entfernen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Submit Photo for Voting (Bild der Woche) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/60 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative space-y-6">
            <button
              onClick={() => {
                setShowAddModal(false);
                setNewTitle('');
                setNewDescription('');
                setNewImage('');
              }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full cursor-pointer border-0"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 text-amber-400">
              <div className="p-3 bg-amber-500/20 rounded-2xl border border-amber-500/40">
                <Camera className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase text-white">Foto zum Voting einreichen</h3>
                <p className="text-xs text-slate-400">Präsentiere dein Bike oder deine Tour für das „Bild der Woche“</p>
              </div>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                  Titel / Bike *
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="z.B. Sonnenuntergang im Schwarzwald oder Yamaha MT-09 Custom"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                  Foto hochladen oder Bild-URL *
                </label>
                
                {/* Drag and Drop / File Input Box */}
                <div className="border-2 border-dashed border-slate-700 hover:border-amber-400/70 rounded-2xl p-4 bg-slate-950/60 text-center transition-all">
                  {newImage ? (
                    <div className="space-y-3">
                      <div className="relative h-44 rounded-xl overflow-hidden bg-black border border-slate-800">
                        <img src={newImage} alt="Vorschau" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setNewImage('')}
                          className="absolute top-2 right-2 p-1.5 bg-red-600/90 text-white rounded-full hover:bg-red-500 cursor-pointer border-0 shadow-lg"
                          title="Foto entfernen"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-[11px] text-emerald-400 font-bold">✓ Foto bereit für das Community-Voting</p>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center cursor-pointer py-4">
                      <Upload className="w-8 h-8 text-amber-400 mb-2 animate-bounce" />
                      <span className="text-xs font-bold text-slate-200">Foto von Gerät auswählen</span>
                      <span className="text-[10px] text-slate-500 mt-1">PNG, JPG, WEBP bis 5 MB</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Optional URL Input */}
                {!newImage && (
                  <div className="mt-2">
                    <input
                      type="url"
                      placeholder="Oder Bild-URL einfügen (https://...)"
                      value={newImage}
                      onChange={(e) => setNewImage(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-400 placeholder:text-slate-600"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                  Beschreibung / Story (Optional)
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Erzähle kurz etwas zum Bild, der Tour oder den Umbauten..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setNewTitle('');
                    setNewDescription('');
                    setNewImage('');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase cursor-pointer border-0"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim() || !newImage}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-black text-xs uppercase cursor-pointer border-0 shadow-lg flex items-center gap-1.5"
                >
                  <Camera className="w-4 h-4" /> Foto Einreichen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXKLUSIVE EVENTS & FEIERABEND-PINGS MODAL */}
      <ExclusiveEventsModal
        isOpen={isEventsModalOpen}
        onClose={() => setIsEventsModalOpen(false)}
        currentUser={currentUser}
        events={events}
        pings={pings}
        initialFilter={eventsFilter}
        onToggleParticipation={onToggleParticipation}
        onTogglePingStatus={onTogglePingStatus}
        onDeletePing={onDeletePing}
        onNavigate={onNavigate}
        showAlert={showAlert}
      />
    </div>
  );
};
