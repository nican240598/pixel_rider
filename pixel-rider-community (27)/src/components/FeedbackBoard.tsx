import React, { useState, useEffect } from 'react';
import { User, FeedbackSuggestion, FeedbackCategory, FeedbackStatus } from '../types';
import {
  Lightbulb,
  Plus,
  ThumbsUp,
  Shield,
  Clock,
  Sparkles,
  Search,
  UserCheck,
  EyeOff,
  X,
  Send,
  Trash2,
  RotateCcw,
  AlertTriangle,
  Layers,
  Check
} from 'lucide-react';
import { UserRoleBadge } from './UserRoleBadge';

interface FeedbackBoardProps {
  currentUser: User;
  feedbacks: FeedbackSuggestion[];
  allUsers?: User[];
  onSubmitFeedback: (data: {
    title: string;
    description: string;
    category: FeedbackCategory;
    is_anonymous: boolean;
  }) => void;
  onUpvoteFeedback: (feedbackId: string) => void;
  onDeleteFeedback?: (feedbackId: string, reason?: string) => void;
  onNavigateToAdmin?: () => void;
  showAlert?: (title: string, message: string, type?: 'success' | 'warning' | 'danger') => void;
  isModalMode?: boolean;
  onCloseModal?: () => void;
}

export const CATEGORY_LABELS: Record<FeedbackCategory, { label: string; icon: string; color: string; bg: string }> = {
  webapp: {
    label: 'Web App & Features',
    icon: '💻',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-500/30'
  },
  crew_rides: {
    label: 'Crew & Ausfahrten',
    icon: '🏍️',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/30'
  },
  events: {
    label: 'Events & Treffen',
    icon: '📅',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/30'
  },
  general: {
    label: 'Community & Feedback',
    icon: '💬',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/30'
  },
  other: {
    label: 'Sonstiges',
    icon: '💡',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10 border-rose-500/30'
  }
};

export const STATUS_LABELS: Record<FeedbackStatus, { label: string; color: string; badgeBg: string; dot: string }> = {
  new: {
    label: 'Neu eingereicht',
    color: 'text-purple-300',
    badgeBg: 'bg-purple-500/20 border-purple-500/40',
    dot: 'bg-purple-400'
  },
  in_review: {
    label: 'In Prüfung',
    color: 'text-amber-300',
    badgeBg: 'bg-amber-500/20 border-amber-500/40',
    dot: 'bg-amber-400'
  },
  planned: {
    label: 'Geplant',
    color: 'text-blue-300',
    badgeBg: 'bg-blue-500/20 border-blue-500/40',
    dot: 'bg-blue-400'
  },
  implemented: {
    label: 'Umgesetzt',
    color: 'text-emerald-300',
    badgeBg: 'bg-emerald-500/20 border-emerald-500/40',
    dot: 'bg-emerald-400'
  },
  declined: {
    label: 'Abgelehnt',
    color: 'text-slate-400',
    badgeBg: 'bg-slate-800 border-slate-700',
    dot: 'bg-slate-500'
  }
};

const DELETE_PRESETS = [
  'Bereits vorhanden / Duplikat',
  'Technisch leider nicht umsetzbar',
  'Verstoß gegen die Crew-Richtlinien',
  'Bereits in anderer Form gelöst',
  'Thema ist veraltet / nicht mehr relevant',
  'Nicht im aktuellen Fokus der Crew'
];

