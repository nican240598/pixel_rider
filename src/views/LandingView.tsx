import React, { useState } from 'react';
import { CrewMember, AppView, PixelOfMonth } from '../types';
import { Users, Wrench, MessageSquare, Calendar, ShieldCheck, Instagram, Youtube, Sparkles, Award, Trophy, Star } from 'lucide-react';

interface LandingViewProps {
  crewMembers: CrewMember[];
  pixelOfMonth?: PixelOfMonth | null;
  onNavigate: (view: AppView) => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ crewMembers, pixelOfMonth, onNavigate }) => {
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});

  const toggleFlip = (id: string) => {
    setFlippedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="py-8 text-center max-w-6xl mx-auto px-4">
      {/* Hero Title */}
      <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight mb-3">
        <span className="bg-gradient-to-r from-purple-800 via-purple-500 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]">
          PIXEL RIDER
        </span>
      </h1>
      <p className="text-lg md:text-xl text-yellow-300 max-w-2xl mx-auto mb-10 font-semibold italic">
        „Alleine nur ein unbedeutender Pixel, zusammen eine einzigartige Community“
      </p>

      {/* Feature Cards Grid */}
      <div className="flex flex-wrap justify-center gap-6 text-left mb-12">
        <div className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] max-w-md min-h-[260px] bg-[#180b2d]/90 border border-purple-900/60 p-8 rounded-2xl feature-card-glow shadow-xl flex flex-col justify-center">
          <Users className="w-9 h-9 text-yellow-400 mb-4" />
          <h3 className="text-xl font-bold uppercase text-white mb-3">Zusammenhalt</h3>
          <p className="text-sm text-purple-100/80 leading-relaxed">
            Egal welches Bike in deiner Garage steht – bei uns zählt der Charakter unterm Helm. Wir starten gemeinsam, wir kommen gemeinsam an. Bei Pixel Rider bleibt niemand zurück.
          </p>
        </div>

        <div className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] max-w-md min-h-[260px] bg-[#180b2d]/90 border border-purple-900/60 p-8 rounded-2xl feature-card-glow shadow-xl flex flex-col justify-center">
          <Wrench className="w-9 h-9 text-yellow-400 mb-4" />
          <h3 className="text-xl font-bold uppercase text-white mb-3">Schrauber-Hilfe</h3>
          <p className="text-sm text-purple-100/80 leading-relaxed">
            Mehr Leidenschaft als Werkzeug? Kein Problem! Unsere erfahrenen Schrauber stehen dir bei jedem Umbau, jeder festen Schraube und jedem technischen Problem mit Rat und Tat zur Seite.
          </p>
        </div>

        <div className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] max-w-md min-h-[260px] bg-[#180b2d]/90 border border-purple-900/60 p-8 rounded-2xl feature-card-glow shadow-xl flex flex-col justify-center">
          <MessageSquare className="w-9 h-9 text-yellow-400 mb-4" />
          <h3 className="text-xl font-bold uppercase text-white mb-3">Wissensaustausch</h3>
          <p className="text-sm text-purple-100/80 leading-relaxed">
            Ob die besten Kurven-Setups, ehrliche Reifenempfehlungen oder versteckte GPX-Routen – wir teilen unser Wissen offen, ehrlich und immer auf Augenhöhe.
          </p>
        </div>

        <div className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] max-w-md min-h-[260px] bg-[#180b2d]/90 border border-purple-900/60 p-8 rounded-2xl feature-card-glow shadow-xl flex flex-col justify-center">
          <Calendar className="w-9 h-9 text-yellow-400 mb-4" />
          <h3 className="text-xl font-bold uppercase text-white mb-3">Ride Outs & Events</h3>
          <p className="text-sm text-purple-100/80 leading-relaxed">
            Der Asphalt ist unser Zuhause. Von der spontanen Feierabendrunde über epische Tagestouren bis hin zu exklusiven Crew-Events – wir leben für den gemeinsamen Ride.
          </p>
        </div>

        <div className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] max-w-md min-h-[260px] bg-[#180b2d]/90 border border-purple-900/60 p-8 rounded-2xl feature-card-glow shadow-xl flex flex-col justify-center">
          <Sparkles className="w-9 h-9 text-yellow-400 mb-4" />
          <h3 className="text-xl font-bold uppercase text-white mb-3">WhatsApp Community</h3>
          <p className="text-sm text-purple-100/80 leading-relaxed">
            Strukturiert, fokussiert und zu 100 % spamfrei. Unsere Gruppen sind thematisch sauber getrennt – von der Verabredung zur Tour bis hin zum echten Technik-Nerd-Talk.
          </p>
        </div>

        <div className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] max-w-md min-h-[260px] bg-[#180b2d]/90 border border-purple-900/60 p-8 rounded-2xl feature-card-glow shadow-xl flex flex-col justify-center">
          <ShieldCheck className="w-9 h-9 text-yellow-400 mb-4" />
          <h3 className="text-xl font-bold uppercase text-white mb-3">Admins & Moderatoren</h3>
          <p className="text-sm text-purple-100/80 leading-relaxed">
            Aktiv, engagiert und greifbar. Unser starkes Team aus Admins und Moderatoren sorgt für ein respektvolles Miteinander und hat stets ein offenes Ohr für dich.
          </p>
        </div>
      </div>

      {/* DIVIDER LINE BEFORE PIXEL DES MONATS */}
      {pixelOfMonth && (
        <>
          <div className="my-12 border-t-2 border-purple-900/60 relative">
            <div className="absolute left-1/2 -translate-x-1/2 -top-3 px-4 bg-[#0a0314] text-amber-400 text-xs font-black uppercase tracking-widest flex items-center gap-2 border border-purple-800/60 rounded-full py-0.5 shadow-md">
              <Star className="w-3.5 h-3.5 fill-amber-400" /> COMMUNITY HIGHLIGHT <Star className="w-3.5 h-3.5 fill-amber-400" />
            </div>
          </div>

          {/* PIXEL DES MONATS (FEATURED SPOTLIGHT SECTION) */}
          <div className="mb-16 relative group">
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 opacity-75 blur-xl group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse" />

            <div className="relative bg-slate-950/95 border-2 border-amber-400 rounded-3xl p-6 md:p-10 text-left shadow-2xl flex flex-col md:flex-row items-center gap-8">
              {/* Left Image / Avatar */}
              <div className="w-full md:w-1/2 lg:w-5/12 flex-shrink-0 relative rounded-2xl overflow-hidden border-2 border-amber-400/80 shadow-[0_0_25px_rgba(250,204,21,0.3)] bg-black h-80 md:h-96">
                <img
                  src={pixelOfMonth.image_url || 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=1000'}
                  alt={pixelOfMonth.username}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

                <div className="absolute top-4 left-4 bg-amber-500 text-black font-black text-xs uppercase px-3.5 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 border border-amber-300">
                  <Trophy className="w-4 h-4 fill-black" />
                  PIXEL DES MONATS
                </div>

                {pixelOfMonth.bike && (
                  <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-md p-3 rounded-xl border border-amber-500/40">
                    <span className="text-[10px] text-amber-300 font-bold uppercase block">Gefahrenes Bike</span>
                    <strong className="text-xs text-white uppercase font-extrabold">{pixelOfMonth.bike}</strong>
                  </div>
                )}
              </div>

              {/* Right Details */}
              <div className="w-full md:w-1/2 lg:w-7/12 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-amber-400 font-extrabold text-xs uppercase tracking-wider mb-2">
                    <Star className="w-4 h-4 fill-amber-400" />
                    Ehrung & Community-Spotlight
                    <Star className="w-4 h-4 fill-amber-400" />
                  </div>

                  <h2 className="text-3xl md:text-4xl font-black uppercase text-white mb-2 leading-tight">
                    {pixelOfMonth.username}
                  </h2>

                  <span className="inline-block bg-amber-500/20 text-amber-300 font-extrabold text-xs px-3 py-1 rounded-full border border-amber-500/40 uppercase mb-4">
                    🏆 {pixelOfMonth.title || 'Gekürter Rider des Monats'}
                  </span>

                  <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl mb-6 relative">
                    <p className="text-sm text-slate-200 leading-relaxed italic">
                      "{pixelOfMonth.reason}"
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
                  <span className="text-xs text-slate-400 font-bold flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-400" /> Von Admins & Community gewählt
                  </span>

                  <div className="flex items-center gap-2 flex-wrap">
                    {pixelOfMonth.social_ig && (
                      <a
                        href={pixelOfMonth.social_ig.startsWith('http') ? pixelOfMonth.social_ig : `https://instagram.com/${pixelOfMonth.social_ig.replace('@', '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-pink-600 hover:bg-pink-500 text-white font-extrabold text-[11px] uppercase transition-all shadow-md"
                      >
                        <Instagram className="w-3.5 h-3.5" /> Instagram
                      </a>
                    )}
                    {pixelOfMonth.social_tiktok && (
                      <a
                        href={pixelOfMonth.social_tiktok.startsWith('http') ? pixelOfMonth.social_tiktok : `https://tiktok.com/@${pixelOfMonth.social_tiktok.replace('@', '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-cyan-300 font-extrabold text-[11px] uppercase transition-all shadow-md border border-cyan-500/30"
                      >
                        🎵 TikTok
                      </a>
                    )}
                    {pixelOfMonth.social_youtube && (
                      <a
                        href={pixelOfMonth.social_youtube.startsWith('http') ? pixelOfMonth.social_youtube : `https://youtube.com/@${pixelOfMonth.social_youtube.replace('@', '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-red-600 hover:bg-red-500 text-white font-extrabold text-[11px] uppercase transition-all shadow-md"
                      >
                        <Youtube className="w-3.5 h-3.5" /> YouTube
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* DIVIDER LINE BEFORE CREW */}
      {crewMembers && crewMembers.length > 0 && (
        <>
          <div className="my-12 border-t-2 border-purple-900/60 relative">
            <div className="absolute left-1/2 -translate-x-1/2 -top-3 px-4 bg-[#0a0314] text-amber-400 text-xs font-black uppercase tracking-widest flex items-center gap-2 border border-purple-800/60 rounded-full py-0.5 shadow-md">
              <Users className="w-3.5 h-3.5 text-amber-400" /> PIXEL RIDER CREW <Users className="w-3.5 h-3.5 text-amber-400" />
            </div>
          </div>

          {/* PIXEL RIDER CREW SECTION (50% COMPACT CARDS) */}
          <div className="mb-12">
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-wider mb-2">
              <span className="bg-gradient-to-r from-purple-800 via-purple-500 to-amber-400 bg-clip-text text-transparent">
                Pixel Rider Crew
              </span>
            </h2>
            <p className="text-xs text-purple-200/80 mb-8 max-w-lg mx-auto">
              Klicke auf eine Karte, um mehr über das Crew-Mitglied zu erfahren.
            </p>

            <div className="flex flex-wrap justify-center gap-5">
              {crewMembers.map((member) => {
                const isFlipped = !!flippedCards[member.id];
                return (
                  <div
                    key={member.id}
                    className={`crew-flip-card ${isFlipped ? 'flipped' : ''}`}
                    onClick={() => toggleFlip(member.id)}
                  >
                    <div className="crew-flip-card-inner">
                      {/* Front Side */}
                      <div className="crew-flip-card-front flex flex-col justify-between bg-[#160a29] border border-amber-400/40 p-2.5 shadow-xl">
                        <div className="relative w-full h-[150px] rounded-xl overflow-hidden border border-purple-800 bg-slate-950 flex-shrink-0">
                          <img
                            src={member.image_url || 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=300'}
                            alt={member.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#160a29] via-transparent to-transparent" />
                        </div>

                        <div className="my-auto py-1 text-center min-w-0 px-1">
                          <h3 className="text-xs font-black uppercase text-amber-400 truncate mb-0.5">{member.name}</h3>
                          <p className="text-[10px] text-purple-200 font-bold truncate">{member.role}</p>
                        </div>

                        <div className="pt-1.5 border-t border-purple-900/60 flex items-center justify-center gap-2">
                          {member.social_ig && (
                            <a
                              href={member.social_ig.startsWith('http') ? member.social_ig : `https://instagram.com/${member.social_ig.replace('@', '')}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-pink-400 hover:text-pink-300 transition-colors p-1"
                              title="Instagram"
                            >
                              <Instagram className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {member.social_youtube && (
                            <a
                              href={member.social_youtube.startsWith('http') ? member.social_youtube : `https://youtube.com/@${member.social_youtube.replace('@', '')}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-red-500 hover:text-red-400 transition-colors p-1"
                              title="YouTube"
                            >
                              <Youtube className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Back Side - Centered Description Text */}
                      <div className="crew-flip-card-back flex flex-col justify-between bg-[#160a29] border border-amber-400/60 p-3 text-center shadow-2xl">
                        <div className="w-full text-center">
                          <h3 className="text-xs font-black uppercase text-amber-400 truncate mb-0.5">{member.name}</h3>
                          <span className="text-[10px] text-purple-300 font-bold block truncate">{member.role}</span>
                        </div>

                        <div className="my-auto flex items-center justify-center text-center px-1 py-1 h-full">
                          <p className="text-[10.5px] text-purple-100/90 text-center leading-tight font-medium italic overflow-y-auto max-h-[145px] pr-0.5">
                            "{member.bio || 'Keine Beschreibung vorhanden.'}"
                          </p>
                        </div>

                        <div className="pt-1.5 border-t border-purple-900/60 w-full flex items-center justify-center gap-2">
                          {member.social_ig && (
                            <a
                              href={member.social_ig.startsWith('http') ? member.social_ig : `https://instagram.com/${member.social_ig.replace('@', '')}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-pink-400 hover:text-pink-300 transition-colors p-1"
                              title="Instagram"
                            >
                              <Instagram className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {member.social_youtube && (
                            <a
                              href={member.social_youtube.startsWith('http') ? member.social_youtube : `https://youtube.com/@${member.social_youtube.replace('@', '')}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-red-500 hover:text-red-400 transition-colors p-1"
                              title="YouTube"
                            >
                              <Youtube className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
