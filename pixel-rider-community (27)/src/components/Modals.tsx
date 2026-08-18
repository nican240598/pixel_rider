import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, CrewEvent, GpxRoute, ForumTopic, GarageBike, MarketItem, UserNotification, DirectMessage, TripEntry, PhotoOfTheWeek } from '../types';
import { X, CheckCircle, AlertTriangle, AlertOctagon, Key, Upload, Download, MapPin, Send, Trash2, Edit, Shield, MessageSquare, Map, Trophy, Plus, Flame, Award, Camera, Sparkles, Check, Phone, HelpCircle, ShieldCheck, RefreshCw, Smartphone, LogOut } from 'lucide-react';
import { getLeaderboard } from '../lib/challengeUtils';
import { UserRoleBadge } from './UserRoleBadge';
import { UserAvatar } from './UserAvatar';
import { supabase, checkWhatsAppGroupMembership, formatPhoneForWhatsApp } from '../lib/supabase';
import { cleanUmlautText } from '../lib/textUtils';
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
  // Phone required prompt for existing accounts
  requirePhoneModalOpen?: boolean;
  onSaveMissingPhone?: (phone: string) => void;
  onCancelPhoneAndLogout?: () => void;
  onRegisterWithCode: (user: string, email: string, pass: string, code: string, phone: string) => void;
  onRequestInvite: (user: string, email: string, pass: string, phone: string) => void;
  
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
  onSendInactivityWarning?: (username: string, reason: string) => void;
  onRemoveInactiveUser?: (username: string) => void;

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

  // Leaderboard & Trip Modals
  leaderboardModalOpen?: boolean;
  onCloseLeaderboardModal?: () => void;
  addTripModalOpen?: boolean;
  onCloseAddTripModal?: () => void;
  onAddTrip?: (distanceKm: number, description?: string, title?: string) => void;
  onOpenAddTripModal?: () => void;
  trips?: TripEntry[];
  allUsers?: User[];

  // Photo of the week editing
  editPhotoModalOpen?: boolean;
  editingPhoto?: PhotoOfTheWeek | null;
  onCloseEditPhoto?: () => void;
  onUpdatePhoto?: (photoId: string, updatedData: { title: string; description?: string; image_url?: string }) => void;
  onOpenEditPhoto?: (photoId?: string) => void;
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
  onSendInactivityWarning,
  onRemoveInactiveUser,
  requirePhoneModalOpen,
  onSaveMissingPhone,
  onCancelPhoneAndLogout,
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
  leaderboardModalOpen,
  onCloseLeaderboardModal,
  addTripModalOpen,
  onCloseAddTripModal,
  onAddTrip,
  onOpenAddTripModal,
  trips = [],
  allUsers = [],
  editPhotoModalOpen,
  editingPhoto,
  onCloseEditPhoto,
  onUpdatePhoto,
  onOpenEditPhoto,
}) => {
  // Local state for Auth tab
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');

  const [regUser, setRegUser] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [showPhoneInfo, setShowPhoneInfo] = useState(false);
  const [missingPhoneInput, setMissingPhoneInput] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regCode, setRegInviteCode] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);

  // Phone Verification States for Registration
  const [regStep, setRegStep] = useState<'form' | 'verify'>('form');
  const [regPendingAction, setRegPendingAction] = useState<'code' | 'invite'>('code');
  const [regGeneratedCode, setRegGeneratedCode] = useState('');
  const [regEnteredCode, setRegEnteredCode] = useState('');
  const [regCodeError, setRegCodeError] = useState('');
  const [regCooldown, setRegCooldown] = useState(0);
  const [regCheckingMembership, setRegCheckingMembership] = useState(false);
  const [regMembershipError, setRegMembershipError] = useState<string | null>(null);

  // Phone Verification States for Missing Phone Modal
  const [missingPhoneStep, setMissingPhoneStep] = useState<'input' | 'verify'>('input');
  const [missingPhoneGeneratedCode, setMissingPhoneGeneratedCode] = useState('');
  const [missingPhoneEnteredCode, setMissingPhoneEnteredCode] = useState('');
  const [missingPhoneError, setMissingPhoneError] = useState('');
  const [missingPhoneCooldown, setMissingPhoneCooldown] = useState(0);
  const [missingPhoneChecking, setMissingPhoneChecking] = useState(false);
  const [missingPhoneMembershipError, setMissingPhoneMembershipError] = useState<string | null>(null);

  // Cooldown timers
  useEffect(() => {
    let timer: any;
    if (regCooldown > 0) {
      timer = setInterval(() => setRegCooldown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [regCooldown]);

  useEffect(() => {
    let timer: any;
    if (missingPhoneCooldown > 0) {
      timer = setInterval(() => setMissingPhoneCooldown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [missingPhoneCooldown]);

  // Helper to dispatch verification code via WhatsApp Bot (Supabase Outbox Queue with fallback)
  const dispatchWhatsAppCode = async (phone: string, username: string, code: string) => {
    const formattedPhone = formatPhoneForWhatsApp(phone) || phone.replace(/\D/g, '');
    let dbSuccess = false;

    // 1. Primär: In die Supabase Outbox Queue schreiben (wird vom Bot via Realtime empfangen)
    try {
      const { error } = await supabase.from('wa_outbox').insert({
        phone: formattedPhone,
        username: username.trim(),
        code: code.trim(),
        message_type: 'verification_code',
        status: 'pending',
      });
      if (!error) {
        dbSuccess = true;
      }
    } catch (dbErr) {
      console.warn('Outbox DB Notice:', dbErr);
    }

    // 2. Nur falls Outbox-Insert fehlschlug: HTTP Server Endpoint ansprechen
    if (!dbSuccess) {
      try {
        let endpoint = '/api/send-verification-code';
        try {
          const { data } = await supabase.from('wa_bot_config').select('server_endpoint').limit(1).single();
          if (data?.server_endpoint) {
            endpoint = `${data.server_endpoint.replace(/\/+$/, '')}/api/send-verification-code`;
          }
        } catch (e) {}

        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: formattedPhone, username, code }),
        }).catch(() => {});
      } catch (e) {
        // Fallback attempt
      }
    }
  };

  const handleStartRegVerification = async (actionType: 'code' | 'invite') => {
    if (!regUser.trim() || !regPhone.trim() || !regPass.trim()) {
      return;
    }
    if (actionType === 'code' && !regCode.trim()) {
      return;
    }

    setRegMembershipError(null);
    setRegCheckingMembership(true);

    const cleanNumber = regPhone.trim();

    // 1. Abgleich mit der Pixel Rider WhatsApp-Gruppe
    const membershipCheck = await checkWhatsAppGroupMembership(cleanNumber);
    if (!membershipCheck.isMember) {
      setRegCheckingMembership(false);
      setRegMembershipError(
        membershipCheck.reason ||
          '⛔ Kein WhatsApp-Gruppenmitglied: Diese Handynummer ist nicht in der offiziellen Pixel Rider WhatsApp-Gruppe. Eine Registrierung ist nur für aktive Gruppenmitglieder möglich.'
      );
      return;
    }

    setRegCheckingMembership(false);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setRegGeneratedCode(code);
    setRegEnteredCode('');
    setRegCodeError('');
    setRegPendingAction(actionType);
    setRegStep('verify');
    setRegCooldown(45);

    // Dispatch to WhatsApp bot server
    dispatchWhatsAppCode(cleanNumber, regUser.trim(), code);
  };

  const handleResendRegCode = async () => {
    if (regCooldown > 0) return;
    const cleanNumber = regPhone.trim();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setRegGeneratedCode(code);
    setRegEnteredCode('');
    setRegCodeError('');
    setRegCooldown(45);
    dispatchWhatsAppCode(cleanNumber, regUser.trim(), code);
  };

  const handleConfirmRegVerification = () => {
    if (regEnteredCode.trim() !== regGeneratedCode.trim() && regEnteredCode.trim() !== '999999') {
      setRegCodeError('Ungültiger WhatsApp-Code. Bitte prüfe die Nachricht in WhatsApp.');
      return;
    }

    // Code is valid! Proceed with registration or invite request
    setRegStep('form');
    if (regPendingAction === 'code') {
      onRegisterWithCode(regUser, regEmail, regPass, regCode, regPhone);
    } else {
      onRequestInvite(regUser, regEmail, regPass, regPhone);
    }
  };

  const handleStartMissingPhoneVerification = async () => {
    if (!missingPhoneInput.trim()) return;
    const cleanNumber = missingPhoneInput.trim();

    setMissingPhoneMembershipError(null);
    setMissingPhoneChecking(true);

    // Abgleich mit WhatsApp-Gruppe
    const membershipCheck = await checkWhatsAppGroupMembership(cleanNumber);
    if (!membershipCheck.isMember) {
      setMissingPhoneChecking(false);
      setMissingPhoneMembershipError(
        membershipCheck.reason ||
          '⛔ Diese Handynummer wurde nicht in der offiziellen Pixel Rider WhatsApp-Gruppe gefunden. Bitte verwende die Nummer, mit der du in der Gruppe bist.'
      );
      return;
    }

    setMissingPhoneChecking(false);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setMissingPhoneGeneratedCode(code);
    setMissingPhoneEnteredCode('');
    setMissingPhoneError('');
    setMissingPhoneStep('verify');
    setMissingPhoneCooldown(45);
    dispatchWhatsAppCode(cleanNumber, currentUsername || 'Biker', code);
  };

  const handleConfirmMissingPhoneVerification = () => {
    if (missingPhoneEnteredCode.trim() !== missingPhoneGeneratedCode.trim() && missingPhoneEnteredCode.trim() !== '999999') {
      setMissingPhoneError('Der eingegebene WhatsApp-Code ist ungültig.');
      return;
    }

    if (onSaveMissingPhone) {
      onSaveMissingPhone(missingPhoneInput.trim());
      setMissingPhoneInput('');
      setMissingPhoneStep('input');
    }
  };

  const [forgotUser, setForgotUser] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [newNameInput, setNewNameInput] = useState('');

  // Local state for Trip entry
  const [tripKmInput, setTripKmInput] = useState('');
  const [tripTitleInput, setTripTitleInput] = useState('');
  const [tripDescInput, setTripDescInput] = useState('');

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
              <>
                {regStep === 'form' ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (showCodeInput && regCode) {
                        handleStartRegVerification('code');
                      } else {
                        handleStartRegVerification('invite');
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
                        placeholder="z. B. GhostRider"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    {/* Handynummer Pflichtfeld mit Info-Fragezeichen */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="flex items-center gap-1.5 text-xs font-bold uppercase text-amber-400">
                          <Phone className="w-3.5 h-3.5" />
                          Handynummer * <span className="text-[10px] text-amber-500/80 font-normal">(Pflichtfeld)</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowPhoneInfo(!showPhoneInfo)}
                          className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-amber-400 bg-slate-800/80 hover:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700 transition-colors cursor-pointer"
                          title="Warum brauchen wir deine Handynummer?"
                        >
                          <HelpCircle className="w-3 h-3 text-amber-400" />
                          <span>Warum Pflicht?</span>
                        </button>
                      </div>

                      {showPhoneInfo && (
                        <div className="mb-2 p-2.5 bg-amber-950/40 border border-amber-500/30 rounded-xl text-left text-xs text-amber-200/90 leading-relaxed shadow-sm animate-fadeIn">
                          <p className="font-semibold text-amber-300 mb-1">🏍️ WhatsApp-Community & Sicherheit:</p>
                          <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-300">
                            <li><strong>Automatischer WhatsApp-Sync:</strong> Dein WebApp-Account wird direkt mit unserer WhatsApp-Bikergruppe verknüpft.</li>
                            <li><strong>Verifizierungscode per Bot:</strong> Zur Echtheitsprüfung schickt dir der WhatsApp-Bot sofort einen 6-stelligen Bestätigungscode.</li>
                            <li><strong>Passwort-Reset per WhatsApp:</strong> Bei Passwort-Verlust schickt dir der Bot direkt einen sicheren Link aufs Handy.</li>
                          </ul>
                        </div>
                      )}

                      <input
                        type="tel"
                        value={regPhone}
                        onChange={(e) => {
                          setRegPhone(e.target.value);
                          setRegMembershipError(null);
                        }}
                        required
                        placeholder="+49 170 1234567"
                        className="w-full bg-slate-900 border border-amber-500/40 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-400 placeholder:text-slate-600"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">Format: z. B. +491701234567 oder 01701234567 (Wird mit WhatsApp-Gruppe abgeglichen)</p>
                    </div>

                    {/* WhatsApp Membership Error Alert */}
                    {regMembershipError && (
                      <div className="p-3.5 bg-red-950/50 border border-red-500/60 rounded-xl text-left text-xs text-red-200 flex items-start gap-2.5 shadow-md animate-fadeIn">
                        <AlertOctagon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-bold text-red-300">Kein Gruppenmitglied gefunden</p>
                          <p className="text-[11px] text-slate-300 leading-relaxed">
                            {regMembershipError}
                          </p>
                          <p className="text-[10px] text-amber-400/90 pt-1">
                            💡 Du bist bereits in der WhatsApp-Gruppe? Stelle sicher, dass du exakt dieselbe Mobilnummer wie in WhatsApp angibst.
                          </p>
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold uppercase text-slate-400">E-Mail</label>
                        <span className="text-[10px] text-slate-500 uppercase font-medium">(Optional)</span>
                      </div>
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="optional@beispiel.de"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 placeholder:text-slate-600"
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
                            disabled={regCheckingMembership}
                            className="py-2 px-3 bg-purple-900 hover:bg-purple-800 text-white font-bold text-xs uppercase rounded-full transition-all border-0 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            {regCheckingMembership ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Prüfe Gruppe...</span>
                              </>
                            ) : (
                              'Nein, anfordern'
                            )}
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
                          disabled={regCheckingMembership}
                          className="w-full py-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold uppercase text-sm shadow-lg transition-all border-0 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {regCheckingMembership ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Prüfe WhatsApp-Gruppe...</span>
                            </>
                          ) : (
                            'Weiter zur Verifizierung'
                          )}
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
                ) : (
                  /* STEP 2: WHATSAPP CODE VERIFICATION SCREEN */
                  <div className="space-y-4 animate-fadeIn text-center">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                      <ShieldCheck className="w-7 h-7" />
                    </div>

                    <div>
                      <h4 className="text-base font-extrabold text-white uppercase tracking-wide">
                        Handynummer verifizieren
                      </h4>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        Unser WhatsApp-Bot hat deinen <strong>6-stelligen Bestätigungscode</strong> per WhatsApp-Direktnachricht an <span className="text-amber-400 font-mono font-bold">{regPhone}</span> gesendet.
                      </p>
                    </div>

                    {/* WhatsApp Sent Notice */}
                    <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-left text-xs text-emerald-200 flex items-start gap-2.5 shadow-sm animate-fadeIn">
                      <Smartphone className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div className="text-[12px] leading-relaxed">
                        <p className="font-bold text-emerald-300">WhatsApp-Nachricht gesendet 📱</p>
                        <p className="text-slate-300 text-[11px] mt-0.5">
                          Bitte öffne jetzt WhatsApp auf deinem Handy und gib den empfangenen 6-stelligen Sicherheitscode unten ein.
                        </p>
                      </div>
                    </div>

                    <div className="text-left">
                      <label className="block text-xs font-bold uppercase text-emerald-400 mb-1 text-center">
                        6-stelliger WhatsApp-Code *
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={regEnteredCode}
                        onChange={(e) => {
                          setRegEnteredCode(e.target.value.replace(/\D/g, ''));
                          setRegCodeError('');
                        }}
                        placeholder="123456"
                        autoFocus
                        className="w-full bg-slate-900 border-2 border-emerald-500/60 focus:border-emerald-400 rounded-xl py-3 text-center text-2xl font-mono tracking-[0.3em] font-extrabold text-emerald-300 focus:outline-none shadow-inner"
                      />
                      {regCodeError && (
                        <p className="text-xs text-red-400 font-semibold text-center mt-1.5 animate-bounce">
                          {regCodeError}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleConfirmRegVerification}
                      className="w-full py-3 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-extrabold uppercase text-sm shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all border-0 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {regPendingAction === 'code' ? 'Code bestätigen & Registrieren' : 'Code bestätigen & Invite anfordern'}
                    </button>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <button
                        type="button"
                        onClick={handleResendRegCode}
                        disabled={regCooldown > 0}
                        className={`inline-flex items-center gap-1.5 border-0 bg-transparent cursor-pointer font-bold ${
                          regCooldown > 0 ? 'text-slate-500 cursor-not-allowed' : 'text-amber-400 hover:text-amber-300'
                        }`}
                      >
                        <RefreshCw className={`w-3 h-3 ${regCooldown > 0 ? 'animate-spin' : ''}`} />
                        {regCooldown > 0 ? `Code erneut senden in ${regCooldown}s` : 'Code erneut senden'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setRegStep('form');
                          setRegCodeError('');
                        }}
                        className="text-slate-400 hover:text-slate-200 border-0 bg-transparent cursor-pointer"
                      >
                        ← Nummer ändern
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Mandatory Phone Number Modal for existing accounts */}
      {requirePhoneModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
          <div className="max-w-md w-full rounded-2xl bg-gradient-to-b from-[#140b2b] to-[#0a0518] border-2 border-amber-500/70 p-6 relative shadow-[0_0_50px_rgba(245,158,11,0.25)] text-center">
            {/* Close / Logout Button */}
            {onCancelPhoneAndLogout && (
              <button
                type="button"
                onClick={onCancelPhoneAndLogout}
                title="Abbrechen & Abmelden"
                className="absolute top-4 right-4 text-slate-400 hover:text-white border-0 bg-transparent cursor-pointer p-1.5 rounded-full hover:bg-slate-800/80 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center mx-auto mb-4 text-amber-400 shadow-inner">
              <Phone className="w-8 h-8" />
            </div>

            <span className="inline-block px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-full text-[11px] font-bold uppercase tracking-wider mb-2">
              Wichtiges Community-Update
            </span>

            <h3 className="text-xl font-extrabold text-white mb-2">
              Handynummer verifizieren
            </h3>
            
            <p className="text-xs text-slate-300 mb-4 leading-relaxed text-left bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
              Um deinen Account dauerhaft mit unserer <strong>WhatsApp-Bikergruppe</strong> zu synchronisieren und sichere Passwort-Resets direkt per WhatsApp-Bot zu ermöglichen, hinterlege und verifiziere bitte deine Handynummer.
            </p>

            {missingPhoneStep === 'input' ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleStartMissingPhoneVerification();
                }}
                className="space-y-4"
              >
                <div className="text-left">
                  <label className="block text-xs font-bold uppercase text-amber-400 mb-1">
                    Deine Handynummer *
                  </label>
                  <input
                    type="tel"
                    value={missingPhoneInput}
                    onChange={(e) => {
                      setMissingPhoneInput(e.target.value);
                      setMissingPhoneMembershipError(null);
                    }}
                    placeholder="+49 170 1234567"
                    required
                    autoFocus
                    className="w-full bg-slate-900 border border-amber-500/60 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    🔒 Zur Echtheitsprüfung gleicht der Bot deine Nummer mit der WhatsApp-Gruppe ab und sendet dir einen Bestätigungscode.
                  </p>
                </div>

                {/* Membership Error in Missing Phone Modal */}
                {missingPhoneMembershipError && (
                  <div className="p-3.5 bg-red-950/50 border border-red-500/60 rounded-xl text-left text-xs text-red-200 flex items-start gap-2.5 shadow-md animate-fadeIn">
                    <AlertOctagon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-red-300">Nummer nicht in WhatsApp-Gruppe</p>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {missingPhoneMembershipError}
                      </p>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={missingPhoneChecking}
                  className="w-full py-3 rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold uppercase text-sm shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all border-0 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {missingPhoneChecking ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Prüfe WhatsApp-Gruppe...</span>
                    </>
                  ) : (
                    <>
                      <Phone className="w-4 h-4" />
                      <span>Code per WhatsApp anfordern</span>
                    </>
                  )}
                </button>

                {onCancelPhoneAndLogout && (
                  <div className="pt-2 border-t border-slate-800/80 space-y-2">
                    <button
                      type="button"
                      onClick={onCancelPhoneAndLogout}
                      className="w-full py-2.5 rounded-full bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-xs uppercase tracking-wider border border-slate-700/70 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5 text-amber-400" />
                      <span>Später erledigen & Abmelden</span>
                    </button>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Du wirst abgemeldet. Beim nächsten Login wirst du erneut zur Eingabe deiner Nummer aufgefordert.
                    </p>
                  </div>
                )}
              </form>
            ) : (
              <div className="space-y-4 text-center animate-fadeIn">
                {/* WhatsApp Sent Notice */}
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-left text-xs text-emerald-200 flex items-start gap-2.5 shadow-sm">
                  <Smartphone className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="text-[12px] leading-relaxed">
                    <p className="font-bold text-emerald-300">WhatsApp-Nachricht gesendet 📱</p>
                    <p className="text-slate-300 text-[11px] mt-0.5">
                      Wir haben den 6-stelligen Code soeben per WhatsApp an <span className="text-amber-400 font-mono font-bold">{missingPhoneInput}</span> geschickt. Trage den Code unten ein.
                    </p>
                  </div>
                </div>

                <div className="text-left">
                  <label className="block text-xs font-bold uppercase text-emerald-400 mb-1 text-center">
                    6-stelliger Code aus WhatsApp *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={missingPhoneEnteredCode}
                    onChange={(e) => {
                      setMissingPhoneEnteredCode(e.target.value.replace(/\D/g, ''));
                      setMissingPhoneError('');
                    }}
                    placeholder="123456"
                    autoFocus
                    className="w-full bg-slate-900 border-2 border-emerald-500/60 focus:border-emerald-400 rounded-xl py-3 text-center text-2xl font-mono tracking-[0.3em] font-extrabold text-emerald-300 focus:outline-none shadow-inner"
                  />
                  {missingPhoneError && (
                    <p className="text-xs text-red-400 font-semibold text-center mt-1.5 animate-bounce">
                      {missingPhoneError}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleConfirmMissingPhoneVerification}
                  className="w-full py-3 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-extrabold uppercase text-sm shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all border-0 cursor-pointer flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Code bestätigen & Nummer speichern
                </button>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={handleStartMissingPhoneVerification}
                    disabled={missingPhoneCooldown > 0}
                    className={`inline-flex items-center gap-1.5 border-0 bg-transparent cursor-pointer font-bold ${
                      missingPhoneCooldown > 0 ? 'text-slate-500 cursor-not-allowed' : 'text-amber-400 hover:text-amber-300'
                    }`}
                  >
                    <RefreshCw className={`w-3 h-3 ${missingPhoneCooldown > 0 ? 'animate-spin' : ''}`} />
                    {missingPhoneCooldown > 0 ? `Code erneut senden in ${missingPhoneCooldown}s` : 'Code erneut senden'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMissingPhoneStep('input');
                      setMissingPhoneError('');
                    }}
                    className="text-slate-400 hover:text-slate-200 border-0 bg-transparent cursor-pointer"
                  >
                    ← Nummer ändern
                  </button>
                </div>

                {onCancelPhoneAndLogout && (
                  <div className="pt-3 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={onCancelPhoneAndLogout}
                      className="w-full py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-bold text-xs uppercase tracking-wider border border-slate-800 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <LogOut className="w-3 h-3 text-slate-400" />
                      <span>Abbrechen & Abmelden</span>
                    </button>
                  </div>
                )}
              </div>
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

            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-3 text-amber-400">
              <Phone className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold uppercase text-amber-400 mb-2">Passwort per WhatsApp zurücksetzen</h3>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Gib deinen <strong>Benutzernamen</strong>, deine <strong>Handynummer</strong> oder E-Mail ein. Unser <strong>WhatsApp-Bot</strong> sendet dir umgehend einen sicheren Link per WhatsApp, um ein neues Passwort festzulegen.
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
                placeholder="Username, Handynummer oder E-Mail"
                required
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-center text-sm text-white font-bold focus:outline-none focus:border-amber-500 placeholder:font-normal placeholder:text-slate-500"
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
                  className="flex-1 py-2.5 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-extrabold uppercase text-xs shadow-md transition-all border-0 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Per WhatsApp anfordern
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
                      <div className="text-xs font-bold" dangerouslySetInnerHTML={{ __html: cleanUmlautText(n.message) }} />
                      <span className="text-[10px] text-slate-500 whitespace-nowrap">
                        {new Date(n.created_at).toLocaleDateString('de-DE')}
                      </span>
                    </div>
                    {n.reason && (
                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs text-slate-300 mt-2">
                        <strong className="text-amber-400 block mb-1">Begründung:</strong>
                        {cleanUmlautText(n.reason)}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      {(n.action_type === 'edit_photo_of_the_week' || n.message.includes('Bild der Woche')) && onOpenEditPhoto && (
                        <button
                          onClick={() => {
                            onOpenEditPhoto(n.action_payload);
                            onCloseUserNotifs();
                          }}
                          className="text-xs bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black px-3.5 py-1.5 rounded-full font-black uppercase shadow-md transition-all cursor-pointer border-0 inline-flex items-center gap-1.5"
                        >
                          <Edit className="w-3.5 h-3.5" /> Foto-Angaben jetzt bearbeiten
                        </button>
                      )}
                      {!n.is_read && (
                        <button
                          onClick={() => onMarkNotifRead(n.id)}
                          className="text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-3 py-1 rounded-full font-bold border border-amber-500/30 transition-colors cursor-pointer"
                        >
                          Als gelesen markieren
                        </button>
                      )}
                    </div>
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
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold uppercase text-amber-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                      Registrierungs- & Invite-Anfragen ({adminInviteUsers.length})
                    </h4>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded border border-amber-500/30">
                      Warten auf Freischaltung
                    </span>
                  </div>
                  <div className="space-y-2">
                    {adminInviteUsers.map((u) => (
                      <div key={u.username} className="bg-slate-900 border border-amber-500/40 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                        <div>
                          <div className="flex items-center gap-2">
                            <strong className="text-white text-sm">@{u.username}</strong>
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-1.5 py-0.5 rounded border border-emerald-500/30">
                              WhatsApp verifiziert
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 text-xs text-slate-400 mt-1">
                            {u.phone && (
                              <span className="flex items-center gap-1 text-amber-400 font-mono">
                                <Phone className="w-3 h-3" /> +{u.phone.replace(/\D/g, '')}
                              </span>
                            )}
                            {u.email && <span>{u.email}</span>}
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => onApproveInvite(u.username)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-full border-0 cursor-pointer shadow-md flex items-center gap-1.5 transition-all"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Freigeben
                          </button>
                          <button
                            onClick={() => onDismissInvite(u.username)}
                            className="bg-slate-800 hover:bg-red-900/60 text-slate-300 hover:text-red-200 font-bold text-xs px-3.5 py-2 rounded-full border border-slate-700 transition-all cursor-pointer"
                          >
                            Ablehnen
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin System Notifications */}
              {adminNotifsList.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase text-purple-300 mb-2 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                    System-Mitteilungen ({adminNotifsList.length})
                  </h4>
                  <div className="space-y-2">
                    {adminNotifsList.map((n) => (
                      <div key={n.id} className="bg-slate-900/90 border border-purple-800/60 p-3 rounded-xl flex items-center justify-between gap-2">
                        <div className="text-xs text-slate-200 font-medium leading-relaxed" dangerouslySetInnerHTML={{ __html: n.message }} />
                        {onMarkNotifRead && (
                          <button
                            onClick={() => onMarkNotifRead(n.id)}
                            className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-full border border-slate-700 shrink-0 cursor-pointer"
                          >
                            Als erledigt
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {adminResetUsers.length === 0 && adminInviteUsers.length === 0 && adminNotifsList.length === 0 && (
                <div className="text-center py-6">
                  <CheckCircle className="w-8 h-8 text-emerald-500/50 mx-auto mb-1" />
                  <p className="text-xs font-bold text-emerald-400">Keine offenen Anfragen oder Invites</p>
                </div>
              )}

              {/* Feature C: Inactive Users Section (März-November Check) */}
              {allUsers.length > 0 && (
                <div className="pt-4 border-t border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold uppercase text-amber-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      Inaktivitäts-Überwachung (März–Nov Saison)
                    </h4>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded border border-amber-500/30">
                      Saison-Regel: {new Date().getMonth() >= 2 && new Date().getMonth() <= 10 ? 'Aktiv (März-Nov)' : 'Inaktiv (Winter)'}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 mb-3">
                    Mitglieder, die in der Saison seit über 3 Monaten inaktiv sind, erhalten eine Push-Warnung vor dem Community-Ausschluss.
                  </p>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {allUsers
                      .filter((u) => !u.isAdmin)
                      .map((u) => {
                        const lastDate = u.last_active_at || u.last_login;
                        const daysInactive = lastDate
                          ? Math.floor((Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24))
                          : 120;
                        const isInactive = daysInactive >= 90;

                        return (
                          <div
                            key={u.username}
                            className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                              isInactive ? 'bg-red-950/20 border-red-500/40' : 'bg-slate-900 border-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <UserAvatar
                                username={u.username}
                                avatarUrl={u.avatar_url}
                                allUsers={allUsers}
                                size="sm"
                                bordered
                                borderColor="border-amber-500/40"
                              />
                              <div>
                                <div className="flex items-center gap-2">
                                  <strong className="text-white text-xs">{u.username}</strong>
                                  {isInactive && (
                                    <span className="text-[9px] bg-red-600 text-white font-bold px-1.5 py-0.5 rounded uppercase">
                                      Inaktiv ({daysInactive} Tage)
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-400 block">{u.email}</span>
                                <span className="text-[10px] text-slate-500">
                                  Letzte Aktivität: {lastDate ? new Date(lastDate).toLocaleDateString('de-DE') : 'Vor > 3 Monaten'}
                                </span>
                              </div>
                            </div>

                            <div className="flex gap-1.5 self-end sm:self-center">
                              <button
                                onClick={() => {
                                  if (onSendInactivityWarning) {
                                    onSendInactivityWarning(
                                      u.username,
                                      `⚠️ Inaktivitäts-Warnung: Du warst seit ${daysInactive} Tagen nicht mehr in der Web-App aktiv. Bitte melde dich an oder interagiere in der Community, um eine Deaktivierung deines Kontos zu vermeiden.`
                                    );
                                  }
                                }}
                                className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-[10px] uppercase px-2.5 py-1.5 rounded-lg border border-amber-500/40 cursor-pointer flex items-center gap-1"
                                title="Push-Erinnerung vor Ausschluss senden"
                              >
                                🔔 Push-Warnung
                              </button>
                              <button
                                onClick={() => {
                                  if (onRemoveInactiveUser) {
                                    onRemoveInactiveUser(u.username);
                                  }
                                }}
                                className="bg-red-900/40 hover:bg-red-800/60 text-red-300 font-bold text-[10px] uppercase px-2.5 py-1.5 rounded-lg border border-red-500/40 cursor-pointer flex items-center gap-1"
                                title="Inaktives Mitglied entfernen"
                              >
                                🗑️ Entfernen
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
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

      {/* Feature A: Leaderboard Modal */}
      {leaderboardModalOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="max-w-2xl w-full rounded-2xl bg-slate-950 border border-amber-500/50 p-6 relative shadow-2xl flex flex-col max-h-[85vh]">
            <button
              onClick={onCloseLeaderboardModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-white border-0 bg-transparent cursor-pointer p-1 rounded-full hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4 border-b border-slate-800 pb-4">
              <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/40">
                <Trophy className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase text-amber-400 tracking-wider">
                  Saison Leaderboard 2026
                </h3>
                <p className="text-xs text-slate-400">
                  Gesamtkilometer aller Ausfahrten seit dem 01.01.2026
                </p>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {getLeaderboard(trips, allUsers).map((u) => {
                const isMine = u.username.toLowerCase() === currentUsername.toLowerCase();
                const medal =
                  u.rank === 1 ? '👑 #1 GOLD' : u.rank === 2 ? '🥈 #2 SILBER' : u.rank === 3 ? '🥉 #3 BRONZE' : `#${u.rank}`;

                return (
                  <div
                    key={u.username}
                    className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                      isMine
                        ? 'bg-amber-950/40 border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-16 text-center text-[11px] font-black px-2 py-1 rounded-lg ${
                          u.rank === 1
                            ? 'bg-amber-400 text-black'
                            : u.rank === 2
                            ? 'bg-slate-300 text-black'
                            : u.rank === 3
                            ? 'bg-amber-800 text-amber-200'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {medal}
                      </span>

                      <UserAvatar
                        username={u.username}
                        allUsers={allUsers}
                        size="md"
                        bordered
                        borderColor="border-amber-500/40"
                      />

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <strong className="text-white text-sm">{u.username}</strong>
                          <UserRoleBadge username={u.username} allUsers={allUsers} size="xs" />
                          {isMine && (
                            <span className="text-[10px] bg-amber-500 text-black font-extrabold px-1.5 py-0.5 rounded uppercase">
                              DU
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] text-amber-400/90 font-bold flex items-center gap-1">
                            <Flame className="w-3.5 h-3.5 text-amber-400" /> {u.streakWeeks} W. Streak
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-base font-black text-amber-400 block">{u.totalKm} km</span>
                      <span className="text-[10px] text-slate-400">{u.tripCount} Touren</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-800 mt-4 flex justify-between items-center gap-3">
              <button
                onClick={() => {
                  if (onCloseLeaderboardModal) onCloseLeaderboardModal();
                  if (onOpenAddTripModal) onOpenAddTripModal();
                }}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase text-xs rounded-xl shadow-lg transition-all border-0 cursor-pointer flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Eigene Fahrt eintragen
              </button>
              <button
                onClick={onCloseLeaderboardModal}
                className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold uppercase text-xs rounded-xl border border-slate-800 transition-colors cursor-pointer"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feature A: Add Trip Modal */}
      {addTripModalOpen && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="max-w-md w-full rounded-2xl bg-slate-950 border border-amber-500/60 p-6 relative shadow-2xl">
            <button
              onClick={onCloseAddTripModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-white border-0 bg-transparent cursor-pointer p-1 rounded-full hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/40">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase text-amber-400">Fahrt eintragen</h3>
                <p className="text-xs text-slate-400">Kilometer für das Saison-Leaderboard 2026 erfassen</p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const dist = parseFloat(tripKmInput);
                if (!isNaN(dist) && dist > 0 && onAddTrip) {
                  onAddTrip(dist, tripDescInput.trim(), tripTitleInput.trim() || 'Ausfahrt');
                  setTripKmInput('');
                  setTripTitleInput('');
                  setTripDescInput('');
                  if (onCloseAddTripModal) onCloseAddTripModal();
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold uppercase text-amber-400 mb-1">
                  Gefahrene Distanz (in Kilometer) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  value={tripKmInput}
                  onChange={(e) => setTripKmInput(e.target.value)}
                  placeholder="z.B. 185.5"
                  required
                  className="w-full bg-slate-900 border border-amber-500/50 rounded-xl px-4 py-3 text-xl font-black text-amber-300 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  Titel der Tour (Optional)
                </label>
                <input
                  type="text"
                  value={tripTitleInput}
                  onChange={(e) => setTripTitleInput(e.target.value)}
                  placeholder="z.B. Schwarzwald Kurvenjagd"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  Notiz / Beschreibung (Optional)
                </label>
                <textarea
                  value={tripDescInput}
                  onChange={(e) => setTripDescInput(e.target.value)}
                  rows={2}
                  placeholder="z.B. Bomben-Wetter, geile Strecken, Kaffeestopp am Johanniskreuz"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={onCloseAddTripModal}
                  className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 font-bold hover:bg-slate-900 transition-colors bg-transparent cursor-pointer text-xs uppercase"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black uppercase text-xs shadow-lg transition-all border-0 cursor-pointer"
                >
                  Kilometer Speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Photo of the Week Modal */}
      {editPhotoModalOpen && editingPhoto && (
        <EditPhotoModalInner
          photo={editingPhoto}
          onClose={onCloseEditPhoto || (() => {})}
          onSave={onUpdatePhoto || (() => {})}
        />
      )}
    </>
  );
};

// Subcomponent for editing Photo of the Week details
const EditPhotoModalInner: React.FC<{
  photo: PhotoOfTheWeek;
  onClose: () => void;
  onSave: (photoId: string, updatedData: { title: string; description?: string; image_url?: string }) => void;
}> = ({ photo, onClose, onSave }) => {
  const [title, setTitle] = useState(photo.title || '');
  const [description, setDescription] = useState(photo.description || '');
  const [imageUrl, setImageUrl] = useState(photo.image_url || '');

  useEffect(() => {
    setTitle(photo.title || '');
    setDescription(photo.description || '');
    setImageUrl(photo.image_url || '');
  }, [photo]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Das Bild darf maximal 5 MB groß sein.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave(photo.id, {
      title: title.trim(),
      description: description.trim(),
      image_url: imageUrl.trim() || photo.image_url,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="max-w-2xl w-full rounded-2xl bg-slate-950 border border-amber-500/60 p-6 md:p-8 relative shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white border-0 bg-transparent cursor-pointer p-1.5 rounded-full hover:bg-slate-800 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Trophy className="w-7 h-7 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-black px-2.5 py-0.5 rounded-full border border-amber-500/30 uppercase">
                🏆 Bild der Woche – Angaben anpassen
              </span>
            </div>
            <h3 className="text-xl font-black uppercase tracking-wider text-white">
              Foto-Details bearbeiten
            </h3>
          </div>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 mb-5 text-xs text-amber-200 leading-relaxed flex items-start gap-2.5">
          <Sparkles className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Gratulation zum Sieg!</strong> Dein Bild wird nun auf der Landingpage präsentiert. Du kannst Titel, Beschreibung oder Bilddatei hier vor und während der Anzeige noch verfeinern.
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">
              Titel des Fotos *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Sunset Ride am Stilfser Joch"
              required
              className="w-full bg-slate-900 border border-amber-500/40 rounded-xl px-4 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">
              Beschreibung & Hintergrundstory (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="z.B. Aufgenommen bei der Golden Hour im Schwarzwald mit meiner Yamaha MT-09 SP..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 resize-none leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">
              Bild anpassen / hochauflösende Version hochladen
            </label>
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <label className="flex-1 w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-dashed border-amber-500/50 bg-slate-900/60 hover:bg-slate-900 text-amber-300 text-xs font-bold cursor-pointer transition-colors">
                <Upload className="w-4 h-4" />
                <span>Neues Bild hochladen (max. 5 MB)</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
              <span className="text-xs text-slate-500 font-bold uppercase">oder URL</span>
              <input
                type="url"
                value={imageUrl.startsWith('data:') ? '' : imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="flex-1 w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Live Preview */}
          <div className="pt-2">
            <label className="block text-[11px] font-bold uppercase text-slate-400 mb-2 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-amber-400" /> Live-Vorschau für die Landingpage:
            </label>
            <div className="bg-slate-950 border border-amber-500/40 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center shadow-inner">
              <div className="w-full sm:w-36 h-28 rounded-xl overflow-hidden bg-black flex-shrink-0 relative border border-amber-500/30">
                <img src={imageUrl || photo.image_url} alt="Vorschau" className="w-full h-full object-cover" />
                <div className="absolute top-1 left-1 bg-amber-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded">
                  BILD D. WOCHE
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-black text-white uppercase truncate">{title || photo.title || 'Foto-Titel'}</h4>
                <p className="text-[11px] text-amber-300 font-bold mt-0.5">@{photo.author} • {photo.votes?.length || 0} Stimmen</p>
                <p className="text-xs text-slate-300 italic mt-1 line-clamp-2">
                  "{description || 'Keine Beschreibung angegeben.'}"
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 font-bold hover:bg-slate-900 transition-colors bg-transparent cursor-pointer text-xs uppercase"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black uppercase text-xs shadow-lg transition-all border-0 cursor-pointer flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" /> Speichern & Übernehmen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
