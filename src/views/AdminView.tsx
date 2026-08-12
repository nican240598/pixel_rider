import React, { useState } from 'react';
import { User, UserRole, MarketAppeal, CrewMember, CrewEvent } from '../types';
import { Shield, Key, Users, CheckCircle, Trash2, RotateCw, Hammer, Plus, Edit, X, Star, Instagram, Youtube, Image as ImageIcon, Bell, AlertTriangle, Calendar, UserCheck } from 'lucide-react';

interface AdminViewProps {
  currentUser: User;
  users: User[];
  invites: { code: string; created_by: string; is_used: boolean; used_by?: string }[];
  appeals: MarketAppeal[];
  crewMembers?: CrewMember[];
  events?: CrewEvent[];
  onGenerateInvite: () => void;
  onToggleInvite: (code: string, currentUsed: boolean) => void;
  onDeleteInvite: (code: string) => void;
  onChangeUserRole: (username: string, role: UserRole) => void;
  onToggleUserStatus: (username: string, currentDeactivated: boolean) => void;
  onDeleteUser: (username: string) => void;
  onResolveAppeal: (appealId: string, resolution: 'accept' | 'reject') => void;
  onAddCrewMember?: (member: Omit<CrewMember, 'id'>) => void;
  onEditCrewMember?: (id: string, member: Partial<CrewMember>) => void;
  onDeleteCrewMember?: (id: string) => void;
  onSendInactivityWarning?: (username: string) => void;
  onSendInactivityWarningToAll?: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  currentUser,
  users,
  invites,
  appeals,
  crewMembers = [],
  events = [],
  onGenerateInvite,
  onToggleInvite,
  onDeleteInvite,
  onChangeUserRole,
  onToggleUserStatus,
  onDeleteUser,
  onResolveAppeal,
  onAddCrewMember,
  onEditCrewMember,
  onDeleteCrewMember,
  onSendInactivityWarning,
  onSendInactivityWarningToAll,
}) => {
  const [activeTab, setActiveTab] = useState<'invites' | 'users' | 'crew' | 'appeals'>('crew');

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
      <div className="flex flex-wrap justify-center border-b border-slate-800 mb-8 gap-2">
        <button
          onClick={() => setActiveTab('invites')}
          className={`px-5 py-3 font-bold uppercase text-xs tracking-wider flex items-center gap-2 border-b-2 transition-colors bg-transparent border-0 cursor-pointer ${
            activeTab === 'invites' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400'
          }`}
        >
          <Key className="w-4 h-4" /> Invites ({invites.length})
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-5 py-3 font-bold uppercase text-xs tracking-wider flex items-center gap-2 border-b-2 transition-colors bg-transparent border-0 cursor-pointer ${
            activeTab === 'users' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400'
          }`}
        >
          <Users className="w-4 h-4" /> User & Rechte ({users.length})
        </button>

        <button
          onClick={() => setActiveTab('crew')}
          className={`px-5 py-3 font-bold uppercase text-xs tracking-wider flex items-center gap-2 border-b-2 transition-colors bg-transparent border-0 cursor-pointer ${
            activeTab === 'crew' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400'
          }`}
        >
          <Users className="w-4 h-4 text-purple-400" /> Crew ({crewMembers.length})
        </button>

        <button
          onClick={() => setActiveTab('appeals')}
          className={`px-5 py-3 font-bold uppercase text-xs tracking-wider flex items-center gap-2 border-b-2 transition-colors bg-transparent border-0 cursor-pointer ${
            activeTab === 'appeals' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400'
          }`}
        >
          <Hammer className="w-4 h-4" /> Einsprüche ({appeals.length})
        </button>
      </div>

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

                      return (
                        <tr key={u.username} className={`hover:bg-slate-800/50 transition-colors ${inactive ? 'bg-red-950/10' : ''}`}>
                          <td className="p-3 font-bold text-white">
                            <div>{u.username}</div>
                            <span className="text-[10px] text-slate-500 font-normal">{u.email}</span>
                          </td>
                          <td className="p-3">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                              u.role === 'admin' ? 'bg-red-900/80 text-red-300' :
                              u.role === 'moderator' ? 'bg-amber-900/80 text-amber-300' : 'bg-purple-900/80 text-purple-300'
                            }`}>
                              {u.role}
                            </span>
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
                            {inactive ? (
                              <span className="bg-red-900/60 text-red-300 border border-red-500/30 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 w-fit">
                                <AlertTriangle className="w-3 h-3 text-red-400" /> Inaktiv (&gt;3 Monate)
                              </span>
                            ) : u.is_deactivated ? (
                              <span className="bg-red-950 text-red-400 px-2 py-0.5 rounded text-[10px]">Gesperrt</span>
                            ) : (
                              <span className="bg-emerald-950 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 w-fit">
                                <UserCheck className="w-3 h-3 text-emerald-400" /> Aktiv
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right space-x-2">
                            {!isSystemAdmin ? (
                              <>
                                {inactive && onSendInactivityWarning && (
                                  <button
                                    onClick={() => onSendInactivityWarning(u.username)}
                                    className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-full text-[10px] font-bold border border-amber-500/40 cursor-pointer inline-flex items-center gap-1"
                                    title="Push-Warnung bezüglich bevorstehendem Community-Kick senden"
                                  >
                                    <Bell className="w-3 h-3 text-amber-400" /> Warnung
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
                                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full text-[10px] font-bold border-0 cursor-pointer"
                                >
                                  {u.is_deactivated ? 'Entsperren' : 'Sperren'}
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
    </div>
  );
};