export const FeedbackBoard: React.FC<FeedbackBoardProps> = ({
  currentUser,
  feedbacks = [],
  allUsers = [],
  onSubmitFeedback,
  onUpvoteFeedback,
  onDeleteFeedback,
  onNavigateToAdmin,
  showAlert,
  isModalMode = false,
  onCloseModal
}) => {
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<FeedbackCategory | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<FeedbackStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Local storage tracking for authored items (supports anonymous withdrawals too)
  const [myCreatedIds, setMyCreatedIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('my_created_feedback_ids');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Modal for admin/mod deletion with mandatory reason
  const [adminDeleteTarget, setAdminDeleteTarget] = useState<FeedbackSuggestion | null>(null);
  const [adminDeleteReason, setAdminDeleteReason] = useState('');

  // Modal for author withdrawal
  const [withdrawTarget, setWithdrawTarget] = useState<FeedbackSuggestion | null>(null);

  // New feedback form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<FeedbackCategory>('webapp');
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Save new id to local array
  const handleSaveSubmittedId = (id: string) => {
    const updated = [...myCreatedIds, id];
    setMyCreatedIds(updated);
    try {
      localStorage.setItem('my_created_feedback_ids', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showAlert?.('Fehlender Titel', 'Bitte gib deiner Idee oder deinem Feedback einen Titel.', 'warning');
      return;
    }
    if (!description.trim()) {
      showAlert?.('Fehlende Beschreibung', 'Bitte beschreibe deinen Vorschlag etwas genauer.', 'warning');
      return;
    }

    const tempId = Date.now().toString();
    handleSaveSubmittedId(tempId);

    onSubmitFeedback({
      title: title.trim(),
      description: description.trim(),
      category,
      is_anonymous: isAnonymous
    });

    setTitle('');
    setDescription('');
    setCategory('webapp');
    setIsAnonymous(false);
    setShowSubmitModal(false);
  };

  // Perform author withdrawal
  const handleConfirmWithdraw = () => {
    if (!withdrawTarget || !onDeleteFeedback) return;
    onDeleteFeedback(withdrawTarget.id);
    setWithdrawTarget(null);
    showAlert?.('Vorschlag zurückgezogen', 'Deine Idee bzw. dein Feedback wurde erfolgreich zurückgezogen und gelöscht.', 'warning');
  };

  // Perform admin deletion with mandatory reason
  const handleConfirmAdminDelete = () => {
    if (!adminDeleteTarget || !onDeleteFeedback) return;
    if (!adminDeleteReason.trim()) {
      showAlert?.('Begründung erforderlich', 'Bitte gib eine Begründung für die Löschung an.', 'danger');
      return;
    }
    onDeleteFeedback(adminDeleteTarget.id, adminDeleteReason.trim());
    setAdminDeleteTarget(null);
    setAdminDeleteReason('');
  };

  // Stats calculation
  const totalCount = feedbacks.length;
  const inReviewCount = feedbacks.filter((f) => f.status === 'in_review' || f.status === 'new').length;
  const plannedCount = feedbacks.filter((f) => f.status === 'planned').length;
  const implementedCount = feedbacks.filter((f) => f.status === 'implemented').length;

  // Filter feedbacks
  const filteredFeedbacks = feedbacks.filter((item) => {
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
    if (selectedStatus !== 'all' && item.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchAuthor = !item.is_anonymous && item.author_username?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchAuthor) return false;
    }
    return true;
  });

  return (
    <div className={`bg-slate-900/95 border-2 border-amber-500/50 rounded-3xl p-5 sm:p-8 shadow-2xl space-y-6 relative ${isModalMode ? 'max-h-[90vh] overflow-y-auto' : ''}`}>
      {/* Modal Close Button if in Modal Mode */}
      {isModalMode && onCloseModal && (
        <button
          onClick={onCloseModal}
          className="absolute top-5 right-5 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all border-0 cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div className="flex items-start sm:items-center gap-3.5 pr-8">
          <div className="p-3.5 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 shadow-inner flex-shrink-0">
            <Lightbulb className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl sm:text-2xl font-extrabold uppercase text-white tracking-wide">
                Ideen & <span className="text-amber-400">Feedback-Board</span>
              </h3>
              <span className="text-amber-400 text-xs px-3 py-1 bg-amber-500/20 border border-amber-500/40 rounded-full font-extrabold">
                Community Driven
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
              Reiche Verbesserungsvorschläge für die Crew & Web App ein, vote für Favoriten oder ziehe eigene Ideen jederzeit zurück.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {(currentUser.isAdmin || currentUser.isModerator) && onNavigateToAdmin && (
            <button
              onClick={onNavigateToAdmin}
              className="px-3.5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-amber-400 border border-amber-500/30 font-bold text-xs uppercase transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" /> Admin-Center
            </button>
          )}

          <button
            onClick={() => setShowSubmitModal(true)}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase shadow-lg shadow-amber-500/20 border-0 cursor-pointer flex items-center justify-center gap-2 transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4" /> Vorschlag Einreichen
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 flex items-center gap-3">
          <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20 font-bold text-xs">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-extrabold text-slate-400 block">Gesamt</span>
            <span className="text-lg font-black text-white">{totalCount}</span>
          </div>
        </div>

        <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20 font-bold text-xs">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-extrabold text-slate-400 block">In Prüfung</span>
            <span className="text-lg font-black text-amber-400">{inReviewCount}</span>
          </div>
        </div>

        <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20 font-bold text-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-extrabold text-slate-400 block">Geplant</span>
            <span className="text-lg font-black text-blue-400">{plannedCount}</span>
          </div>
        </div>

        <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 font-bold text-xs">
            <Check className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-extrabold text-slate-400 block">Umgesetzt</span>
            <span className="text-lg font-black text-emerald-400">{implementedCount}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className="space-y-3 pt-2">
        {/* Category Pills & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar touch-pan-x flex-nowrap scroll-smooth px-0.5">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-amber-500 text-black border-amber-400 shadow-md font-extrabold'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              Alle Themen ({feedbacks.length})
            </button>
            {(Object.keys(CATEGORY_LABELS) as FeedbackCategory[]).map((cat) => {
              const info = CATEGORY_LABELS[cat];
              const count = feedbacks.filter((f) => f.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    selectedCategory === cat
                      ? `${info.bg} ${info.color} border-current shadow-md font-extrabold`
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <span>{info.icon}</span>
                  <span>{info.label}</span>
                  <span className="text-[10px] opacity-70">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Vorschlag oder Thema suchen..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white border-0 bg-transparent cursor-pointer p-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Status Sub-Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar touch-pan-x flex-nowrap scroll-smooth px-0.5 text-xs">
          <span className="text-[10px] font-extrabold uppercase text-slate-500 mr-1 shrink-0">Status:</span>
          <button
            onClick={() => setSelectedStatus('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border shrink-0 cursor-pointer ${
              selectedStatus === 'all'
                ? 'bg-slate-800 text-white border-slate-700 font-bold'
                : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            Alle ({feedbacks.length})
          </button>
          {(['new', 'in_review', 'planned', 'implemented', 'declined'] as FeedbackStatus[]).map((st) => {
            const info = STATUS_LABELS[st];
            const count = feedbacks.filter((f) => f.status === st).length;
            if (count === 0 && selectedStatus !== st) return null;
            return (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  selectedStatus === st
                    ? `${info.badgeBg} ${info.color} font-bold`
                    : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${info.dot}`} />
                <span>{info.label}</span>
                <span className="text-[10px] opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Feedback cards grid */}
      {filteredFeedbacks.length === 0 ? (
        <div className="text-center py-14 bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 text-slate-500 flex items-center justify-center mx-auto">
            <Lightbulb className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-white">Keine Vorschläge gefunden</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all'
              ? 'Passe deine Filterkriterien an oder reiche einen neuen Vorschlag ein!'
              : 'Sei der Erste und reiche deine Idee zur Verbesserung der Crew oder der Web App ein!'}
          </p>
          <button
            onClick={() => setShowSubmitModal(true)}
            className="mt-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase shadow-md border-0 cursor-pointer inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Ersten Vorschlag einreichen
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFeedbacks.map((item) => {
            const catInfo = CATEGORY_LABELS[item.category] || CATEGORY_LABELS.other;
            const statusInfo = STATUS_LABELS[item.status] || STATUS_LABELS.new;
            const upvotesList = item.upvotes || [];
            const hasUpvoted = currentUser ? upvotesList.includes(currentUser.username) : false;
            
            // Check if current user is the author (by username or saved id on this device)
            const isAuthor = (!item.is_anonymous && item.author_username === currentUser?.username) ||
              myCreatedIds.includes(item.id);
            const isAdminOrMod = currentUser?.isAdmin || currentUser?.isModerator;

            const dateFormatted = new Date(item.created_at).toLocaleDateString('de-DE', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            });

            return (
              <div
                key={item.id}
                className="bg-slate-950 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all p-5 flex flex-col justify-between space-y-4 relative group shadow-lg"
              >
                {/* Top meta info */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-lg border ${catInfo.bg} ${catInfo.color}`}>
                      <span>{catInfo.icon}</span>
                      <span>{catInfo.label}</span>
                    </span>

                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${statusInfo.badgeBg} ${statusInfo.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                      <span>{statusInfo.label}</span>
                    </span>
                  </div>

                  {/* Title and Description */}
                  <div>
                    <h4 className="text-base font-bold text-white tracking-wide leading-snug">
                      {item.title}
                    </h4>
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed whitespace-pre-line">
                      {item.description}
                    </p>
                  </div>

                  {/* Admin notes callout box if present */}
                  {item.admin_notes && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1 mt-3">
                      <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase text-amber-400">
                        <Shield className="w-3.5 h-3.5" />
                        <span>Antwort der Moderation / Admins:</span>
                        {item.admin_updated_by && (
                          <span className="text-[10px] text-amber-300 font-normal">(@{item.admin_updated_by})</span>
                        )}
                      </div>
                      <p className="text-xs text-amber-200/90 italic leading-relaxed">
                        "{item.admin_notes}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Bottom Bar: Author, Date, Upvotes and Actions */}
                <div className="pt-3 border-t border-slate-900 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    {item.is_anonymous ? (
                      <span className="inline-flex items-center gap-1 text-slate-400 font-semibold bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800 text-[11px]">
                        <EyeOff className="w-3 h-3 text-slate-500" /> Anonym
                        {isAuthor && <span className="text-amber-400 font-bold ml-0.5">(Du)</span>}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 text-[11px] flex-wrap">
                        <UserCheck className="w-3 h-3 text-amber-400" /> @{item.author_username}
                        <UserRoleBadge username={item.author_username} allUsers={allUsers} currentUser={currentUser} size="xs" />
                        {isAuthor && <span className="text-white font-normal ml-0.5">(Du)</span>}
                      </span>
                    )}
                    <span className="text-[11px] text-slate-500">{dateFormatted}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Upvote button */}
                    <button
                      onClick={() => onUpvoteFeedback(item.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        hasUpvoted
                          ? 'bg-amber-500 text-black border-amber-400 shadow-md scale-105'
                          : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-amber-400 hover:border-amber-500/40'
                      }`}
                      title={hasUpvoted ? 'Du unterstützt diesen Vorschlag bereits' : 'Diesen Vorschlag unterstützen'}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>{upvotesList.length}</span>
                    </button>

                    {/* Author: Withdraw own proposal anytime */}
                    {isAuthor && onDeleteFeedback && (
                      <button
                        onClick={() => setWithdrawTarget(item)}
                        className="px-2.5 py-1 text-[11px] font-bold text-slate-400 hover:text-amber-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                        title="Diesen Vorschlag zurückziehen und löschen"
                      >
                        <RotateCcw className="w-3 h-3 text-amber-400" />
                        <span>Zurückziehen</span>
                      </button>
                    )}

                    {/* Admin / Mod: Delete with mandatory reason */}
                    {!isAuthor && isAdminOrMod && onDeleteFeedback && (
                      <button
                        onClick={() => {
                          setAdminDeleteTarget(item);
                          setAdminDeleteReason('');
                        }}
                        className="p-1.5 text-slate-500 hover:text-red-400 transition-colors border-0 bg-transparent cursor-pointer rounded-lg hover:bg-red-950/30"
                        title="Vorschlag als Admin/Mod löschen (mit Begründung)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SUBMISSION MODAL */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="max-w-lg w-full rounded-3xl bg-slate-950 border border-amber-500/60 p-6 sm:p-8 relative shadow-2xl max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowSubmitModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white border-0 bg-transparent cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                <Lightbulb className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold uppercase text-white">
                  Neuen Vorschlag <span className="text-amber-400">Einreichen</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Hilf uns, die App und die Crew noch besser zu machen.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Category selector */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">
                  Kategorie wählen *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(Object.keys(CATEGORY_LABELS) as FeedbackCategory[]).map((cat) => {
                    const info = CATEGORY_LABELS[cat];
                    const isSelected = category === cat;
                    return (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => setCategory(cat)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-400 text-white shadow-md'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                        }`}
                      >
                        <span className="text-base mb-1">{info.icon}</span>
                        <span className="text-xs font-bold">{info.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title input */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">
                  Titel der Idee / des Feedbacks *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="z.B. Routen-Export als GPX direkt aufs Navi"
                  required
                  maxLength={100}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Description input */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">
                  Genaue Beschreibung *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Erkläre deinen Vorschlag, warum er für die Gruppe hilfreich wäre..."
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              {/* Anonymous Toggle Option */}
              <div
                className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 flex items-start gap-3 cursor-pointer select-none"
                onClick={() => setIsAnonymous(!isAnonymous)}
              >
                <input
                  type="checkbox"
                  id="anonymousCheck"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
                <label htmlFor="anonymousCheck" className="text-xs text-slate-300 cursor-pointer space-y-0.5">
                  <span className="font-extrabold text-white block flex items-center gap-1.5">
                    {isAnonymous ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <UserCheck className="w-3.5 h-3.5 text-slate-400" />}
                    {isAnonymous ? 'Anonym einreichen (Aktiviert)' : 'Als @' + (currentUser?.username || 'Rider') + ' einreichen'}
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    {isAnonymous
                      ? '🔒 Dein Benutzername wird nicht gespeichert. Niemand sieht, wer dies geschrieben hat. Du kannst den Vorschlag trotzdem jederzeit von diesem Gerät zurückziehen.'
                      : 'Dein Profilname wird als Autor auf dem Board angezeigt.'}
                  </span>
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-extrabold uppercase text-xs tracking-wider shadow-lg shadow-amber-500/20 transition-all border-0 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" /> Vorschlag Veröffentlichen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AUTHOR: WITHDRAW PROPOSAL MODAL */}
      {withdrawTarget && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="max-w-md w-full rounded-3xl bg-slate-950 border border-amber-500/60 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/40">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold uppercase text-white">Vorschlag Zurückziehen?</h3>
                <p className="text-xs text-slate-400">Deine eigene Idee aus dem Board entfernen</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 text-xs space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Ausgewählter Vorschlag:</span>
              <p className="font-bold text-white text-sm">{withdrawTarget.title}</p>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Möchtest du diesen Vorschlag wirklich zurückziehen? Er wird dauerhaft aus dem Ideen-Board gelöscht und kann nicht wiederhergestellt werden.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-900">
              <button
                onClick={() => setWithdrawTarget(null)}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white bg-transparent border-0 cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                onClick={handleConfirmWithdraw}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase shadow-md border-0 cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Ja, Zurückziehen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN & MODERATOR: DELETE WITH MANDATORY REASON MODAL */}
      {adminDeleteTarget && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="max-w-md w-full rounded-3xl bg-slate-950 border border-red-500/60 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-500/20 text-red-400 rounded-2xl border border-red-500/40">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold uppercase text-white">Vorschlag Löschen (Admin)</h3>
                <p className="text-xs text-red-400 font-semibold">Begründung erforderlich</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 text-xs space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Titel des Vorschlags:</span>
              <p className="font-bold text-white">{adminDeleteTarget.title}</p>
              <p className="text-[11px] text-slate-400">
                Eingereicht von: {adminDeleteTarget.is_anonymous ? 'Anonym' : `@${adminDeleteTarget.author_username}`}
              </p>
            </div>

            {/* Quick Reason Presets */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase text-slate-400 mb-1.5">
                Schnellauswahl Begründung:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {DELETE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAdminDeleteReason(preset)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                      adminDeleteReason === preset
                        ? 'bg-red-500/20 border-red-500 text-red-300 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Reason Textarea */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase text-slate-400 mb-1.5">
                Individuelle Begründung *
              </label>
              <textarea
                value={adminDeleteReason}
                onChange={(e) => setAdminDeleteReason(e.target.value)}
                rows={3}
                placeholder="z.B. Wurde bereits in v1.3 implementiert oder entspricht nicht den Community-Regeln."
                required
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-900">
              <button
                onClick={() => {
                  setAdminDeleteTarget(null);
                  setAdminDeleteReason('');
                }}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white bg-transparent border-0 cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                onClick={handleConfirmAdminDelete}
                disabled={!adminDeleteReason.trim()}
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
