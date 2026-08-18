import React, { useState } from 'react';
import { User, GarageBike, ForumTopic, GpxRoute } from '../types';
import { User as UserIcon, Instagram, Youtube, Wrench, MessageSquare, Map, ExternalLink, ArrowLeft, Bike, Navigation, MessageCircle } from 'lucide-react';
import { UserRoleBadge } from '../components/UserRoleBadge';
import { UserAvatar } from '../components/UserAvatar';

interface PublicProfileViewProps {
  username: string;
  avatarUrl?: string;
  bio?: string;
  allUsers?: User[];
  userSocials?: { ig?: string; tt?: string; yt?: string };
  userBikes: GarageBike[];
  userTopics: ForumTopic[];
  userRoutes: GpxRoute[];
  onBack: () => void;
  onNavigateToGarage?: () => void;
  onNavigateToForum?: () => void;
  onNavigateToGpx?: () => void;
}

export const PublicProfileView: React.FC<PublicProfileViewProps> = ({
  username,
  avatarUrl,
  bio,
  allUsers = [],
  userSocials,
  userBikes,
  userTopics,
  userRoutes,
  onBack,
  onNavigateToGarage,
  onNavigateToForum,
  onNavigateToGpx,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'garage' | 'forum' | 'gpx'>('all');
  const [selectedBike, setSelectedBike] = useState<GarageBike | null>(null);

  return (
    <div className="py-6 max-w-5xl mx-auto px-4 pb-28">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl">
        {/* Top bar */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-extrabold uppercase text-amber-400 hover:text-amber-300 bg-slate-950 px-4 py-2 rounded-full border border-amber-500/30 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Zurück zum Dashboard
          </button>

          <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
            Öffentliches Mitgliedsprofil
          </span>
        </div>

        {/* User Hero Banner */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-purple-950 via-slate-950 to-purple-950 border border-purple-800/40 p-6 md:p-8 text-center mb-8 shadow-xl">
          <div className="flex justify-center mb-3">
            <UserAvatar
              username={username}
              avatarUrl={avatarUrl}
              allUsers={allUsers}
              size="2xl"
              bordered
              borderColor="border-amber-400 shadow-[0_0_20px_rgba(250,204,21,0.4)]"
            />
          </div>

          <div className="flex items-center justify-center gap-2 mb-2 flex-wrap">
            <h2 className="text-3xl md:text-4xl font-extrabold uppercase text-white tracking-tight">
              @{username}
            </h2>
            <UserRoleBadge username={username} allUsers={allUsers} showText={true} size="md" />
          </div>

          {/* Bio / Über mich Card */}
          {bio && bio.trim() && (
            <div className="max-w-xl mx-auto my-3 bg-slate-900/80 border border-amber-500/30 rounded-2xl p-4 text-left shadow-inner">
              <span className="text-[10px] font-black uppercase text-amber-400 block mb-1 tracking-wider">
                Über {username}:
              </span>
              <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line italic">
                "{bio}"
              </p>
            </div>
          )}

          {/* Social Links */}
          {userSocials && (userSocials.ig || userSocials.tt || userSocials.yt) && (
            <div className="flex justify-center flex-wrap gap-2.5 mt-4 pt-4 border-t border-purple-900/50">
              {userSocials.ig && (
                <a
                  href={userSocials.ig.startsWith('http') ? userSocials.ig : `https://instagram.com/${userSocials.ig.replace('@', '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-pink-600/90 hover:bg-pink-600 text-white font-extrabold text-xs uppercase transition-all shadow-md"
                >
                  <Instagram className="w-4 h-4" /> Instagram
                </a>
              )}
              {userSocials.tt && (
                <a
                  href={userSocials.tt.startsWith('http') ? userSocials.tt : `https://tiktok.com/@${userSocials.tt.replace('@', '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-950 hover:bg-slate-800 text-cyan-300 font-extrabold text-xs uppercase border border-cyan-500/40 transition-all shadow-md"
                >
                  🎵 TikTok
                </a>
              )}
              {userSocials.yt && (
                <a
                  href={userSocials.yt.startsWith('http') ? userSocials.yt : `https://youtube.com/@${userSocials.yt.replace('@', '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-red-600/90 hover:bg-red-600 text-white font-extrabold text-xs uppercase transition-all shadow-md"
                >
                  <Youtube className="w-4 h-4" /> YouTube
                </a>
              )}
            </div>
          )}
        </div>

        {/* Tab Navigation Filter (Scrollable pill dock) */}
        <div className="flex justify-center mb-8">
          <div className="bg-slate-900/90 border border-purple-800/80 rounded-2xl md:rounded-full p-1.5 flex items-center gap-1 sm:gap-2 shadow-2xl backdrop-blur-md overflow-x-auto no-scrollbar w-full sm:w-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl md:rounded-full text-xs sm:text-sm font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer border-0 select-none min-h-[38px] shrink-0 whitespace-nowrap ${
                activeTab === 'all'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-[0_0_18px_rgba(245,158,11,0.45)]'
                  : 'text-slate-300 hover:text-white hover:bg-purple-950/60 bg-transparent'
              }`}
            >
              <span>Alle ({userBikes.length + userTopics.length + userRoutes.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('garage')}
              className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl md:rounded-full text-xs sm:text-sm font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer border-0 select-none min-h-[38px] shrink-0 whitespace-nowrap ${
                activeTab === 'garage'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-[0_0_18px_rgba(245,158,11,0.45)]'
                  : 'text-slate-300 hover:text-white hover:bg-purple-950/60 bg-transparent'
              }`}
            >
              <Bike className="w-4 h-4 text-current shrink-0" />
              <span>Garage ({userBikes.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('forum')}
              className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl md:rounded-full text-xs sm:text-sm font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer border-0 select-none min-h-[38px] shrink-0 whitespace-nowrap ${
                activeTab === 'forum'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-[0_0_18px_rgba(245,158,11,0.45)]'
                  : 'text-slate-300 hover:text-white hover:bg-purple-950/60 bg-transparent'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-current shrink-0" />
              <span>Forum ({userTopics.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('gpx')}
              className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl md:rounded-full text-xs sm:text-sm font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer border-0 select-none min-h-[38px] shrink-0 whitespace-nowrap ${
                activeTab === 'gpx'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-[0_0_18px_rgba(245,158,11,0.45)]'
                  : 'text-slate-300 hover:text-white hover:bg-purple-950/60 bg-transparent'
              }`}
            >
              <Navigation className="w-4 h-4 text-current shrink-0" />
              <span>Routen ({userRoutes.length})</span>
            </button>
          </div>
        </div>

        {/* CONTENT SECTIONS */}
        <div className="space-y-10">
          {/* 1. GARAGE SECTION */}
          {(activeTab === 'all' || activeTab === 'garage') && (
            <div>
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800">
                <h3 className="text-base font-extrabold uppercase text-amber-400 flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-amber-400" /> Garage ({userBikes.length} Bikes)
                </h3>
                {onNavigateToGarage && (
                  <button
                    onClick={onNavigateToGarage}
                    className="text-xs font-bold text-purple-300 hover:text-amber-400 flex items-center gap-1 bg-transparent border-0 cursor-pointer"
                  >
                    Alle Garage Bikes ansehen <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {userBikes.length === 0 ? (
                <p className="text-xs text-slate-500 italic bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                  Keine eingetragenen Bikes in der Garage.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userBikes.map((bike) => {
                    const bgImg = bike.images?.[0] || 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=600';
                    return (
                      <div
                        key={bike.id}
                        onClick={() => setSelectedBike(bike)}
                        className="group relative h-48 rounded-2xl overflow-hidden border border-slate-800 hover:border-amber-400/80 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-amber-500/10 hover:-translate-y-1"
                      >
                        <img
                          src={bgImg}
                          alt={bike.model}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                        <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-amber-500/40 text-[10px] font-extrabold text-amber-300 uppercase">
                          Baujahr {bike.year || 'k.A.'}
                        </div>

                        <div className="absolute bottom-3 left-3 right-3">
                          <h4 className="text-base font-black text-white uppercase group-hover:text-amber-400 transition-colors truncate">
                            {bike.model}
                          </h4>
                          <p className="text-[11px] text-slate-300 line-clamp-1 mt-0.5">
                            🛠️ {bike.mods || 'Keine Umbauten'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 2. FORUM SECTION */}
          {(activeTab === 'all' || activeTab === 'forum') && (
            <div>
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800">
                <h3 className="text-base font-extrabold uppercase text-amber-400 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-amber-400" /> Foren Beiträge ({userTopics.length})
                </h3>
                {onNavigateToForum && (
                  <button
                    onClick={onNavigateToForum}
                    className="text-xs font-bold text-purple-300 hover:text-amber-400 flex items-center gap-1 bg-transparent border-0 cursor-pointer"
                  >
                    Zum Forum wechseln <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {userTopics.length === 0 ? (
                <p className="text-xs text-slate-500 italic bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                  Keine Forenbeiträge verfasst.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userTopics.map((topic) => (
                    <div
                      key={topic.id}
                      onClick={onNavigateToForum}
                      className="group relative h-40 rounded-2xl overflow-hidden border border-slate-800 hover:border-purple-400/80 p-4 flex flex-col justify-between transition-all duration-300 cursor-pointer bg-gradient-to-br from-slate-950 via-purple-950/40 to-slate-950 hover:-translate-y-1 shadow-lg"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className="bg-purple-900/80 text-purple-200 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border border-purple-500/30 truncate">
                          {topic.category}
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <MessageCircle className="w-3.5 h-3.5 text-amber-400" /> {topic.replies?.length || 0}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-white uppercase group-hover:text-amber-400 transition-colors line-clamp-2">
                          {topic.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-1">
                          {topic.content}
                        </p>
                      </div>

                      <div className="text-[10px] text-purple-300 font-semibold flex items-center justify-between pt-2 border-t border-purple-900/40">
                        <span>Antworten lesen</span>
                        <ExternalLink className="w-3 h-3" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. GPX ROUTES SECTION */}
          {(activeTab === 'all' || activeTab === 'gpx') && (
            <div>
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800">
                <h3 className="text-base font-extrabold uppercase text-amber-400 flex items-center gap-2">
                  <Map className="w-5 h-5 text-amber-400" /> GPX Routen ({userRoutes.length})
                </h3>
                {onNavigateToGpx && (
                  <button
                    onClick={onNavigateToGpx}
                    className="text-xs font-bold text-purple-300 hover:text-amber-400 flex items-center gap-1 bg-transparent border-0 cursor-pointer"
                  >
                    Alle Routen ansehen <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {userRoutes.length === 0 ? (
                <p className="text-xs text-slate-500 italic bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                  Keine GPX Routen geteilt.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userRoutes.map((route) => (
                    <div
                      key={route.id}
                      onClick={onNavigateToGpx}
                      className="group relative h-40 rounded-2xl overflow-hidden border border-slate-800 hover:border-emerald-400/80 p-4 flex flex-col justify-between transition-all duration-300 cursor-pointer bg-slate-950 hover:-translate-y-1 shadow-lg"
                      style={{
                        backgroundImage: `linear-gradient(to top, rgba(2, 6, 23, 0.95), rgba(2, 6, 23, 0.7)), url('https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?q=80&w=600')`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <span className="bg-emerald-900/90 text-emerald-300 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border border-emerald-500/40">
                          📍 {route.distance} km Tour
                        </span>
                        <Navigation className="w-4 h-4 text-emerald-400" />
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-white uppercase group-hover:text-amber-400 transition-colors line-clamp-2">
                          {route.title}
                        </h4>
                      </div>

                      <div className="text-[10px] text-emerald-300 font-bold flex items-center justify-between pt-2 border-t border-slate-800">
                        <span>Tour Details & Download</span>
                        <ExternalLink className="w-3 h-3" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* BIKE PREVIEW MODAL */}
      {selectedBike && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="max-w-lg w-full bg-slate-950 border border-amber-500/50 rounded-3xl overflow-hidden shadow-2xl relative">
            <button
              onClick={() => setSelectedBike(null)}
              className="absolute top-4 right-4 bg-black/70 text-white rounded-full p-2 hover:bg-black transition-all border-0 cursor-pointer z-10"
            >
              ✕
            </button>

            <div className="h-64 relative">
              <img
                src={selectedBike.images?.[0] || 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=800'}
                alt={selectedBike.model}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
            </div>

            <div className="p-6">
              <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full">
                {username}'s Garage Bike
              </span>

              <h3 className="text-2xl font-black uppercase text-white mt-2 mb-1">{selectedBike.model}</h3>
              <p className="text-xs text-slate-400 font-bold mb-4">Baujahr: {selectedBike.year || 'Nicht angegeben'}</p>

              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 mb-6">
                <strong className="text-xs uppercase text-amber-400 block mb-1">Umbauten & Tuning:</strong>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {selectedBike.mods || 'Keine Umbauten angegeben.'}
                </p>
              </div>

              {onNavigateToGarage && (
                <button
                  onClick={() => {
                    setSelectedBike(null);
                    onNavigateToGarage();
                  }}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-extrabold uppercase text-xs rounded-full shadow-lg transition-all border-0 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Wrench className="w-4 h-4" /> Zum Pixel Garage Showroom
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
