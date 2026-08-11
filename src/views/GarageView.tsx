import React, { useState } from 'react';
import { GarageBike, User } from '../types';
import { Wrench, Plus, Images, Edit, Trash2, Heart, MessageSquare, X, ChevronLeft, ChevronRight, Shield } from 'lucide-react';

interface GarageViewProps {
  currentUser: User;
  bikes: GarageBike[];
  showAlert?: (title: string, message: string, type?: 'success' | 'warning' | 'danger') => void;
  onAddBike: (model: string, mods: string, images: string[]) => void;
  onEditBike: (id: string, model: string, mods: string, images: string[]) => void;
  onDeleteBike: (id: string) => void;
  onModAction: (type: 'edit' | 'delete', id: string, owner: string) => void;
  onLikeBike: (id: string) => void;
  onCommentBike: (id: string, commentText: string) => void;
}

export const GarageView: React.FC<GarageViewProps> = ({
  currentUser,
  bikes,
  showAlert,
  onAddBike,
  onEditBike,
  onDeleteBike,
  onModAction,
  onLikeBike,
  onCommentBike,
}) => {
  // Modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [previewBike, setPreviewBike] = useState<GarageBike | null>(null);
  const [previewImageIdx, setPreviewImageIdx] = useState(0);

  const [editBike, setEditBike] = useState<GarageBike | null>(null);

  // Add Bike Form
  const [modelInput, setModelInput] = useState('');
  const [modsInput, setModsInput] = useState('');
  const [imageFiles, setImageFiles] = useState<string[]>([]);

  // Comment input
  const [commentInput, setCommentInput] = useState('');

  // Handle files selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files).slice(0, 8);
    Promise.all(
      files.map(
        (f) =>
          new Promise<string>((res) => {
            const reader = new FileReader();
            reader.readAsDataURL(f as Blob);
            reader.onload = () => res(reader.result as string);
          })
      )
    ).then((base64Imgs) => {
      if (isEdit && editBike) {
        setEditBike({ ...editBike, images: [...editBike.images, ...base64Imgs].slice(0, 8) });
      } else {
        setImageFiles(prev => [...prev, ...base64Imgs].slice(0, 8));
      }
    });
  };

  return (
    <div className="py-6 max-w-6xl mx-auto px-4">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold uppercase text-amber-400 flex items-center gap-2">
            <Wrench className="w-8 h-8" /> Die Pixel Garage
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Zeige dein Bike und entdecke die Umbauten der Community
          </p>
        </div>

        <button
          onClick={() => {
            setModelInput('');
            setModsInput('');
            setImageFiles([]);
            setAddModalOpen(true);
          }}
          className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase px-5 py-3 rounded-full transition-all shadow-lg flex items-center gap-2 border-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Mein Bike in den Showroom stellen
        </button>
      </div>

      {/* Bike Grid */}
      <div className="flex flex-wrap justify-center gap-6">
        {bikes.length === 0 ? (
          <div className="w-full text-center py-16 bg-slate-900/50 border border-slate-800 rounded-3xl p-8">
            <Wrench className="w-16 h-16 text-purple-500/40 mx-auto mb-3" />
            <h3 className="text-lg font-bold uppercase text-amber-400">Die Garage ist noch leer</h3>
            <p className="text-xs text-slate-500 mt-1">Stell als Erster dein Bike in den Showroom!</p>
          </div>
        ) : (
          bikes.map((b) => {
            const isOwner = currentUser.username === b.owner;
            const isMod = currentUser.isAdmin || currentUser.isModerator;
            const cover = b.images?.[0] || 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=800';

            return (
              <div
                key={b.id}
                onClick={() => {
                  setPreviewBike(b);
                  setPreviewImageIdx(0);
                }}
                className="w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] max-w-md min-h-[480px] bg-slate-900 border border-slate-800 hover:border-yellow-400/50 rounded-2xl overflow-hidden transition-all duration-300 shadow-xl cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-80 w-full overflow-hidden bg-black">
                    <img
                      src={cover}
                      alt={b.model}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold text-amber-400">
                      👤 {b.owner}
                    </div>
                    {b.images.length > 1 && (
                      <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-white flex items-center gap-1">
                        <Images className="w-3 h-3" /> {b.images.length}
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <h3 className="text-lg font-bold uppercase text-white group-hover:text-amber-400 transition-colors">
                      {b.model}
                    </h3>
                    <p className="text-sm text-slate-300 mt-2 line-clamp-3 leading-relaxed">
                      🛠️ {b.mods || 'Keine Umbauten angegeben'}
                    </p>
                  </div>
                </div>

                <div className="px-4 pb-4 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1 text-slate-400">
                    <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500/20" /> {b.likes?.length || 0}
                  </span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <MessageSquare className="w-3.5 h-3.5 text-purple-400" /> {b.comments?.length || 0}
                  </span>

                  {/* Actions */}
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    {isOwner ? (
                      <>
                        <button
                          onClick={() => setEditBike(b)}
                          className="p-1.5 hover:bg-slate-800 text-amber-400 rounded-lg border-0 bg-transparent cursor-pointer"
                          title="Bearbeiten"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteBike(b.id)}
                          className="p-1.5 hover:bg-slate-800 text-red-400 rounded-lg border-0 bg-transparent cursor-pointer"
                          title="Löschen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : isMod ? (
                      <button
                        onClick={() => onModAction('edit', b.id, b.owner)}
                        className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-[10px] font-bold flex items-center gap-1 border border-amber-500/30 cursor-pointer"
                      >
                        <Shield className="w-3 h-3" /> Mod
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Bike Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="max-w-md w-full rounded-2xl bg-slate-950 border border-purple-800 p-6 relative shadow-2xl">
            <button
              onClick={() => setAddModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white border-0 bg-transparent cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold uppercase text-amber-400 mb-4">Bike in Showroom stellen</h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (imageFiles.length === 0) {
                  if (showAlert) {
                    showAlert('Bilder Fehlen', 'Bitte lade mindestens 1 Bild für deinen Showroom-Eintrag hoch.', 'warning');
                  } else {
                    alert('Bitte lade mindestens 1 Bild hoch');
                  }
                  return;
                }
                onAddBike(modelInput, modsInput, imageFiles);
                setAddModalOpen(false);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Modell *</label>
                <input
                  type="text"
                  value={modelInput}
                  onChange={(e) => setModelInput(e.target.value)}
                  placeholder="z.B. Yamaha MT-07, BMW S1000RR"
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Mods & Umbauten</label>
                <textarea
                  value={modsInput}
                  onChange={(e) => setModsInput(e.target.value)}
                  rows={3}
                  placeholder="Auspuff, Fahrwerk, Hebel, Dekorkit..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Bilder (bis zu 8) *</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleFileChange(e, false)}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-black hover:file:bg-amber-400 cursor-pointer"
                />
                {imageFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {imageFiles.map((img, idx) => (
                      <div key={idx} className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-700">
                        <img src={img} alt="Thumb" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setImageFiles(imageFiles.filter((_, i) => i !== idx))}
                          className="absolute top-0 right-0 bg-red-600 text-white rounded-bl p-0.5 text-[10px] border-0 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-extrabold uppercase text-sm shadow-lg transition-all border-0 cursor-pointer mt-4"
              >
                Ab in den Showroom
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Bike Modal */}
      {editBike && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="max-w-md w-full rounded-2xl bg-slate-950 border border-amber-500/50 p-6 relative shadow-2xl">
            <button
              onClick={() => setEditBike(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white border-0 bg-transparent cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold uppercase text-amber-400 mb-4">Bike Bearbeiten</h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onEditBike(editBike.id, editBike.model, editBike.mods || '', editBike.images);
                setEditBike(null);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Modell</label>
                <input
                  type="text"
                  value={editBike.model}
                  onChange={(e) => setEditBike({ ...editBike, model: e.target.value })}
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Mods & Umbauten</label>
                <textarea
                  value={editBike.mods || ''}
                  onChange={(e) => setEditBike({ ...editBike, mods: e.target.value })}
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Bilder ({editBike.images.length}/8)</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleFileChange(e, true)}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-black cursor-pointer"
                />
                <div className="flex flex-wrap gap-2 mt-3">
                  {editBike.images.map((img, idx) => (
                    <div key={idx} className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-700">
                      <img src={img} alt="Thumb" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() =>
                          setEditBike({ ...editBike, images: editBike.images.filter((_, i) => i !== idx) })
                        }
                        className="absolute top-0 right-0 bg-red-600 text-white rounded-bl p-0.5 text-[10px] border-0 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
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

      {/* Bike Preview Gallery Lightbox */}
      {previewBike && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
          <div className="max-w-3xl w-full rounded-2xl bg-slate-950 border border-amber-500/50 p-6 relative shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setPreviewBike(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white border-0 bg-transparent cursor-pointer z-10"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="mb-4">
              <h3 className="text-2xl font-bold uppercase text-amber-400">{previewBike.model}</h3>
              <p className="text-xs text-purple-400">Besitzer: <strong>{previewBike.owner}</strong></p>
            </div>

            {/* Modern & Elegant Carousel Display */}
            <div className="relative h-80 sm:h-[420px] w-full bg-slate-950 rounded-2xl overflow-hidden mb-3 border border-slate-800/80 shadow-2xl flex items-center justify-center group">
              {/* Blurred Ambient Background */}
              <div className="absolute inset-0 overflow-hidden opacity-25 blur-2xl pointer-events-none">
                <img
                  src={previewBike.images[previewImageIdx] || 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=800'}
                  alt=""
                  className="w-full h-full object-cover scale-125"
                />
              </div>

              {/* Main Image */}
              <img
                src={previewBike.images[previewImageIdx] || 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=800'}
                alt={previewBike.model}
                className="relative z-10 w-full h-full object-contain p-2 transition-all duration-300 ease-out"
              />

              {/* Glassmorphism Badge */}
              <div className="absolute top-4 left-4 z-20 bg-slate-950/80 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-extrabold text-amber-300 border border-amber-500/40 shadow-lg flex items-center gap-1.5">
                <span>📷</span>
                <span>{previewImageIdx + 1} von {previewBike.images.length}</span>
              </div>

              {previewBike.images.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setPreviewImageIdx((prev) => (prev > 0 ? prev - 1 : previewBike.images.length - 1))
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-3 rounded-2xl bg-black/60 hover:bg-amber-500 hover:text-black text-white backdrop-blur-md border border-white/10 shadow-xl transition-all duration-200 cursor-pointer active:scale-95"
                    title="Vorheriges Bild"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() =>
                      setPreviewImageIdx((prev) => (prev < previewBike.images.length - 1 ? prev + 1 : 0))
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-3 rounded-2xl bg-black/60 hover:bg-amber-500 hover:text-black text-white backdrop-blur-md border border-white/10 shadow-xl transition-all duration-200 cursor-pointer active:scale-95"
                    title="Nächstes Bild"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Ribbon */}
            {previewBike.images.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 scrollbar-thin">
                {previewBike.images.map((img, idx) => {
                  const isActive = idx === previewImageIdx;
                  return (
                    <button
                      key={idx}
                      onClick={() => setPreviewImageIdx(idx)}
                      className={`relative flex-shrink-0 w-20 h-16 rounded-xl overflow-hidden border-2 cursor-pointer transition-all duration-200 ${
                        isActive
                          ? 'border-amber-400 ring-2 ring-amber-400/40 scale-105 shadow-md shadow-amber-500/20'
                          : 'border-slate-800 opacity-50 hover:opacity-100 hover:border-slate-600'
                      }`}
                    >
                      <img src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Mods */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 mb-4">
              <h4 className="text-xs font-bold uppercase text-amber-400 mb-1">🛠️ Umbau-Details</h4>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                {previewBike.mods || 'Keine Angaben'}
              </p>
            </div>

            {/* Likes & Comments */}
            <div className="flex items-center justify-between border-t border-slate-800 pt-4 mb-4">
              <button
                onClick={() => onLikeBike(previewBike.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 text-xs font-bold transition-all cursor-pointer"
              >
                <Heart className="w-4 h-4 fill-red-500" /> Like ({previewBike.likes?.length || 0})
              </button>
            </div>

            {/* Comments List */}
            <div className="space-y-2 mb-4 max-h-40 overflow-y-auto pr-1">
              {previewBike.comments?.length === 0 ? (
                <p className="text-xs text-slate-500 italic">Noch keine Kommentare.</p>
              ) : (
                previewBike.comments?.map((c, i) => (
                  <div key={i} className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 text-xs">
                    <strong className="text-purple-400 block mb-0.5">{c.author}</strong>
                    <span className="text-slate-300">{c.text}</span>
                  </div>
                ))
              )}
            </div>

            {/* Comment Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (commentInput.trim()) {
                  onCommentBike(previewBike.id, commentInput.trim());
                  setCommentInput('');
                }
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="Schreibe einen Kommentar..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase rounded-xl border-0 cursor-pointer"
              >
                Senden
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
