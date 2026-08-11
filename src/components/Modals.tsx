import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, CrewEvent, GpxRoute, ForumTopic, GarageBike, MarketItem, UserNotification, DirectMessage } from '../types';
import { X, CheckCircle, AlertTriangle, AlertOctagon, Key, Upload, Download, MapPin, Send, Trash2, Edit, Shield, MessageSquare, Map } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Helper to parse GPX Trackpoints
const parseGpxTrackData = (gpxData?: string) => {
  if (!gpxData) {
    return { points: [], minEle: 0, maxEle: 0, eleGain: 0 };
  }
  try {
    const xml = new DOMParser().parseFromString(gpxData, 'text/xml');
    const trkpts = xml.getElementsByTagName('trkpt');
    const points: [number, number][] = [];
    let minEle = Infinity;
    let maxEle = -Infinity;
    let eleGain = 0;
    let prevEle: number | null = null;

    for (let i = 0; i < trkpts.length; i++) {
      const lat = parseFloat(trkpts[i].getAttribute('lat') || '');
      const lon = parseFloat(trkpts[i].getAttribute('lon') || trkpts[i].getAttribute('lng') || '');
      const eleEl = trkpts[i].getElementsByTagName('ele')[0];
      const ele = eleEl ? parseFloat(eleEl.textContent || '') : NaN;

      if (!isNaN(lat) && !isNaN(lon)) {
        points.push([lat, lon]);
        if (!isNaN(ele)) {
          if (ele < minEle) minEle = ele;
          if (ele > maxEle) maxEle = ele;
          if (prevEle !== null && ele > prevEle) {
            eleGain += ele - prevEle;
          }
          prevEle = ele;
        }
      }
    }

    return {
      points,
      minEle: minEle === Infinity ? 0 : Math.round(minEle),
      maxEle: maxEle === -Infinity ? 0 : Math.round(maxEle),
      eleGain: Math.round(eleGain),
    };
  } catch (e) {
    return { points: [], minEle: 0, maxEle: 0, eleGain: 0 };
  }
};

// Subcomponent for interactive Leaflet GPX Route Preview
const GpxPreviewMapContainer: React.FC<{ previewGpx: GpxRoute; onClose: () => void; onDownload: (r: GpxRoute) => void }> = ({
  previewGpx,
  onClose,
  onDownload,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const parsedData = useMemo(() => parseGpxTrackData(previewGpx.gpx_data), [previewGpx.gpx_data]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: false,
    });
    mapInstanceRef.current = map;

    // Dark Map Tile Layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    if (parsedData.points.length >= 2) {
      // Glow polyline
      L.polyline(parsedData.points, {
        color: '#facc15',
        weight: 7,
        opacity: 0.35,
      }).addTo(map);

      // Main polyline
      const routePolyline = L.polyline(parsedData.points, {
        color: '#eab308',
        weight: 4,
        opacity: 0.95,
      }).addTo(map);

      // Start Pin
      const startPt = parsedData.points[0];
      const startIcon = L.divIcon({
        className: 'custom-gpx-start',
        html: `<div style="background:#22c55e; color:#000; font-weight:900; font-size:11px; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid #fff; box-shadow:0 0 12px #22c55e;">A</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });
      L.marker(startPt, { icon: startIcon }).bindPopup('<b style="color:#15803d;">Startpunkt</b>').addTo(map);

      // End Pin
      const endPt = parsedData.points[parsedData.points.length - 1];
      const endIcon = L.divIcon({
        className: 'custom-gpx-end',
        html: `<div style="background:#ef4444; color:#fff; font-weight:900; font-size:11px; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid #fff; box-shadow:0 0 12px #ef4444;">B</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });
      L.marker(endPt, { icon: endIcon }).bindPopup('<b style="color:#b91c1c;">Zielpunkt</b>').addTo(map);

      map.fitBounds(routePolyline.getBounds(), { padding: [30, 30] });
    } else {
      map.setView([51.1657, 10.4515], 6);
    }

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [parsedData]);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="max-w-3xl w-full rounded-2xl bg-slate-950 border border-amber-500/50 p-6 relative shadow-2xl flex flex-col max-h-[92vh]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white border-0 bg-transparent cursor-pointer z-20 p-1.5 rounded-full hover:bg-slate-800 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="mb-4 pr-10">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] bg-amber-500/20 text-amber-300 font-extrabold px-2.5 py-0.5 rounded-full border border-amber-500/30 uppercase">
              🗺️ Interaktive GPX Vorschau
            </span>
            <span className="text-xs text-purple-300 font-bold">Ersteller: {previewGpx.created_by}</span>
          </div>
          <h3 className="text-2xl font-extrabold uppercase text-amber-400">{previewGpx.title}</h3>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 bg-slate-900/90 p-3 rounded-xl border border-slate-800">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Streckenlänge</span>
            <strong className="text-amber-400 text-sm">{previewGpx.distance} km</strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Trackpunkte</span>
            <strong className="text-white text-sm">{parsedData.points.length} Pkt</strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Höhenmeter Ca.</span>
            <strong className="text-emerald-400 text-sm">+{parsedData.eleGain} m</strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Max. Höhe</span>
            <strong className="text-purple-400 text-sm">{parsedData.maxEle} m</strong>
          </div>
        </div>

        {/* Map View */}
        <div className="relative w-full h-80 sm:h-96 rounded-2xl overflow-hidden border border-slate-800 mb-5 shadow-inner">
          <div ref={mapContainerRef} className="w-full h-full z-0" />
        </div>

        <button
          onClick={() => onDownload(previewGpx)}
          className="w-full py-3.5 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-extrabold uppercase text-xs shadow-xl flex items-center justify-center gap-2 border-0 cursor-pointer transition-all hover:scale-[1.01]"
        >
          <Download className="w-4 h-4" /> GPX Datei Herunterladen
        </button>
      </div>
    </div>
  );
};

