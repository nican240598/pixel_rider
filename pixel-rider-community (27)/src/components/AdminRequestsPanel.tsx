import React, { useState, useEffect } from 'react';
import {
  User,
  MarketAppeal,
  FeedbackSuggestion,
  UserNotification,
  WAJoinRequest,
} from '../types';
import {
  ShieldAlert,
  UserCheck,
  UserX,
  KeyRound,
  Hammer,
  Smartphone,
  Lightbulb,
  Bell,
  Check,
  X,
  Send,
  Sparkles,
  Search,
  ExternalLink,
  MessageSquare,
  AlertCircle,
  Clock,
  RotateCw,
  PlusCircle,
  Database,
  Trash2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cleanUmlautText } from '../lib/textUtils';
import { CATEGORY_LABELS } from './FeedbackBoard';

interface AdminRequestsPanelProps {
  currentUser: User;
  users: User[];
  appeals: MarketAppeal[];
  feedbacks: FeedbackSuggestion[];
  adminInviteUsers?: User[];
  adminResetUsers?: User[];
  adminNotifsList?: UserNotification[];
  onApproveInvite?: (username: string) => void;
  onDismissInvite?: (username: string) => void;
  onResetPasswordAdmin?: (username: string) => void;
  onSendPasswordResetLinkWhatsApp?: (user: User) => void;
  onRejectPasswordReset?: (username: string) => void;
  onResolveAppeal?: (appealId: string, resolution: 'accept' | 'reject') => void;
  onUpdateFeedbackStatus?: (feedbackId: string, status: any, adminNotes?: string) => void;
  onDeleteFeedback?: (feedbackId: string, reason?: string) => void;
  onMarkAdminNotifRead?: (notifId: string) => void;
  onDeleteAdminNotif?: (notifId: string) => void;
  onShowAlert?: (title: string, message: string, type: 'success' | 'danger' | 'info') => void;
}

