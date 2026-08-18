import React, { useState } from 'react';
import { MarketItem, User } from '../types';
import { ShoppingBag, Plus, ExternalLink, Shield, Trash2, Edit, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { UserRoleBadge } from '../components/UserRoleBadge';
import { UserAvatar } from '../components/UserAvatar';

interface MarketViewProps {
  currentUser: User;
  marketItems: MarketItem[];
  allUsers?: User[];
  showAlert?: (title: string, message: string, type?: 'success' | 'warning' | 'danger') => void;
  onAddMarketItem: (item: Omit<MarketItem, 'id' | 'created_at'>) => void;
  onEditMarketItem: (id: string, item: Partial<MarketItem>) => void;
  onDeleteMarketItem: (id: string) => void;
  onModAction: (type: 'edit' | 'delete', id: string, author: string) => void;
}

export const MarketView: React.FC<MarketViewProps> = ({
  currentUser,
  marketItems,
  allUsers = [],
  showAlert,
  onAddMarketItem,
  onEditMarketItem,
  onDeleteMarketItem,
  onModAction,
}) => {
  const [selectedCat, setSelectedCat] = useState<string>('Alle');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<MarketItem | null>(null);
  const [previewImgIdx, setPreviewImgIdx] = useState(0);

  // Add Item State
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Teile');
  const [desc, setDesc] = useState('');
  const [linkEbay, setLinkEbay] = useState('');
  const [linkKleinanzeigen, setLinkKleinanzeigen] = useState('');
  const [linkFb, setLinkFb] = useState('');
  const [linkMobile, setLinkMobile] = useState('');
  const [images, setImages] = useState<string[]>([]);

  const filteredItems = marketItems.filter((item) => {
    if (item.is_deleted) return false;
    if (selectedCat === 'Alle') return true;
    return item.category === selectedCat;
  });

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files).slice(0, 10);
    Promise.all(
      files.map(
        (f) =>
          new Promise<string>((res) => {
            const r = new FileReader();
            r.readAsDataURL(f as Blob);
            r.onload = () => res(r.result as string);
          })
      )
    ).then((base64s) => {
      setImages((prev) => [...prev, ...base64s].slice(0, 10));
    });
  };

  return (
    <div className="py-6 max-w-6xl mx-auto px-4">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold uppercase text-amber-400 flex items-center gap-2">
            <ShoppingBag className="w-8 h-8" /> Pixel Flohmarkt
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Kaufen & Verkaufen von Bikes, Ersatzteilen, Kleidung & Zubehör
          </p>
        </div>

        <button
          onClick={() => {
            setTitle('');
            setPrice('');
            setCategory('Teile');
            setDesc('');
            setLinkEbay('');
            setLinkKleinanzeigen('');
            setLinkFb('');
            setLinkMobile('');
            setImages([]);
            setAddModalOpen(true);
          }}
          className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase px-5 py-3 rounded-full transition-all shadow-lg flex items-center gap-2 border-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Neues Inserat Aufgeben
        </button>
      </div>

      {/* Category Pills (Unified Scrollable Pill Dock) */}
      <div className="flex justify-center mb-8">
        <div className="bg-slate-900/90 border border-purple-800/80 rounded-2xl md:rounded-full p-1.5 flex items-center gap-1 sm:gap-2 shadow-2xl backdrop-blur-md overflow-x-auto no-scrollbar w-full sm:w-auto scrollbar-none">
          {['Alle', 'Fahrzeug', 'Teile', 'Kleidung', 'Sonstiges'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl md:rounded-full text-xs sm:text-sm font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0 border-0 cursor-pointer select-none min-h-[38px] ${
                selectedCat === cat
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-[0_0_18px_rgba(245,158,11,0.45)]'
                  : 'text-slate-300 hover:text-white hover:bg-purple-950/60 bg-transparent'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Item Grid */}
      <div className="flex flex-wrap justify-center gap-6">
        {filteredItems.length === 0 ? (
          <div className="w-full text-center py-16 bg-slate-900/50 border border-slate-800 rounded-3xl p-8">
            <ShoppingBag className="w-16 h-16 text-blue-500/40 mx-auto mb-3" />
            <h3 className="text-lg font-bold uppercase text-amber-400">Keine Inserate in dieser Kategorie</h3>
            <p className="text-xs text-slate-500 mt-1">Sei der Erste und erstelle ein Angebot!</p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isOwner = currentUser.username === item.author;
            const isMod = currentUser.isAdmin || currentUser.isModerator;
            const cover = item.images?.[0] || 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?q=80&w=800';

            return (
              <div
                key={item.id}
                onClick={() => {
                  setPreviewItem(item);
                  setPreviewImgIdx(0);
                }}
                className="w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] max-w-md min-h-[480px] bg-slate-900 border border-slate-800 hover:border-yellow-400/50 rounded-2xl overflow-hidden transition-all duration-300 shadow-xl cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-72 w-full overflow-hidden bg-black">
                    <img
                      src={cover}
                      alt={item.item_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <span className="absolute top-3 left-3 bg-purple-900/90 text-white font-bold text-[10px] uppercase px-3 py-1 rounded-full border border-purple-500/40">
                      {item.category}
                    </span>
                    <span className="absolute bottom-3 right-3 bg-yellow-400 text-slate-950 font-extrabold text-xs px-3 py-1 rounded-full shadow-lg">
                      {Number(item.price).toFixed(2).replace('.', ',')} €
                    </span>
                  </div>

                  <div className="p-5">
                    <h3 className="text-lg font-bold uppercase text-white group-hover:text-amber-400 transition-colors">
                      {item.item_name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <UserAvatar
                        username={item.author}
                        allUsers={allUsers}
                        currentUser={currentUser}
                        size="xs"
                        bordered
                        borderColor="border-amber-500/40"
                      />
                      <p className="text-xs text-purple-400 m-0">Verkäufer: <strong>{item.author}</strong></p>
                      <UserRoleBadge username={item.author} allUsers={allUsers} currentUser={currentUser} size="xs" />
                    </div>
                    <p className="text-sm text-slate-300 mt-2 line-clamp-3 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="px-4 pb-4 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                  <span className="text-[10px] text-slate-500">
                    📷 {item.images?.length || 1} Fotos
                  </span>

                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    {isOwner ? (
                      <button
                        onClick={() => onDeleteMarketItem(item.id)}
                        className="p-1.5 hover:bg-slate-800 text-red-400 rounded-lg border-0 bg-transparent cursor-pointer"
                        title="Löschen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : isMod ? (
                      <button
                        onClick={() => onModAction('delete', item.id, item.author)}
                        className="px-2 py-1 bg-red-600/20 text-red-400 rounded text-[10px] font-bold flex items-center gap-1 border border-red-500/30 cursor-pointer"
                      >
                        <Shield className="w-3 h-3" /> Mod Löschen
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Market Item Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="max-w-lg w-full rounded-2xl bg-slate-950 border border-amber-500/50 p-6 relative shadow-2xl max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setAddModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white border-0 bg-transparent cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold uppercase text-amber-400 mb-4">Neues Inserat Aufgeben</h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (images.length < 1) {
                  if (showAlert) {
                    showAlert('Bilder Fehlen', 'Bitte lade mindestens 1 Bild für dein Inserat hoch.', 'warning');
                  } else {
                    alert('Bitte lade mindestens 1 Bild hoch');
                  }
                  return;
                }
                onAddMarketItem({
                  author: currentUser.username,
                  item_name: title,
                  price: parseFloat(price) || 0,
                  category,
                  description: desc,
                  images,
                  link_ebay: linkEbay || undefined,
                  link_kleinanzeigen: linkKleinanzeigen || undefined,
                  link_facebook: linkFb || undefined,
                  link_mobile: linkMobile || undefined,
                });
                setAddModalOpen(false);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Titel *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="z.B. Akrapovic Auspuff YZF-R6"
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Kategorie *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Fahrzeug">Fahrzeug</option>
                    <option value="Teile">Teile</option>
                    <option value="Kleidung">Kleidung</option>
                    <option value="Sonstiges">Sonstiges</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Preis (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="250.00"
                    required
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Beschreibung *</label>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  rows={4}
                  placeholder="Zustand, Passgenauigkeit, Versandmöglichkeiten..."
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Links */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="block text-xs font-bold uppercase text-amber-400">Externe Links (Optional)</label>
                <input
                  type="url"
                  value={linkEbay}
                  onChange={(e) => setLinkEbay(e.target.value)}
                  placeholder="eBay Link"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
                <input
                  type="url"
                  value={linkKleinanzeigen}
                  onChange={(e) => setLinkKleinanzeigen(e.target.value)}
                  placeholder="Kleinanzeigen Link"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
                {category === 'Fahrzeug' && (
                  <input
                    type="url"
                    value={linkMobile}
                    onChange={(e) => setLinkMobile(e.target.value)}
                    placeholder="mobile.de Link"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                )}
              </div>

              {/* Images */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Fotos hochladen *</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFiles}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-black hover:file:bg-amber-400 cursor-pointer"
                />
                <div className="flex flex-wrap gap-2 mt-3">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-700">
                      <img src={img} alt="Thumb" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setImages(images.filter((_, i) => i !== idx))}
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
                Inserat Veröffentlichen
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Item Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
          <div className="max-w-2xl w-full rounded-2xl bg-slate-950 border border-amber-500/50 p-6 relative shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setPreviewItem(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white border-0 bg-transparent cursor-pointer z-10"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="mb-4">
              <span className="text-[10px] font-bold uppercase bg-purple-900 text-purple-200 px-3 py-1 rounded-full mb-2 inline-block">
                {previewItem.category}
              </span>
              <h3 className="text-2xl font-bold uppercase text-amber-400">{previewItem.item_name}</h3>
              <p className="text-sm font-extrabold text-emerald-400 mt-1">
                Preis: {Number(previewItem.price).toFixed(2).replace('.', ',')} €
              </p>
              <div className="flex items-center gap-2 mt-2 text-xs text-slate-300">
                <UserAvatar
                  username={previewItem.author}
                  allUsers={allUsers}
                  currentUser={currentUser}
                  size="sm"
                  bordered
                  borderColor="border-amber-500/40"
                />
                <span>Verkäufer: <strong className="text-purple-300">{previewItem.author}</strong></span>
                <UserRoleBadge username={previewItem.author} allUsers={allUsers} currentUser={currentUser} size="xs" />
              </div>
            </div>

            {/* Photos */}
            <div className="relative h-72 w-full bg-black rounded-xl overflow-hidden mb-4 flex items-center justify-center">
              <img
                src={previewItem.images[previewImgIdx] || 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?q=80&w=800'}
                alt="Item"
                className="w-full h-full object-contain"
              />

              {previewItem.images.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setPreviewImgIdx((prev) => (prev > 0 ? prev - 1 : previewItem.images.length - 1))
                    }
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-black border-0 cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() =>
                      setPreviewImgIdx((prev) => (prev < previewItem.images.length - 1 ? prev + 1 : 0))
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-black border-0 cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* Description */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 mb-4">
              <h4 className="text-xs font-bold uppercase text-amber-400 mb-1">Beschreibung</h4>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                {previewItem.description}
              </p>
            </div>

            {/* External Links */}
            {(previewItem.link_ebay || previewItem.link_kleinanzeigen || previewItem.link_mobile) && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
                {previewItem.link_ebay && (
                  <a
                    href={previewItem.link_ebay}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-full flex items-center gap-1 text-decoration-none"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> eBay Angebot
                  </a>
                )}
                {previewItem.link_kleinanzeigen && (
                  <a
                    href={previewItem.link_kleinanzeigen}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-full flex items-center gap-1 text-decoration-none"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Kleinanzeigen
                  </a>
                )}
                {previewItem.link_mobile && (
                  <a
                    href={previewItem.link_mobile}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-full flex items-center gap-1 text-decoration-none"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> mobile.de
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
