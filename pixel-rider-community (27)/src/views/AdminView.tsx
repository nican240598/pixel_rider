import React, { useState } from 'react';
import { User, UserRole, MarketAppeal, CrewMember, CrewEvent, FeedbackSuggestion, FeedbackCategory, FeedbackStatus, UserNotification } from '../types';
import {
  Shield,
  Key,
  Users,
  CheckCircle,
  Trash2,
  RotateCw,
  Hammer,
  Plus,
  Edit,
  X,
  Star,
  Instagram,
  Youtube,
  Image as ImageIcon,
  Bell,
  AlertTriangle,
  Calendar,
  UserCheck,
  Lightbulb,
  EyeOff,
  Clock,
  Sparkles,
  CheckCircle2,
  Send,
  Search,
  Filter,
  ThumbsUp,
  MessageSquareQuote,
  Check,
  Smartphone,
  ShieldAlert,
  KeyRound
} from 'lucide-react';
import { CATEGORY_LABELS, STATUS_LABELS } from '../components/FeedbackBoard';
import { WhatsAppBotPanel } from '../components/WhatsAppBotPanel';
import { AdminRequestsPanel } from '../components/AdminRequestsPanel';
import { UserRoleBadge } from '../components/UserRoleBadge';
import { UserAvatar } from '../components/UserAvatar';

