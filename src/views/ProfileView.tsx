import React, { useState, useEffect } from 'react';
import { User, MarketItem, GarageBike } from '../types';
import { User as UserIcon, Save, Instagram, Youtube, Wrench, ShoppingBag, Edit, Trash2, Key, Bike, Plus, Camera, Upload } from 'lucide-react';

interface ProfileViewProps {
  currentUser: User;
  userMarketItems: MarketItem[];
  userGarageBikes: GarageBike[];
  initialMapBikes?: string;
  onSaveProfile: (data: { email: string; pass?: string; ig?: string; tt?: string; yt?: string; avatarUrl?: string; mapBikes?: string }) => void;
  onRequestUsernameChange: () => void;
  onDeleteMarketItem: (id: string) => void;
  onDeleteGarageBike: (id: string) => void;
  onNavigateToGarage?: () => void;
  onNavigateToMarket?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  userMarketItems,
  userGarageBikes,
  initialMapBikes = '',
  onSaveProfile,
  onRequestUsernameChange,
  onDeleteMarketItem,
  onDeleteGarageBike,
  onNavigateToGarage,
  onNavigateToMarket,
}) => {
  // Dropdown section selector
  const [activeSection, setActiveSection] = useState<'credentials' | 'name_profile' | 'garage' | 'market'>('name_profile');

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

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setAvatarUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
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
                      <Upload className="w-4 h-4" /> Foto Auswählen
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
                        onClick={() => setAvatarUrl('')}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-red-400 hover:text-red-300 font-bold text-xs uppercase rounded-full border border-red-900/50 transition-all cursor-pointer"
                      >
                        Bild Entfernen
                      </button>
                    )}
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
      </div>
    </div>
  );
};