interface ModalsProps {
  // Alert & Confirm State
  alertState: { isOpen: boolean; title: string; message: string; type: 'success' | 'warning' | 'danger' } | null;
  onCloseAlert: () => void;
  confirmState: { isOpen: boolean; title: string; message: string; onConfirm: () => void } | null;
  onCloseConfirm: () => void;

  // Auth Modals
  authModalOpen: boolean;
  onCloseAuth: () => void;
  onLogin: (user: string, pass: string) => void;
  onRegisterWithCode: (user: string, email: string, pass: string, code: string) => void;
  onRequestInvite: (user: string, email: string, pass: string) => void;
  
  // Forgot password
  forgotPassOpen: boolean;
  onCloseForgotPass: () => void;
  onOpenForgotPass?: () => void;
  onRequestPasswordReset: (username: string) => void;

  // User Notifications
  userNotifsOpen: boolean;
  onCloseUserNotifs: () => void;
  userNotifs: UserNotification[];
  onMarkNotifRead: (id: string) => void;

  // Admin Notifs / Password Resets
  adminNotifsOpen: boolean;
  onCloseAdminNotifs: () => void;
  adminResetUsers: User[];
  adminInviteUsers: User[];
  adminNotifsList: UserNotification[];
  onApproveInvite: (username: string) => void;
  onDismissInvite: (username: string) => void;
  onResetPasswordAdmin: (username: string) => void;

  // GPX Preview Modal
  previewGpx: GpxRoute | null;
  onCloseGpxPreview: () => void;
  onDownloadGpx: (route: GpxRoute) => void;

  // Direct Chat Modal
  directChatUser: string | null;
  onCloseDirectChat: () => void;
  directMessages: DirectMessage[];
  onSendDirectMessage: (text: string) => void;
  currentUsername: string;

  // Username Change Modal
  usernameChangeOpen: boolean;
  onCloseUsernameChange: () => void;
  onRequestUsernameChange: (newName: string) => void;
}

