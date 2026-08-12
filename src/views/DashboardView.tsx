import React, { useState, useEffect } from 'react';
import { User, AppView, TripEntry, SpotCheckin, SpotOfTheWeek, PhotoOfTheWeek, TileConfig, CrewEvent, GarageBike, MarketItem, GpxRoute, ForumTopic, MapPin as MapPinType } from '../types';
import { Map, MessageSquare, Calendar, MapPin, Wrench, ShoppingBag, Shield, Camera, ThumbsUp, Plus, Check, Trophy, X, Upload, Trash2, LayoutGrid, Users, ArrowRight, ChevronRight, Tag, Clock } from 'lucide-react';
import { getSavedTileLayout } from '../lib/tileUtils';

interface DashboardViewProps {
  currentUser: User;
  trips?: TripEntry[];
  spotCheckins?: SpotCheckin[];
  spotOfTheWeek?: SpotOfTheWeek;
  allUsers?: User[];
  photosOfTheWeek?: PhotoOfTheWeek[];
  events?: CrewEvent[];
  bikes?: GarageBike[];
  marketItems?: MarketItem[];
  routes?: GpxRoute[];
  topics?: ForumTopic[];
  mapPins?: MapPinType[];
  onNavigate: (view: AppView) => void;
  onOpenLeaderboardModal?: () => void;
  onOpenAddTripModal?: () => void;
  onSpotCheckin?: (spotId: string, spotName: string) => void;
  onVotePhoto?: (photoId: string) => void;
  onSubmitPhoto?: (photoData: { title: string; image_url: string; description: string }) => void;
  onSetWinnerPhoto?: (photoId: string) => void;
  onDeletePhoto?: (photoId: string, reason: string) => void;
  showAlert?: (title: string, message: string, type?: 'success' | 'warning' | 'danger') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  photosOfTheWeek = [],
  events = [],
  bikes = [],
  marketItems = [],
  routes = [],
  topics = [],
  mapPins = [],
  onNavigate,
  onVotePhoto,
  onSubmitPhoto,
  onSetWinnerPhoto,
  onDeletePhoto,
  showAlert,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newImage, setNewImage] = useState('');

  const [dashboardTiles, setDashboardTiles] = useState<TileConfig[]>(() => getSavedTileLayout());

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
                default: return <LayoutGrid className="w-8 h-8" />;
              }
            };

            const renderTilePreviews = () => {
              const count = tile.colSpan === 3 ? 3 : 2;

              if (tile.id === 'events') {
                const upcomingEvents = events.slice(0, count);
                if (upcomingEvents.length === 0) {
                  return (
                    <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
                      <span>Keine anstehenden Events geplant</span>
                      <span className="text-amber-400 font-bold flex items-center gap-1">Ausfahrt planen <ChevronRight className="w-3 h-3" /></span>
                    </div>
                  );
                }
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-800/80">
                    {upcomingEvents.map((ev) => (
                      <div
                        key={ev.id}
                        className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 flex items-center gap-3 hover:border-red-500/50 transition-all text-left"
                      >
                        {ev.image_data ? (
                          <img src={ev.image_data} alt={ev.title} className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-slate-800" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 flex items-center justify-center font-black text-xs flex-shrink-0">
                            <Calendar className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-extrabold uppercase text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20 inline-block">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-800/80">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-800/80">
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
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">
                            von {item.author}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              }

              if (tile.id === 'gpx') {
                const sampleRoutes = routes.slice(0, count);
                if (sampleRoutes.length === 0) return null;
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-800/80">
                    {sampleRoutes.map((r) => (
                      <div
                        key={r.id}
                        className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 flex items-center gap-3 hover:border-yellow-400/50 transition-all text-left"
                      >
                        <div className="w-12 h-12 rounded-lg bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 flex items-center justify-center flex-shrink-0">
                          <Map className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-extrabold text-yellow-300 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20 inline-block">
                            {r.distance}
                          </span>
                          <h4 className="text-xs font-bold text-white truncate mt-0.5">{r.title}</h4>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">von {r.created_by}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              }

              if (tile.id === 'forum') {
                const sampleTopics = topics.slice(0, count);
                if (sampleTopics.length === 0) return null;
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-800/80">
                    {sampleTopics.map((t) => (
                      <div
                        key={t.id}
                        className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 flex items-center gap-3 hover:border-purple-400/50 transition-all text-left"
                      >
                        <div className="w-12 h-12 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                          <MessageSquare className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-extrabold text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20 inline-block truncate max-w-full">
                            {t.category}
                          </span>
                          <h4 className="text-xs font-bold text-white truncate mt-0.5">{t.title}</h4>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">
                            {t.replies?.length || 0} Antworten · von {t.author}
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-800/80">
                    {samplePins.map((p, idx) => (
                      <div
                        key={p.id || idx}
                        className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 flex items-center gap-3 hover:border-emerald-400/50 transition-all text-left"
                      >
                        <div className="w-12 h-12 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-5 h-5" />
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

              return null;
            };

            return (
              <div
                key={tile.id}
                onClick={() => tile.viewTarget && onNavigate(tile.viewTarget)}
                style={{ minHeight: `${tile.minHeight}px` }}
                className={`bg-slate-900/90 border border-slate-800 p-6 md:p-8 rounded-2xl hover:border-yellow-400/60 transition-all cursor-pointer group shadow-lg flex flex-col justify-between ${getColClass(
                  tile.colSpan
                )}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-5">
                    <div
                      className={`p-4 rounded-xl group-hover:scale-110 transition-transform flex-shrink-0 ${tile.bgIconClass}`}
                    >
                      {renderIcon(tile.iconName)}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold uppercase text-white group-hover:text-yellow-400 transition-colors">
                        {tile.title}
                      </h3>
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

                {isExpanded && renderTilePreviews()}
              </div>
            );
          })}
      </div>


      {/* 📸 CREW VOTING: BILD DER WOCHE SECTION */}
      <div className="bg-slate-900/90 border-2 border-amber-500/60 rounded-3xl p-6 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold uppercase text-white tracking-wide flex items-center gap-2">
                Bild der Woche <span className="text-amber-400 text-xs px-2.5 py-0.5 bg-amber-500/20 border border-amber-500/40 rounded-full">Crew Vote</span>
              </h3>
              <p className="text-xs text-slate-400">
                Wähle deinen Favoriten! Das meistgewählte Foto wird auf der Landingpage präsentiert.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase shadow-lg border-0 cursor-pointer flex items-center justify-center gap-2 transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4" /> Foto einreichen
          </button>
        </div>

        {/* Candidate Photos Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {photosOfTheWeek.map((photo) => {
            const votesList = photo.votes || [];
            const hasVoted = votesList.includes(currentUser.username);
            const isWinner = currentWinner?.id === photo.id;

            return (
              <div
                key={photo.id}
                className={`bg-slate-950 rounded-2xl border ${
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

                    <div className="absolute bottom-2 left-3 right-3 text-xs font-bold text-white truncate">
                      @{photo.author}
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    <h4 className="text-sm font-extrabold text-white uppercase line-clamp-1">{photo.title}</h4>
                    {photo.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 italic">"{photo.description}"</p>
                    )}
                  </div>
                </div>

                <div className="p-4 pt-2 border-t border-slate-900 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onVotePhoto && onVotePhoto(photo.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all border cursor-pointer ${
                      hasVoted
                        ? 'bg-amber-500 text-black border-amber-400 shadow-md scale-105'
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-amber-400 hover:border-amber-500/40'
                    }`}
                  >
                    {hasVoted ? <Check className="w-4 h-4" /> : <ThumbsUp className="w-4 h-4" />}
                    <span>{hasVoted ? 'Gestimmt' : 'Stimme abgeben'}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${hasVoted ? 'bg-black/30 text-black' : 'bg-slate-800 text-amber-400'}`}>
                      {votesList.length}
                    </span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {(currentUser.isAdmin || currentUser.isModerator) && !photo.is_winner && (
                      <button
                        onClick={() => onSetWinnerPhoto && onSetWinnerPhoto(photo.id)}
                        className="px-2 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold uppercase transition-all cursor-pointer"
                        title="Als offizielles Bild der Woche festlegen"
                      >
                        👑 #1 Kürung
                      </button>
                    )}

                    {(currentUser.isAdmin || currentUser.isModerator) && (
                      <button
                        onClick={() => {
                          setDeleteModalPhoto(photo);
                          setDeleteReason('');
                        }}
                        className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-400 border border-red-500/30 text-[10px] font-bold uppercase transition-all cursor-pointer"
                        title="Foto mit Begründung entfernen"
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
      </div>

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
    </div>
  );
};
