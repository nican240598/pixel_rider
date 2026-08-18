import React, { useState } from 'react';
import { GpxRoute, User } from '../types';
import { Map, Plus, Download, Trash2, Edit, X, Eye } from 'lucide-react';

interface GpxViewProps {
  currentUser: User;
  routes: GpxRoute[];
  onAddRoute: (title: string, distance: string, gpxText: string) => void;
  onEditRoute: (id: string, title: string, distance: string, gpxText?: string) => void;
  onDeleteRoute: (id: string) => void;
  onPreviewRoute: (route: GpxRoute) => void;
  onDownloadRoute: (route: GpxRoute) => void;
}

export const GpxView: React.FC<GpxViewProps> = ({
  currentUser,
  routes,
  onAddRoute,
  onEditRoute,
  onDeleteRoute,
  onPreviewRoute,
  onDownloadRoute,
}) => {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editRoute, setEditRoute] = useState<GpxRoute | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [distance, setDistance] = useState('');
  const [gpxText, setGpxText] = useState('');

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.readAsText(e.target.files[0]);
      reader.onload = () => setGpxText(reader.result as string);
    }
  };

  // Helper to render simple SVG track representation if GPX available
  const renderSvgTrack = (gpxData?: string) => {
    if (!gpxData) return null;
    try {
      const xml = new DOMParser().parseFromString(gpxData, 'text/xml');
      const trkpts = xml.getElementsByTagName('trkpt');
      if (trkpts.length < 2) return null;

      let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
      const points: { lat: number; lon: number }[] = [];

      for (let i = 0; i < trkpts.length; i++) {
        const lat = parseFloat(trkpts[i].getAttribute('lat') || '');
        const lon = parseFloat(trkpts[i].getAttribute('lon') || trkpts[i].getAttribute('lng') || '');
        if (!isNaN(lat) && !isNaN(lon)) {
          points.push({ lat, lon });
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
          if (lon < minLon) minLon = lon;
          if (lon > maxLon) maxLon = lon;
        }
      }

      if (points.length < 2) return null;

      const latRange = maxLat - minLat || 0.0001;
      const lonRange = maxLon - minLon || 0.0001;
      const w = 320, h = 220, pad = 20;

      let d = '';
      points.forEach((p, idx) => {
        const x = pad + ((p.lon - minLon) / lonRange) * (w - pad * 2);
        const y = h - (pad + ((p.lat - minLat) / latRange) * (h - pad * 2));
        d += idx === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
      });

      return (
        <div className="w-full h-56 bg-slate-950/80 rounded-xl overflow-hidden border border-purple-900/40 p-2 flex items-center justify-center mb-3">
          <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full">
            <path d={d} fill="none" stroke="#facc15" strokeWidth="3" strokeLinecap="round" className="drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]" />
          </svg>
        </div>
      );
    } catch (e) {
      return null;
    }
  };

  return (
    <div className="py-6 max-w-6xl mx-auto px-4">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold uppercase text-amber-400 flex items-center gap-2">
            <Map className="w-8 h-8" /> GPX-Ausfahrten & Routen
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Entdecke geprüfte Kurventouren und lade eigene GPX-Dateien hoch
          </p>
        </div>

        <button
          onClick={() => {
            setTitle('');
            setDistance('');
            setGpxText('');
            setAddModalOpen(true);
          }}
          className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase px-5 py-3 rounded-full transition-all shadow-lg flex items-center gap-2 border-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> GPX Tour Hochladen
        </button>
      </div>

      {/* Routes Grid */}
      <div className="flex flex-wrap justify-center gap-6">
        {routes.length === 0 ? (
          <div className="w-full text-center py-16 bg-slate-900/50 border border-slate-800 rounded-3xl p-8">
            <Map className="w-16 h-16 text-amber-500/40 mx-auto mb-3" />
            <h3 className="text-lg font-bold uppercase text-amber-400">Keine Routen vorhanden</h3>
            <p className="text-xs text-slate-500 mt-1">Lade deine Lieblingsstrecke als Erste hoch!</p>
          </div>
        ) : (
          routes.map((r) => {
            const isOwner = currentUser.username === r.created_by || currentUser.isAdmin || currentUser.isModerator;

            return (
              <div
                key={r.id}
                className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] max-w-md min-h-[460px] bg-slate-900 border border-slate-800 hover:border-yellow-400/50 rounded-2xl p-6 transition-all shadow-xl flex flex-col justify-between"
              >
                <div>
                  {renderSvgTrack(r.gpx_data)}

                  <h3 className="text-lg font-bold uppercase text-amber-400 mb-2">{r.title}</h3>
                  <div className="flex items-center justify-between text-xs text-slate-300 mb-4">
                    <span>Länge: <strong className="text-white">{r.distance} km</strong></span>
                    <span>Ersteller: <strong className="text-purple-400">{r.created_by}</strong></span>
                  </div>
                </div>

                <div className="space-y-2 pt-3 border-t border-slate-800">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onPreviewRoute(r)}
                      className="flex-1 py-2 rounded-xl bg-purple-900/40 hover:bg-purple-900/70 text-purple-200 border border-purple-700/50 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" /> Vorschau
                    </button>
                    <button
                      onClick={() => onDownloadRoute(r)}
                      className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all border-0 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> GPX
                    </button>
                  </div>

                  {isOwner && (
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => setEditRoute(r)}
                        className="text-xs text-amber-400 hover:underline p-1 border-0 bg-transparent cursor-pointer flex items-center gap-1"
                      >
                        <Edit className="w-3.5 h-3.5" /> Bearbeiten
                      </button>
                      <button
                        onClick={() => onDeleteRoute(r.id)}
                        className="text-xs text-red-400 hover:underline p-1 border-0 bg-transparent cursor-pointer flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Löschen
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Route Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="max-w-md w-full rounded-2xl bg-slate-950 border border-purple-800 p-6 relative shadow-2xl">
            <button
              onClick={() => setAddModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white border-0 bg-transparent cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold uppercase text-amber-400 mb-4">GPX Tour Hochladen</h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onAddRoute(title, distance, gpxText);
                setAddModalOpen(false);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Titel der Tour *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="z.B. Nordschwarzwald Kurventraum"
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Länge in km *</label>
                <input
                  type="number"
                  step="0.1"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  placeholder="145.0"
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">GPX Datei (.gpx) *</label>
                <input
                  type="file"
                  accept=".gpx"
                  onChange={handleFile}
                  required
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-black hover:file:bg-amber-400 cursor-pointer"
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

      {/* Edit Route Modal */}
      {editRoute && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="max-w-md w-full rounded-2xl bg-slate-950 border border-amber-500/50 p-6 relative shadow-2xl">
            <button
              onClick={() => setEditRoute(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white border-0 bg-transparent cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold uppercase text-amber-400 mb-4">Tour Bearbeiten</h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onEditRoute(editRoute.id, editRoute.title, editRoute.distance, editRoute.gpx_data);
                setEditRoute(null);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Titel</label>
                <input
                  type="text"
                  value={editRoute.title}
                  onChange={(e) => setEditRoute({ ...editRoute, title: e.target.value })}
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Länge (km)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editRoute.distance}
                  onChange={(e) => setEditRoute({ ...editRoute, distance: e.target.value })}
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
    </div>
  );
};
