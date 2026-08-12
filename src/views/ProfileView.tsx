import React, { useState, useEffect } from 'react';
import { User, MarketItem, GarageBike, TripEntry, ForumTopic, GpxRoute, CrewEvent, MapPin as MapPinType, TileConfig } from '../types';
import { User as UserIcon, Save, Instagram, Youtube, Wrench, ShoppingBag, Edit, Trash2, Key, Bike, Plus, Camera, Upload, LayoutGrid, Maximize2, Minimize2, Move, Eye, EyeOff, RotateCcw, ArrowUp, ArrowDown, Map, MessageSquare, Calendar, Sliders, Check, Sparkles, MapPin } from 'lucide-react';
import { getSavedTileLayout, saveTileLayout, resetTileLayout } from '../lib/tileUtils';

interface ProfileViewProps {
  currentUser: User;
  userMarketItems: MarketItem[];
  userGarageBikes: GarageBike[];
  initialMapBikes?: string;
  trips?: TripEntry[];
  forumTopics?: ForumTopic[];
  gpxRoutes?: GpxRoute[];
  crewEvents?: CrewEvent[];
  mapPins?: MapPinType[];
  onSaveProfile: (data: { email: string; pass?: string; ig?: string; tt?: string; yt?: string; avatarUrl?: string; mapBikes?: string }) => void;
  onRequestUsernameChange: () => void;
  onDeleteMarketItem: (id: string) => void;
  onDeleteGarageBike: (id: string) => void;
  onNavigateToGarage?: () => void;
  onNavigateToMarket?: () => void;
  showAlert?: (title: string, message: string, type?: 'success' | 'warning' | 'danger') => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  userMarketItems,
  userGarageBikes,
  initialMapBikes = '',
  trips = [],
  forumTopics = [],
  gpxRoutes = [],
  crewEvents = [],
  mapPins = [],
  onSaveProfile,
  onRequestUsernameChange,
  onDeleteMarketItem,
  onDeleteGarageBike,
  onNavigateToGarage,
  onNavigateToMarket,
  showAlert,
}) => {
  // Dropdown section selector
  const [activeSection, setActiveSection] = useState<'name_profile' | 'credentials' | 'garage' | 'market' | 'tile_layout'>('name_profile');

  // Tile layout customization state
  const [tilesState, setTilesState] = useState<TileConfig[]>(() => getSavedTileLayout());

  // Form states
  const [email, setEmail] = useState(currentUser.email || '');
  const [password, setPassword] = useState('');
  const [ig, setIg] = useState(currentUser.social_ig || '');
  const [tt, setTt] = useState(currentUser.social_tiktok || '');
  const [yt, setYt] = useState(currentUser.social_youtube || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatar_url || '');

  // 5 lines for PixelMap bikes
  const [mapBikeLines, setMapBikeLines] = useState<string[]>(['', '', '', '', '']);

  useEffect(() => {
    setAvatarUrl(currentUser.avatar_url || '');
    setEmail(currentUser.email || '');
    setIg(currentUser.social_ig || '');
    setTt(currentUser.social_tiktok || '');
    setYt(currentUser.social_youtube || '');
  }, [currentUser.username, currentUser.avatar_url]);

  useEffect(() => {
    const raw = initialMapBikes || '';
    const splitBikes = raw.includes('\n')
      ? raw.split('\n')
      : raw.split(',').map((s) => s.trim());

    const fiveBikes = ['', '', '', '', ''];
    for (let i = 0; i < 5; i++) {
      fiveBikes[i] = splitBikes[i] || '';
    }
    setMapBikeLines(fiveBikes);
  }, [initialMapBikes]);

  const saveProfileData = (newAvatar?: string) => {
    const targetAvatar = newAvatar !== undefined ? newAvatar : avatarUrl;
    const combinedMapBikes = mapBikeLines.map((b) => b.trim()).filter(Boolean).join('\n');
    onSaveProfile({
      email,
      pass: password || undefined,
      ig,
      tt,
      yt,
      avatarUrl: targetAvatar,
      mapBikes: combinedMapBikes,
    });
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = typeof event.target?.result === 'string' ? event.target.result : '';
        if (!result) return;

        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const MAX_DIM = 350;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_DIM) {
                height *= MAX_DIM / width;
                width = MAX_DIM;
              }
            } else {
              if (height > MAX_DIM) {
                width *= MAX_DIM / height;
                height = MAX_DIM;
              }
            }
            canvas.width = Math.round(width);
            canvas.height = Math.round(height);
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
              setAvatarUrl(compressedDataUrl);
              saveProfileData(compressedDataUrl);
              return;
            }
          } catch (err) {
            console.error('Canvas compression error:', err);
          }
          setAvatarUrl(result);
          saveProfileData(result);
        };
        img.onerror = () => {
          setAvatarUrl(result);
          saveProfileData(result);
        };
        img.src = result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMoveTile = (idx: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === tilesState.length - 1)) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const updated = [...tilesState];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    updated.forEach((t, i) => {
      t.order = i;
    });
    setTilesState(updated);
  };

  const handleSetTileWidth = (id: string, colSpan: number) => {
    setTilesState((prev) =>
      prev.map((t) => (t.id === id ? { ...t, colSpan } : t))
    );
  };

  const handleUpdateTileHeight = (id: string, deltaPx: number) => {
    setTilesState((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const newHeight = Math.max(120, Math.min(420, t.minHeight + deltaPx));
        return { ...t, minHeight: newHeight };
      })
    );
  };

  const handleSetTileHeight = (id: string, minHeight: number) => {
    setTilesState((prev) =>
      prev.map((t) => (t.id === id ? { ...t, minHeight } : t))
    );
  };

  const handleToggleTileVisibility = (id: string) => {
    setTilesState((prev) =>
      prev.map((t) => (t.id === id ? { ...t, visible: !t.visible } : t))
    );
  };

  const handleSaveTileLayout = () => {
    saveTileLayout(tilesState);
    if (showAlert) {
      showAlert('Layout Gespeichert', 'Deine individuellen Kachel-Größen und Ausrichtungen wurden erfolgreich gespeichert!', 'success');
    }
  };

  const handleResetTileLayout = () => {
    const defaults = resetTileLayout();
    setTilesState(defaults);
    if (showAlert) {
      showAlert('Standard Wiederhergestellt', 'Das Kachel-Layout wurde auf die Standardansicht zurückgesetzt.', 'success');
    }
  };

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    const combinedMapBikes = mapBikeLines.map((b) => b.trim()).filter(Boolean).join('\n');
    onSaveProfile({
      email,
      pass: password || undefined,
      ig,
      tt,
      yt,
      avatarUrl,
      mapBikes: combinedMapBikes,
    });
  };

  return (
    <div className="py-6 max-w-4xl mx-auto px-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-full overflow-hidden bg-slate-950 border-2 border-amber-400 flex items-center justify-center shadow-lg flex-shrink-0">
              {avatarUrl || currentUser.avatar_url ? (
                <img src={avatarUrl || currentUser.avatar_url} alt={currentUser.username} className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-8 h-8 text-amber-400" />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-extrabold uppercase text-amber-400 flex items-center gap-2">
                Profil & Einstellungen
              </h2>
              <p className="text-xs text-purple-200/80 mt-1">
                Verwalte dein Profilbild, Anmeldedaten, Socials & PixelMap-Bikes.
              </p>
            </div>
          </div>

          <div className="bg-slate-950 px-4 py-2 rounded-2xl border border-amber-500/30 flex items-center gap-3 self-start sm:self-auto">
            <span className="text-xs text-slate-400 uppercase font-bold">User:</span>
            <span className="text-base font-extrabold text-amber-400">{currentUser.username}</span>
            <span className="text-[10px] bg-purple-900/80 text-purple-200 uppercase font-bold px-2 py-0.5 rounded-full border border-purple-500/40">
              {currentUser.role}
            </span>
          </div>
        </div>

        {/* Section Navigation Buttons */}
        <div className="mb-8 bg-slate-950 p-4 rounded-2xl border border-slate-800">
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => setActiveSection('name_profile')}
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase border cursor-pointer transition-all flex items-center gap-2 ${
                activeSection === 'name_profile'
                  ? 'bg-amber-500 text-black border-amber-400 shadow-lg scale-105'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-amber-500/50 hover:text-white'
              }`}
            >
              👤 Name & Profil
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('credentials')}
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase border cursor-pointer transition-all flex items-center gap-2 ${
                activeSection === 'credentials'
                  ? 'bg-amber-500 text-black border-amber-400 shadow-lg scale-105'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-amber-500/50 hover:text-white'
              }`}
            >
              🔑 Anmeldedaten
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('garage')}
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase border cursor-pointer transition-all flex items-center gap-2 ${
                activeSection === 'garage'
                  ? 'bg-amber-500 text-black border-amber-400 shadow-lg scale-105'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-amber-500/50 hover:text-white'
              }`}
            >
              🏍️ Garage ({userGarageBikes.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('market')}
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase border cursor-pointer transition-all flex items-center gap-2 ${
                activeSection === 'market'
                  ? 'bg-amber-500 text-black border-amber-400 shadow-lg scale-105'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-amber-500/50 hover:text-white'
              }`}
            >
              🛒 Inserate ({userMarketItems.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('tile_layout')}
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase border cursor-pointer transition-all flex items-center gap-2 ${
                activeSection === 'tile_layout'
                  ? 'bg-amber-500 text-black border-amber-400 shadow-lg scale-105'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-amber-500/50 hover:text-white'
              }`}
            >
              🧩 Kacheln ausrichten
            </button>
          </div>
        </div>

        {/* SECTION 1: NAME & PROFIL-DETAILS ÄNDERN */}
        {activeSection === 'name_profile' && (
          <form onSubmit={handleSaveAll} className="space-y-6">
            {/* Username Box */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs text-slate-400 uppercase font-bold block mb-1">Aktueller Crew-Username</span>
                <h3 className="text-2xl font-extrabold text-amber-400">{currentUser.username}</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Möchtest du deinen Benutzernamen ändern? Reiche eine Anfrage beim Admin-Team ein.
                </p>
              </div>
              <button
                type="button"
                onClick={onRequestUsernameChange}
                className="text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold px-5 py-2.5 rounded-full border border-amber-500/40 transition-all cursor-pointer flex items-center gap-1.5 flex-shrink-0"
              >
                <Edit className="w-4 h-4" /> Namensänderung Beantragen
              </button>
            </div>

            {/* Profilbild Upload Box */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
              <h4 className="text-xs font-bold uppercase text-amber-400 flex items-center gap-2">
                <Camera className="w-4 h-4 text-amber-400" /> Community Profilbild
              </h4>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="relative w-24 h-24 rounded-full overflow-hidden bg-slate-900 border-2 border-amber-400 flex items-center justify-center shadow-xl flex-shrink-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar Vorschau" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-12 h-12 text-slate-600" />
                  )}
                </div>

                <div className="flex-1 space-y-3 text-center sm:text-left">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Lade ein Foto von dir oder deinem Bike hoch. Dein Profilbild wird in der Community, im Profil und Header angezeigt.
                  </p>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase rounded-full cursor-pointer transition-all shadow-md">
                      <Upload className="w-4 h-4" /> Foto Hochladen
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarFileChange}
                        className="hidden"
                      />
                    </label>

                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setAvatarUrl('');
                          saveProfileData('');
                        }}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-red-400 hover:text-red-300 font-bold text-xs uppercase rounded-full border border-red-900/50 transition-all cursor-pointer"
                      >
                        Bild Entfernen
                      </button>
                    )}
                  </div>

                  <div className="pt-1">
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Oder Bild-URL einfügen:
                    </label>
                    <input
                      type="url"
                      value={avatarUrl.startsWith('data:') ? '' : avatarUrl}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAvatarUrl(val);
                        saveProfileData(val);
                      }}
                      placeholder="https://beispiel.de/mein-foto.jpg"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Social Media Links */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
              <h4 className="text-xs font-bold uppercase text-purple-400 flex items-center gap-2">
                Social Media Kanäle
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1 flex items-center gap-1.5">
                    <Instagram className="w-4 h-4 text-red-400" /> Instagram Username
                  </label>
                  <input
                    type="text"
                    value={ig}
                    onChange={(e) => setIg(e.target.value)}
                    placeholder="z.B. pixel_rider_official"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1 flex items-center gap-1.5">
                    TikTok Username
                  </label>
                  <input
                    type="text"
                    value={tt}
                    onChange={(e) => setTt(e.target.value)}
                    placeholder="z.B. pixel_biker"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1 flex items-center gap-1.5">
                    <Youtube className="w-4 h-4 text-red-500" /> YouTube Channel
                  </label>
                  <input
                    type="text"
                    value={yt}
                    onChange={(e) => setYt(e.target.value)}
                    placeholder="z.B. PixelRiderVlogs"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* PixelMap Bikes (Up to 5) */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase text-amber-400 flex items-center gap-2">
                    <Bike className="w-4 h-4" /> PixelMap Motorräder (Bis zu 5 Bikes)
                  </h4>
                  <p className="text-[11px] text-purple-200/70 mt-1">
                    Trage hier deine Motorräder für deinen Standort-Pin auf der PixelMap ein (jeweils in einer eigenen Zeile):
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                {mapBikeLines.map((lineVal, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="text-xs font-extrabold text-amber-400/80 w-16 flex-shrink-0">
                      Bike {idx + 1}:
                    </span>
                    <input
                      type="text"
                      value={lineVal}
                      onChange={(e) => {
                        const updated = [...mapBikeLines];
                        updated[idx] = e.target.value;
                        setMapBikeLines(updated);
                      }}
                      placeholder={
                        idx === 0
                          ? '1. Bike (z.B. Yamaha YZF-R6)'
                          : idx === 1
                          ? '2. Bike (optional, z.B. Honda CBR600RR)'
                          : `${idx + 1}. Bike (optional)`
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center pt-2">
              <button
                type="submit"
                className="px-8 py-3.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold uppercase text-xs rounded-full shadow-lg transition-all border-0 cursor-pointer inline-flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> Profil-Änderungen Speichern
              </button>
            </div>
          </form>
        )}

        {/* SECTION 2: ANMELDEDATEN ÄNDERN */}
        {activeSection === 'credentials' && (
          <form onSubmit={handleSaveAll} className="space-y-6">
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold uppercase text-amber-400 flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" /> Anmeldedaten Ändern
              </h3>
              <p className="text-xs text-purple-200/80">
                Hier kannst du deine hinterlegte E-Mail-Adresse anpassen oder ein neues Passwort vergeben.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                    E-Mail Adresse
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                    Neues Passwort (optional)
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Leer lassen = unverändert"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            <div className="text-center pt-2">
              <button
                type="submit"
                className="px-8 py-3.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold uppercase text-xs rounded-full shadow-lg transition-all border-0 cursor-pointer inline-flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> Anmeldedaten Speichern
              </button>
            </div>
          </form>
        )}

        {/* SECTION 3: GARAGE BEARBEITEN */}
        {activeSection === 'garage' && (
          <div className="space-y-6">
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold uppercase text-amber-400 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-amber-400" /> Meine Pixel Garage ({userGarageBikes.length} Bikes)
                </h3>
                <p className="text-xs text-purple-200/80 mt-1">
                  Klicke auf ein Bike, um direkt zum Garage Showroom zu gelangen.
                </p>
              </div>

              {onNavigateToGarage && (
                <button
                  type="button"
                  onClick={onNavigateToGarage}
                  className="px-4 py-2.5 bg-purple-900/80 hover:bg-purple-800 text-amber-300 font-bold uppercase text-xs rounded-full border border-purple-500/40 transition-all cursor-pointer flex items-center gap-1.5 flex-shrink-0"
                >
                  <Plus className="w-4 h-4" /> Zum Garage Showroom
                </button>
              )}
            </div>

            {userGarageBikes.length === 0 ? (
              <div className="text-center py-12 bg-slate-950 rounded-2xl border border-slate-800 p-8">
                <Wrench className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-400">Du hast noch keine Bikes in deiner Garage</p>
                <p className="text-xs text-slate-500 mt-1">Stell deine Maschine im Pixel Garage Showroom aus!</p>
                {onNavigateToGarage && (
                  <button
                    type="button"
                    onClick={onNavigateToGarage}
                    className="mt-4 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold uppercase text-xs rounded-full cursor-pointer border-0"
                  >
                    Bike Jetzt Hinzufügen
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userGarageBikes.map((bike) => (
                  <div
                    key={bike.id}
                    onClick={() => onNavigateToGarage && onNavigateToGarage()}
                    className="group bg-slate-950 p-4 rounded-2xl border border-slate-800 hover:border-amber-400/80 flex items-center gap-4 shadow-lg cursor-pointer transition-all hover:scale-[1.01]"
                  >
                    <img
                      src={bike.images?.[0] || 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=300'}
                      alt={bike.model}
                      className="w-20 h-20 object-cover rounded-xl border border-slate-800 group-hover:border-amber-400/50 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-amber-400">
                        <h4 className="text-base font-bold uppercase truncate group-hover:underline">{bike.model}</h4>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 line-clamp-2">
                        🛠️ {bike.mods || 'Keine Umbauten angegeben'}
                      </p>
                      <span className="text-[10px] text-purple-300 uppercase font-extrabold mt-1 inline-block">
                        ➔ In der Garage anzeigen
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteGarageBike(bike.id);
                      }}
                      title="Bike aus Garage entfernen"
                      className="p-2.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 rounded-xl border border-red-800/40 cursor-pointer transition-all flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION 4: MEINE INSERATE */}
        {activeSection === 'market' && (
          <div className="space-y-6">
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold uppercase text-amber-400 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-amber-400" /> Meine Flohmarkt-Inserate ({userMarketItems.length})
                </h3>
                <p className="text-xs text-purple-200/80 mt-1">
                  Klicke auf ein Inserat, um direkt zum Flohmarkt geleitet zu werden.
                </p>
              </div>

              {onNavigateToMarket && (
                <button
                  type="button"
                  onClick={onNavigateToMarket}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold uppercase text-xs rounded-full transition-all cursor-pointer border-0 flex items-center gap-1.5 flex-shrink-0 shadow-md"
                >
                  <ShoppingBag className="w-4 h-4" /> Zum Flohmarkt
                </button>
              )}
            </div>

            {userMarketItems.length === 0 ? (
              <div className="text-center py-12 bg-slate-950 rounded-2xl border border-slate-800 p-8">
                <ShoppingBag className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-400">Du hast aktuell keine aktiven Inserate</p>
                {onNavigateToMarket && (
                  <button
                    type="button"
                    onClick={onNavigateToMarket}
                    className="mt-4 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold uppercase text-xs rounded-full cursor-pointer border-0"
                  >
                    Neues Inserat im Flohmarkt Erstellen
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userMarketItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onNavigateToMarket && onNavigateToMarket()}
                    className="group bg-slate-950 p-4 rounded-2xl border border-slate-800 hover:border-amber-400/80 flex items-center gap-4 shadow-lg cursor-pointer transition-all hover:scale-[1.01]"
                  >
                    <img
                      src={item.images?.[0] || 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?q=80&w=300'}
                      alt={item.item_name}
                      className="w-20 h-20 object-cover rounded-xl border border-slate-800 group-hover:border-amber-400/50 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base font-bold text-amber-400 uppercase truncate group-hover:underline">{item.item_name}</h4>
                      <p className="text-xs font-extrabold text-white mt-1">
                        {Number(item.price).toFixed(2).replace('.', ',')} €
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] bg-purple-900/60 text-purple-200 px-2 py-0.5 rounded-full border border-purple-500/30">
                          {item.category}
                        </span>
                        <span className="text-[10px] text-amber-300 uppercase font-extrabold">
                          ➔ Im Flohmarkt anzeigen
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteMarketItem(item.id);
                      }}
                      title="Inserat löschen"
                      className="p-2.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 rounded-xl border border-red-800/40 cursor-pointer transition-all flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION 5: KACHELN AUSRICHTEN & SKALIEREN */}
        {activeSection === 'tile_layout' && (
          <div className="space-y-6">
            <div className="bg-slate-950 p-6 rounded-2xl border border-amber-500/40 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/30 flex-shrink-0">
                    <LayoutGrid className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold uppercase text-white flex items-center gap-2">
                      Kacheln Ausrichten & Skalieren
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Passe die Größe (Breite & Höhe), Position und Sichtbarkeit deiner Kacheln individuell an.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleResetTileLayout}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-extrabold uppercase cursor-pointer transition-all flex items-center gap-1.5"
                    title="Zurücksetzen"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Standard
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveTileLayout}
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase cursor-pointer shadow-lg transition-all flex items-center gap-1.5 border-0"
                  >
                    <Save className="w-4 h-4" /> Layout Speichern
                  </button>
                </div>
              </div>

              {/* Preset buttons */}
              <div className="pt-2 border-t border-slate-900 flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">Schnell-Layouts:</span>
                <button
                  type="button"
                  onClick={() => setTilesState((prev) => prev.map((t) => ({ ...t, colSpan: 1, minHeight: 160, visible: true })))}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-bold text-slate-300 uppercase cursor-pointer"
                >
                  Standard (1/3 Breite)
                </button>
                <button
                  type="button"
                  onClick={() => setTilesState((prev) => prev.map((t) => ({ ...t, colSpan: 2, minHeight: 200, visible: true })))}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-bold text-slate-300 uppercase cursor-pointer"
                >
                  Panorama (2/3 Breite)
                </button>
                <button
                  type="button"
                  onClick={() => setTilesState((prev) => prev.map((t) => ({ ...t, colSpan: 3, minHeight: 180, visible: true })))}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-bold text-slate-300 uppercase cursor-pointer"
                >
                  Vollbreit (100%)
                </button>
              </div>
            </div>

            {/* Interactive Grid Editor & Preview */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-amber-400" /> Interaktive Kachel-Gitter Vorschau
                </h4>
                <span className="text-[11px] text-slate-400">Passe Kachel-Spalten und Höhen nach Wunsch an</span>
              </div>

              <div className="flex flex-wrap justify-center gap-5 bg-slate-950 p-6 rounded-3xl border border-slate-800 min-h-[300px]">
                {tilesState.map((tile, idx) => {
                  const getColWidthClass = (cols: number) => {
                    if (cols === 1) return 'w-full md:w-[calc(50%-10px)] lg:w-[calc(33.333%-14px)]';
                    if (cols === 2) return 'w-full lg:w-[calc(66.666%-10px)]';
                    return 'w-full';
                  };

                  const getIconComponent = (iconName: string) => {
                    switch (iconName) {
                      case 'Map': return <Map className="w-7 h-7" />;
                      case 'MessageSquare': return <MessageSquare className="w-7 h-7" />;
                      case 'Calendar': return <Calendar className="w-7 h-7" />;
                      case 'MapPin': return <MapPin className="w-7 h-7" />;
                      case 'Wrench': return <Wrench className="w-7 h-7" />;
                      case 'ShoppingBag': return <ShoppingBag className="w-7 h-7" />;
                      default: return <LayoutGrid className="w-7 h-7" />;
                    }
                  };

                  return (
                    <div
                      key={tile.id}
                      style={{ minHeight: `${tile.minHeight}px` }}
                      className={`relative bg-slate-900/90 border-2 transition-all rounded-2xl p-5 shadow-xl flex flex-col justify-between group ${
                        getColWidthClass(tile.colSpan)
                      } ${
                        tile.visible
                          ? 'border-slate-800 hover:border-amber-400/80'
                          : 'border-red-900/40 opacity-40 grayscale'
                      }`}
                    >
                      {/* Control Bar Header */}
                      <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3 mb-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`p-2 rounded-xl flex-shrink-0 ${tile.bgIconClass}`}>
                            {getIconComponent(tile.iconName)}
                          </div>
                          <div className="min-w-0">
                            <h5 className="text-sm font-black uppercase text-white truncate">{tile.title}</h5>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] bg-slate-950 text-amber-300 font-extrabold px-2 py-0.5 rounded border border-slate-800">
                                {tile.colSpan === 1 ? '1/3 B' : tile.colSpan === 2 ? '2/3 B' : '100% B'} · {tile.minHeight}px H
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Order & Visibility Controls */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMoveTile(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 disabled:opacity-30 text-slate-300 border border-slate-800 cursor-pointer"
                            title="Nach oben / links verschieben"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveTile(idx, 'down')}
                            disabled={idx === tilesState.length - 1}
                            className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 disabled:opacity-30 text-slate-300 border border-slate-800 cursor-pointer"
                            title="Nach unten / rechts verschieben"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleTileVisibility(tile.id)}
                            className={`p-1.5 rounded-lg border cursor-pointer transition-colors ${
                              tile.visible
                                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                                : 'bg-red-950/60 text-red-400 border-red-800/60'
                            }`}
                            title={tile.visible ? 'Kachel ausblenden' : 'Kachel einblenden'}
                          >
                            {tile.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Content Preview */}
                      <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed mb-4">
                        {tile.subtitle}
                      </p>

                      {/* Interactive Resizing Controls Footer */}
                      <div className="bg-slate-950/90 p-3 rounded-xl border border-slate-800/80 space-y-2 mt-auto">
                        {/* Width Buttons */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase text-slate-400">Breite:</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleSetTileWidth(tile.id, 1)}
                              className={`px-2 py-0.5 rounded text-[10px] font-extrabold border cursor-pointer ${
                                tile.colSpan === 1
                                  ? 'bg-amber-500 text-black border-amber-400'
                                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                              }`}
                            >
                              Klein (1)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetTileWidth(tile.id, 2)}
                              className={`px-2 py-0.5 rounded text-[10px] font-extrabold border cursor-pointer ${
                                tile.colSpan === 2
                                  ? 'bg-amber-500 text-black border-amber-400'
                                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                              }`}
                            >
                              Mittel (2)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetTileWidth(tile.id, 3)}
                              className={`px-2 py-0.5 rounded text-[10px] font-extrabold border cursor-pointer ${
                                tile.colSpan === 3
                                  ? 'bg-amber-500 text-black border-amber-400'
                                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                              }`}
                            >
                              Groß (3)
                            </button>
                          </div>
                        </div>

                        {/* Height Slider */}
                        <div className="flex items-center gap-2 pt-1 border-t border-slate-900">
                          <span className="text-[10px] font-bold uppercase text-slate-400 flex-shrink-0">
                            Höhe ({tile.minHeight}px):
                          </span>
                          <input
                            type="range"
                            min="130"
                            max="380"
                            step="10"
                            value={tile.minHeight}
                            onChange={(e) => handleSetTileHeight(tile.id, Number(e.target.value))}
                            className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                          />
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => handleUpdateTileHeight(tile.id, -20)}
                              className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-black text-amber-400 cursor-pointer"
                              title="Höhe verringern"
                            >
                              -
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateTileHeight(tile.id, 20)}
                              className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-black text-amber-400 cursor-pointer"
                              title="Höhe vergrößern"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={handleSaveTileLayout}
                className="px-8 py-3.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold uppercase text-xs rounded-full shadow-xl transition-all border-0 cursor-pointer inline-flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> Kachel-Layout Speichern
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