export const AdminRequestsPanel: React.FC<AdminRequestsPanelProps> = ({
  currentUser,
  users: initialUsers,
  appeals: initialAppeals,
  feedbacks: initialFeedbacks,
  adminInviteUsers: initialAdminInviteUsers = [],
  adminResetUsers: initialAdminResetUsers = [],
  adminNotifsList: initialAdminNotifsList = [],
  onApproveInvite,
  onDismissInvite,
  onResetPasswordAdmin,
  onSendPasswordResetLinkWhatsApp,
  onRejectPasswordReset,
  onResolveAppeal,
  onUpdateFeedbackStatus,
  onDeleteFeedback,
  onMarkAdminNotifRead,
  onDeleteAdminNotif,
  onShowAlert,
}) => {
  const [filterCategory, setFilterCategory] = useState<'all' | 'register' | 'reset' | 'appeal' | 'whatsapp' | 'feedback' | 'sysnotif'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Local active database states
  const [dbUsers, setDbUsers] = useState<User[]>(initialUsers);
  const [dbAppeals, setDbAppeals] = useState<MarketAppeal[]>(initialAppeals);
  const [dbFeedbacks, setDbFeedbacks] = useState<FeedbackSuggestion[]>(initialFeedbacks);
  const [dbNotifs, setDbNotifs] = useState<UserNotification[]>(initialAdminNotifsList);
  const [waRequests, setWaRequests] = useState<WAJoinRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingTest, setIsCreatingTest] = useState(false);

  // Sync props to state if props update
  useEffect(() => {
    if (initialUsers && initialUsers.length > 0) setDbUsers(initialUsers);
  }, [initialUsers]);

  useEffect(() => {
    if (initialAppeals) setDbAppeals(initialAppeals);
  }, [initialAppeals]);

  useEffect(() => {
    if (initialFeedbacks) setDbFeedbacks(initialFeedbacks);
  }, [initialFeedbacks]);

  useEffect(() => {
    if (initialAdminNotifsList) setDbNotifs(initialAdminNotifsList);
  }, [initialAdminNotifsList]);

  // Master Database Fetch Function
  const fetchAllDatabaseRequests = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Users
      const { data: usersData } = await supabase.from('users').select('*');
      if (usersData) {
        setDbUsers(usersData);
      }

      // 2. Fetch WhatsApp Join Requests
      const { data: waData } = await supabase
        .from('wa_join_requests')
        .select('*')
        .order('requested_at', { ascending: false });
      if (waData) {
        const parsed: WAJoinRequest[] = waData.map((r: any) => {
          let parsedAnswers = r.answers;
          if (typeof parsedAnswers === 'string') {
            try {
              parsedAnswers = JSON.parse(parsedAnswers);
            } catch (e) {
              parsedAnswers = [];
            }
          }
          return { ...r, answers: Array.isArray(parsedAnswers) ? parsedAnswers : [] };
        });
        setWaRequests(parsed);
      }

      // 3. Fetch Feedbacks
      const { data: fbData } = await supabase
        .from('feedback_suggestions')
        .select('*')
        .order('created_at', { ascending: false });
      if (fbData) {
        setDbFeedbacks(fbData);
      }

      // 4. Fetch System Notifications
      const { data: notifData } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('target_username', 'SYSTEM_ADMIN')
        .order('created_at', { ascending: false });
      if (notifData) {
        setDbNotifs(notifData);
      }

      // 5. Fetch Appeals (checking both table names for safety)
      try {
        const { data: appealData } = await supabase.from('market_appeals').select('*');
        if (appealData) setDbAppeals(appealData);
      } catch (e) {
        try {
          const { data: appealData2 } = await supabase.from('appeals').select('*');
          if (appealData2) setDbAppeals(appealData2);
        } catch (e2) {}
      }
    } catch (err) {
      console.warn('Database fetch notice in AdminRequestsPanel:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllDatabaseRequests();

    // Fast periodic polling fallback (every 2.5s) to guarantee real-time updates without manual reload
    const pollInterval = setInterval(() => {
      fetchAllDatabaseRequests();
    }, 2500);

    // Supabase Realtime Channels for Instant Sync
    const channel = supabase
      .channel('admin_requests_realtime_hub')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => fetchAllDatabaseRequests())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wa_join_requests' }, () => fetchAllDatabaseRequests())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feedback_suggestions' }, () => fetchAllDatabaseRequests())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_notifications' }, () => fetchAllDatabaseRequests())
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, []);

  // --- ACTIONS WITH INSTANT DATABASE PERSISTENCE ---

  // 1. Approve User Registration
  const handleApproveRegistration = async (username: string) => {
    try {
      setDbUsers((prev) =>
        prev.map((u) =>
          u.username.toLowerCase() === username.toLowerCase()
            ? { ...u, invite: 'APPROVED', is_deactivated: false, deactivated_reason: undefined }
            : u
        )
      );
      setDbNotifs((prev) => prev.filter((n) => !n.message.includes(username)));

      // Delete system admin notification
      try {
        await supabase.from('user_notifications').delete().eq('target_username', 'SYSTEM_ADMIN').ilike('message', `%${username}%`);
      } catch (e) {}

      const { error } = await supabase
        .from('users')
        .update({ invite: 'APPROVED', is_deactivated: false, deactivated_reason: null })
        .eq('username', username);
      if (error) throw error;

      onApproveInvite?.(username);
      onShowAlert?.('Registrierung Freigegeben ✅', `Der Account @${username} wurde erfolgreich in der Datenbank freigeschaltet.`, 'success');
      fetchAllDatabaseRequests();
    } catch (e: any) {
      onShowAlert?.('Fehler', e?.message || 'Konnte Registrierung in der Datenbank nicht freigeben.', 'danger');
    }
  };

  // 2. Dismiss / Reject User Registration
  const handleDismissRegistration = async (username: string) => {
    try {
      setDbUsers((prev) => prev.filter((u) => u.username.toLowerCase() !== username.toLowerCase()));
      setDbNotifs((prev) => prev.filter((n) => !n.message.includes(username)));

      try {
        await supabase.from('user_notifications').delete().eq('target_username', 'SYSTEM_ADMIN').ilike('message', `%${username}%`);
      } catch (e) {}

      const { error } = await supabase.from('users').delete().eq('username', username);
      if (error) throw error;

      onDismissInvite?.(username);
      onShowAlert?.('Registrierung Abgelehnt ❌', `Account @${username} wurde aus der Datenbank gelöscht.`, 'warning');
      fetchAllDatabaseRequests();
    } catch (e: any) {
      onShowAlert?.('Fehler', e?.message || 'Konnte Registrierung nicht ablehnen.', 'danger');
    }
  };

  // 3. Reset Password to 1234
  const handleResetPasswordStandard = async (username: string) => {
    try {
      setDbUsers((prev) =>
        prev.map((u) =>
          u.username.toLowerCase() === username.toLowerCase()
            ? { ...u, password: '1234', reset_requested: false }
            : u
        )
      );
      setDbNotifs((prev) => prev.filter((n) => !n.message.includes(username)));

      try {
        await supabase.from('user_notifications').delete().eq('target_username', 'SYSTEM_ADMIN').ilike('message', `%${username}%`);
      } catch (e) {}

      const { error } = await supabase
        .from('users')
        .update({ password: '1234', reset_requested: false })
        .eq('username', username);
      if (error) throw error;

      onResetPasswordAdmin?.(username);
      onShowAlert?.('Passwort Zurückgesetzt ✅', `Passwort für @${username} wurde in der Datenbank auf "1234" gesetzt.`, 'success');
      fetchAllDatabaseRequests();
    } catch (e: any) {
      onShowAlert?.('Fehler', e?.message || 'Konnte Passwort nicht zurücksetzen.', 'danger');
    }
  };

  // 4. Send WhatsApp Reset Link
  const handleSendWhatsAppResetLink = async (user: User) => {
    try {
      const token = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      const isLocalOrDev = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1');
      const baseDomain = isLocalOrDev ? window.location.origin : 'https://www.pixel-rider.de';
      const resetUrl = `${baseDomain}/#reset-pass-${token}`;
      const cleanPhone = (user.phone || '').replace(/\D/g, '');
      
      await supabase.from('wa_outbox').insert({
        phone: cleanPhone,
        username: user.username,
        message_type: 'password_reset',
        reset_url: resetUrl,
        status: 'pending',
      });

      onSendPasswordResetLinkWhatsApp?.(user);
      onShowAlert?.('WhatsApp-Link Versendet 🚀', `Reset-Link für @${user.username} an ${user.phone} via WhatsApp versandt. Sobald der Nutzer den Link nutzt, wird die Anfrage automatisch abgeschlossen.`, 'success');
      fetchAllDatabaseRequests();
    } catch (e: any) {
      onShowAlert?.('Fehler', e?.message || 'Konnte WhatsApp-Reset nicht versenden.', 'danger');
    }
  };

  // 5. Reject Password Reset
  const handleRejectPasswordReset = async (username: string) => {
    try {
      setDbUsers((prev) =>
        prev.map((u) => (u.username.toLowerCase() === username.toLowerCase() ? { ...u, reset_requested: false } : u))
      );
      setDbNotifs((prev) => prev.filter((n) => !n.message.includes(username)));

      try {
        await supabase.from('user_notifications').delete().eq('target_username', 'SYSTEM_ADMIN').ilike('message', `%${username}%`);
        await supabase.from('wa_outbox').delete().eq('username', username).eq('message_type', 'password_reset');
      } catch (e) {}

      await supabase.from('users').update({ reset_requested: false }).eq('username', username);

      onRejectPasswordReset?.(username);
      onShowAlert?.('Reset-Anfrage Abgelehnt ❌', `Passwort-Reset für @${username} verworfen.`, 'warning');
      fetchAllDatabaseRequests();
    } catch (e: any) {
      onShowAlert?.('Fehler', e?.message || 'Konnte Anfrage nicht verwerfen.', 'danger');
    }
  };

  // 6. WhatsApp Vetting Approve / Reject
  const handleApproveWARequest = async (req: WAJoinRequest) => {
    try {
      setWaRequests((prev) => prev.map((r) => (r.id === req.id ? { ...r, status: 'approved' } : r)));
      await supabase.from('wa_join_requests').update({
        status: 'approved',
        reviewed_by: currentUser.username,
        reviewed_at: new Date().toISOString(),
      }).eq('id', req.id);

      const cleanPhone = (req.phone_number || '').replace(/\D/g, '');
      if (cleanPhone) {
        await supabase.from('wa_outbox').insert({
          phone: cleanPhone,
          username: req.user_name || 'Biker',
          message_type: 'welcome',
          status: 'pending',
        });
      }

      onShowAlert?.('WhatsApp Vetting Freigegeben ✅', `${req.user_name || req.phone_number} wurde zur Hauptgruppe freigeschaltet.`, 'success');
      fetchAllDatabaseRequests();
    } catch (e: any) {
      onShowAlert?.('Fehler', e?.message || 'Konnte Anfrage nicht freigeben.', 'danger');
    }
  };

  const handleRejectWARequest = async (req: WAJoinRequest) => {
    try {
      setWaRequests((prev) => prev.map((r) => (r.id === req.id ? { ...r, status: 'rejected' } : r)));
      await supabase.from('wa_join_requests').update({
        status: 'rejected',
        reviewed_by: currentUser.username,
        reviewed_at: new Date().toISOString(),
      }).eq('id', req.id);

      onShowAlert?.('WhatsApp Anfrage Abgelehnt ❌', `Beitritt von ${req.user_name || req.phone_number} abgewiesen.`, 'warning');
      fetchAllDatabaseRequests();
    } catch (e: any) {
      onShowAlert?.('Fehler', e?.message || 'Konnte Anfrage nicht ablehnen.', 'danger');
    }
  };

  // 7. Resolve Appeal
  const handleResolveAppealAction = async (appealId: string, resolution: 'accept' | 'reject') => {
    try {
      setDbAppeals((prev) =>
        prev.map((a) => (a.id === appealId ? { ...a, status: resolution === 'accept' ? 'accepted' : 'rejected' } : a))
      );
      try {
        await supabase.from('market_appeals').update({ status: resolution === 'accept' ? 'accepted' : 'rejected' }).eq('id', appealId);
      } catch (e) {
        try {
          await supabase.from('appeals').update({ status: resolution === 'accept' ? 'accepted' : 'rejected' }).eq('id', appealId);
        } catch (e2) {}
      }

      onResolveAppeal?.(appealId, resolution);
      onShowAlert?.(
        resolution === 'accept' ? 'Einspruch Stattgegeben ✅' : 'Einspruch Abgelehnt ❌',
        `Der Einspruch wurde als ${resolution === 'accept' ? 'akzeptiert' : 'abgelehnt'} gespeichert.`,
        resolution === 'accept' ? 'success' : 'warning'
      );
      fetchAllDatabaseRequests();
    } catch (e: any) {
      onShowAlert?.('Fehler', e?.message || 'Konnte Einspruch nicht auflösen.', 'danger');
    }
  };

  // 8. Feedback Approve / Reject
  const handleUpdateFeedbackAction = async (feedbackId: string, status: 'accepted' | 'rejected', notes: string) => {
    try {
      setDbFeedbacks((prev) =>
        prev.map((f) => (f.id === feedbackId ? { ...f, status, admin_notes: notes } : f))
      );
      await supabase
        .from('feedback_suggestions')
        .update({ status, admin_notes: notes, updated_at: new Date().toISOString() })
        .eq('id', feedbackId);

      onUpdateFeedbackStatus?.(feedbackId, status, notes);
      onShowAlert?.(
        status === 'accepted' ? 'Vorschlag Angenommen 🚀' : 'Vorschlag Abgelehnt ❌',
        `Der Vorschlag wurde in der Datenbank als ${status === 'accepted' ? 'angenommen' : 'abgelehnt'} markiert.`,
        status === 'accepted' ? 'success' : 'warning'
      );
      fetchAllDatabaseRequests();
    } catch (e: any) {
      onShowAlert?.('Fehler', e?.message || 'Konnte Feedback nicht aktualisieren.', 'danger');
    }
  };

  // 9. Mark System Notif Read
  const handleDismissSysNotif = async (notifId: string) => {
    try {
      setDbNotifs((prev) => prev.filter((n) => n.id !== notifId));
      await supabase.from('user_notifications').update({ is_read: true }).eq('id', notifId);
      onMarkAdminNotifRead?.(notifId);
      fetchAllDatabaseRequests();
    } catch (e: any) {
      console.warn('Notif update notice:', e);
    }
  };

  // --- DEMO / TEST ANFRAGE GENERATOR (Um Live-Datenbank sofort zu testen) ---
  const handleCreateTestRegistration = async () => {
    setIsCreatingTest(true);
    try {
      const testNum = Math.floor(100 + Math.random() * 900);
      const testUsername = `TestBiker_${testNum}`;
      const testPhone = `+49170${Math.floor(1000000 + Math.random() * 9000000)}`;
      
      const { error } = await supabase.from('users').insert([{
        username: testUsername,
        email: `${testUsername.toLowerCase()}@pixel-rider.de`,
        phone: testPhone,
        role: 'member',
        invite: 'PENDING',
        password: '1234',
      }]);

      if (error) throw error;

      await supabase.from('user_notifications').insert([{
        target_username: 'SYSTEM_ADMIN',
        username: 'SYSTEM_ADMIN',
        message: `👤 <strong>Neue Registrierung:</strong> @${testUsername} (${testPhone}) wartet auf Freischaltung.`,
        action_type: 'invite_request',
        action_payload: testUsername,
        is_read: false,
        type: 'info',
      }]);

      onShowAlert?.('Test-Anfrage Erstellt 🚀', `Test-User @${testUsername} wurde in der Supabase-Datenbank mit Status "PENDING" angelegt.`, 'success');
      fetchAllDatabaseRequests();
    } catch (e: any) {
      onShowAlert?.('Fehler beim Erstellen', e?.message || 'Konnte Test-User nicht anlegen', 'danger');
    } finally {
      setIsCreatingTest(false);
    }
  };

  const handleCreateTestPasswordReset = async () => {
    setIsCreatingTest(true);
    try {
      // Find an existing active user or pick first user
      const targetUser = dbUsers.find((u) => u.username.toLowerCase() !== 'nican') || dbUsers[0];
      if (!targetUser) {
        onShowAlert?.('Kein User', 'Bitte lege zuerst einen Test-User an.', 'warning');
        return;
      }

      await supabase.from('users').update({ reset_requested: true }).eq('username', targetUser.username);
      onShowAlert?.('Reset-Anfrage Erstellt 🔑', `Für @${targetUser.username} wurde "reset_requested = true" in der Datenbank gesetzt.`, 'success');
      fetchAllDatabaseRequests();
    } catch (e: any) {
      onShowAlert?.('Fehler', e?.message || 'Konnte Reset-Anfrage nicht setzen', 'danger');
    } finally {
      setIsCreatingTest(false);
    }
  };

  // Compile Pending Items directly from database state
  const pendingUsers = dbUsers.filter(
    (u) =>
      u.invite === 'PENDING' ||
      u.invite === 'pending' ||
      (u.is_deactivated && u.deactivated_reason?.toLowerCase().includes('freigabe'))
  );

  const pendingResets = dbUsers.filter(
    (u) => Boolean(u.reset_requested) || String(u.reset_requested) === 'true'
  );

  const pendingAppeals = dbAppeals.filter((a) => a.status === 'pending' || a.status === 'none');

  const pendingWARequests = waRequests.filter(
    (r) => r.status === 'pending' || r.status === 'manual_review'
  );

  const pendingFeedbacks = dbFeedbacks.filter((f) => f.status === 'new' || f.status === 'in_review');

  const pendingSysNotifs = dbNotifs.filter((n) => !n.is_read);

  const totalPendingCount =
    pendingUsers.length +
    pendingResets.length +
    pendingAppeals.length +
    pendingWARequests.length +
    pendingFeedbacks.length +
    pendingSysNotifs.length;

  const matchesSearch = (text: string) => {
    if (!searchQuery.trim()) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  return (
    <div className="space-y-6">
      {/* Header Overview Banner */}
      <div className="bg-gradient-to-r from-amber-950/70 via-slate-900 to-amber-900/40 border border-amber-500/50 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-amber-400" /> Admin & Moderator Freigaben
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                <Database className="w-3 h-3 text-emerald-400" /> Supabase Live-Sync Aktiv
              </span>
            </div>
            <h3 className="text-xl font-black uppercase text-amber-400 tracking-wide">
              Zentrale Anfragen & Freigaben
            </h3>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Hier werden alle eingehenden Anfragen aus der Supabase-Datenbank gebündelt. Alle Klicks (Freigeben / Ablehnen) schreiben direkt in die Datenbank und aktualisieren den Benutzerstatus in Echtzeit.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-slate-950/80 border border-amber-500/30 rounded-xl p-3 px-4">
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-slate-400">Offene Anfragen</div>
                <div className="text-2xl font-extrabold text-amber-400 font-mono">{totalPendingCount}</div>
              </div>
              <button
                onClick={fetchAllDatabaseRequests}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg border-0 cursor-pointer transition-colors"
                title="Datenbank neu laden"
              >
                <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Test Creation Quick Buttons */}
            <div className="flex flex-col gap-1.5">
              <button
                onClick={handleCreateTestRegistration}
                disabled={isCreatingTest}
                className="px-3 py-1.5 bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white rounded-lg text-[10px] font-bold uppercase border border-slate-700 transition-all cursor-pointer flex items-center gap-1"
                title="Erstellt einen echten Registrierungs-Datensatz in Supabase"
              >
                <PlusCircle className="w-3 h-3 text-emerald-400" /> Test-Registrierung +
              </button>
              <button
                onClick={handleCreateTestPasswordReset}
                disabled={isCreatingTest}
                className="px-3 py-1.5 bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white rounded-lg text-[10px] font-bold uppercase border border-slate-700 transition-all cursor-pointer flex items-center gap-1"
                title="Setzt reset_requested=true in Supabase"
              >
                <KeyRound className="w-3 h-3 text-blue-400" /> Test-Reset anfordern +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all border cursor-pointer ${
              filterCategory === 'all'
                ? 'bg-amber-500 text-black border-amber-400 font-black shadow-md shadow-amber-500/20'
                : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            Alle ({totalPendingCount})
          </button>

          <button
            onClick={() => setFilterCategory('register')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all border cursor-pointer flex items-center gap-1.5 ${
              filterCategory === 'register'
                ? 'bg-emerald-500 text-black border-emerald-400 font-black'
                : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" /> Registrierungen ({pendingUsers.length})
          </button>

          <button
            onClick={() => setFilterCategory('reset')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all border cursor-pointer flex items-center gap-1.5 ${
              filterCategory === 'reset'
                ? 'bg-blue-500 text-black border-blue-400 font-black'
                : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" /> Passwort-Resets ({pendingResets.length})
          </button>

          <button
            onClick={() => setFilterCategory('appeal')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all border cursor-pointer flex items-center gap-1.5 ${
              filterCategory === 'appeal'
                ? 'bg-purple-500 text-white border-purple-400 font-black'
                : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <Hammer className="w-3.5 h-3.5" /> Einsprüche ({pendingAppeals.length})
          </button>

          <button
            onClick={() => setFilterCategory('whatsapp')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all border cursor-pointer flex items-center gap-1.5 ${
              filterCategory === 'whatsapp'
                ? 'bg-emerald-600 text-white border-emerald-400 font-black'
                : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" /> WhatsApp Vetting ({pendingWARequests.length})
          </button>

          <button
            onClick={() => setFilterCategory('feedback')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all border cursor-pointer flex items-center gap-1.5 ${
              filterCategory === 'feedback'
                ? 'bg-amber-400 text-black border-amber-300 font-black'
                : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" /> Vorschläge ({pendingFeedbacks.length})
          </button>

          <button
            onClick={() => setFilterCategory('sysnotif')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all border cursor-pointer flex items-center gap-1.5 ${
              filterCategory === 'sysnotif'
                ? 'bg-cyan-500 text-black border-cyan-400 font-black'
                : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <Bell className="w-3.5 h-3.5" /> System ({pendingSysNotifs.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Suchen nach Name, Grund..."
            className="w-full bg-slate-950 border border-slate-800 rounded-full pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* Main Request Cards Feed */}
      {totalPendingCount === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center shadow-xl space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
            <Sparkles className="w-8 h-8" />
          </div>
          <h4 className="text-lg font-bold text-white uppercase tracking-wide">Aktuell keine offenen Anfragen</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            In der Datenbank liegen derzeit keine offenen Registrierungen (`invite='PENDING'`), Passwort-Resets (`reset_requested=true`) oder WhatsApp-Vetting Anfragen vor.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={handleCreateTestRegistration}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase rounded-full border-0 cursor-pointer shadow-lg transition-all flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" /> Test-Registrierung Anlegen
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 1. REGISTRATIONS */}
          {(filterCategory === 'all' || filterCategory === 'register') &&
            pendingUsers
              .filter((u) => matchesSearch(`${u.username} ${u.email || ''} ${u.phone || ''}`))
              .map((u) => {
                const cleanPhone = (u.phone || '').replace(/\D/g, '');
                return (
                  <div
                    key={`reg-${u.username}`}
                    className="bg-slate-900 border border-emerald-500/40 hover:border-emerald-500/80 rounded-xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <UserCheck className="w-3 h-3" /> Neue Registrierung
                        </span>
                        <span className="text-sm font-extrabold text-white">@{u.username}</span>
                        {u.email && <span className="text-xs text-slate-400">({u.email})</span>}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                        {u.phone && (
                          <a
                            href={`https://wa.me/${cleanPhone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-400 hover:underline flex items-center gap-1 font-mono font-bold"
                          >
                            <Smartphone className="w-3.5 h-3.5" /> {u.phone}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        <span className="text-slate-400">Status in DB: <strong className="text-amber-400 font-mono">invite = PENDING</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleApproveRegistration(u.username)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase rounded-full shadow-md transition-all border-0 cursor-pointer flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4" /> Freigeben
                      </button>
                      <button
                        onClick={() => handleDismissRegistration(u.username)}
                        className="px-4 py-2 bg-red-600/80 hover:bg-red-500 text-white font-bold text-xs uppercase rounded-full shadow-md transition-all border-0 cursor-pointer flex items-center gap-1.5"
                      >
                        <X className="w-4 h-4" /> Ablehnen & Löschen
                      </button>
                    </div>
                  </div>
                );
              })}

          {/* 2. PASSWORD RESETS */}
          {(filterCategory === 'all' || filterCategory === 'reset') &&
            pendingResets
              .filter((u) => matchesSearch(`${u.username} ${u.email || ''} ${u.phone || ''}`))
              .map((u) => {
                const cleanPhone = (u.phone || '').replace(/\D/g, '');
                return (
                  <div
                    key={`reset-${u.username}`}
                    className="bg-slate-900 border border-blue-500/40 hover:border-blue-500/80 rounded-xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <KeyRound className="w-3 h-3" /> Passwort-Reset Anfrage
                        </span>
                        <span className="text-sm font-extrabold text-white">@{u.username}</span>
                        {u.email && <span className="text-xs text-slate-400">({u.email})</span>}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                        {u.phone ? (
                          <span className="text-blue-300 font-mono font-bold flex items-center gap-1">
                            <Smartphone className="w-3.5 h-3.5" /> {u.phone}
                          </span>
                        ) : (
                          <span className="text-amber-400/80 text-[11px]">Keine Telefonnummer hinterlegt</span>
                        )}
                        <span className="text-slate-400 font-mono">DB: reset_requested = true</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                      {u.phone && (
                        <button
                          onClick={() => handleSendWhatsAppResetLink(u)}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase rounded-full shadow-md transition-all border-0 cursor-pointer flex items-center gap-1.5"
                          title="Sendet sicheren Link per WhatsApp Outbox"
                        >
                          <Send className="w-3.5 h-3.5" /> WhatsApp-Link Freigeben
                        </button>
                      )}
                      <button
                        onClick={() => handleResetPasswordStandard(u.username)}
                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs uppercase rounded-full shadow-md transition-all border-0 cursor-pointer flex items-center gap-1.5"
                        title="Setzt Passwort auf 1234"
                      >
                        <KeyRound className="w-3.5 h-3.5" /> Auf "1234" Freigeben
                      </button>
                      <button
                        onClick={() => handleRejectPasswordReset(u.username)}
                        className="px-3 py-2 bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white font-bold text-xs uppercase rounded-full transition-all border-0 cursor-pointer flex items-center gap-1.5"
                      >
                        <X className="w-3.5 h-3.5" /> Ablehnen
                      </button>
                    </div>
                  </div>
                );
              })}

          {/* 3. APPEALS */}
          {(filterCategory === 'all' || filterCategory === 'appeal') &&
            pendingAppeals
              .filter((a) => matchesSearch(`${a.author} ${a.appeal_reason} ${a.action_type}`))
              .map((app) => (
                <div
                  key={`appeal-${app.id}`}
                  className="bg-slate-900 border border-purple-500/40 hover:border-purple-500/80 rounded-xl p-5 shadow-lg space-y-3 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <Hammer className="w-3 h-3" /> Sperr-Einspruch
                      </span>
                      <span className="text-sm font-extrabold text-white">@{app.author}</span>
                      <span className="text-xs text-amber-400 font-bold">
                        Betrifft: {app.action_type === 'delete' ? 'Löschung / Sperrung' : 'Bearbeitung'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleResolveAppealAction(app.id, 'accept')}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase rounded-full shadow-md transition-all border-0 cursor-pointer flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" /> Stattgeben & Entsperren
                      </button>
                      <button
                        onClick={() => handleResolveAppealAction(app.id, 'reject')}
                        className="px-4 py-1.5 bg-red-600/80 hover:bg-red-500 text-white font-bold text-xs uppercase rounded-full shadow-md transition-all border-0 cursor-pointer flex items-center gap-1.5"
                      >
                        <X className="w-3.5 h-3.5" /> Ablehnen
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs text-slate-300 leading-relaxed">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1">Begründung des Nutzers:</span>
                    {app.appeal_reason}
                  </div>
                </div>
              ))}

          {/* 4. WHATSAPP JOIN REQUESTS */}
          {(filterCategory === 'all' || filterCategory === 'whatsapp') &&
            pendingWARequests
              .filter((r) => matchesSearch(`${r.user_name || ''} ${r.phone_number || ''} ${r.ai_reason || ''}`))
              .map((r) => {
                const cleanPhone = (r.phone_number || '').replace(/\D/g, '');
                return (
                  <div
                    key={`wa-${r.id}`}
                    className="bg-slate-900 border border-emerald-600/40 hover:border-emerald-600/80 rounded-xl p-5 shadow-lg space-y-3 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <Smartphone className="w-3 h-3" /> WhatsApp Vetting Anfrage
                        </span>
                        <span className="text-sm font-extrabold text-white">{r.user_name || 'Biker'}</span>
                        <a
                          href={`https://wa.me/${cleanPhone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-emerald-400 hover:underline font-mono font-bold flex items-center gap-1"
                        >
                          {r.phone_number} <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApproveWARequest(r)}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase rounded-full shadow-md transition-all border-0 cursor-pointer flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" /> In Gruppe Aufnehmen
                        </button>
                        <button
                          onClick={() => handleRejectWARequest(r)}
                          className="px-4 py-1.5 bg-red-600/80 hover:bg-red-500 text-white font-bold text-xs uppercase rounded-full shadow-md transition-all border-0 cursor-pointer flex items-center gap-1.5"
                        >
                          <X className="w-3.5 h-3.5" /> Ablehnen
                        </button>
                      </div>
                    </div>

                    {r.answers && r.answers.length > 0 && (
                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5">
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Beantwortete Vetting-Fragen:</span>
                        {r.answers.map((ans, idx) => (
                          <div key={idx} className="text-xs">
                            <span className="text-slate-400">{ans.question}:</span>{' '}
                            <strong className="text-amber-300">{ans.answer}</strong>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

          {/* 5. FEEDBACKS */}
          {(filterCategory === 'all' || filterCategory === 'feedback') &&
            pendingFeedbacks
              .filter((f) => matchesSearch(`${f.title} ${f.author_name} ${f.description}`))
              .map((f) => (
                <div
                  key={`fb-${f.id}`}
                  className="bg-slate-900 border border-amber-500/40 hover:border-amber-500/80 rounded-xl p-5 shadow-lg space-y-3 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <Lightbulb className="w-3 h-3" /> {CATEGORY_LABELS[f.category]?.label || 'Vorschlag'}
                      </span>
                      <span className="text-sm font-extrabold text-white">{f.title}</span>
                      <span className="text-xs text-slate-400">von @{f.author_name}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          handleUpdateFeedbackAction(
                            f.id,
                            'accepted',
                            'Vom Admin freigegeben und in die Umsetzung aufgenommen! 🚀'
                          )
                        }
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase rounded-full shadow-md transition-all border-0 cursor-pointer flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" /> Freigeben / Annehmen
                      </button>
                      <button
                        onClick={() =>
                          handleUpdateFeedbackAction(
                            f.id,
                            'rejected',
                            'Danke für den Vorschlag! Aktuell können wir diesen leider nicht umsetzen.'
                          )
                        }
                        className="px-4 py-1.5 bg-red-600/80 hover:bg-red-500 text-white font-bold text-xs uppercase rounded-full shadow-md transition-all border-0 cursor-pointer flex items-center gap-1.5"
                      >
                        <X className="w-3.5 h-3.5" /> Ablehnen
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800 leading-relaxed">
                    {f.description}
                  </p>
                </div>
              ))}

          {/* 6. SYSTEM ADMIN NOTIFICATIONS */}
          {(filterCategory === 'all' || filterCategory === 'sysnotif') &&
            pendingSysNotifs
              .filter((n) => matchesSearch(`${n.message || ''} ${n.type || ''}`))
              .map((n) => (
                <div
                  key={`sys-${n.id}`}
                  className="bg-slate-900 border border-cyan-500/40 hover:border-cyan-500/80 rounded-xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <Bell className="w-3 h-3" /> System-Hinweis
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(n.created_at).toLocaleString('de-DE')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200" dangerouslySetInnerHTML={{ __html: cleanUmlautText(n.message) }} />
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleDismissSysNotif(n.id)}
                      className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-black font-extrabold text-xs uppercase rounded-full shadow-md transition-all border-0 cursor-pointer flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" /> Erledigt
                    </button>
                  </div>
                </div>
              ))}
        </div>
      )}
    </div>
  );
};
