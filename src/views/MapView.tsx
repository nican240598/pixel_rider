import React, { useState, useEffect, useRef } from 'react';
import type { MapPin, Poi, User } from '../types';
import { MapPin as MapPinIcon, Search, Compass, Plus, RotateCw } from 'lucide-react';
import L from 'leaflet';

interface MapViewProps {
  currentUser: User;
  mapPins: MapPin[];
  pois: Poi[];
  showAlert?: (title: string, message: string, type?: 'success' | 'warning' | 'danger') => void;
  onSavePin: (zip: string, city: string, bikes: string) => void;
  onAddPoi: (poi: Omit<Poi, 'id'>) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  currentUser,
  mapPins,
  pois,
  showAlert,
  onSavePin,
  onAddPoi,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const poiGroupRef = useRef<L.LayerGroup | null>(null);

  const myPin = mapPins.find((p) => p.email === currentUser.email || p.username === currentUser.username);

  // Form states
  const [zip, setZip] = useState('');
  const [city, setCity] = useState('');
  const [bikeLines, setBikeLines] = useState<string[]>(['', '', '', '', '']);

  // Search & POI states
  const [radius, setRadius] = useState(50);
  const [showTreffs, setShowTreffs] = useState(true);
  const [showPasses, setShowPasses] = useState(true);

  // Modal POI
  const [addPoiModalOpen, setAddPoiModalOpen] = useState(false);
  const [poiName, setPoiName] = useState('');
  const [poiCategory, setPoiCategory] = useState<'treff' | 'pass'>('treff');
  const [poiLocation, setPoiLocation] = useState('');

