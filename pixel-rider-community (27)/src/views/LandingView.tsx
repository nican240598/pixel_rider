import React, { useState, useEffect } from 'react';
import { CrewMember, AppView, PhotoOfTheWeek, User, GpxRoute } from '../types';
import { QRCodeSVG } from 'qrcode.react';
import {
  Users,
  Wrench,
  MessageSquare,
  Calendar,
  ShieldCheck,
  Instagram,
  Youtube,
  Sparkles,
  Star,
  Camera,
  Timer,
  Clock,
  X,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  MessageCircle,
  Share2,
  Edit2,
  Save,
  Upload,
  Trash2,
  Image as ImageIcon,
  Edit,
  Map,
  Compass,
  Shuffle,
  ChevronRight,
  Route,
  Navigation,
} from 'lucide-react';
import { getVotingCycleStatus, CycleStatus } from '../lib/votingCycle';

interface LandingViewProps {
  crewMembers: CrewMember[];
  photoOfTheWeek?: PhotoOfTheWeek | null;
  routes?: GpxRoute[];
  currentUser?: User | null;
  onNavigate: (view: AppView) => void;
  onOpenEditPhoto?: (photoId?: string) => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  crewMembers,
  photoOfTheWeek,
  routes = [],
  currentUser,
  onNavigate,
  onOpenEditPhoto,
}) => {
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
  const [cycleStatus, setCycleStatus] = useState<CycleStatus>(() => getVotingCycleStatus());
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [customQrImage, setCustomQrImage] = useState<string | null>(() => {
    try {
      return localStorage.getItem('app_whatsapp_qr_custom_image') || null;
    } catch (e) {
      return null;
    }
  });

  // GPX Random Rotation index
  const [rotatingGpxIndex, setRotatingGpxIndex] = useState<number>(0);

  // Rotate GPX Route every 8 seconds if routes are available
  useEffect(() => {
    if (routes.length <= 1) return;
    const interval = setInterval(() => {
      setRotatingGpxIndex((prev) => (prev + 1) % routes.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [routes.length]);

  const handleNextGpx = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (routes.length > 0) {
      setRotatingGpxIndex((prev) => (prev + 1) % routes.length);
    }
  };

  // Helper to render mini SVG track representation for GPX
  const renderSvgTrack = (gpxData?: string) => {
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
      const w = 360,
        h = 190,
        pad = 22;

      let d = '';
      points.forEach((p, idx) => {
        const x = pad + ((p.lon - minLon) / lonRange) * (w - pad * 2);
        const y = h - (pad + ((p.lat - minLat) / latRange) * (h - pad * 2));
        d += idx === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
      });

      return (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full">
          <defs>
            <linearGradient id="routeGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
            <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <path
            d={d}
            fill="none"
            stroke="url(#routeGlow)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glowEffect)"
          />
          {points.length > 0 && (
            <circle
              cx={pad + ((points[0].lon - minLon) / lonRange) * (w - pad * 2)}
              cy={h - (pad + ((points[0].lat - minLat) / latRange) * (h - pad * 2))}
              r="4.5"
              fill="#22c55e"
              stroke="#0f172a"
              strokeWidth="2"
            />
          )}
          {points.length > 1 && (
            <circle
              cx={pad + ((points[points.length - 1].lon - minLon) / lonRange) * (w - pad * 2)}
              cy={h - (pad + ((points[points.length - 1].lat - minLat) / latRange) * (h - pad * 2))}
              r="4.5"
              fill="#ef4444"
              stroke="#0f172a"
              strokeWidth="2"
            />
          )}
        </svg>
      );
    } catch (e) {
      return null;
    }
  };

  // WhatsApp Invite Link state with persistence
  const [whatsappLink, setWhatsappLink] = useState<string>(() => {
    try {
      return localStorage.getItem('app_whatsapp_link') || 'https://chat.whatsapp.com/invite/PixelRiderCommunity';
    } catch (e) {
      return 'https://chat.whatsapp.com/invite/PixelRiderCommunity';
    }
  });
  const [isEditingLink, setIsEditingLink] = useState(false);
  const [tempLink, setTempLink] = useState(whatsappLink);

  const handleQrImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setCustomQrImage(dataUrl);
        try {
          localStorage.setItem('app_whatsapp_qr_custom_image', dataUrl);
        } catch (err) {}
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveCustomQrImage = () => {
    setCustomQrImage(null);
    try {
      localStorage.removeItem('app_whatsapp_qr_custom_image');
    } catch (err) {}
  };

  const handleSaveLink = () => {
    const trimmed = tempLink.trim();
    if (trimmed) {
      setWhatsappLink(trimmed);
      try {
        localStorage.setItem('app_whatsapp_link', trimmed);
      } catch (e) {}
    }
    setIsEditingLink(false);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCycleStatus(getVotingCycleStatus());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleFlip = (id: string) => {
    setFlippedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(whatsappLink);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = whatsappLink;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (err) {
      console.warn('Copy failed:', err);
    }
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

        {/* WhatsApp Community Card - Interactive & Clickable */}
        <div
          onClick={() => setWhatsAppModalOpen(true)}
          className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] max-w-md min-h-[260px] bg-gradient-to-b from-[#220d3f] to-[#15092a] hover:from-[#2d1253] hover:to-[#1b0c36] border-2 border-amber-500/50 hover:border-amber-400 p-8 rounded-2xl shadow-xl hover:shadow-[0_0_30px_rgba(245,158,11,0.3)] flex flex-col justify-between cursor-pointer group transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setWhatsAppModalOpen(true);
            }
          }}
        >
          {/* Subtle Ambient Glow Effect */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl group-hover:bg-amber-500/30 transition-all pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-amber-500/20 rounded-xl border border-amber-500/40 text-amber-400 group-hover:scale-110 transition-transform">
                <MessageCircle className="w-6 h-6 text-amber-400" />
              </div>
              <span className="text-[11px] uppercase font-black px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                QR-Code & Link
              </span>
            </div>

            <h3 className="text-xl font-bold uppercase text-white group-hover:text-amber-400 transition-colors mb-3 flex items-center gap-2">
              WhatsApp Community
            </h3>
            <p className="text-sm text-purple-100/80 leading-relaxed">
              Strukturiert, fokussiert und zu 100 % spamfrei. Klicke hier, um den WhatsApp QR-Code und den Beitrittslink direkt anzuzeigen.
            </p>
          </div>

          <div className="mt-5 pt-3 border-t border-purple-900/60 flex items-center justify-between text-xs font-black uppercase text-amber-400 tracking-wider">
            <span className="flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-amber-400" /> QR-Code & Beitrittslink öffnen
            </span>
            <span className="text-base group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </div>

        <div className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] max-w-md min-h-[260px] bg-[#180b2d]/90 border border-purple-900/60 p-8 rounded-2xl feature-card-glow shadow-xl flex flex-col justify-center">
          <ShieldCheck className="w-9 h-9 text-yellow-400 mb-4" />
          <h3 className="text-xl font-bold uppercase text-white mb-3">Admins & Moderatoren</h3>
          <p className="text-sm text-purple-100/80 leading-relaxed">
            Aktiv, engagiert und greifbar. Unser starkes Team aus Admins und Moderatoren sorgt für ein respektvolles Miteinander und hat stets ein offenes Ohr für dich.
          </p>
        </div>
      </div>

      {/* HIGHLIGHT SECTION: BILD DER WOCHE */}
      {photoOfTheWeek && (
        <div className="my-12">
          {/* Divider */}
          <div className="my-8 border-t-2 border-amber-500/40 relative">
            <div className="absolute left-1/2 -translate-x-1/2 -top-3 px-4 bg-[#0a0314] text-amber-400 text-xs font-black uppercase tracking-widest flex items-center gap-2 border border-amber-500/50 rounded-full py-0.5 shadow-md">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> BILD DER WOCHE <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </div>
          </div>

          <div className="max-w-4xl mx-auto">
            {/* BILD DER WOCHE (CREW VOTE HIGHLIGHT) */}
            <div className="relative group">
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-purple-600 via-amber-500 to-yellow-400 opacity-60 blur-xl group-hover:opacity-90 transition duration-700" />

              <div className="relative h-full bg-slate-950/95 border-2 border-amber-500/80 rounded-3xl p-6 md:p-8 text-left shadow-2xl flex flex-col justify-between">
                <div>
                  {/* Photo Banner with Badges */}
                  <div className="relative w-full h-72 sm:h-96 rounded-2xl overflow-hidden border border-amber-500/50 shadow-2xl bg-black mb-5">
                    <img
                      src={photoOfTheWeek.image_url}
                      alt={photoOfTheWeek.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />

                    <div className="absolute top-4 left-4 bg-amber-500 text-black font-black text-xs uppercase px-3.5 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 border border-amber-300">
                      <Camera className="w-4 h-4 text-black" />
                      BILD DER WOCHE
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 bg-black/80 backdrop-blur-md p-3 rounded-xl border border-amber-500/30 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-amber-300 font-bold uppercase block">Geknipst von</span>
                        <strong className="text-xs sm:text-sm text-white uppercase font-extrabold">@{photoOfTheWeek.author}</strong>
                      </div>
                      <div className="bg-amber-500/20 text-amber-300 font-black text-xs sm:text-sm px-3 py-1 rounded-lg border border-amber-500/40">
                        🏆 {photoOfTheWeek.votes?.length || 0} Stimmen
                      </div>
                    </div>
                  </div>

                  {/* Photo Title & Info */}
                  <div className="flex items-center gap-2 text-amber-400 font-extrabold text-xs uppercase tracking-wider mb-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Intern von der Crew gewählt
                  </div>

                  <h3 className="text-xl md:text-3xl font-black uppercase text-white mb-3 leading-tight">
                    {photoOfTheWeek.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-300 font-extrabold text-xs sm:text-sm px-3.5 py-1.5 rounded-xl border border-amber-400/60 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                      <Timer className="w-4 h-4 text-amber-400 animate-pulse flex-shrink-0" />
                      <span className="text-amber-200">
                        {cycleStatus.phase === 'voting'
                          ? 'Voting bis So. 20:00:'
                          : 'Neuer Zyklus in:'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-black/80 text-yellow-300 font-mono font-black border border-amber-400/40">
                        {cycleStatus.formattedCountdown}
                      </span>
                    </div>
                  </div>

                  {photoOfTheWeek.description && (
                    <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl mb-4">
                      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed italic">
                        "{photoOfTheWeek.description}"
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-800/90 flex items-center justify-between flex-wrap gap-3">
                  <span className="text-xs text-slate-400 font-bold">
                    Community-Voting
                  </span>

                  <div className="flex items-center gap-2">
                    {currentUser && photoOfTheWeek && currentUser.username.toLowerCase() === photoOfTheWeek.author.toLowerCase() && onOpenEditPhoto && (
                      <button
                        onClick={() => onOpenEditPhoto(photoOfTheWeek.id)}
                        className="px-3.5 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/50 font-extrabold text-xs uppercase hover:scale-105 transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                      >
                        <Edit className="w-3.5 h-3.5" /> Angaben anpassen
                      </button>
                    )}
                    <button
                      onClick={() => onNavigate('dashboard')}
                      className="px-4 py-2 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-extrabold text-xs uppercase hover:scale-105 transition-all shadow-lg cursor-pointer border-0 flex items-center gap-2"
                    >
                      <Camera className="w-4 h-4" /> Mitvoten
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
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

      {/* WhatsApp Community QR Code Modal */}
      {whatsAppModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
          onClick={() => {
            setWhatsAppModalOpen(false);
            setIsEditingLink(false);
          }}
        >
          <div
            className="bg-gradient-to-b from-[#180a2d] via-[#10061e] to-[#0a0314] border-2 border-purple-800/80 rounded-3xl shadow-[0_0_50px_rgba(168,85,247,0.3)] p-5 sm:p-7 max-w-md w-full text-center relative my-auto animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => {
                setWhatsAppModalOpen(false);
                setIsEditingLink(false);
              }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors border-0 bg-transparent cursor-pointer z-10"
              title="Schließen"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Title Bar */}
            <div className="text-xs font-black uppercase text-purple-300 tracking-widest mb-3 flex items-center justify-center gap-2">
              <QrCode className="w-4 h-4 text-amber-400" /> WhatsApp Community Einladung
            </div>

            {/* Authentic WhatsApp QR Card Container (matching original screenshot) */}
            <div className="bg-[#121317] border border-gray-800/90 rounded-2xl p-5 shadow-2xl flex flex-col items-center justify-center mx-auto w-full mb-4 relative">
              {/* Shield PR Logo */}
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-800 via-purple-600 to-indigo-900 border-2 border-purple-400/80 p-0.5 shadow-[0_0_15px_rgba(168,85,247,0.5)] flex items-center justify-center mb-2">
                <span className="font-black text-2xl tracking-tighter text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] italic">
                  PR
                </span>
              </div>

              {/* Group Name & Subtitle */}
              <h3 className="text-xl font-bold text-white tracking-normal mb-0.5">
                Pixel Rider
              </h3>
              <p className="text-xs text-gray-400 font-medium mb-4">
                WhatsApp-Gruppe
              </p>

              {/* 1:1 Original WhatsApp QR Image */}
              <div
                className="flex flex-col items-center justify-center my-2 mx-auto w-full max-w-[290px] relative group"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const dataUrl = event.target?.result as string;
                      if (dataUrl) {
                        setCustomQrImage(dataUrl);
                        try {
                          localStorage.setItem('app_whatsapp_qr_custom_image', dataUrl);
                        } catch (err) {}
                      }
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              >
                {customQrImage ? (
                  <img
                    src={customQrImage}
                    alt="WhatsApp Group Invite QR Code Pixel Rider"
                    className="w-64 h-64 sm:w-72 sm:h-72 object-contain rounded-2xl shadow-xl bg-white p-3 transition-transform group-hover:scale-[1.01]"
                    onError={() => {
                      // Fallback if custom image fails to load
                      setCustomQrImage(null);
                    }}
                  />
                ) : (
                  <div className="w-64 h-64 sm:w-72 sm:h-72 bg-white rounded-2xl shadow-xl p-4 flex flex-col items-center justify-center transition-transform group-hover:scale-[1.01]">
                    <QRCodeSVG
                      value={whatsappLink}
                      size={220}
                      level="Q"
                      includeMargin={false}
                      className="w-full h-full"
                    />
                  </div>
                )}
              </div>

              {/* Upload custom QR image / reset button */}
              <div className="mt-3 flex items-center justify-center gap-2">
                <label className="text-[11px] font-bold px-3 py-1 rounded-xl bg-purple-950/80 hover:bg-purple-900 text-purple-200 border border-purple-700/60 cursor-pointer flex items-center gap-1.5 transition-colors shadow-sm">
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                  <span>{customQrImage ? 'Anderes Bild wählen' : 'Eigenes QR-Bild hochladen'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleQrImageUpload}
                    className="hidden"
                  />
                </label>
                {customQrImage && (
                  <button
                    onClick={handleRemoveCustomQrImage}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-red-950/70 hover:bg-red-900/90 text-red-300 border border-red-800/60 cursor-pointer flex items-center gap-1 transition-colors"
                    title="Zurück zum Standard-QR"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Exact WhatsApp note text from screenshot */}
              <p className="text-[11px] text-gray-400 leading-relaxed max-w-xs mx-auto mt-4 mb-0 font-normal">
                Der QR-Code dieser Gruppe ist privat. Wenn du ihn mit jemandem teilst, kann diese Person ihn mit ihrer WhatsApp-Kamera scannen, um der Gruppe beizutreten.
              </p>
            </div>

            {/* Link & Copy / Edit Section */}
            {isEditingLink ? (
              <div className="bg-[#090312] border border-amber-500/80 rounded-2xl p-3 mb-4 text-left">
                <label className="text-[10px] font-bold uppercase text-amber-400 tracking-wider block mb-1">
                  WhatsApp Einladungslink eingeben:
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={tempLink}
                    onChange={(e) => setTempLink(e.target.value)}
                    placeholder="https://chat.whatsapp.com/..."
                    className="flex-1 bg-black/70 border border-purple-700/60 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 font-mono"
                  />
                  <button
                    onClick={handleSaveLink}
                    className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs flex items-center gap-1 cursor-pointer border-0"
                  >
                    <Save className="w-3.5 h-3.5" /> Speichern
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-[#090312] border border-purple-800/80 rounded-2xl p-2.5 flex items-center gap-2 mb-4">
                <div className="text-xs text-amber-300 font-mono truncate flex-1 text-left px-2 select-all">
                  {whatsappLink}
                </div>
                <button
                  onClick={() => {
                    setTempLink(whatsappLink);
                    setIsEditingLink(true);
                  }}
                  className="p-2 rounded-lg text-purple-300 hover:text-white hover:bg-purple-900/50 transition-colors border-0 bg-transparent cursor-pointer"
                  title="Link bearbeiten"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleCopyLink}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition-all flex-shrink-0 cursor-pointer border-0 ${
                    copiedLink
                      ? 'bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                      : 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black shadow-md'
                  }`}
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Kopiert!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Kopieren
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
              <a
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-transform hover:scale-[1.02] no-underline"
              >
                <MessageCircle className="w-4 h-4" /> Direkt in WhatsApp öffnen <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </a>

              <button
                onClick={() => {
                  setWhatsAppModalOpen(false);
                  setIsEditingLink(false);
                }}
                className="w-full py-2.5 text-xs font-bold text-slate-400 hover:text-white bg-transparent border-0 cursor-pointer transition-colors"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