export const Modals: React.FC<ModalsProps> = ({
  alertState,
  onCloseAlert,
  confirmState,
  onCloseConfirm,
  authModalOpen,
  onCloseAuth,
  onLogin,
  onRegisterWithCode,
  onRequestInvite,
  forgotPassOpen,
  onCloseForgotPass,
  onOpenForgotPass,
  onRequestPasswordReset,
  userNotifsOpen,
  onCloseUserNotifs,
  userNotifs,
  onMarkNotifRead,
  adminNotifsOpen,
  onCloseAdminNotifs,
  adminResetUsers,
  adminInviteUsers,
  adminNotifsList,
  onApproveInvite,
  onDismissInvite,
  onResetPasswordAdmin,
  previewGpx,
  onCloseGpxPreview,
  onDownloadGpx,
  directChatUser,
  onCloseDirectChat,
  directMessages,
  onSendDirectMessage,
  currentUsername,
  usernameChangeOpen,
  onCloseUsernameChange,
  onRequestUsernameChange,
}) => {
  // Local state for Auth tab
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');

  const [regUser, setRegUser] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regCode, setRegInviteCode] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);

  const [forgotUser, setForgotUser] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [newNameInput, setNewNameInput] = useState('');

  return (
    <>
      {/* Alert Modal */}
      {alertState?.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div
            className={`max-w-md w-full rounded-2xl bg-[#0f071e]/95 border p-6 text-center shadow-[0_0_40px_rgba(15,7,30,0.8)] relative transition-all ${
              alertState.type === 'danger'
                ? 'border-red-500/60 shadow-[0_0_30px_rgba(239,68,68,0.25)]'
                : alertState.type === 'success'
                ? 'border-emerald-500/60 shadow-[0_0_30px_rgba(16,185,129,0.25)]'
                : 'border-amber-400/60 shadow-[0_0_30px_rgba(250,204,21,0.25)]'
            }`}
          >
            <button
              onClick={onCloseAlert}
              className="absolute top-4 right-4 text-slate-400 hover:text-white border-0 bg-transparent cursor-pointer p-1 rounded-full hover:bg-slate-800/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex justify-center mb-4">
              <div
                className={`p-3.5 rounded-2xl border shadow-inner inline-flex items-center justify-center ${
                  alertState.type === 'danger'
                    ? 'bg-red-500/10 border-red-500/30 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
                    : alertState.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-[0_0_20px_rgba(250,204,21,0.3)]'
                }`}
              >
                {alertState.type === 'danger' && <AlertOctagon className="w-9 h-9" />}
                {alertState.type === 'success' && <CheckCircle className="w-9 h-9" />}
                {alertState.type === 'warning' && <AlertTriangle className="w-9 h-9" />}
              </div>
            </div>

            <h3
              className={`text-xl font-black uppercase tracking-wider ${
                alertState.type === 'danger'
                  ? 'text-red-400'
                  : alertState.type === 'success'
                  ? 'text-emerald-400'
                  : 'text-amber-400'
              }`}
            >
              {alertState.title}
            </h3>

            <p className="text-slate-200 text-sm font-medium mt-3 mb-6 whitespace-pre-line leading-relaxed px-2">
              {alertState.message}
            </p>

            <button
              onClick={onCloseAlert}
              className={`w-full py-3 rounded-full font-extrabold uppercase text-xs tracking-wider shadow-lg transition-all border border-amber-400/30 cursor-pointer ${
                alertState.type === 'danger'
                  ? 'bg-gradient-to-r from-red-950 via-red-800 to-amber-500 hover:from-red-900 hover:to-amber-400 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]'
                  : alertState.type === 'success'
                  ? 'bg-gradient-to-r from-emerald-950 via-emerald-800 to-amber-400 hover:from-emerald-900 hover:to-amber-300 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                  : 'bg-gradient-to-r from-purple-950 via-purple-800 to-amber-400 hover:from-purple-900 hover:to-amber-300 text-white shadow-[0_0_20px_rgba(250,204,21,0.3)]'
              }`}
            >
              Verstanden
            </button>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmState?.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="max-w-md w-full rounded-2xl bg-[#0f071e]/95 border border-red-500/60 p-6 text-center shadow-[0_0_35px_rgba(239,68,68,0.25)] relative">
            <button
              onClick={onCloseConfirm}
              className="absolute top-4 right-4 text-slate-400 hover:text-white border-0 bg-transparent cursor-pointer p-1 rounded-full hover:bg-slate-800/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex justify-center mb-4">
              <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.3)] inline-flex items-center justify-center">
                <AlertOctagon className="w-9 h-9" />
              </div>
            </div>

            <h3 className="text-xl font-black uppercase tracking-wider text-red-400">
              {confirmState.title}
            </h3>

            <p className="text-slate-200 text-sm font-medium mt-3 mb-6 leading-relaxed px-2">
              {confirmState.message}
            </p>

            <div className="flex gap-3 justify-center">
              <button
                onClick={onCloseConfirm}
                className="flex-1 py-3 rounded-full border border-slate-700/80 text-slate-300 font-bold hover:bg-slate-800/60 hover:text-white transition-colors bg-slate-900/50 cursor-pointer text-xs uppercase tracking-wider"
              >
                Abbrechen
              </button>
              <button
                onClick={() => {
                  confirmState.onConfirm();
                  onCloseConfirm();
                }}
                className="flex-1 py-3 rounded-full bg-gradient-to-r from-red-950 via-red-800 to-amber-500 hover:from-red-900 hover:to-amber-400 text-white font-extrabold uppercase text-xs tracking-wider shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all border border-red-400/40 cursor-pointer"
              >
                Ja, fortfahren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal (Login / Register) */}
      {authModalOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="max-w-md w-full rounded-2xl bg-slate-950 border border-purple-800 p-6 relative shadow-2xl">
            <button
              onClick={onCloseAuth}
              className="absolute top-4 right-4 text-slate-400 hover:text-white border-0 bg-transparent cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold uppercase tracking-wider text-amber-400 text-center mb-4">
              Crew Login & Registrieren
            </h3>

            {/* Tabs */}
            <div className="flex border-b border-slate-800 mb-6">
              <button
                onClick={() => setAuthTab('login')}
                className={`flex-1 py-2 text-center text-sm font-bold uppercase border-b-2 transition-colors bg-transparent border-0 cursor-pointer ${
                  authTab === 'login' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400'
                }`}
              >
                Login
              </button>
              <button
                onClick={() => setAuthTab('register')}
                className={`flex-1 py-2 text-center text-sm font-bold uppercase border-b-2 transition-colors bg-transparent border-0 cursor-pointer ${
                  authTab === 'register' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400'
                }`}
              >
                Registrieren
              </button>
            </div>

            {/* Login Tab */}
            {authTab === 'login' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onLogin(loginUser, loginPass);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Username / E-Mail</label>
                  <input
                    type="text"
                    value={loginUser}
                    onChange={(e) => setLoginUser(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Passwort</label>
                  <input
                    type="password"
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => {
                      onCloseAuth();
                      if (onOpenForgotPass) {
                        onOpenForgotPass();
                      }
                    }}
                    className="text-xs text-purple-300 hover:text-amber-400 hover:underline bg-transparent border-0 cursor-pointer"
                  >
                    Passwort vergessen?
                  </button>
                </div>
                <button
                  type="submit"
                  className="w-full py-3 rounded-full bg-gradient-to-r from-purple-950 via-purple-800 to-amber-400 hover:from-purple-900 hover:to-amber-300 text-white font-extrabold uppercase text-sm shadow-lg transition-all border border-amber-400/40 cursor-pointer"
                >
                  Einloggen
                </button>
              </form>
            )}

            {/* Register Tab */}
            {authTab === 'register' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (showCodeInput && regCode) {
                    onRegisterWithCode(regUser, regEmail, regPass, regCode);
                  } else {
                    onRequestInvite(regUser, regEmail, regPass);
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Username *</label>
                  <input
                    type="text"
                    value={regUser}
                    onChange={(e) => setRegUser(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">E-Mail *</label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Passwort *</label>
                  <input
                    type="password"
                    value={regPass}
                    onChange={(e) => setRegPass(e.target.value)}
                    required
                    minLength={6}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                {!showCodeInput ? (
                  <div className="pt-2 text-center space-y-2">
                    <p className="text-xs text-amber-400 font-bold mb-2">Hast du bereits einen Invite-Code?</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCodeInput(true)}
                        className="py-2 px-3 bg-amber-500 text-black font-bold text-xs uppercase rounded-full hover:bg-amber-400 transition-all border-0 cursor-pointer"
                      >
                        Ja, Code eingeben
                      </button>
                      <button
                        type="submit"
                        className="py-2 px-3 bg-purple-900 text-white font-bold text-xs uppercase rounded-full hover:bg-purple-800 transition-all border-0 cursor-pointer"
                      >
                        Nein, anfordern
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block text-xs font-bold uppercase text-amber-400 mb-1">Dein Invite-Code *</label>
                      <input
                        type="text"
                        value={regCode}
                        onChange={(e) => setRegInviteCode(e.target.value.toUpperCase())}
                        placeholder="Z.B. RIDER-ABC12"
                        required
                        className="w-full bg-slate-900 border border-amber-500/50 rounded-xl px-4 py-2.5 text-sm text-amber-300 font-mono tracking-wider uppercase focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold uppercase text-sm shadow-lg transition-all border-0 cursor-pointer"
                    >
                      Konto erstellen
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCodeInput(false)}
                      className="w-full py-2 text-xs text-slate-400 hover:text-white border-0 bg-transparent cursor-pointer"
                    >
                      ← Zurück zur Auswahl
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {forgotPassOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="max-w-md w-full rounded-2xl bg-slate-950 border border-amber-500/50 p-6 relative shadow-2xl text-center">
            <button
              onClick={onCloseForgotPass}
              className="absolute top-4 right-4 text-slate-400 hover:text-white border-0 bg-transparent cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <Key className="w-12 h-12 text-amber-400 mx-auto mb-2" />
            <h3 className="text-xl font-bold uppercase text-amber-400 mb-2">Passwort zurücksetzen</h3>
            <p className="text-xs text-slate-400 mb-4">
              Gib deinen Benutzernamen oder deine E-Mail-Adresse ein. Eine Zurücksetzungs-Anfrage wird direkt an die Admins übermittelt.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (forgotUser.trim()) {
                  onRequestPasswordReset(forgotUser.trim());
                  setForgotUser('');
                  onCloseForgotPass();
                }
              }}
              className="space-y-4"
            >
              <input
                type="text"
                value={forgotUser}
                onChange={(e) => setForgotUser(e.target.value)}
                placeholder="Username oder E-Mail"
                required
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-center text-sm text-white font-bold focus:outline-none focus:border-amber-500"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onCloseForgotPass}
                  className="flex-1 py-2.5 rounded-full border border-slate-700 text-slate-300 font-bold hover:bg-slate-900 transition-colors bg-transparent cursor-pointer text-xs uppercase"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-full bg-gradient-to-r from-purple-950 via-purple-800 to-amber-400 hover:from-purple-900 hover:to-amber-300 text-white font-extrabold uppercase text-xs shadow-lg transition-all border border-amber-400/40 cursor-pointer"
                >
                  Anfragen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Notifications Modal */}
      {userNotifsOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="max-w-lg w-full rounded-2xl bg-slate-950 border border-purple-800 p-6 relative shadow-2xl">
            <button
              onClick={onCloseUserNotifs}
              className="absolute top-4 right-4 text-slate-400 hover:text-white border-0 bg-transparent cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold uppercase tracking-wider text-amber-400 mb-1 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" /> Deine Benachrichtigungen
            </h3>
            <p className="text-xs text-slate-500 mb-4">Gelesene Mitteilungen verfallen nach 30 Tagen.</p>

            <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-1">
              {userNotifs.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-slate-700 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-400">Keine Benachrichtigungen</p>
                </div>
              ) : (
                userNotifs.map((n) => (
                  <div
                    key={n.id}
                    className={`p-4 rounded-xl border transition-all ${
                      n.is_read ? 'bg-slate-900/40 border-slate-800 text-slate-400' : 'bg-slate-900 border-amber-500/50 text-white'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <div className="text-xs font-bold" dangerouslySetInnerHTML={{ __html: n.message }} />
                      <span className="text-[10px] text-slate-500 whitespace-nowrap">
                        {new Date(n.created_at).toLocaleDateString('de-DE')}
                      </span>
                    </div>
                    {n.reason && (
                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs text-slate-300 mt-2">
                        <strong className="text-amber-400 block mb-1">Begründung:</strong>
                        {n.reason}
                      </div>
                    )}
                    {!n.is_read && (
                      <button
                        onClick={() => onMarkNotifRead(n.id)}
                        className="mt-3 text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-3 py-1 rounded-full font-bold border border-amber-500/30 transition-colors cursor-pointer"
                      >
                        Als gelesen markieren
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin Dashboard / Notifications Modal */}
      {adminNotifsOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="max-w-2xl w-full rounded-2xl bg-slate-950 border border-amber-500/50 p-6 relative shadow-2xl">
            <button
              onClick={onCloseAdminNotifs}
              className="absolute top-4 right-4 text-slate-400 hover:text-white border-0 bg-transparent cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold uppercase tracking-wider text-amber-400 mb-1 flex items-center gap-2">
              <Shield className="w-5 h-5" /> Admin Center - Offene Anfragen
            </h3>
            <p className="text-xs text-slate-500 mb-4">Verwalte Passwort-Resets, Invite-Anfragen und Namensänderungen.</p>

            <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-1">
              {/* Reset Requests */}
              {adminResetUsers.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase text-red-400 mb-2">Passwort-Reset Anfragen</h4>
                  <div className="space-y-2">
                    {adminResetUsers.map((u) => (
                      <div key={u.username} className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
                        <div>
                          <strong className="text-amber-400 block">{u.username}</strong>
                          <span className="text-xs text-slate-400">{u.email}</span>
                        </div>
                        <button
                          onClick={() => onResetPasswordAdmin(u.username)}
                          className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-3 py-1.5 rounded-full border-0 cursor-pointer"
                        >
                          Reset (1234)
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Invite Requests */}
              {adminInviteUsers.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase text-amber-400 mb-2">Invite-Anfragen</h4>
                  <div className="space-y-2">
                    {adminInviteUsers.map((u) => (
                      <div key={u.username} className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
                        <div>
                          <strong className="text-white block">{u.username}</strong>
                          <span className="text-xs text-slate-400">{u.email}</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => onApproveInvite(u.username)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-1.5 rounded-full border-0 cursor-pointer"
                          >
                            Freigeben
                          </button>
                          <button
                            onClick={() => onDismissInvite(u.username)}
                            className="bg-slate-800 hover:bg-red-900/60 text-slate-300 font-bold text-xs px-3 py-1.5 rounded-full border-0 cursor-pointer"
                          >
                            Ablehnen
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {adminResetUsers.length === 0 && adminInviteUsers.length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-emerald-500/50 mx-auto mb-2" />
                  <p className="text-sm font-bold text-emerald-400">Alles erledigt!</p>
                  <p className="text-xs text-slate-500">Es liegen keine offenen Anfragen vor.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* GPX Preview Modal */}
      {previewGpx && (
        <GpxPreviewMapContainer
          previewGpx={previewGpx}
          onClose={onCloseGpxPreview}
          onDownload={onDownloadGpx}
        />
      )}

      {/* Direct Chat Modal */}
      {directChatUser && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="max-w-xl w-full rounded-2xl bg-slate-950 border border-purple-800 p-6 relative shadow-2xl flex flex-col h-[70vh]">
            <button
              onClick={onCloseDirectChat}
              className="absolute top-4 right-4 text-slate-400 hover:text-white border-0 bg-transparent cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold uppercase text-purple-400 mb-4 flex items-center gap-2">
              💬 Direct Chat mit <span className="text-white">{directChatUser}</span>
            </h3>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto space-y-3 bg-slate-900/50 p-4 rounded-xl border border-slate-800 mb-4">
              {directMessages.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">Noch keine Nachrichten. Schreib die erste!</p>
              ) : (
                directMessages.map((m, idx) => {
                  const isMine = m.sender === currentUsername;
                  return (
                    <div key={idx} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                      <span className="text-[10px] text-slate-500 mb-0.5">{m.sender}</span>
                      <div className={`p-3 rounded-2xl max-w-[80%] text-xs leading-relaxed ${
                        isMine ? 'bg-amber-500 text-black rounded-tr-none font-semibold' : 'bg-slate-800 text-white rounded-tl-none'
                      }`}>
                        {m.message}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Chat Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (chatInput.trim()) {
                  onSendDirectMessage(chatInput.trim());
                  setChatInput('');
                }
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Nachricht schreiben..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl border-0 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Username Change Request Modal */}
      {usernameChangeOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="max-w-md w-full rounded-2xl bg-slate-950 border border-amber-500/50 p-6 relative shadow-2xl text-center">
            <button
              onClick={onCloseUsernameChange}
              className="absolute top-4 right-4 text-slate-400 hover:text-white border-0 bg-transparent cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold uppercase text-amber-400 mb-2">Namensänderung beantragen</h3>
            <p className="text-xs text-slate-400 mb-4">
              Gib deinen gewünschten neuen Benutzernamen ein. Ein Admin wird die Änderung prüfen.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newNameInput.trim()) {
                  onRequestUsernameChange(newNameInput.trim());
                  setNewNameInput('');
                  onCloseUsernameChange();
                }
              }}
              className="space-y-4"
            >
              <input
                type="text"
                value={newNameInput}
                onChange={(e) => setNewNameInput(e.target.value)}
                placeholder="Neuer Username"
                required
                minLength={3}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-center text-lg text-white font-bold focus:outline-none focus:border-amber-500"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onCloseUsernameChange}
                  className="flex-1 py-2.5 rounded-full border border-slate-700 text-slate-300 font-bold hover:bg-slate-900 transition-colors bg-transparent cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-bold uppercase text-sm shadow-lg transition-all border-0 cursor-pointer"
                >
                  Beantragen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
