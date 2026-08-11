import React, { useState } from 'react';
import { User, UserRole, MarketAppeal, CrewMember, PixelOfMonth } from '../types';
import { Shield, Key, Users, CheckCircle, Trash2, RotateCw, Hammer, Trophy, Plus, Edit, X, Star, Instagram, Youtube, Image as ImageIcon } from 'lucide-react';

interface AdminViewProps {
  currentUser: User;
  users: User[];
  invites: { code: string; created_by: string; is_used: boolean; used_by?: string }[];
  appeals: MarketAppeal[];
  crewMembers?: CrewMember[];
  pixelOfMonth: PixelOfMonth | null;
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
  onSetPixelOfMonth: (pixel: PixelOfMonth) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  currentUser,
  users,
  invites,
  appeals,
  crewMembers = [],
  pixelOfMonth,
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
  onSetPixelOfMonth,
}) => {
  const [activeTab, setActiveTab] = useState<'invites' | 'users' | 'crew' | 'appeals'>('crew');
  const [crewSubTab, setCrewSubTab] = useState<'members' | 'pixel_month'>('members');

  // Crew Modal state
  const [crewModalOpen, setCrewModalOpen] = useState(false);
  const [editingCrew, setEditingCrew] = useState<CrewMember | null>(null);
  const [crewName, setCrewName] = useState('');
  const [crewRole, setCrewRole] = useState('');
  const [crewBio, setCrewBio] = useState('');
  const [crewImage, setCrewImage] = useState('');
  const [crewIg, setCrewIg] = useState('');
  const [crewYt, setCrewYt] = useState('');

  // Pixel des Monats state
  const [pomUsername, setPomUsername] = useState(pixelOfMonth?.username || '');
  const [pomTitle, setPomTitle] = useState(pixelOfMonth?.title || 'Pixel des Monats');
  const [pomReason, setPomReason] = useState(pixelOfMonth?.reason || '');
  const [pomImage, setPomImage] = useState(pixelOfMonth?.image_url || '');
  const [pomBike, setPomBike] = useState(pixelOfMonth?.bike || '');
  const [pomIg, setPomIg] = useState(pixelOfMonth?.social_ig || '');
  const [pomTt, setPomTt] = useState(pixelOfMonth?.social_tiktok || '');
  const [pomYt, setPomYt] = useState(pixelOfMonth?.social_youtube || '');
  const [autoFillNotice, setAutoFillNotice] = useState<string | null>(null);

  const handlePomUsernameChange = (uname: string) => {
    setPomUsername(uname);
    const targetUser = users.find((u) => u.username.toLowerCase() === uname.toLowerCase().trim());
    if (targetUser) {
      if (targetUser.social_ig) setPomIg(targetUser.social_ig);
      if (targetUser.social_tiktok) setPomTt(targetUser.social_tiktok);
      if (targetUser.social_youtube) setPomYt(targetUser.social_youtube);

      // Check crew image if applicable
      const matchedCrew = crewMembers.find((c) => c.name.toLowerCase() === uname.toLowerCase().trim());
      if (matchedCrew?.image_url && !pomImage) {
        setPomImage(matchedCrew.image_url);
      }

      const foundSocials = [
        targetUser.social_ig && 'Instagram',
        targetUser.social_tiktok && 'TikTok',
        targetUser.social_youtube && 'YouTube',
      ].filter(Boolean);

      if (foundSocials.length > 0) {
        setAutoFillNotice(`✨ Profile-Links (${foundSocials.join(', ')}) für ${targetUser.username} wurden automatisch vorausgefüllt!`);
      } else {
        setAutoFillNotice(`User „${targetUser.username}“ in der Datenbank gefunden.`);
      }
    } else {
      setAutoFillNotice(null);
    }
  };

  const handleCrewImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.readAsDataURL(e.target.files[0]);
      reader.onload = () => setCrewImage(reader.result as string);
    }
  };

  const handlePomImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.readAsDataURL(e.target.files[0]);
      reader.onload = () => setPomImage(reader.result as string);
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
          <Users className="w-4 h-4 text-purple-400" /> Crew & Pixel des Monats
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
      {activeTab === 'users' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-base font-bold uppercase text-amber-400 mb-6">Mitglieder & Rechteverwaltung</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="p-3">Username</th>
                  <th className="p-3">Rolle</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Rolle Ändern / Aktion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.map((u) => {
                  const isSystemAdmin = u.username.toLowerCase() === 'nican';

                  return (
                    <tr key={u.username} className="hover:bg-slate-800/50">
                      <td className="p-3 font-bold text-white">{u.username}</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          u.role === 'admin' ? 'bg-red-900/80 text-red-300' :
                          u.role === 'moderator' ? 'bg-amber-900/80 text-amber-300' : 'bg-purple-900/80 text-purple-300'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3">
                        {u.is_deactivated ? (
                          <span className="bg-red-900/60 text-red-300 px-2 py-0.5 rounded text-[10px]">Gesperrt</span>
                        ) : (
                          <span className="bg-emerald-900/60 text-emerald-300 px-2 py-0.5 rounded text-[10px]">Aktiv</span>
                        )}
                      </td>
                      <td className="p-3 text-right space-x-2">
                        {!isSystemAdmin ? (
                          <>
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
                                className="p-1 text-red-400 hover:text-red-300 border-0 bg-transparent cursor-pointer"
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
      )}

      {/* CREW & PIXEL DES MONATS TAB */}
      {activeTab === 'crew' && (
        <div className="space-y-6">
          {/* Sub-Tabs Toggle Bar */}
          <div className="flex justify-center gap-3 bg-slate-950 p-1.5 rounded-full border border-slate-800 max-w-md mx-auto shadow-inner">
            <button
              onClick={() => setCrewSubTab('members')}
              className={`flex-1 py-2 rounded-full font-extrabold uppercase text-xs transition-all border-0 cursor-pointer flex items-center justify-center gap-2 ${
                crewSubTab === 'members'
                  ? 'bg-gradient-to-r from-purple-900 to-amber-500 text-white shadow-lg border border-amber-400/40'
                  : 'text-slate-400 hover:text-white bg-transparent'
              }`}
            >
              <Users className="w-4 h-4" /> Crew-Mitglieder ({crewMembers.length})
            </button>
            <button
              onClick={() => setCrewSubTab('pixel_month')}
              className={`flex-1 py-2 rounded-full font-extrabold uppercase text-xs transition-all border-0 cursor-pointer flex items-center justify-center gap-2 ${
                crewSubTab === 'pixel_month'
                  ? 'bg-gradient-to-r from-purple-900 to-amber-500 text-white shadow-lg border border-amber-400/40'
                  : 'text-slate-400 hover:text-white bg-transparent'
              }`}
            >
              <Trophy className="w-4 h-4 text-amber-400" /> Pixel des Monats
            </button>
          </div>

          {/* SUB-TAB 1: CREW MEMBERS LIST */}
          {crewSubTab === 'members' && (
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

          {/* SUB-TAB 2: PIXEL DES MONATS FORM */}
          {crewSubTab === 'pixel_month' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="mb-6">
                <h3 className="text-lg font-bold uppercase text-amber-400 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" /> Pixel des Monats Kürung
                </h3>
                <p className="text-xs text-slate-400">
                  Küre ein Mitglied der Community. Tippe den Namen ein oder wähle einen User aus — Instagram, TikTok & YouTube Links werden automatisch aus der Datenbank geladen!
                </p>
              </div>

              {autoFillNotice && (
                <div className="mb-4 bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold px-4 py-3 rounded-xl flex items-center gap-2">
                  <span>{autoFillNotice}</span>
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onSetPixelOfMonth({
                    username: pomUsername,
                    title: pomTitle,
                    reason: pomReason,
                    image_url: pomImage,
                    bike: pomBike,
                    social_ig: pomIg,
                    social_tiktok: pomTt,
                    social_youtube: pomYt,
                  });
                }}
                className="space-y-4 max-w-2xl"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                      User Name (Aus Datenbank wählen) *
                    </label>
                    <input
                      type="text"
                      list="user-suggestions"
                      value={pomUsername}
                      onChange={(e) => handlePomUsernameChange(e.target.value)}
                      placeholder="Name eingeben oder aus Liste wählen..."
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                    <datalist id="user-suggestions">
                      {users.map((u, i) => (
                        <option key={i} value={u.username}>
                          {u.username} ({u.role})
                        </option>
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Titel / Monats-Award *</label>
                    <input
                      type="text"
                      value={pomTitle}
                      onChange={(e) => setPomTitle(e.target.value)}
                      placeholder="z.B. Pixel des Monats – August 2026"
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Begründung & Ehrung *</label>
                  <textarea
                    value={pomReason}
                    onChange={(e) => setPomReason(e.target.value)}
                    rows={3}
                    placeholder="Warum ist diese Person Pixel des Monats geworden?"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Motorrad / Bike Modell</label>
                  <input
                    type="text"
                    value={pomBike}
                    onChange={(e) => setPomBike(e.target.value)}
                    placeholder="z.B. Yamaha MT-09 SP"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Auto-populated social media links */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-pink-400 mb-1">
                      Instagram Link / Name
                    </label>
                    <input
                      type="text"
                      value={pomIg}
                      onChange={(e) => setPomIg(e.target.value)}
                      placeholder="https://instagram.com/... oder Username"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-cyan-400 mb-1">
                      TikTok Link / Name
                    </label>
                    <input
                      type="text"
                      value={pomTt}
                      onChange={(e) => setPomTt(e.target.value)}
                      placeholder="https://tiktok.com/@... oder Username"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-red-400 mb-1">
                      YouTube Link / Channel
                    </label>
                    <input
                      type="text"
                      value={pomYt}
                      onChange={(e) => setPomYt(e.target.value)}
                      placeholder="https://youtube.com/@... oder Channel"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Highlight Foto / Portrait</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePomImage}
                    className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-black hover:file:bg-amber-400 cursor-pointer mb-2"
                  />
                  {pomImage && (
                    <div className="w-32 h-32 rounded-xl overflow-hidden border border-amber-500/50 mt-2">
                      <img src={pomImage} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase rounded-full shadow-lg transition-all border-0 cursor-pointer flex items-center gap-2"
                >
                  <Star className="w-4 h-4 fill-black" />
                  Pixel des Monats Veröffentlichen
                </button>
              </form>
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
