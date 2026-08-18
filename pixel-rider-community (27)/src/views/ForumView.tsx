import React, { useState } from 'react';
import { ForumTopic, User } from '../types';
import { MessageSquare, Plus, MessageCircle, Instagram, Youtube, Trash2, Edit, X, Send } from 'lucide-react';
import { UserRoleBadge } from '../components/UserRoleBadge';
import { UserAvatar } from '../components/UserAvatar';

interface ForumViewProps {
  currentUser: User;
  topics: ForumTopic[];
  allUsers?: User[];
  onAddTopic: (category: string, title: string, content: string) => void;
  onEditTopic: (id: string, category: string, title: string, content: string) => void;
  onDeleteTopic: (id: string) => void;
  onAddReply: (topicId: string, replyText: string) => void;
}

export const ForumView: React.FC<ForumViewProps> = ({
  currentUser,
  topics,
  allUsers = [],
  onAddTopic,
  onEditTopic,
  onDeleteTopic,
  onAddReply,
}) => {
  const [selectedCat, setSelectedCat] = useState<string>('Alle');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [activeTopic, setActiveTopic] = useState<ForumTopic | null>(null);
  const [editTopic, setEditTopic] = useState<ForumTopic | null>(null);

  // Form states
  const [catInput, setCatInput] = useState('Schrauber-Ecke');
  const [titleInput, setTitleInput] = useState('');
  const [contentInput, setContentInput] = useState('');
  const [replyText, setReplyText] = useState('');

  const filteredTopics = topics.filter((t) => {
    if (selectedCat === 'Alle') return true;
    return t.category === selectedCat;
  });

  return (
    <div className="py-6 max-w-6xl mx-auto px-4">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold uppercase text-amber-400 flex items-center gap-2">
            <MessageSquare className="w-8 h-8" /> Wissensaustausch & Forum
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Fragen zu Technik, Schraubertipps & Erfahrungen austauschen
          </p>
        </div>

        <button
          onClick={() => {
            setCatInput('Schrauber-Ecke');
            setTitleInput('');
            setContentInput('');
            setAddModalOpen(true);
          }}
          className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase px-5 py-3 rounded-full transition-all shadow-lg flex items-center gap-2 border-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Neues Thema Erstellen
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Categories */}
        <div className="lg:col-span-1 space-y-2 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
          <h3 className="text-xs font-bold uppercase text-amber-400 mb-3 tracking-wider">Kategorien</h3>
          {['Alle', 'Schrauber-Ecke', 'Fahrtechnik', 'Allgemeines'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all border-0 cursor-pointer ${
                selectedCat === cat
                  ? 'bg-amber-500 text-black font-extrabold shadow-md'
                  : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {cat === 'Alle' ? 'Alle Beiträge' : cat}
            </button>
          ))}
        </div>

        {/* Topics List */}
        <div className="lg:col-span-3 space-y-4">
          {filteredTopics.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
              <MessageSquare className="w-12 h-12 text-purple-500/40 mx-auto mb-2" />
              <p className="text-sm font-bold text-amber-400">Keine Themen in dieser Kategorie</p>
            </div>
          ) : (
            filteredTopics.map((topic) => {
              const isOwner = currentUser.username === topic.author || currentUser.isAdmin || currentUser.isModerator;

              return (
                <div
                  key={topic.id}
                  onClick={() => setActiveTopic(topic)}
                  className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 p-5 rounded-2xl transition-all shadow-lg cursor-pointer group"
                >
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase bg-purple-900/80 text-purple-200 px-3 py-0.5 rounded-full border border-purple-500/30">
                      {topic.category}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1 font-bold">
                      <MessageCircle className="w-3.5 h-3.5" /> {topic.replies?.length || 0}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors mb-2">
                    {topic.title}
                  </h3>

                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed mb-3">
                    {topic.content}
                  </p>

                  <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-800/80">
                    <div className="flex items-center gap-2 flex-wrap">
                      <UserAvatar
                        username={topic.author}
                        allUsers={allUsers}
                        currentUser={currentUser}
                        size="xs"
                        bordered
                        borderColor="border-amber-500/40"
                      />
                      <span className="text-purple-400 font-bold">Von {topic.author}</span>
                      <UserRoleBadge username={topic.author} allUsers={allUsers} currentUser={currentUser} size="xs" />
                    </div>

                    {isOwner && (
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setEditTopic(topic)}
                          className="text-amber-400 hover:underline text-xs p-1 border-0 bg-transparent cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteTopic(topic.id)}
                          className="text-red-400 hover:underline text-xs p-1 border-0 bg-transparent cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add Topic Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="max-w-md w-full rounded-2xl bg-slate-950 border border-purple-800 p-6 relative shadow-2xl">
            <button
              onClick={() => setAddModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white border-0 bg-transparent cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold uppercase text-amber-400 mb-4">Neues Thema Erstellen</h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onAddTopic(catInput, titleInput, contentInput);
                setAddModalOpen(false);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Kategorie *</label>
                <select
                  value={catInput}
                  onChange={(e) => setCatInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Schrauber-Ecke">Schrauber-Ecke</option>
                  <option value="Fahrtechnik">Fahrtechnik</option>
                  <option value="Allgemeines">Allgemeines</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Titel / Frage *</label>
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  placeholder="z.B. Welches Öl verwendet ihr?"
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Beitrag *</label>
                <textarea
                  value={contentInput}
                  onChange={(e) => setContentInput(e.target.value)}
                  rows={4}
                  placeholder="Deine Frage oder Erfahrung..."
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-extrabold uppercase text-sm shadow-lg transition-all border-0 cursor-pointer mt-4"
              >
                Veröffentlichen
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Topic Modal */}
      {editTopic && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="max-w-md w-full rounded-2xl bg-slate-950 border border-amber-500/50 p-6 relative shadow-2xl">
            <button
              onClick={() => setEditTopic(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white border-0 bg-transparent cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold uppercase text-amber-400 mb-4">Beitrag Bearbeiten</h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onEditTopic(editTopic.id, editTopic.category, editTopic.title, editTopic.content);
                setEditTopic(null);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Kategorie</label>
                <select
                  value={editTopic.category}
                  onChange={(e) => setEditTopic({ ...editTopic, category: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Schrauber-Ecke">Schrauber-Ecke</option>
                  <option value="Fahrtechnik">Fahrtechnik</option>
                  <option value="Allgemeines">Allgemeines</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Titel</label>
                <input
                  type="text"
                  value={editTopic.title}
                  onChange={(e) => setEditTopic({ ...editTopic, title: e.target.value })}
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Beitrag</label>
                <textarea
                  value={editTopic.content}
                  onChange={(e) => setEditTopic({ ...editTopic, content: e.target.value })}
                  rows={4}
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-extrabold uppercase text-sm shadow-lg transition-all border-0 cursor-pointer mt-4"
              >
                Änderungen Speichern
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Topic Chat / Thread Reply Modal */}
      {activeTopic && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
          <div className="max-w-2xl w-full rounded-2xl bg-slate-950 border border-purple-800 p-6 relative shadow-2xl flex flex-col h-[80vh]">
            <button
              onClick={() => setActiveTopic(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white border-0 bg-transparent cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4 pr-6">
              <span className="text-[10px] font-bold uppercase bg-purple-900 text-purple-200 px-3 py-0.5 rounded-full inline-block mb-1">
                {activeTopic.category}
              </span>
              <h3 className="text-xl font-bold uppercase text-amber-400">{activeTopic.title}</h3>
            </div>

            {/* Main post & replies */}
            <div className="flex-1 overflow-y-auto space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800 mb-4">
              {/* Original Post */}
              <div className="bg-slate-900 p-4 rounded-xl border border-purple-800/40">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <UserAvatar
                    username={activeTopic.author}
                    allUsers={allUsers}
                    currentUser={currentUser}
                    size="sm"
                    bordered
                    borderColor="border-amber-500/40"
                  />
                  <span className="text-xs font-bold text-amber-400">
                    {activeTopic.author} (Ersteller)
                  </span>
                  <UserRoleBadge username={activeTopic.author} allUsers={allUsers} currentUser={currentUser} size="xs" />
                </div>
                <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {activeTopic.content}
                </p>
              </div>

              {/* Replies */}
              {activeTopic.replies?.map((r, idx) => (
                <div key={idx} className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                  <div className="flex justify-between items-center mb-1 flex-wrap gap-1">
                    <div className="flex items-center gap-2">
                      <UserAvatar
                        username={r.author}
                        allUsers={allUsers}
                        currentUser={currentUser}
                        size="xs"
                        bordered
                        borderColor="border-amber-500/30"
                      />
                      <span className="text-xs font-bold text-purple-400">{r.author}</span>
                      <UserRoleBadge username={r.author} allUsers={allUsers} currentUser={currentUser} size="xs" />
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {new Date(r.time).toLocaleDateString('de-DE')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 whitespace-pre-wrap">{r.text}</p>
                </div>
              ))}
            </div>

            {/* Reply Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (replyText.trim()) {
                  onAddReply(activeTopic.id, replyText.trim());
                  // update activeTopic locally for immediate view
                  setActiveTopic({
                    ...activeTopic,
                    replies: [
                      ...(activeTopic.replies || []),
                      { author: currentUser.username, text: replyText.trim(), time: new Date().toISOString() },
                    ],
                  });
                  setReplyText('');
                }
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Antwort verfassen..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase rounded-xl border-0 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