interface AdminViewProps {
  currentUser: User;
  users: User[];
  invites: { code: string; created_by: string; is_used: boolean; used_by?: string }[];
  appeals: MarketAppeal[];
  crewMembers?: CrewMember[];
  events?: CrewEvent[];
  feedbacks?: FeedbackSuggestion[];
  adminInviteUsers?: User[];
  adminResetUsers?: User[];
  adminNotifsList?: UserNotification[];
  onGenerateInvite: () => void;
  onToggleInvite: (code: string, currentUsed: boolean) => void;
  onDeleteInvite: (code: string) => void;
  onChangeUserRole: (username: string, role: UserRole) => void;
  onToggleUserStatus: (username: string, currentDeactivated: boolean) => void;
  onDeleteUser: (username: string) => void;
  onApproveInvite?: (username: string) => void;
  onDismissInvite?: (username: string) => void;
  onResetPasswordAdmin?: (username: string) => void;
  onSendPasswordResetLinkWhatsApp?: (user: User) => void;
  onRejectPasswordReset?: (username: string) => void;
  onResolveAppeal: (appealId: string, resolution: 'accept' | 'reject') => void;
  onAddCrewMember?: (member: Omit<CrewMember, 'id'>) => void;
  onEditCrewMember?: (id: string, member: Partial<CrewMember>) => void;
  onDeleteCrewMember?: (id: string) => void;
  onSendInactivityWarning?: (username: string) => void;
  onSendInactivityWarningToAll?: () => void;
  onUpdateFeedbackStatus?: (feedbackId: string, status: FeedbackStatus, adminNotes?: string) => void;
  onDeleteFeedback?: (feedbackId: string, reason?: string) => void;
  onMarkAdminNotifRead?: (notifId: string) => void;
  onDeleteAdminNotif?: (notifId: string) => void;
  onShowAlert?: (title: string, message: string, type: 'success' | 'danger' | 'info') => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  currentUser,
  users,
  invites,
  appeals,
  crewMembers = [],
  events = [],
  feedbacks = [],
  adminInviteUsers = [],
  adminResetUsers = [],
  adminNotifsList = [],
  onGenerateInvite,
  onToggleInvite,
  onDeleteInvite,
  onChangeUserRole,
  onToggleUserStatus,
  onDeleteUser,
  onApproveInvite,
  onDismissInvite,
  onResetPasswordAdmin,
  onSendPasswordResetLinkWhatsApp,
  onRejectPasswordReset,
  onResolveAppeal,
  onAddCrewMember,
  onEditCrewMember,
  onDeleteCrewMember,
  onSendInactivityWarning,
  onSendInactivityWarningToAll,
  onUpdateFeedbackStatus,
  onDeleteFeedback,
  onMarkAdminNotifRead,
  onDeleteAdminNotif,
  onShowAlert,
}) => {
  // Compute total pending requests for the badge
  const pendingUsersCount = users.filter(
    (u) =>
      u.invite === 'PENDING' ||
      u.invite === 'pending' ||
      adminInviteUsers.some((inv) => inv.username.toLowerCase() === u.username.toLowerCase())
  ).length;
  const pendingResetsCount = users.filter(
    (u) =>
      u.reset_requested ||
      adminResetUsers.some((r) => r.username.toLowerCase() === u.username.toLowerCase())
  ).length;
  const pendingAppealsCount = appeals.filter((a) => a.status === 'pending' || a.status === 'none').length;
  const pendingFeedbacksCount = feedbacks.filter((f) => f.status === 'new' || f.status === 'in_review').length;
  const pendingNotifsCount = adminNotifsList.filter((n) => !n.is_read).length;

  const totalOpenRequestsCount =
    pendingUsersCount + pendingResetsCount + pendingAppealsCount + pendingFeedbacksCount + pendingNotifsCount;

  const [activeTab, setActiveTab] = useState<'requests' | 'users' | 'invites' | 'crew' | 'appeals' | 'feedback' | 'whatsapp'>('requests');

  // Feedback admin filtering & response editing states
  const [fbCategoryFilter, setFbCategoryFilter] = useState<FeedbackCategory | 'all'>('all');
  const [fbStatusFilter, setFbStatusFilter] = useState<FeedbackStatus | 'all'>('all');
  const [fbSearchQuery, setFbSearchQuery] = useState('');
  const [editingFeedbackId, setEditingFeedbackId] = useState<string | null>(null);
  const [editAdminNote, setEditAdminNote] = useState('');
  const [editStatus, setEditStatus] = useState<FeedbackStatus>('in_review');

  // Deletion with mandatory reason
  const [deleteTargetFeedback, setDeleteTargetFeedback] = useState<FeedbackSuggestion | null>(null);
  const [deleteFeedbackReason, setDeleteFeedbackReason] = useState('');

  // Crew Modal state
  const [crewModalOpen, setCrewModalOpen] = useState(false);
  const [editingCrew, setEditingCrew] = useState<CrewMember | null>(null);
  const [crewName, setCrewName] = useState('');
  const [crewRole, setCrewRole] = useState('');
  const [crewBio, setCrewBio] = useState('');
  const [crewImage, setCrewImage] = useState('');
  const [crewIg, setCrewIg] = useState('');
  const [crewYt, setCrewYt] = useState('');

  const handleCrewImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.readAsDataURL(e.target.files[0]);
      reader.onload = () => setCrewImage(reader.result as string);
    }
  };

  const openNewCrewModal = () => {
    setEditingCrew(null);
    setCrewName('');
    setCrewRole('Crew Member');
    setCrewBio('');
    setCrewImage('');
    setCrewIg('');
    setCrewYt('');
    setCrewModalOpen(true);
  };

  const openEditCrewModal = (m: CrewMember) => {
    setEditingCrew(m);
    setCrewName(m.name);
    setCrewRole(m.role);
    setCrewBio(m.bio || '');
    setCrewImage(m.image_url || '');
    setCrewIg(m.social_ig || '');
    setCrewYt(m.social_youtube || '');
    setCrewModalOpen(true);
  };

  return (
    <div className="py-6 max-w-6xl mx-auto px-4">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-extrabold uppercase text-amber-400 flex items-center justify-center gap-2">
          <Shield className="w-8 h-8" /> Admin & Moderator Center
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Verwaltung von Einladungscodes, Pixel des Monats und Benutzerrechten
        </p>
      </div>

      {/* Tabs Header */}
      <div className="flex items-center overflow-x-auto no-scrollbar touch-pan-x flex-nowrap md:flex-wrap md:justify-center border-b border-slate-800 mb-8 gap-1.5 md:gap-2 px-1">
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 sm:px-5 py-3 font-bold uppercase text-xs tracking-wider flex items-center gap-2 border-b-2 transition-colors bg-transparent border-0 cursor-pointer shrink-0 whitespace-nowrap ${
            activeTab === 'requests' ? 'border-amber-400 text-amber-400 font-extrabold' : 'border-transparent text-slate-400'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span>Anfragen & Freigaben</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            totalOpenRequestsCount > 0
              ? 'bg-amber-500 text-black shadow-md shadow-amber-500/30 animate-pulse'
              : 'bg-slate-800 text-slate-400'
          }`}>
            {totalOpenRequestsCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 sm:px-5 py-3 font-bold uppercase text-xs tracking-wider flex items-center gap-2 border-b-2 transition-colors bg-transparent border-0 cursor-pointer shrink-0 whitespace-nowrap ${
            activeTab === 'users' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400'
          }`}
        >
          <Users className="w-4 h-4" /> User & Rechte ({users.length})
        </button>

        <button
          onClick={() => setActiveTab('invites')}
          className={`px-4 sm:px-5 py-3 font-bold uppercase text-xs tracking-wider flex items-center gap-2 border-b-2 transition-colors bg-transparent border-0 cursor-pointer shrink-0 whitespace-nowrap ${
            activeTab === 'invites' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400'
          }`}
        >
          <Key className="w-4 h-4" /> Invites ({invites.length})
        </button>

        <button
          onClick={() => setActiveTab('crew')}
          className={`px-4 sm:px-5 py-3 font-bold uppercase text-xs tracking-wider flex items-center gap-2 border-b-2 transition-colors bg-transparent border-0 cursor-pointer shrink-0 whitespace-nowrap ${
            activeTab === 'crew' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400'
          }`}
        >
          <Users className="w-4 h-4 text-purple-400" /> Crew ({crewMembers.length})
        </button>

        <button
          onClick={() => setActiveTab('appeals')}
          className={`px-4 sm:px-5 py-3 font-bold uppercase text-xs tracking-wider flex items-center gap-2 border-b-2 transition-colors bg-transparent border-0 cursor-pointer shrink-0 whitespace-nowrap ${
            activeTab === 'appeals' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400'
          }`}
        >
          <Hammer className="w-4 h-4" /> Einsprüche ({appeals.length})
        </button>

        <button
          onClick={() => setActiveTab('feedback')}
          className={`px-4 sm:px-5 py-3 font-bold uppercase text-xs tracking-wider flex items-center gap-2 border-b-2 transition-colors bg-transparent border-0 cursor-pointer shrink-0 whitespace-nowrap ${
            activeTab === 'feedback' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400'
          }`}
        >
          <Lightbulb className="w-4 h-4 text-amber-400" />
          <span>Feedback & Vorschläge</span>
          <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
            {feedbacks.length}
          </span>
          {feedbacks.filter((f) => f.status === 'new' || f.status === 'in_review').length > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('whatsapp')}
          className={`px-4 sm:px-5 py-3 font-bold uppercase text-xs tracking-wider flex items-center gap-2 border-b-2 transition-colors bg-transparent border-0 cursor-pointer shrink-0 whitespace-nowrap ${
            activeTab === 'whatsapp' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-400'
          }`}
        >
          <Smartphone className="w-4 h-4 text-emerald-400" />
          <span>WhatsApp Bot</span>
          <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
            Vetting & Inaktivität
          </span>
        </button>
      </div>

      {/* Requests & Approvals Tab */}
      {activeTab === 'requests' && (
        <AdminRequestsPanel
          currentUser={currentUser}
          users={users}
          appeals={appeals}
          feedbacks={feedbacks}
          adminInviteUsers={adminInviteUsers}
          adminResetUsers={adminResetUsers}
          adminNotifsList={adminNotifsList}
          onApproveInvite={onApproveInvite}
          onDismissInvite={onDismissInvite}
          onResetPasswordAdmin={onResetPasswordAdmin}
          onSendPasswordResetLinkWhatsApp={onSendPasswordResetLinkWhatsApp}
          onRejectPasswordReset={onRejectPasswordReset}
          onResolveAppeal={onResolveAppeal}
          onUpdateFeedbackStatus={onUpdateFeedbackStatus}
          onDeleteFeedback={onDeleteFeedback}
          onMarkAdminNotifRead={onMarkAdminNotifRead}
          onDeleteAdminNotif={onDeleteAdminNotif}
          onShowAlert={onShowAlert}
        />
      )}

      {/* Invites Tab */}
      {activeTab === 'invites' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-base font-bold uppercase text-amber-400">Aktive Invite-Codes</h3>
            <button
              onClick={onGenerateInvite}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase rounded-full shadow transition-all border-0 cursor-pointer flex items-center gap-1.5"
            >
              <RotateCw className="w-3.5 h-3.5" /> Code Generieren
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="p-3">Code</th>
                  <th className="p-3">Erstellt Von</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Aktion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {invites.map((inv) => (
                  <tr key={inv.code} className="hover:bg-slate-800/50">
                    <td className="p-3 font-mono font-bold text-amber-400">{inv.code}</td>
                    <td className="p-3">{inv.created_by}</td>
                    <td className="p-3">
                      {inv.is_used ? (
                        <span className="bg-slate-800 text-slate-400 px-2.5 py-1 rounded-full text-[10px]">
                          Benutzt von {inv.used_by || 'Unbekannt'}
                        </span>
                      ) : (
                        <span className="bg-emerald-900/80 text-emerald-300 px-2.5 py-1 rounded-full text-[10px] font-bold">
                          Frei
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => onToggleInvite(inv.code, inv.is_used)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full text-[10px] font-bold border-0 cursor-pointer"
                      >
                        {inv.is_used ? 'Aktivieren' : 'Deaktivieren'}
                      </button>
                      <button
                        onClick={() => onDeleteInvite(inv.code)}
                        className="p-1 text-red-400 hover:text-red-300 border-0 bg-transparent cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (() => {
        const currentMonth = new Date().getMonth(); // 0 = Jan, 2 = Mar, 10 = Nov
        const isRidingSeason = currentMonth >= 2 && currentMonth <= 10;

        const getDaysSinceLogin = (u: User) => {
          if (!u.last_login) return null;
          const d = new Date(u.last_login);
          if (isNaN(d.getTime())) return null;
          const diffMs = Date.now() - d.getTime();
          return Math.floor(diffMs / (1000 * 60 * 60 * 24));
        };

        const getUserEventCount = (u: User) => {
          if (!events) return 0;
          const uName = u.username.toLowerCase();
          const uEmail = u.email ? u.email.toLowerCase() : '';
          return events.filter((e) => {
            const parts = e.participants || [];
            const isPart = parts.some((p) => {
              const pClean = p.toLowerCase();
              return pClean === uName || (uEmail && pClean === uEmail);
            });
            const isCreator = e.created_by && e.created_by.toLowerCase() === uName;
            return isPart || isCreator;
          }).length;
        };

        const isUserInactive = (u: User) => {
          if (u.username.toLowerCase() === 'nican' || u.role === 'admin') return false;
          const days = getDaysSinceLogin(u);
          const evCount = getUserEventCount(u);
          const longInactive = days === null || days > 90; // > 3 months
          return longInactive && evCount === 0;
        };

        const inactiveCount = users.filter((u) => isUserInactive(u)).length;

        return (
          <div className="space-y-6">
            {/* Seasonal Inactivity Alert Header Banner */}
            <div className="bg-gradient-to-r from-purple-950/90 via-slate-900 to-amber-950/40 border border-amber-500/50 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 z-10 relative">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-amber-400" /> Biker-Saison Überwachung (März – November)
                    </span>
                    {isRidingSeason ? (
                      <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                        🟢 Saison Aktiv
                      </span>
                    ) : (
                      <span className="bg-slate-800 text-slate-400 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border border-slate-700">
                        ⚪ Saison-Pause (Dez–Feb)
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-black uppercase text-amber-400 tracking-wide">
                    Inaktivitäts-Tracking & Community Kick-Avis
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                    Mitglieder, die in der Biker-Saison (März bis November) länger als <strong>3 Monate (90 Tage)</strong> nicht auf der Webseite aktiv waren und an <strong>0 Events</strong> teilgenommen haben, werden hier automatisch erfasst und können verwarnt oder wegen Inaktivität entfernt werden.
                  </p>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl flex flex-col items-center justify-center min-w-[220px] text-center shadow-inner">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Gefährdete Profile</span>
                  <span className={`text-2xl font-black my-1 ${inactiveCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {inactiveCount} / {users.length} Inaktiv
                  </span>
                  {inactiveCount > 0 && onSendInactivityWarningToAll && (
                    <button
                      onClick={onSendInactivityWarningToAll}
                      className="mt-2 w-full py-2 px-3 bg-red-600 hover:bg-red-500 text-white font-extrabold text-[10px] uppercase rounded-lg shadow-lg border-0 cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Bell className="w-3 h-3 animate-bounce" /> Warnung an alle Inaktiven
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h4 className="text-sm font-bold uppercase text-amber-400 mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" /> Alle Mitglieder-Profile ({users.length})
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Username & E-Mail</th>
                      <th className="p-3">Rolle</th>
                      <th className="p-3">Letzte Aktivität</th>
                      <th className="p-3">Event-Aktivität</th>
                      <th className="p-3">Saison-Status</th>
                      <th className="p-3 text-right">Aktionen / Inaktivitäts-Warnung</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {users.map((u) => {
                      const isSystemAdmin = u.username.toLowerCase() === 'nican';
                      const daysInactive = getDaysSinceLogin(u);
                      const eventCount = getUserEventCount(u);
                      const inactive = isUserInactive(u);
                      const isPending = u.invite === 'PENDING' || u.invite === 'pending';

                      return (
                        <tr key={u.username} className={`hover:bg-slate-800/50 transition-colors ${isPending ? 'bg-amber-950/20' : inactive ? 'bg-red-950/10' : ''}`}>
                          <td className="p-3 font-bold text-white">
                            <div className="flex items-center gap-3">
                              <UserAvatar
                                username={u.username}
                                avatarUrl={u.avatar_url}
                                allUsers={users}
                                size="md"
                                bordered
                                borderColor="border-amber-500/40"
                              />
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span>{u.username}</span>
                                  {isSystemAdmin && <span className="text-[10px] text-amber-400 font-extrabold">(System-Owner)</span>}
                                </div>
                                <span className="text-[10px] text-slate-500 font-normal">{u.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <UserRoleBadge username={u.username} role={u.role} allUsers={users} showText={true} size="sm" />
                          </td>
                          <td className="p-3">
                            {daysInactive !== null ? (
                              <span className={`font-semibold ${daysInactive > 90 ? 'text-red-400' : daysInactive > 30 ? 'text-amber-400' : 'text-slate-300'}`}>
                                Vor {daysInactive} Tag{daysInactive !== 1 ? 'en' : ''}
                              </span>
                            ) : (
                              <span className="text-slate-500 italic">Nie eingeloggt</span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className={`font-bold ${eventCount > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                              {eventCount} Event{eventCount !== 1 ? 's' : ''}
                            </span>
                          </td>
                          <td className="p-3">
                            {isPending ? (
                              <span className="bg-amber-950 border border-amber-500/50 text-amber-300 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 w-fit">
                                <Clock className="w-3 h-3 text-amber-400" /> Wartet auf Freigabe
                              </span>
                            ) : inactive ? (
                              <span className="bg-red-900/60 text-red-300 border border-red-500/30 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 w-fit">
                                <AlertTriangle className="w-3 h-3 text-red-400" /> Inaktiv (&gt;3 Monate)
                              </span>
                            ) : u.is_deactivated ? (
                              <span className="bg-red-950 text-red-400 border border-red-500/30 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 w-fit">
                                <EyeOff className="w-3 h-3 text-red-400" /> Gesperrt
                              </span>
                            ) : (
                              <span className="bg-emerald-950 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 w-fit">
                                <UserCheck className="w-3 h-3 text-emerald-400" /> Aktiv
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right space-x-2">
                            {!isSystemAdmin ? (
                              <>
                                {isPending && onApproveInvite ? (
                                  <button
                                    onClick={() => onApproveInvite(u.username)}
                                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full text-[10px] font-bold border-0 cursor-pointer shadow-md inline-flex items-center gap-1"
                                    title="Diesen Benutzer für die WebApp freischalten"
                                  >
                                    <CheckCircle className="w-3 h-3" /> Freigeben
                                  </button>
                                ) : null}

                                {inactive && onSendInactivityWarning && (
                                  <button
                                    onClick={() => onSendInactivityWarning(u.username)}
                                    className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-full text-[10px] font-bold border border-amber-500/40 cursor-pointer inline-flex items-center gap-1"
                                    title="Push-Warnung bezüglich bevorstehendem Community-Kick senden"
                                  >
                                    <Bell className="w-3 h-3 text-amber-400" /> Warnung
                                  </button>
                                )}

                                {onResetPasswordAdmin && (
                                  <button
                                    onClick={() => onResetPasswordAdmin(u.username)}
                                    className="px-2.5 py-1 bg-blue-900/60 hover:bg-blue-600 text-blue-300 hover:text-white rounded-full text-[10px] font-bold border border-blue-500/30 cursor-pointer inline-flex items-center gap-1 transition-colors"
                                    title="Passwort dieses Nutzers auf 1234 zurücksetzen"
                                  >
                                    <KeyRound className="w-3 h-3" /> PW-Reset
                                  </button>
                                )}

                                <select
                                  value={u.role}
                                  onChange={(e) => onChangeUserRole(u.username, e.target.value as UserRole)}
                                  className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white"
                                >
                                  <option value="member">Member</option>
                                  <option value="ehren pixel">Ehren Pixel</option>
                                  <option value="moderator">Moderator</option>
                                  {currentUser.isAdmin && <option value="admin">Admin</option>}
                                </select>

                                <button
                                  onClick={() => onToggleUserStatus(u.username, !!u.is_deactivated)}
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold border-0 cursor-pointer ${
                                    u.is_deactivated
                                      ? 'bg-emerald-700/80 hover:bg-emerald-600 text-white'
                                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                                  }`}
                                >
                                  {u.is_deactivated ? 'Entsperren & Freigeben' : 'Sperren'}
                                </button>

                                {currentUser.isAdmin && (
                                  <button
                                    onClick={() => onDeleteUser(u.username)}
                                    className="p-1 text-red-400 hover:text-red-300 border-0 bg-transparent cursor-pointer inline-block align-middle"
                                    title="User aus der Community kicken / löschen"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </>
                            ) : (
                              <span className="text-[10px] text-slate-500 italic">System-Admin</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* CREW TAB */}
      {activeTab === 'crew' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
            <div>
              <h3 className="text-lg font-bold uppercase text-amber-400 flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" /> Pixel Rider Crew Verwaltung
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Verwalte die Mitglieder der Pixel Rider Crew, die auf der Landing Page angezeigt werden.
              </p>
            </div>
            <button
              onClick={openNewCrewModal}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase rounded-full shadow transition-all border-0 cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Mitglied Hinzufügen
            </button>
          </div>

          {crewMembers.length === 0 ? (
            <div className="text-center text-slate-500 text-xs py-12">
              <p>Keine Crew-Mitglieder vorhanden. Lege das erste Mitglied an!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {crewMembers.map((m) => (
                <div key={m.id} className="bg-slate-950 border border-slate-800 hover:border-purple-800/80 rounded-xl p-4 flex items-center justify-between gap-3 transition-colors shadow-md">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={m.image_url || 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=200'}
                      alt={m.name}
                      className="w-12 h-12 rounded-full object-cover border border-purple-500/50 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="text-sm font-black text-white uppercase truncate">{m.name}</h4>
                      <p className="text-xs text-amber-400 font-bold truncate">{m.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEditCrewModal(m)}
                      className="p-2 text-slate-400 hover:text-amber-400 transition-colors border-0 bg-transparent cursor-pointer"
                      title="Bearbeiten"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteCrewMember?.(m.id)}
                      className="p-2 text-slate-400 hover:text-red-400 transition-colors border-0 bg-transparent cursor-pointer"
                      title="Löschen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Appeals Tab */}
      {activeTab === 'appeals' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-base font-bold uppercase text-amber-400 mb-6">Offene Einsprüche</h3>

          {appeals.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-emerald-500/50 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-400">Keine offenen Einsprüche</p>
            </div>
          ) : (
            <div className="space-y-4">
              {appeals.map((app) => (
                <div key={app.id} className="p-4 bg-slate-950 border border-amber-500/30 rounded-xl">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 px-3 py-0.5 rounded-full">
                      Aktion: {app.action_type === 'delete' ? 'Löschung' : 'Bearbeitung'}
                    </span>
                    <span className="text-xs text-slate-400">User: <strong>{app.author}</strong></span>
                  </div>
                  <p className="text-xs text-slate-300 bg-slate-900 p-3 rounded-lg border border-slate-800 mb-3">
                    {app.appeal_reason}
                  </p>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => onResolveAppeal(app.id, 'accept')}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-full border-0 cursor-pointer"
                    >
                      Einspruch Stattgeben (Rückgängig)
                    </button>
                    <button
                      onClick={() => onResolveAppeal(app.id, 'reject')}
                      className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-full border-0 cursor-pointer"
                    >
                      Ablehnen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FEEDBACK & VORSCHLÄGE TAB (ADMIN & MODERATOR CENTER) */}
      {activeTab === 'feedback' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold uppercase text-amber-400 flex items-center gap-2">
                <Lightbulb className="w-5 h-5" /> Crew-Feedback & Verbesserungsvorschläge
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Prüfe Anregungen der Crew, ändere den Status und antworte direkt mit Umsetzungshinweisen.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full text-xs font-extrabold">
                {feedbacks.length} Vorschläge gesamt
              </span>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] uppercase font-bold text-purple-400 block">Neu</span>
              <span className="text-lg font-black text-white">
                {feedbacks.filter((f) => f.status === 'new').length}
              </span>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] uppercase font-bold text-amber-400 block">In Prüfung</span>
              <span className="text-lg font-black text-amber-400">
                {feedbacks.filter((f) => f.status === 'in_review').length}
              </span>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] uppercase font-bold text-blue-400 block">Geplant</span>
              <span className="text-lg font-black text-blue-400">
                {feedbacks.filter((f) => f.status === 'planned').length}
              </span>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-400 block">Umgesetzt</span>
              <span className="text-lg font-black text-emerald-400">
                {feedbacks.filter((f) => f.status === 'implemented').length}
              </span>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center col-span-2 sm:col-span-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Abgelehnt</span>
              <span className="text-lg font-black text-slate-400">
                {feedbacks.filter((f) => f.status === 'declined').length}
              </span>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between pt-2">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setFbStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                  fbStatusFilter === 'all'
                    ? 'bg-amber-500 text-black border-amber-400 font-extrabold'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                Alle Status ({feedbacks.length})
              </button>
              {(['new', 'in_review', 'planned', 'implemented', 'declined'] as FeedbackStatus[]).map((st) => {
                const info = STATUS_LABELS[st];
                const count = feedbacks.filter((f) => f.status === st).length;
                return (
                  <button
                    key={st}
                    onClick={() => setFbStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 cursor-pointer ${
                      fbStatusFilter === st
                        ? `${info.badgeBg} ${info.color} font-extrabold`
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${info.dot}`} />
                    <span>{info.label}</span>
                    <span className="text-[10px] opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>

            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={fbSearchQuery}
                onChange={(e) => setFbSearchQuery(e.target.value)}
                placeholder="Suchen nach Titel, Text, User..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              {fbSearchQuery && (
                <button
                  onClick={() => setFbSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white border-0 bg-transparent cursor-pointer p-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Feedback items list */}
          {feedbacks
            .filter((f) => {
              if (fbStatusFilter !== 'all' && f.status !== fbStatusFilter) return false;
              if (fbCategoryFilter !== 'all' && f.category !== fbCategoryFilter) return false;
              if (fbSearchQuery.trim()) {
                const q = fbSearchQuery.toLowerCase();
                const matchTitle = f.title.toLowerCase().includes(q);
                const matchDesc = f.description.toLowerCase().includes(q);
                const matchAuthor = !f.is_anonymous && f.author_username?.toLowerCase().includes(q);
                if (!matchTitle && !matchDesc && !matchAuthor) return false;
              }
              return true;
            })
            .length === 0 ? (
            <div className="text-center py-12 bg-slate-950 rounded-2xl border border-slate-800">
              <Lightbulb className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-400">Keine passenden Vorschläge gefunden</p>
            </div>
          ) : (
            <div className="space-y-4">
              {feedbacks
                .filter((f) => {
                  if (fbStatusFilter !== 'all' && f.status !== fbStatusFilter) return false;
                  if (fbCategoryFilter !== 'all' && f.category !== fbCategoryFilter) return false;
                  if (fbSearchQuery.trim()) {
                    const q = fbSearchQuery.toLowerCase();
                    const matchTitle = f.title.toLowerCase().includes(q);
                    const matchDesc = f.description.toLowerCase().includes(q);
                    const matchAuthor = !f.is_anonymous && f.author_username?.toLowerCase().includes(q);
                    if (!matchTitle && !matchDesc && !matchAuthor) return false;
                  }
                  return true;
                })
                .map((item) => {
                  const catInfo = CATEGORY_LABELS[item.category] || CATEGORY_LABELS.other;
                  const statusInfo = STATUS_LABELS[item.status] || STATUS_LABELS.new;
                  const isEditing = editingFeedbackId === item.id;

                  const dateFormatted = new Date(item.created_at).toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <div
                      key={item.id}
                      className="p-5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl space-y-4 transition-all shadow-md"
                    >
                      {/* Top bar info */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-900 pb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-lg border ${catInfo.bg} ${catInfo.color}`}>
                            <span>{catInfo.icon}</span>
                            <span>{catInfo.label}</span>
                          </span>

                          <span className={`inline-flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${statusInfo.badgeBg} ${statusInfo.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                            <span>{statusInfo.label}</span>
                          </span>

                          {item.is_anonymous ? (
                            <span className="inline-flex items-center gap-1 text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800 text-[11px] font-semibold">
                              <EyeOff className="w-3 h-3 text-slate-500" /> Anonym eingereicht
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 text-[11px] font-bold">
                              <UserCheck className="w-3 h-3 text-amber-400" /> @{item.author_username}
                            </span>
                          )}

                          <span className="text-[11px] text-slate-500">{dateFormatted}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-xs text-slate-300 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
                            <ThumbsUp className="w-3 h-3 text-amber-400" /> {item.upvotes?.length || 0} Stimmen
                          </span>

                          {onDeleteFeedback && (
                            <button
                              onClick={() => {
                                setDeleteTargetFeedback(item);
                                setDeleteFeedbackReason('');
                              }}
                              className="p-1.5 text-slate-500 hover:text-red-400 transition-colors border-0 bg-transparent cursor-pointer rounded-lg hover:bg-red-950/30"
                              title="Vorschlag mit Begründung löschen"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Title & Body */}
                      <div>
                        <h4 className="text-base font-bold text-white tracking-wide">
                          {item.title}
                        </h4>
                        <p className="text-xs text-slate-300 mt-1.5 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-900 whitespace-pre-line">
                          {item.description}
                        </p>
                      </div>

                      {/* Admin Note Display if not editing */}
                      {!isEditing && item.admin_notes && (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-extrabold uppercase text-amber-400">
                            <span className="flex items-center gap-1">
                              <Shield className="w-3.5 h-3.5" /> Antwort / Notiz der Moderation:
                              {item.admin_updated_by && <span className="font-normal text-amber-300">(@{item.admin_updated_by})</span>}
                            </span>
                            <button
                              onClick={() => {
                                setEditingFeedbackId(item.id);
                                setEditStatus(item.status);
                                setEditAdminNote(item.admin_notes || '');
                              }}
                              className="text-[10px] text-amber-400 hover:text-amber-300 underline bg-transparent border-0 cursor-pointer"
                            >
                              Bearbeiten
                            </button>
                          </div>
                          <p className="text-xs text-amber-200/90 italic">"{item.admin_notes}"</p>
                        </div>
                      )}

                      {/* Status quick actions & edit response */}
                      {isEditing ? (
                        <div className="p-4 bg-slate-900 rounded-xl border border-amber-500/40 space-y-3 animate-fadeIn">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold uppercase text-amber-400 flex items-center gap-1.5">
                              <Shield className="w-3.5 h-3.5" /> Status & Antwort bearbeiten
                            </span>
                            <button
                              onClick={() => setEditingFeedbackId(null)}
                              className="text-xs text-slate-500 hover:text-white border-0 bg-transparent cursor-pointer"
                            >
                              Abbrechen
                            </button>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                              Neuen Status zuweisen
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                              {(['new', 'in_review', 'planned', 'implemented', 'declined'] as FeedbackStatus[]).map((st) => {
                                const info = STATUS_LABELS[st];
                                return (
                                  <button
                                    key={st}
                                    type="button"
                                    onClick={() => setEditStatus(st)}
                                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                      editStatus === st
                                        ? `${info.badgeBg} ${info.color} ring-1 ring-amber-400`
                                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                                    }`}
                                  >
                                    {info.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                              Öffentliche Antwort / Notiz der Admins
                            </label>
                            <textarea
                              value={editAdminNote}
                              onChange={(e) => setEditAdminNote(e.target.value)}
                              rows={2}
                              placeholder="z.B. Wird im nächsten Web App Update v1.4 integriert! Danke für das Feedback."
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
                            />
                          </div>

                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEditingFeedbackId(null)}
                              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-transparent border-0 cursor-pointer"
                            >
                              Abbrechen
                            </button>
                            <button
                              onClick={() => {
                                onUpdateFeedbackStatus?.(item.id, editStatus, editAdminNote.trim());
                                setEditingFeedbackId(null);
                              }}
                              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase rounded-xl border-0 cursor-pointer shadow flex items-center gap-1.5"
                            >
                              <Check className="w-3.5 h-3.5" /> Speichern & Aktualisieren
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-900">
                          {/* 1-Click Status Quick-Pills */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold uppercase text-slate-500 mr-1">Status setzen:</span>
                            <button
                              onClick={() => onUpdateFeedbackStatus?.(item.id, 'in_review', item.admin_notes)}
                              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all border cursor-pointer ${
                                item.status === 'in_review'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-amber-300'
                              }`}
                            >
                              In Prüfung
                            </button>
                            <button
                              onClick={() => onUpdateFeedbackStatus?.(item.id, 'planned', item.admin_notes)}
                              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all border cursor-pointer ${
                                item.status === 'planned'
                                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-blue-300'
                              }`}
                            >
                              Geplant
                            </button>
                            <button
                              onClick={() => onUpdateFeedbackStatus?.(item.id, 'implemented', item.admin_notes || 'Erfolgreich in der App / Gruppe umgesetzt!')}
                              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all border cursor-pointer ${
                                item.status === 'implemented'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-emerald-300'
                              }`}
                            >
                              Umgesetzt
                            </button>
                            <button
                              onClick={() => onUpdateFeedbackStatus?.(item.id, 'declined', item.admin_notes)}
                              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all border cursor-pointer ${
                                item.status === 'declined'
                                  ? 'bg-slate-800 text-slate-400 border-slate-700'
                                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-300'
                              }`}
                            >
                              Ablehnen
                            </button>
                          </div>

                          <button
                            onClick={() => {
                              setEditingFeedbackId(item.id);
                              setEditStatus(item.status);
                              setEditAdminNote(item.admin_notes || '');
                            }}
                            className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/30 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <MessageSquareQuote className="w-3.5 h-3.5" />
                            <span>{item.admin_notes ? 'Antwort bearbeiten' : 'Antwort verfassen'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* WhatsApp Bot Management Tab */}
      {activeTab === 'whatsapp' && (
        <WhatsAppBotPanel currentUser={currentUser} onShowAlert={onShowAlert} />
      )}

      {/* CREW MEMBER ADD/EDIT MODAL */}
      {crewModalOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="max-w-md w-full rounded-2xl bg-slate-950 border border-purple-800 p-6 relative shadow-2xl">
            <button
              onClick={() => setCrewModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white border-0 bg-transparent cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold uppercase text-amber-400 mb-4">
              {editingCrew ? 'Crew-Mitglied Bearbeiten' : 'Neues Crew-Mitglied Anlegen'}
            </h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (editingCrew) {
                  onEditCrewMember?.(editingCrew.id, {
                    name: crewName,
                    role: crewRole,
                    bio: crewBio,
                    image_url: crewImage,
                    social_ig: crewIg,
                    social_youtube: crewYt,
                  });
                } else {
                  onAddCrewMember?.({
                    name: crewName,
                    role: crewRole,
                    bio: crewBio,
                    image_url: crewImage,
                    social_ig: crewIg,
                    social_youtube: crewYt,
                    sort_order: crewMembers.length + 1,
                  });
                }
                setCrewModalOpen(false);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Name / Pseudonym *</label>
                <input
                  type="text"
                  value={crewName}
                  onChange={(e) => setCrewName(e.target.value)}
                  required
                  placeholder="z.B. Nican"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Rolle / Funktion *</label>
                <input
                  type="text"
                  value={crewRole}
                  onChange={(e) => setCrewRole(e.target.value)}
                  required
                  placeholder="z.B. Gründer & Lead Rider"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Bio / Stecki</label>
                <textarea
                  value={crewBio}
                  onChange={(e) => setCrewBio(e.target.value)}
                  rows={3}
                  placeholder="Über das Crew-Mitglied, gefahrenes Bike..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Instagram Link</label>
                  <input
                    type="url"
                    value={crewIg}
                    onChange={(e) => setCrewIg(e.target.value)}
                    placeholder="https://instagram.com/..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">YouTube Link</label>
                  <input
                    type="url"
                    value={crewYt}
                    onChange={(e) => setCrewYt(e.target.value)}
                    placeholder="https://youtube.com/..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Profilbild Hochladen</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCrewImage}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-black hover:file:bg-amber-400 cursor-pointer"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-extrabold uppercase text-sm shadow-lg transition-all border-0 cursor-pointer mt-4"
              >
                {editingCrew ? 'Mitglied Speichern' : 'Crew-Mitglied Erstellen'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Feedback with Mandatory Reason Modal */}
      {deleteTargetFeedback && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="max-w-md w-full rounded-3xl bg-slate-950 border border-red-500/60 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-500/20 text-red-400 rounded-2xl border border-red-500/40">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold uppercase text-white">Vorschlag Löschen</h3>
                <p className="text-xs text-red-400 font-semibold">Begründung für die Moderation erforderlich</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 text-xs space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Titel des Vorschlags:</span>
              <p className="font-bold text-white text-sm">{deleteTargetFeedback.title}</p>
              <p className="text-[11px] text-slate-400">
                Eingereicht von: {deleteTargetFeedback.is_anonymous ? 'Anonym' : `@${deleteTargetFeedback.author_username}`}
              </p>
            </div>

            {/* Presets */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase text-slate-400 mb-1.5">
                Schnellauswahl Begründung:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Bereits vorhanden / Duplikat',
                  'Technisch leider nicht umsetzbar',
                  'Verstoß gegen die Crew-Richtlinien',
                  'Bereits in anderer Form gelöst',
                  'Thema ist veraltet / nicht mehr relevant',
                  'Nicht im aktuellen Fokus der Crew'
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setDeleteFeedbackReason(preset)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                      deleteFeedbackReason === preset
                        ? 'bg-red-500/20 border-red-500 text-red-300 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Reason Textarea */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase text-slate-400 mb-1.5">
                Individuelle Begründung *
              </label>
              <textarea
                value={deleteFeedbackReason}
                onChange={(e) => setDeleteFeedbackReason(e.target.value)}
                rows={3}
                placeholder="z.B. Wurde bereits in Version 1.3 implementiert oder ist aus Sicherheitsgründen abgelehnt."
                required
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-900">
              <button
                onClick={() => {
                  setDeleteTargetFeedback(null);
                  setDeleteFeedbackReason('');
                }}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white bg-transparent border-0 cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                onClick={() => {
                  if (onDeleteFeedback && deleteFeedbackReason.trim()) {
                    onDeleteFeedback(deleteTargetFeedback.id, deleteFeedbackReason.trim());
                    setDeleteTargetFeedback(null);
                    setDeleteFeedbackReason('');
                  }
                }}
                disabled={!deleteFeedbackReason.trim()}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs uppercase shadow-md border-0 cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Endgültig Löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
