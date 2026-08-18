import React, { useState, useEffect } from 'react';
import { User, MarketItem, GarageBike, TripEntry, ForumTopic, GpxRoute, CrewEvent, MapPin as MapPinType, TileConfig } from '../types';
import { User as UserIcon, Save, Instagram, Youtube, Wrench, ShoppingBag, Edit, Trash2, Key, Bike, Plus, Camera, Upload, LayoutGrid, Maximize2, Minimize2, Move, Eye, EyeOff, RotateCcw, ArrowUp, ArrowDown, Map, MessageSquare, Calendar, Sliders, Check, Sparkles, MapPin, Lightbulb, Phone, AlertOctagon, FileText, Shield, ExternalLink } from 'lucide-react';
import { getSavedTileLayout, saveTileLayout, resetTileLayout } from '../lib/tileUtils';
import { checkWhatsAppGroupMembership, uploadAvatarToStorage } from '../lib/supabase';
import { LegalConfig, ImpressumData, PrivacyData, getStoredLegalConfig, saveStoredLegalConfig } from '../lib/legalConfig';
import { UserRoleBadge } from '../components/UserRoleBadge';
import { UserAvatar } from '../components/UserAvatar';

interface ProfileViewProps {
  currentUser: User;
  userMarketItems: MarketItem[];
  userGarageBikes: GarageBike[];
  initialMapBikes?: string;
  initialSection?: 'name_profile' | 'credentials' | 'garage' | 'market' | 'tile_layout' | 'legal';
  trips?: TripEntry[];
  forumTopics?: ForumTopic[];
  gpxRoutes?: GpxRoute[];
  crewEvents?: CrewEvent[];
  mapPins?: MapPinType[];
  legalConfig?: LegalConfig;
  onSaveProfile: (data: { email: string; phone?: string; pass?: string; ig?: string; tt?: string; yt?: string; avatarUrl?: string; mapBikes?: string; bio?: string }) => void;
  onRequestUsernameChange: () => void;
  onDeleteMarketItem: (id: string) => void;
  onDeleteGarageBike: (id: string) => void;
  onDeleteAccount?: (passwordConfirm: string, phoneToKick?: string) => void;
  onNavigateToGarage?: () => void;
  onNavigateToMarket?: () => void;
  onSaveLegalConfig?: (config: LegalConfig) => void;
  onNavigateToLegal?: (type: 'impressum' | 'privacy') => void;
  showAlert?: (title: string, message: string, type?: 'success' | 'warning' | 'danger') => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  userMarketItems,
  userGarageBikes,
  initialMapBikes = '',
  initialSection = 'name_profile',
  trips = [],
  forumTopics = [],
  gpxRoutes = [],
  crewEvents = [],
  mapPins = [],
  legalConfig,
  onSaveProfile,
  onRequestUsernameChange,
  onDeleteMarketItem,
  onDeleteGarageBike,
  onDeleteAccount,
  onNavigateToGarage,
  onNavigateToMarket,
  onSaveLegalConfig,
  onNavigateToLegal,
  showAlert,
}) => {
  // Dropdown section selector
  const [activeSection, setActiveSection] = useState<'name_profile' | 'credentials' | 'garage' | 'market' | 'tile_layout' | 'legal'>(initialSection);

  const isFounderOrAdmin =
    currentUser.isAdmin ||
    currentUser.role === 'admin' ||
    currentUser.role === 'founder' ||
    currentUser.username.toLowerCase() === 'nican' ||
    (currentUser.email && currentUser.email.toLowerCase() === 'nico.anschau98@gmail.com') ||
    currentUser.isModerator;

  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
    }
  }, [initialSection]);

  // Tile layout customization state
  const [tilesState, setTilesState] = useState<TileConfig[]>(() => getSavedTileLayout());

  // Form states
  const [email, setEmail] = useState(currentUser.email || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [password, setPassword] = useState('');
  const [deletePassConfirm, setDeletePassConfirm] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [ig, setIg] = useState(currentUser.social_ig || '');
  const [tt, setTt] = useState(currentUser.social_tiktok || '');
  const [yt, setYt] = useState(currentUser.social_youtube || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatar_url || '');
  const [bio, setBio] = useState(currentUser.bio || '');

  // Legal config state for Founder
  const [currentLegalConfig, setCurrentLegalConfig] = useState<LegalConfig>(() => legalConfig || getStoredLegalConfig());
  const [impressumForm, setImpressumForm] = useState<ImpressumData>(currentLegalConfig.impressum);
  const [privacyForm, setPrivacyForm] = useState<PrivacyData>(currentLegalConfig.privacy);

  // Dynamic list for PixelMap bikes (up to 5)
  const [mapBikeLines, setMapBikeLines] = useState<string[]>([]);

  useEffect(() => {
    setAvatarUrl(currentUser.avatar_url || '');
    setEmail(currentUser.email || '');
    setPhone(currentUser.phone || '');
    setIg(currentUser.social_ig || '');
    setTt(currentUser.social_tiktok || '');
    setYt(currentUser.social_youtube || '');
    setBio(currentUser.bio || '');
  }, [currentUser.username, currentUser.avatar_url, currentUser.phone, currentUser.email, currentUser.bio]);

  useEffect(() => {
    if (legalConfig) {
      setCurrentLegalConfig(legalConfig);
      setImpressumForm(legalConfig.impressum);
      setPrivacyForm(legalConfig.privacy);
    }
  }, [legalConfig]);

  useEffect(() => {
    const raw = (initialMapBikes || '').trim();
    if (!raw) {
      setMapBikeLines([]);
      return;
    }
    const splitBikes = raw.includes('\n')
      ? raw.split('\n').map((s) => s.trim()).filter(Boolean)
      : raw.split(',').map((s) => s.trim()).filter(Boolean);

    setMapBikeLines(splitBikes.slice(0, 5));
  }, [initialMapBikes]);

  const saveProfileData = (newAvatar?: string) => {
    const targetAvatar = newAvatar !== undefined ? newAvatar : avatarUrl;
    const combinedMapBikes = mapBikeLines.map((b) => b.trim()).filter(Boolean).join('\n');
    onSaveProfile({
      email,
      phone,
      pass: password || undefined,
      ig,
      tt,
      yt,
      avatarUrl: targetAvatar,
      mapBikes: combinedMapBikes,
      bio,
    });
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // 1. Try uploading directly to Supabase Storage if available
      try {
        const publicUrl = await uploadAvatarToStorage(file, currentUser.username);
        if (publicUrl) {
          setAvatarUrl(publicUrl);
          saveProfileData(publicUrl);
          if (showAlert) {
            showAlert('Profilbild Hochgeladen 📸', 'Dein Profilbild wurde im Cloud-Speicher hinterlegt und synchronisiert.', 'success');
          }
          return;
        }
      } catch (err) {
        console.warn('Storage upload error, fallback to optimized DB storage:', err);
      }

      // 2. Fallback: Compress nicely with canvas (320x320 JPEG) and save directly to users table
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = typeof event.target?.result === 'string' ? event.target.result : '';
        if (!result) return;

        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const MAX_DIM = 320;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_DIM) {
                height = Math.round(height * (MAX_DIM / width));
                width = MAX_DIM;
              }
            } else {
              if (height > MAX_DIM) {
                width = Math.round(width * (MAX_DIM / height));
                height = MAX_DIM;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
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

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();

    // If phone number is being added or changed, check WhatsApp group membership
    if (phone && phone.trim() && phone.trim() !== (currentUser.phone || '').trim()) {
      const membership = await checkWhatsAppGroupMembership(phone.trim());
      if (!membership.isMember) {
        if (showAlert) {
          showAlert(
            'Kein WhatsApp-Gruppenmitglied ⛔',
            membership.reason || 'Diese Handynummer wurde nicht in der offiziellen Pixel Rider WhatsApp-Gruppe gefunden. Es können nur Nummern hinterlegt werden, die aktive Gruppenmitglieder sind.',
            'danger'
          );
        }
        return;
      }
    }

    const combinedMapBikes = mapBikeLines.map((b) => b.trim()).filter(Boolean).join('\n');
    onSaveProfile({
      email,
      phone,
      pass: password || undefined,
      ig,
      tt,
      yt,
      avatarUrl,
      mapBikes: combinedMapBikes,
      bio,
    });
  };

  const handleSaveImpressum = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: LegalConfig = {
      ...currentLegalConfig,
      impressum: impressumForm,
    };
    setCurrentLegalConfig(updated);
    saveStoredLegalConfig(updated);
    if (onSaveLegalConfig) onSaveLegalConfig(updated);
    if (showAlert) {
      showAlert('Impressum Gespeichert 📜', 'Das Impressum der Community wurde erfolgreich aktualisiert.', 'success');
    }
  };

  const handleSavePrivacy = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: LegalConfig = {
      ...currentLegalConfig,
      privacy: privacyForm,
    };
    setCurrentLegalConfig(updated);
    saveStoredLegalConfig(updated);
    if (onSaveLegalConfig) onSaveLegalConfig(updated);
    if (showAlert) {
      showAlert('Datenschutz Gespeichert 🛡️', 'Die Datenschutzerklärung wurde erfolgreich aktualisiert.', 'success');
    }
  };

  return (
    <div className="py-6 max-w-4xl mx-auto px-4 pb-28">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <UserAvatar
              username={currentUser.username}
              avatarUrl={avatarUrl || currentUser.avatar_url}
              currentUser={currentUser}
              size="xl"
              bordered
              borderColor="border-amber-400"
            />
            <div>
              <h2 className="text-2xl font-extrabold uppercase text-amber-400 flex items-center gap-2">
                Profil & Einstellungen
              </h2>
              <p className="text-xs text-purple-200/80 mt-1">
                Verwalte dein Profilbild, Bio, Anmeldedaten, Socials & PixelMap-Bikes.
              </p>
            </div>
          </div>

          <div className="bg-slate-950 px-4 py-2 rounded-2xl border border-amber-500/30 flex items-center gap-3 self-start sm:self-auto">
            <span className="text-xs text-slate-400 uppercase font-bold">User:</span>
            <span className="text-base font-extrabold text-amber-400">@{currentUser.username}</span>
            {currentUser.isAdmin ? (
              <span className="text-[10px] bg-red-950/80 text-red-300 uppercase font-extrabold px-2.5 py-1 rounded-full border border-red-500/40">
                👑 Admin
              </span>
            ) : currentUser.isModerator ? (
              <span className="text-[10px] bg-yellow-950/80 text-yellow-300 uppercase font-extrabold px-2.5 py-1 rounded-full border border-yellow-500/40">
                🛡️ Mod
              </span>
            ) : (currentUser.role === 'ehren pixel' || (currentUser.role as string)?.toLowerCase().includes('ehren')) ? (
              <span className="text-[10px] bg-gradient-to-r from-cyan-950 to-blue-950 text-cyan-300 uppercase font-black px-2.5 py-1 rounded-full border border-cyan-400/60 shadow-[0_0_10px_rgba(6,182,212,0.4)] flex items-center gap-1">
                💎 Ehrenpixel
              </span>
            ) : (
              <span className="text-[10px] bg-slate-900 text-slate-300 uppercase font-bold px-2 py-0.5 rounded-full border border-slate-700">
                {currentUser.role || 'Member'}
              </span>
            )}
          </div>
        </div>

        {/* Section Navigation Tabs (Modern scrollable pill dock matching EventsView) */}
        <div className="flex justify-center mb-8">
          <div className="bg-slate-900/90 border border-purple-800/80 rounded-2xl md:rounded-full p-1.5 flex items-center gap-1 sm:gap-2 shadow-2xl backdrop-blur-md overflow-x-auto no-scrollbar w-full sm:w-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveSection('name_profile')}
              className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl md:rounded-full text-xs sm:text-sm font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer border-0 select-none min-h-[38px] shrink-0 whitespace-nowrap ${
                activeSection === 'name_profile'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-[0_0_18px_rgba(245,158,11,0.45)]'
                  : 'text-slate-300 hover:text-white hover:bg-purple-950/60 bg-transparent'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-current shrink-0" />
              <span>Profil</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('credentials')}
              className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl md:rounded-full text-xs sm:text-sm font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer border-0 select-none min-h-[38px] shrink-0 whitespace-nowrap ${
                activeSection === 'credentials'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-[0_0_18px_rgba(245,158,11,0.45)]'
                  : 'text-slate-300 hover:text-white hover:bg-purple-950/60 bg-transparent'
              }`}
            >
              <Key className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-current shrink-0" />
              <span>Anmeldedaten</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('garage')}
              className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl md:rounded-full text-xs sm:text-sm font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer border-0 select-none min-h-[38px] shrink-0 whitespace-nowrap ${
                activeSection === 'garage'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-[0_0_18px_rgba(245,158,11,0.45)]'
                  : 'text-slate-300 hover:text-white hover:bg-purple-950/60 bg-transparent'
              }`}
            >
              <Wrench className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-current shrink-0" />
              <span>Garage ({userGarageBikes.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('market')}
              className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl md:rounded-full text-xs sm:text-sm font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer border-0 select-none min-h-[38px] shrink-0 whitespace-nowrap ${
                activeSection === 'market'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-[0_0_18px_rgba(245,158,11,0.45)]'
                  : 'text-slate-300 hover:text-white hover:bg-purple-950/60 bg-transparent'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-current shrink-0" />
              <span>Inserate ({userMarketItems.length})</span>
            </button>

            {/* Kacheln Tab - only displayed if active */}
            {activeSection === 'tile_layout' && (
              <button
                type="button"
                onClick={() => setActiveSection('tile_layout')}
                className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl md:rounded-full text-xs sm:text-sm font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer border-0 select-none min-h-[38px] shrink-0 whitespace-nowrap bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-[0_0_18px_rgba(245,158,11,0.45)]"
              >
                <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-current shrink-0" />
                <span>Kacheln</span>
              </button>
            )}

            {/* Legal Tab - only displayed if active */}
            {isFounderOrAdmin && activeSection === 'legal' && (
              <button
                type="button"
                onClick={() => setActiveSection('legal')}
                className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl md:rounded-full text-xs sm:text-sm font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer border-0 select-none min-h-[38px] shrink-0 whitespace-nowrap bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-[0_0_18px_rgba(245,158,11,0.45)]"
              >
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-current shrink-0" />
                <span>Rechtliches</span>
              </button>
            )}
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
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-extrabold text-xs uppercase rounded-xl border border-amber-500/30 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap"
              >
                <Edit className="w-4 h-4" /> Namensänderung Beantragen
              </button>
            </div>

            {/* Avatar Upload Box */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase text-amber-400 flex items-center gap-2">
                  <Camera className="w-4 h-4" /> Profilbild & Community-Avatar
                </h4>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Server- & DB-Sync
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="flex-shrink-0">
                  <UserAvatar
                    username={currentUser.username}
                    avatarUrl={avatarUrl}
                    currentUser={currentUser}
                    size="2xl"
                    bordered
                    borderColor="border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.35)]"
                  />
                </div>

                <div className="flex-1 space-y-3 w-full text-center sm:text-left">
                  <p className="text-xs text-slate-300">
                    Lade ein persönliches Foto hoch. Dein Profilbild wird direkt in der <strong>Server-Datenbank</strong> gespeichert und ist für alle anderen Mitglieder in der Community, im Forum, in der Garage und auf der PixelMap sichtbar.
                  </p>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1">
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

            {/* Profil-Bio / Über mich Box */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase text-amber-400 flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-amber-400" /> Über mich (Profil-Bio & Beschreibung)
                </h4>
                <span className="text-[10px] text-slate-400 font-mono">
                  {bio.length} / 500 Zeichen
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Füge hier eine Beschreibung über dich, deine Leidenschaft, deine Bikes oder deinen Fahrstil hinzu. Diese Bio wird in allen Ansichten und in deinem <strong>öffentlichen Mitgliedsprofil</strong> angezeigt.
              </p>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 500))}
                rows={4}
                placeholder="z.B. Passionierter Kurvenjäger aus dem Pfälzerwald. Liebe sportliche Naked Bikes, Feierabendrunden und spontane Tagestouren. Immer bereit für neue Strecken!"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition-all leading-relaxed"
              />
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
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4 w-full overflow-hidden">
              <div className="pb-2 border-b border-slate-900">
                <h4 className="text-xs font-bold uppercase text-amber-400 flex items-center gap-2">
                  <Bike className="w-4 h-4 text-amber-400" /> PixelMap Motorräder (Bis zu 5 Bikes)
                </h4>
                <p className="text-[11px] text-purple-200/70 mt-0.5">
                  Trage hier deine Motorräder für deinen Standort-Pin auf der PixelMap ein.
                </p>
              </div>

              {/* Quick Suggestion from User Garage */}
              {userGarageBikes.length > 0 && mapBikeLines.length < 5 && (
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <Wrench className="w-3 h-3 text-amber-400" /> Aus Garage übernehmen:
                  </span>
                  {userGarageBikes
                    .filter((gb) => !mapBikeLines.some((mb) => mb.toLowerCase().includes(gb.model.toLowerCase())))
                    .slice(0, 5 - mapBikeLines.length)
                    .map((gb) => (
                      <button
                        key={gb.id}
                        type="button"
                        onClick={() => {
                          if (mapBikeLines.length < 5) {
                            setMapBikeLines([...mapBikeLines, `${gb.model}${gb.year ? ` (${gb.year})` : ''}`]);
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg bg-purple-950/50 hover:bg-purple-900/80 text-purple-200 hover:text-white border border-purple-800/60 text-[11px] font-bold cursor-pointer transition-all inline-flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3 text-amber-400" /> {gb.model}
                      </button>
                    ))}
                </div>
              )}

              {/* Dynamic Bike List or Empty State */}
              {mapBikeLines.length === 0 ? (
                <div className="py-8 px-4 bg-slate-900/40 rounded-2xl border border-dashed border-slate-800 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                    <Bike className="w-6 h-6 text-amber-400/80" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200 uppercase">Noch kein Motorrad für die Karte hinterlegt</p>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-md mx-auto">
                      Füge deine Motorräder hinzu, damit andere Biker auf der PixelMap sehen, welche Maschinen du fährst.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMapBikeLines([''])}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase rounded-full shadow-lg transition-all border-0 cursor-pointer inline-flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Bike Hinzufügen
                  </button>
                </div>
              ) : (
                <div className="space-y-3 pt-1 w-full">
                  {mapBikeLines.map((lineVal, idx) => (
                    <div key={idx} className="flex items-center gap-2 sm:gap-3 w-full min-w-0 bg-slate-900/50 p-2 sm:p-2.5 rounded-xl border border-slate-800/80">
                      <span className="text-[11px] sm:text-xs font-black uppercase text-amber-400/90 w-14 sm:w-16 flex-shrink-0 text-center bg-slate-950 py-1.5 px-1 rounded-lg border border-slate-800">
                        Bike {idx + 1}:
                      </span>
                      <div className="flex-1 min-w-0">
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
                              ? 'z.B. Honda CB1000RR SC600 (Hauptbike)'
                              : idx === 1
                              ? 'z.B. Yamaha XT660R'
                              : idx === 2
                              ? 'z.B. Suzuki V-Strom 1050'
                              : `Modell & Baujahr (Bike ${idx + 1})`
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-all"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = mapBikeLines.filter((_, i) => i !== idx);
                          setMapBikeLines(updated);
                        }}
                        title="Bike entfernen"
                        className="p-2 rounded-lg bg-slate-950 hover:bg-red-950/80 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-800 transition-all cursor-pointer flex-shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {mapBikeLines.length < 5 && (
                    <div className="pt-2 text-center sm:text-left">
                      <button
                        type="button"
                        onClick={() => setMapBikeLines([...mapBikeLines, ''])}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs uppercase rounded-xl border border-amber-500/30 hover:border-amber-500/60 transition-all cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> Weiteres Bike Hinzufügen ({mapBikeLines.length}/5)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="text-center pt-2">
              <button
                type="submit"
                className="px-8 py-3.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold uppercase text-xs rounded-full shadow-xl transition-all border-0 cursor-pointer inline-flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> Profil & Bio Speichern
              </button>
            </div>
          </form>
        )}

        {/* SECTION 2: ANMELDEDATEN & PASSWORT */}
        {activeSection === 'credentials' && (
          <form onSubmit={handleSaveAll} className="space-y-6">
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
              <h4 className="text-xs font-bold uppercase text-amber-400 flex items-center gap-2">
                <Key className="w-4 h-4" /> E-Mail & Passwort Ändern
              </h4>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                    E-Mail Adresse
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="deine.email@beispiel.de"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" /> WhatsApp Handynummer
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="z.B. +49 170 1234567 oder 0170 1234567"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Muss ein aktives Mitglied der Pixel Rider WhatsApp-Gruppe sein.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                    Neues Passwort (Leer lassen falls keine Änderung)
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            <div className="text-center pt-2">
              <button
                type="submit"
                className="px-8 py-3.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold uppercase text-xs rounded-full shadow-xl transition-all border-0 cursor-pointer inline-flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> Anmeldedaten Speichern
              </button>
            </div>

            {/* Account löschen */}
            {onDeleteAccount && (
              <div className="mt-12 pt-6 border-t border-red-950/60 bg-red-950/20 p-6 rounded-2xl border border-red-900/30 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-extrabold uppercase text-red-400 flex items-center gap-2">
                    <AlertOctagon className="w-4 h-4" /> Konto Vollständig Löschen (Art. 17 DSGVO)
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Löscht dein Profil, deine Bikes, Flohmarkt-Inserate und alle gespeicherten Daten unwiderruflich.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="px-4 py-2.5 bg-red-900 hover:bg-red-800 text-white font-extrabold text-xs uppercase rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 border-0"
                >
                  <Trash2 className="w-4 h-4" /> Konto Löschen
                </button>
              </div>
            )}
          </form>
        )}

        {/* SECTION 3: MEINE GARAGE */}
        {activeSection === 'garage' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950 p-5 rounded-2xl border border-slate-800">
              <div>
                <h3 className="text-base font-extrabold uppercase text-amber-400 flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-amber-400" /> Meine Garagen-Bikes ({userGarageBikes.length})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Hier siehst du alle Motorräder, die du in deiner Garage angelegt hast.
                </p>
              </div>
              {onNavigateToGarage && (
                <button
                  type="button"
                  onClick={onNavigateToGarage}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase rounded-full transition-all cursor-pointer border-0 flex items-center gap-2 self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" /> Zur Garage / Neues Bike
                </button>
              )}
            </div>

            {userGarageBikes.length === 0 ? (
              <div className="text-center py-12 bg-slate-950 rounded-2xl border border-slate-800/80 p-6">
                <Bike className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h4 className="text-sm font-bold uppercase text-slate-300">Noch keine Bikes in der Garage</h4>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Präsentiere dein Motorrad mit Bildern, Umbauten und Soundcheck der Community!
                </p>
                {onNavigateToGarage && (
                  <button
                    type="button"
                    onClick={onNavigateToGarage}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase rounded-full transition-all cursor-pointer border-0 inline-flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Erstes Bike Hinzufügen
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {userGarageBikes.map((bike) => (
                  <div
                    key={bike.id}
                    className="bg-slate-950 border border-slate-800 hover:border-amber-500/50 rounded-2xl overflow-hidden transition-all flex flex-col justify-between p-4 space-y-3"
                  >
                    <div className="flex gap-4 items-center">
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-900 flex-shrink-0 border border-slate-800">
                        {bike.images?.[0] ? (
                          <img src={bike.images[0]} alt={bike.model} className="w-full h-full object-cover" />
                        ) : (
                          <Bike className="w-8 h-8 text-slate-600 m-auto mt-6" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-black uppercase text-white truncate">{bike.model}</h4>
                        <p className="text-xs text-amber-400 font-bold">{bike.year || 'Kein Baujahr'}</p>
                        {bike.mods && (
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {bike.mods}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-900 pt-3">
                      <span className="text-[10px] uppercase font-bold text-purple-300">
                        {bike.images?.length || 0} Fotos
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Möchtest du das Bike "${bike.model}" wirklich aus deiner Garage entfernen?`)) {
                            onDeleteGarageBike(bike.id);
                          }
                        }}
                        className="text-red-400 hover:text-red-300 text-xs font-bold uppercase flex items-center gap-1 cursor-pointer bg-transparent border-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Löschen
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION 4: MEINE INSERATE */}
        {activeSection === 'market' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950 p-5 rounded-2xl border border-slate-800">
              <div>
                <h3 className="text-base font-extrabold uppercase text-amber-400 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-amber-400" /> Meine Flohmarkt-Inserate ({userMarketItems.length})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verwalte deine Angebote auf dem Pixel Rider Flohmarkt.
                </p>
              </div>
              {onNavigateToMarket && (
                <button
                  type="button"
                  onClick={onNavigateToMarket}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase rounded-full transition-all cursor-pointer border-0 flex items-center gap-2 self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" /> Zum Flohmarkt
                </button>
              )}
            </div>

            {userMarketItems.length === 0 ? (
              <div className="text-center py-12 bg-slate-950 rounded-2xl border border-slate-800/80 p-6">
                <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h4 className="text-sm font-bold uppercase text-slate-300">Keine aktiven Inserate</h4>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Hast du Motorradteile, Kleidung oder Zubehör abzugeben?
                </p>
                {onNavigateToMarket && (
                  <button
                    type="button"
                    onClick={onNavigateToMarket}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase rounded-full transition-all cursor-pointer border-0 inline-flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Inserat Erstellen
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {userMarketItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4 hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 flex-shrink-0">
                        {item.images?.[0] ? (
                          <img src={item.images[0]} alt={item.item_name} className="w-full h-full object-cover" />
                        ) : (
                          <ShoppingBag className="w-6 h-6 text-slate-600 m-auto mt-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] bg-purple-900/60 text-purple-300 px-2 py-0.5 rounded font-bold uppercase">
                          {item.category}
                        </span>
                        <h4 className="text-sm font-extrabold text-white truncate mt-1">{item.item_name}</h4>
                        <p className="text-xs font-black text-amber-400">{item.price} €</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Möchtest du das Inserat "${item.item_name}" wirklich löschen?`)) {
                          onDeleteMarketItem(item.id);
                        }
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
                      case 'Camera': return <Camera className="w-7 h-7" />;
                      case 'Lightbulb': return <Lightbulb className="w-7 h-7" />;
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

        {/* SECTION 6: FOUNDER RECHTLICHES (IMPRESSUM & DATENSCHUTZ) */}
        {activeSection === 'legal' && isFounderOrAdmin && (
          <div className="space-y-8">
            {/* Header info */}
            <div className="bg-gradient-to-r from-amber-500/20 via-purple-950/60 to-amber-500/10 border border-amber-500/40 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase bg-amber-500 text-black px-2.5 py-0.5 rounded-full inline-block mb-1">
                  Founder Dashboard
                </span>
                <h3 className="text-xl font-black uppercase text-amber-400">
                  Impressum & Datenschutzerklärung Verwalten
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Als Founder kannst du hier alle rechtlichen Pflichtangaben jederzeit in Echtzeit anpassen.
                </p>
              </div>

              {onNavigateToLegal && (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => onNavigateToLegal('impressum')}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-xs uppercase rounded-xl border border-slate-700 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Impressum Ansehen
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigateToLegal('privacy')}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-xs uppercase rounded-xl border border-slate-700 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Datenschutz Ansehen
                  </button>
                </div>
              )}
            </div>

            {/* CARD 1: IMPRESSUM FORMULAR */}
            <form onSubmit={handleSaveImpressum} className="bg-slate-950 p-6 md:p-8 rounded-3xl border border-slate-800 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/30">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold uppercase text-white">Impressum Angaben (§ 5 DDG)</h4>
                    <p className="text-xs text-slate-400">Verwalte Betreiberdaten, Kontakt und inhaltliche Verantwortung</p>
                  </div>
                </div>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase rounded-full shadow-lg transition-all cursor-pointer border-0 flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" /> Impressum Speichern
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">
                    Website- / Community-Name:
                  </label>
                  <input
                    type="text"
                    required
                    value={impressumForm.site_name}
                    onChange={(e) => setImpressumForm({ ...impressumForm, site_name: e.target.value })}
                    placeholder="Pixel Rider Community"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">
                    Betreiber / Vertretungsberechtigter (Vollständiger Name):
                  </label>
                  <input
                    type="text"
                    required
                    value={impressumForm.operator_name}
                    onChange={(e) => setImpressumForm({ ...impressumForm, operator_name: e.target.value })}
                    placeholder="Nico Anschau"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">
                    Straße und Hausnummer:
                  </label>
                  <input
                    type="text"
                    required
                    value={impressumForm.street}
                    onChange={(e) => setImpressumForm({ ...impressumForm, street: e.target.value })}
                    placeholder="Alte Straße 19"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">
                    PLZ und Ort:
                  </label>
                  <input
                    type="text"
                    required
                    value={impressumForm.city_zip}
                    onChange={(e) => setImpressumForm({ ...impressumForm, city_zip: e.target.value })}
                    placeholder="66909 Hüffler"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">
                    Offizielle Kontakt-E-Mail:
                  </label>
                  <input
                    type="email"
                    required
                    value={impressumForm.email}
                    onChange={(e) => setImpressumForm({ ...impressumForm, email: e.target.value })}
                    placeholder="info@pixel-rider.de"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">
                    Telefonnummer (Optional):
                  </label>
                  <input
                    type="text"
                    value={impressumForm.phone || ''}
                    onChange={(e) => setImpressumForm({ ...impressumForm, phone: e.target.value })}
                    placeholder="+49 ..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">
                  Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV:
                </label>
                <textarea
                  rows={2}
                  value={impressumForm.responsible_content}
                  onChange={(e) => setImpressumForm({ ...impressumForm, responsible_content: e.target.value })}
                  placeholder="Nico Anschau, Alte Straße 19, 66909 Hüffler"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">
                  Haftungsausschluss / Disclaimer:
                </label>
                <textarea
                  rows={3}
                  value={impressumForm.disclaimer}
                  onChange={(e) => setImpressumForm({ ...impressumForm, disclaimer: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500 leading-relaxed"
                />
              </div>

              <div className="text-right">
                <button
                  type="submit"
                  className="px-7 py-3 bg-amber-500 hover:bg-amber-400 text-black font-extrabold uppercase text-xs rounded-full shadow-lg transition-all border-0 cursor-pointer inline-flex items-center gap-2"
                >
                  <Save className="w-4 h-4" /> Impressum Aktualisieren
                </button>
              </div>
            </form>

            {/* CARD 2: DATENSCHUTZ FORMULAR */}
            <form onSubmit={handleSavePrivacy} className="bg-slate-950 p-6 md:p-8 rounded-3xl border border-slate-800 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/30">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold uppercase text-white">Datenschutzerklärung (DSGVO)</h4>
                    <p className="text-xs text-slate-400">Verwalte Verantwortlichkeit, Hosting-Dienste und Speicherzwecke</p>
                  </div>
                </div>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase rounded-full shadow-lg transition-all cursor-pointer border-0 flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" /> Datenschutz Speichern
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">
                    Datenschutz-Verantwortlicher (Name & Anschrift):
                  </label>
                  <input
                    type="text"
                    required
                    value={privacyForm.responsible_name}
                    onChange={(e) => setPrivacyForm({ ...privacyForm, responsible_name: e.target.value })}
                    placeholder="Nico Anschau, Alte Straße 19, 66909 Hüffler"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">
                    Datenschutz-Kontakt-E-Mail:
                  </label>
                  <input
                    type="email"
                    required
                    value={privacyForm.contact_email}
                    onChange={(e) => setPrivacyForm({ ...privacyForm, contact_email: e.target.value })}
                    placeholder="info@pixel-rider.de"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">
                  Serverinfrastruktur & Drittanbieter:
                </label>
                <input
                  type="text"
                  required
                  value={privacyForm.hosting_location}
                  onChange={(e) => setPrivacyForm({ ...privacyForm, hosting_location: e.target.value })}
                  placeholder="Supabase Cloud (EU Frankfurt), OpenStreetMap Nominatim"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">
                  Gespeicherte Daten & Nutzungszwecke:
                </label>
                <textarea
                  rows={3}
                  required
                  value={privacyForm.data_storage_info}
                  onChange={(e) => setPrivacyForm({ ...privacyForm, data_storage_info: e.target.value })}
                  placeholder="Registrierung (E-Mail, SHA-256 Passwort-Hash), Garagen-Bikes mit Fotos, Flohmarkt-Inserate..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">
                  Nutzerrechte & Löschung nach Art. 17 DSGVO:
                </label>
                <textarea
                  rows={2}
                  required
                  value={privacyForm.user_rights_info}
                  onChange={(e) => setPrivacyForm({ ...privacyForm, user_rights_info: e.target.value })}
                  placeholder="Du hast jederzeit das Recht auf unentgeltliche Auskunft über deine gespeicherten Daten..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">
                  Zusätzlicher Datenschutz-Freitext (Optional):
                </label>
                <textarea
                  rows={2}
                  value={privacyForm.custom_privacy_text || ''}
                  onChange={(e) => setPrivacyForm({ ...privacyForm, custom_privacy_text: e.target.value })}
                  placeholder="Keine Weitergabe an Werbenetzwerke, keine Werbe-Tracker..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500 leading-relaxed"
                />
              </div>

              <div className="text-right">
                <button
                  type="submit"
                  className="px-7 py-3 bg-amber-500 hover:bg-amber-400 text-black font-extrabold uppercase text-xs rounded-full shadow-lg transition-all border-0 cursor-pointer inline-flex items-center gap-2"
                >
                  <Save className="w-4 h-4" /> Datenschutz Aktualisieren
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Account Löschen Bestätigungs-Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-red-900/60 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-950/80 border border-red-800 flex items-center justify-center text-red-400 mx-auto">
              <AlertOctagon className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-black uppercase text-white">Konto Endgültig Löschen?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Diese Aktion kann nicht rückgängig gemacht werden. Alle deine Bikes, Flohmarkt-Inserate und Forum-Beiträge werden gelöscht.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <label className="block text-xs font-bold uppercase text-slate-300">
                Gib dein Passwort zur Bestätigung ein:
              </label>
              <input
                type="password"
                value={deletePassConfirm}
                onChange={(e) => setDeletePassConfirm(e.target.value)}
                placeholder="Dein Passwort"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex gap-3 pt-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletePassConfirm('');
                }}
                className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase rounded-xl transition-all border-0 cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                type="button"
                disabled={!deletePassConfirm}
                onClick={() => {
                  if (onDeleteAccount) {
                    onDeleteAccount(deletePassConfirm, phone);
                  }
                  setShowDeleteModal(false);
                }}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-extrabold text-xs uppercase rounded-xl transition-all border-0 cursor-pointer"
              >
                Endgültig Löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