  // Sync myPin fields
  useEffect(() => {
    if (myPin) {
      const parts = myPin.city.split(' ');
      if (parts.length > 1 && /^\d+$/.test(parts[0])) {
        setZip(parts[0]);
        setCity(parts.slice(1).join(' '));
      } else {
        setCity(myPin.city);
      }

      const raw = myPin.bike || '';
      const splitBikes = raw.includes('\n')
        ? raw.split('\n')
        : raw.split(',').map((s) => s.trim());

      const fiveBikes = ['', '', '', '', ''];
      for (let i = 0; i < 5; i++) {
        fiveBikes[i] = splitBikes[i] || '';
      }
      setBikeLines(fiveBikes);
    }
  }, [myPin]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView([51.1657, 10.4515], 6);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      markersGroupRef.current = L.layerGroup().addTo(map);
      poiGroupRef.current = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
    }

    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 300);

    return () => {
      // Map cleanup if needed on unmount
    };
  }, []);

  // Update Pins & POIs on Map
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current || !poiGroupRef.current) return;

    // Clear old markers
    markersGroupRef.current.clearLayers();
    poiGroupRef.current.clearLayers();

    const redIcon = new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
    });

    const blueIcon = new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
    });

    // Render User Pins
    mapPins.forEach((p) => {
      const isMe = p.email === currentUser.email || p.username === currentUser.username;
      const marker = L.marker([p.lat, p.lng], { icon: isMe ? redIcon : blueIcon });

      const bikesList = (p.bike || '')
        .split('\n')
        .map((b) => b.trim())
        .filter(Boolean);

      const bikesHtml =
        bikesList.length > 0
          ? bikesList.map((b) => `<div style="font-weight:600; color:#fbbf24; margin-bottom:2px;">• ${b}</div>`).join('')
          : '<div style="color:#94a3b8; font-style:italic;">Keine Bikes angegeben</div>';

      marker.bindPopup(`
        <div style="font-family:sans-serif; padding:2px; min-width:160px;">
          <strong style="color:${isMe ? '#e11d48' : '#2563eb'}; font-size:13px; display:block; margin-bottom:4px;">
            ${p.username} ${isMe ? '(Du)' : ''}
          </strong>
          <div style="font-size:11px; margin-bottom:4px; color:#334155;"><b>📍 Ort:</b> ${p.city}</div>
          <div style="font-size:11px; font-weight:bold; color:#0f172a; margin-bottom:3px;">🏍️ Motorräder:</div>
          <div style="font-size:11px; background:#0f172a; padding:6px; border-radius:6px;">
            ${bikesHtml}
          </div>
        </div>
      `);
      markersGroupRef.current?.addLayer(marker);
    });

    // POI Icons
    const greenIcon = new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
    });

    const goldIcon = new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
    });

    // Render POIs
    pois.forEach((poi) => {
      if ((poi.type === 'treff' && showTreffs) || (poi.type === 'pass' && showPasses)) {
        const icon = poi.type === 'treff' ? greenIcon : goldIcon;
        const marker = L.marker([poi.lat, poi.lng], { icon });
        const label = poi.type === 'treff' ? 'Bikertreff / Café' : 'Traumstraße / Pass';
        marker.bindPopup(`
          <div class="text-xs">
            <strong class="text-amber-600 text-sm block mb-1">${poi.name}</strong>
            <span class="bg-slate-200 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded">${label}</span>
          </div>
        `);
        poiGroupRef.current?.addLayer(marker);
      }
    });

    if (myPin) {
      mapInstanceRef.current.setView([myPin.lat, myPin.lng], 9);
    }
  }, [mapPins, pois, showTreffs, showPasses, currentUser]);

  return (
    <div className="py-6 max-w-6xl mx-auto px-4">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold uppercase text-amber-400 flex items-center gap-2">
            <MapPinIcon className="w-8 h-8" /> PixelMap Community Karte
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Finde Rider in deiner Nähe, Treffpunkte & traumhafte Pässe
          </p>
        </div>

        <button
          onClick={() => setAddPoiModalOpen(true)}
          className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase px-5 py-3 rounded-full transition-all shadow-lg flex items-center gap-2 border-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Neuen POI Eintragen
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar Controls */}
        <div className="lg:col-span-1 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl space-y-6">
          {/* User Location Form */}
          <div>
            <h3 className="text-sm font-bold uppercase text-amber-400 mb-3 flex items-center gap-1.5">
              <MapPinIcon className="w-4 h-4" /> Mein Standort
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const combinedBikes = bikeLines.map((b) => b.trim()).filter(Boolean).join('\n');
                onSavePin(zip, city, combinedBikes);
              }}
              className="space-y-3"
            >
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="PLZ"
                  required
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="z.B. Karlsruhe"
                  required
                  className="col-span-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* 5 Bike Input Lines */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-[11px] font-bold uppercase text-amber-400">
                  Motorräder (bis zu 5 Bikes, jeweils eigene Zeile):
                </label>
                {[0, 1, 2, 3, 4].map((idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold text-slate-500 w-12 flex-shrink-0">
                      Bike {idx + 1}:
                    </span>
                    <input
                      type="text"
                      value={bikeLines[idx] || ''}
                      onChange={(e) => {
                        const updated = [...bikeLines];
                        updated[idx] = e.target.value;
                        setBikeLines(updated);
                      }}
                      placeholder={
                        idx === 0
                          ? '1. Bike (z.B. YZF-R6)'
                          : idx === 1
                          ? '2. Bike (optional)'
                          : `${idx + 1}. Bike (optional)`
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                ))}
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-extrabold uppercase text-xs shadow-md transition-all border-0 cursor-pointer flex items-center justify-center gap-1.5 mt-2"
              >
                <RotateCw className="w-3.5 h-3.5" /> {myPin ? 'Pin Aktualisieren' : 'Pin Speichern'}
              </button>
            </form>
          </div>

          {/* Radius Filter */}
          <div className="pt-4 border-t border-slate-800">
            <h3 className="text-sm font-bold uppercase text-amber-400 mb-2 flex items-center gap-1.5">
              <Search className="w-4 h-4" /> Umkreis-Suche
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Radius:</span>
                <strong className="text-amber-400">{radius} km</strong>
              </div>
              <input
                type="range"
                min="10"
                max="150"
                step="10"
                value={radius}
                onChange={(e) => setRadius(parseInt(e.target.value))}
                className="w-full accent-amber-500 bg-slate-950 cursor-pointer"
              />
            </div>
          </div>

          {/* POI Toggles */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <h3 className="text-sm font-bold uppercase text-amber-400 mb-2 flex items-center gap-1.5">
              <Compass className="w-4 h-4" /> Karte Entdecken (POIs)
            </h3>

            <label className="flex items-center gap-3 text-xs text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={showTreffs}
                onChange={(e) => setShowTreffs(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
              />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Bikertreffs & Cafés</span>
            </label>

            <label className="flex items-center gap-3 text-xs text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={showPasses}
                onChange={(e) => setShowPasses(e.target.checked)}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Pässe & Kurvenstrecken</span>
            </label>
          </div>
        </div>

        {/* Map Canvas */}
        <div className="lg:col-span-2 h-[500px] lg:h-auto min-h-[450px] bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden relative">
          <div ref={mapContainerRef} className="w-full h-full" />
        </div>
      </div>

      {/* Add POI Modal */}
      {addPoiModalOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="max-w-md w-full rounded-2xl bg-slate-950 border border-purple-800 p-6 relative shadow-2xl">
            <button
              onClick={() => setAddPoiModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white border-0 bg-transparent cursor-pointer"
            >
              ✕
            </button>

            <h3 className="text-xl font-bold uppercase text-amber-400 mb-4">Neuen POI Eintragen</h3>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                // Get coords using nomination
                try {
                  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(poiLocation)}`);
                  const data = await res.json();
                  if (data && data[0]) {
                    onAddPoi({
                      type: poiCategory,
                      name: poiName,
                      location: poiLocation,
                      lat: parseFloat(data[0].lat),
                      lng: parseFloat(data[0].lon),
                      created_by: currentUser.username,
                    });
                    setAddPoiModalOpen(false);
                    setPoiName('');
                    setPoiLocation('');
                  } else {
                    if (showAlert) {
                      showAlert('Ort nicht gefunden', 'Der eingegebene Ort konnte auf der Karte nicht gefunden werden.', 'warning');
                    } else {
                      alert('Ort konnte nicht gefunden werden.');
                    }
                  }
                } catch (err) {
                  if (showAlert) {
                    showAlert('Suchfehler', 'Fehler bei der Ortssuche aufgetreten.', 'danger');
                  } else {
                    alert('Fehler bei der Ortssuche.');
                  }
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Name des Treffpunkts *</label>
                <input
                  type="text"
                  value={poiName}
                  onChange={(e) => setPoiName(e.target.value)}
                  placeholder="z.B. Motorradtreff Löwensteiner Platte"
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Kategorie *</label>
                <select
                  value={poiCategory}
                  onChange={(e) => setPoiCategory(e.target.value as 'treff' | 'pass')}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="treff">Bikertreff / Café</option>
                  <option value="pass">Traumstraße / Pass</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Adresse / Ort *</label>
                <input
                  type="text"
                  value={poiLocation}
                  onChange={(e) => setPoiLocation(e.target.value)}
                  placeholder="z.B. Löwenstein, Deutschland"
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-extrabold uppercase text-sm shadow-lg transition-all border-0 cursor-pointer mt-4"
              >
                POI Speichern
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
