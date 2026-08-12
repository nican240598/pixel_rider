import React, { useState, useEffect, useRef } from 'react';
import type { MapPin, Poi, User } from '../types';
import { MapPin as MapPinIcon, Search, Compass, Plus, RotateCw, Navigation, Play, Square, Radio, Save, Download, Map, Route } from 'lucide-react';
import L from 'leaflet';

interface MapViewProps {
  currentUser: User;
  mapPins: MapPin[];
  pois: Poi[];
  showAlert?: (title: string, message: string, type?: 'success' | 'warning' | 'danger') => void;
  onSavePin: (zip: string, city: string, bikes: string) => void;
  onUpdateLivePin?: (lat: number, lng: number, isLive: boolean, liveNote?: string) => void;
  onAddPoi: (poi: Omit<Poi, 'id'>) => void;
  onSaveRecordedRoute?: (title: string, distance: string, gpxText: string) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  currentUser,
  mapPins,
  pois,
  showAlert,
  onSavePin,
  onUpdateLivePin,
  onAddPoi,
  onSaveRecordedRoute,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const poiGroupRef = useRef<L.LayerGroup | null>(null);
  const livePolylineRef = useRef<L.Polyline | null>(null);

  const myPin = mapPins.find((p) => p.email === currentUser.email || p.username === currentUser.username);

  // Live Mode states
  const [isLiveMode, setIsLiveMode] = useState<boolean>(Boolean(myPin?.isLive));
  const [liveNoteInput, setLiveNoteInput] = useState<string>(myPin?.liveNote || 'Feierabendrunde 🏍️');
  const [intervalMinutes, setIntervalMinutes] = useState<number>(5);
  const [isLocating, setIsLocating] = useState(false);
  const [liveModalOpen, setLiveModalOpen] = useState(false);
  const [lastLiveTime, setLastLiveTime] = useState<string>(myPin?.lastLiveUpdate || '');

  // Track Recording State
  const [trackPoints, setTrackPoints] = useState<{ lat: number; lng: number; time: string }[]>(() => {
    try {
      const saved = localStorage.getItem('app_live_track');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [saveRouteModalOpen, setSaveRouteModalOpen] = useState(false);
  const [saveRouteTitle, setSaveRouteTitle] = useState('');

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

  const liveRidersCount = mapPins.filter((p) => p.isLive).length;

  // Haversine Distance helper
  const calculateTrackDistanceKm = (pts: { lat: number; lng: number }[]) => {
    if (pts.length < 2) return 0;
    let totalKm = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const R = 6371; // km
      const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
      const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((p1.lat * Math.PI) / 180) *
          Math.cos((p2.lat * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      totalKm += R * c;
    }
    return Math.round(totalKm * 10) / 10;
  };

  // GPX XML Generator
  const generateGpxXml = (titleStr: string, pts: { lat: number; lng: number; time: string }[]) => {
    const trkptsXml = pts
      .map(
        (p) => `      <trkpt lat="${p.lat.toFixed(6)}" lon="${p.lng.toFixed(6)}">
        <time>${p.time}</time>
      </trkpt>`
      )
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="PixelCrew Community App" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${titleStr.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</name>
    <time>${new Date().toISOString()}</time>
  </metadata>
  <trk>
    <name>${titleStr.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</name>
    <trkseg>
${trkptsXml}
    </trkseg>
  </trk>
</gpx>`;
  };

  // Sync myPin fields
  useEffect(() => {
    if (myPin) {
      if (myPin.isLive !== undefined) setIsLiveMode(myPin.isLive);
      if (myPin.liveNote) setLiveNoteInput(myPin.liveNote);
      if (myPin.lastLiveUpdate) setLastLiveTime(myPin.lastLiveUpdate);

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

  // GPS fetch & track point record function
  const fetchAndSendGpsLocation = (isInitial = false) => {
    if (!navigator.geolocation) {
      if (showAlert) showAlert('GPS Fehler', 'Dein Browser unterstützt keine Geolocation.', 'warning');
      return;
    }

    setIsLocating(true);

    const handleSuccess = (pos: GeolocationPosition) => {
      setIsLocating(false);
      const { latitude, longitude } = pos.coords;
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const nowIso = new Date().toISOString();
      setLastLiveTime(nowStr);

      if (onUpdateLivePin) {
        onUpdateLivePin(latitude, longitude, true, liveNoteInput);
      }

      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([latitude, longitude], 13);
      }

      // Record Track Point for Route Saving
      setTrackPoints((prev) => {
        if (prev.length > 0) {
          const last = prev[prev.length - 1];
          const dLat = Math.abs(last.lat - latitude);
          const dLng = Math.abs(last.lng - longitude);
          if (dLat < 0.0001 && dLng < 0.0001) {
            return prev;
          }
        }
        const updated = [...prev, { lat: latitude, lng: longitude, time: nowIso }];
        try {
          localStorage.setItem('app_live_track', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });

      if (isInitial && showAlert) {
        showAlert('Live-Tracking Aktiv 🏍️', `Dein Live-Standort wird nun alle ${intervalMinutes} Minuten aktualisiert & deine Route aufgezeichnet!`, 'success');
      }
    };

    const handleError = (err: GeolocationPositionError, isFallbackAttempt = false) => {
      console.warn('Geolocation position error code:', err?.code, 'message:', err?.message || err);

      if (!isFallbackAttempt) {
        // Retry with lower accuracy & higher maximumAge for desktop/sandboxed browsers
        navigator.geolocation.getCurrentPosition(
          handleSuccess,
          (err2) => handleError(err2, true),
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
        );
        return;
      }

      setIsLocating(false);

      // Fallback to saved myPin location if available
      if (myPin && myPin.lat && myPin.lng) {
        const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLastLiveTime(nowStr);

        if (onUpdateLivePin) {
          onUpdateLivePin(myPin.lat, myPin.lng, true, liveNoteInput);
        }

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([myPin.lat, myPin.lng], 13);
        }

        if (showAlert) {
          showAlert(
            'GPS Signal nicht aktiv',
            'GPS-Signal im Browser nicht verfügbar. Dein hinterlegter Heimat-Standort wurde auf der Karte als Live-Position verwendet.',
            'warning'
          );
        }
        return;
      }

      let errorMsg = 'Konnte aktuellen GPS-Standort nicht abrufen.';
      if (err?.code === 1) {
        errorMsg = 'Standort-Zugriff im Browser abgelehnt. Bitte erlaube den Standortzugriff in den Browser-Einstellungen.';
      } else if (err?.code === 2) {
        errorMsg = 'GPS-Position derzeit nicht verfügbar.';
      } else if (err?.code === 3) {
        errorMsg = 'GPS-Zeitüberschreitung (Timeout).';
      }

      if (showAlert) {
        showAlert('GPS Hinweis', errorMsg, 'danger');
      }
    };

    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      (err) => handleError(err, false),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  };

  // Live Timer effect (runs every X minutes when live)
  useEffect(() => {
    if (!isLiveMode) return;

    if (!lastLiveTime) {
      fetchAndSendGpsLocation(false);
    }

    const timer = setInterval(() => {
      fetchAndSendGpsLocation(false);
    }, intervalMinutes * 60 * 1000);

    return () => clearInterval(timer);
  }, [isLiveMode, intervalMinutes, liveNoteInput]);

  // Handle Stop Live Ride & Ask to Save Route
  const handleStopLiveRide = () => {
    setIsLiveMode(false);
    if (onUpdateLivePin) {
      const lat = myPin?.lat || 51.1657;
      const lng = myPin?.lng || 10.4515;
      onUpdateLivePin(lat, lng, false, '');
    }

    if (trackPoints.length >= 2) {
      const dist = calculateTrackDistanceKm(trackPoints);
      const dateStr = new Date().toLocaleDateString('de-DE');
      setSaveRouteTitle(`Live-Ausfahrt vom ${dateStr} (${dist} km)`);
      setSaveRouteModalOpen(true);
    } else {
      setTrackPoints([]);
      try {
        localStorage.removeItem('app_live_track');
      } catch (e) {}
      if (showAlert) showAlert('Live-Tracking Beendet', 'Deine Fahrt wurde beendet.', 'info');
    }
  };

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

    // Custom Animated Live Marker
    const liveIcon = L.divIcon({
      className: 'custom-live-marker',
      html: `
        <div style="position:relative; width:40px; height:40px; display:flex; align-items:center; justify-content:center; background:#7c3aed; border:3px solid #fbbf24; border-radius:50%; box-shadow:0 0 18px rgba(251,191,36,0.9); cursor:pointer;">
          <div style="position:absolute; inset:-8px; border-radius:50%; background:#f59e0b; opacity:0.6; animation:ping 1.6s cubic-bezier(0,0,0.2,1) infinite;"></div>
          <span style="position:relative; z-index:10; font-size:20px;">🏍️</span>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20],
    });

    // Render User Pins
    mapPins.forEach((p) => {
      const isMe = p.email === currentUser.email || p.username === currentUser.username;
      const markerIcon = p.isLive ? liveIcon : isMe ? redIcon : blueIcon;
      const marker = L.marker([p.lat, p.lng], { icon: markerIcon });

      const bikesList = (p.bike || '')
        .split('\n')
        .map((b) => b.trim())
        .filter(Boolean);

      const bikesHtml =
        bikesList.length > 0
          ? bikesList.map((b) => `<div style="font-weight:600; color:#fbbf24; margin-bottom:2px;">• ${b}</div>`).join('')
          : '<div style="color:#94a3b8; font-style:italic;">Keine Bikes angegeben</div>';

      const liveBadge = p.isLive
        ? `<div style="background:#7c3aed; color:#ffffff; padding:3px 8px; border-radius:12px; font-weight:800; font-size:10px; margin-bottom:6px; display:inline-flex; align-items:center; gap:4px; box-shadow:0 2px 8px rgba(124,58,237,0.4);">
             <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#34d399; animation:pulse 1s infinite;"></span>
             LIVE UNTERWEGS (${p.lastLiveUpdate || 'Aktiv'})
           </div>
           ${p.liveNote ? `<div style="font-size:11px; color:#fbbf24; font-weight:bold; margin-bottom:6px; background:#1e1b4b; padding:4px 8px; border-radius:6px;">💬 "${p.liveNote}"</div>` : ''}`
        : '';

      marker.bindPopup(`
        <div style="font-family:sans-serif; padding:2px; min-width:170px;">
          ${liveBadge}
          <strong style="color:${p.isLive ? '#a855f7' : isMe ? '#e11d48' : '#2563eb'}; font-size:13px; display:block; margin-bottom:4px;">
            ${p.username} ${isMe ? '(Du)' : ''}
          </strong>
          <div style="font-size:11px; margin-bottom:4px; color:#334155;"><b>📍 Standort:</b> ${p.city}</div>
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

    if (myPin && !isLiveMode) {
      mapInstanceRef.current.setView([myPin.lat, myPin.lng], 9);
    }
  }, [mapPins, pois, showTreffs, showPasses, currentUser, isLiveMode]);

  // Draw Live Recorded Track on Leaflet Map
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (livePolylineRef.current) {
      livePolylineRef.current.remove();
      livePolylineRef.current = null;
    }

    if (trackPoints.length >= 2) {
      const latLngs = trackPoints.map((p) => [p.lat, p.lng] as [number, number]);
      const polyline = L.polyline(latLngs, {
        color: '#fbbf24',
        weight: 5,
        opacity: 0.9,
        dashArray: '2, 6',
      }).addTo(mapInstanceRef.current);
      livePolylineRef.current = polyline;
    }
  }, [trackPoints]);

  return (
    <div className="py-6 max-w-6xl mx-auto px-4">
      {/* Header & Live Status Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold uppercase text-amber-400 flex items-center gap-2">
            <MapPinIcon className="w-8 h-8" /> PixelMap Community Karte
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Finde Rider in deiner Nähe, Treffpunkte, Kurvenstrecken & Live-Biker
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {liveRidersCount > 0 && (
            <div className="bg-purple-950/80 border border-purple-600/60 text-purple-200 text-xs font-extrabold px-3.5 py-2 rounded-full flex items-center gap-2 shadow-lg">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <span>{liveRidersCount} Rider gerade LIVE unterwegs</span>
            </div>
          )}

          <button
            onClick={() => setAddPoiModalOpen(true)}
            className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase px-4 py-2.5 rounded-full transition-all shadow-lg flex items-center gap-2 border-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> POI Hinzufügen
          </button>
        </div>
      </div>

      {/* Prominent LIVE RIDE Banner / Card */}
      <div className="mb-6 bg-gradient-to-r from-purple-950/90 via-slate-900 to-amber-950/70 border border-purple-700/60 p-5 rounded-2xl shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-purple-900/60 rounded-2xl border border-purple-500/40 text-amber-400 flex-shrink-0">
              <Radio className={`w-7 h-7 ${isLiveMode ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold uppercase text-white tracking-wide">
                  Jetzt Losfahren (Live-Standort Teilen)
                </h3>
                {isLiveMode ? (
                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> Aktiv
                  </span>
                ) : (
                  <span className="bg-slate-800 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full">Inaktiv</span>
                )}
              </div>

              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                {isLiveMode ? (
                  <>
                    Dein GPS-Standort wird automatisch <strong className="text-amber-400">alle {intervalMinutes} Minuten</strong> aktualisiert.
                    {trackPoints.length > 0 && (
                      <span className="block text-amber-400 text-[11px] font-extrabold mt-1 bg-amber-950/60 border border-amber-500/30 px-2.5 py-1 rounded-lg inline-block">
                        📍 Live Route aufgezeichnet: <strong>{calculateTrackDistanceKm(trackPoints)} km</strong> ({trackPoints.length} Wegpunkte)
                      </span>
                    )}
                    {lastLiveTime && <span className="block text-emerald-400 text-[11px] font-semibold mt-0.5">Letztes GPS-Update: {lastLiveTime} Uhr</span>}
                    {liveNoteInput && <span className="block text-purple-300 italic text-[11px] mt-0.5">💬 "{liveNoteInput}"</span>}
                  </>
                ) : (
                  'Starte die Live-Funktion vor deiner Ausfahrt! Dein GPS-Standort wird automatisch alle 5 Minuten aktualisiert & deine Route aufgezeichnet, um sie später zu speichern.'
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
            {!isLiveMode ? (
              <button
                onClick={() => setLiveModalOpen(true)}
                className="w-full md:w-auto px-6 py-3 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-black text-xs uppercase shadow-xl transition-all border-0 cursor-pointer flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-black" /> Jetzt Losfahren
              </button>
            ) : (
              <>
                <button
                  onClick={() => fetchAndSendGpsLocation(true)}
                  disabled={isLocating}
                  className="px-4 py-2.5 rounded-full bg-purple-800 hover:bg-purple-700 text-white font-bold text-xs uppercase transition-all border border-purple-500/50 cursor-pointer flex items-center gap-1.5 shadow-md"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} /> GPS Erneuern
                </button>

                <button
                  onClick={handleStopLiveRide}
                  className="px-4 py-2.5 rounded-full bg-red-950/80 hover:bg-red-900 text-red-200 font-extrabold text-xs uppercase transition-all border border-red-600/60 cursor-pointer flex items-center gap-1.5 shadow-md"
                >
                  <Square className="w-3.5 h-3.5 fill-red-200" /> Fahrt Beenden
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar Controls */}
        <div className="lg:col-span-1 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl space-y-6">
          {/* User Location Form */}
          <div>
            <h3 className="text-sm font-bold uppercase text-amber-400 mb-3 flex items-center gap-1.5">
              <MapPinIcon className="w-4 h-4" /> Heimat-Standort
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
                  Motorräder (bis zu 5 Bikes):
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
                <RotateCw className="w-3.5 h-3.5" /> {myPin ? 'Standort Speichern' : 'Pin Anlegen'}
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

      {/* Live Ride Modal */}
      {liveModalOpen && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="max-w-md w-full rounded-2xl bg-slate-950 border border-purple-600 p-6 relative shadow-2xl">
            <button
              onClick={() => setLiveModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white border-0 bg-transparent cursor-pointer text-lg"
            >
              ✕
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-purple-900/60 rounded-xl text-amber-400 border border-purple-500/40">
                <Navigation className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase text-amber-400">Jetzt Losfahren (Live Ride)</h3>
                <p className="text-xs text-slate-400">Teile deinen Live-Standort auf der PixelMap</p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setLiveModalOpen(false);
                setIsLiveMode(true);
                fetchAndSendGpsLocation(true);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                  Tour / Status-Notiz (optional):
                </label>
                <input
                  type="text"
                  value={liveNoteInput}
                  onChange={(e) => setLiveNoteInput(e.target.value)}
                  placeholder="z.B. Richtung Schwarzwald, Feierabendrunde..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                  GPS-Aktualisierungsintervall:
                </label>
                <select
                  value={intervalMinutes}
                  onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value={2}>Alle 2 Minuten</option>
                  <option value={5}>Alle 5 Minuten (Standard)</option>
                  <option value={10}>Alle 10 Minuten</option>
                </select>
              </div>

              <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 text-[11px] text-slate-300 space-y-1">
                <p className="font-bold text-amber-400">📍 Wie es funktioniert:</p>
                <p>1. Dein Browser fragt nach Zugriff auf deinen aktuellen GPS-Standort.</p>
                <p>2. Dein Standort wird als lila, blinkender Biker-Marker 🏍️ auf der Karte angezeigt.</p>
                <p>3. Alle {intervalMinutes} Minuten sendet deine App ein frisches GPS-Signal.</p>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 text-black font-black uppercase text-xs shadow-xl transition-all border-0 cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                <Play className="w-4 h-4 fill-black" /> Live-Tracking jetzt Starten
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add POI Modal */}
      {addPoiModalOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="max-w-md w-full rounded-2xl bg-slate-950 border border-purple-800 p-6 relative shadow-2xl max-h-[90vh] overflow-y-auto pb-10">
            <button
              onClick={() => setAddPoiModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white border-0 bg-transparent cursor-pointer text-lg"
            >
              ✕
            </button>

            <h3 className="text-xl font-bold uppercase text-amber-400 mb-4">Neuen POI Eintragen</h3>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
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

      {/* Save Recorded Route Modal */}
      {saveRouteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="max-w-lg w-full rounded-2xl bg-slate-950 border border-amber-500/60 p-6 relative shadow-2xl space-y-5">
            <button
              onClick={() => {
                setSaveRouteModalOpen(false);
                setTrackPoints([]);
                try {
                  localStorage.removeItem('app_live_track');
                } catch (e) {}
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white border-0 bg-transparent cursor-pointer text-lg"
            >
              ✕
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/40">
                <Route className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase text-amber-400">Route Speichern & Teilen?</h3>
                <p className="text-xs text-slate-300">Du hast deine Ausfahrt beendet! Möchtest du diese Strecke als GPX-Tour speichern?</p>
              </div>
            </div>

            {/* Ride Stats Cards */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-center">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Distanz</span>
                <span className="text-sm font-black text-amber-400">{calculateTrackDistanceKm(trackPoints)} km</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-center">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">GPS-Punkte</span>
                <span className="text-sm font-black text-purple-300">{trackPoints.length}</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-center">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Dauer</span>
                <span className="text-sm font-black text-emerald-400">
                  {trackPoints.length >= 2
                    ? `${Math.max(1, Math.round((new Date(trackPoints[trackPoints.length - 1].time).getTime() - new Date(trackPoints[0].time).getTime()) / 60000))} Min.`
                    : '-'}
                </span>
              </div>
            </div>

            {/* SVG Track Preview */}
            {trackPoints.length >= 2 && (
              <div className="w-full h-36 bg-slate-900/90 rounded-xl border border-slate-800 p-2 flex items-center justify-center">
                {(() => {
                  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
                  trackPoints.forEach((p) => {
                    if (p.lat < minLat) minLat = p.lat;
                    if (p.lat > maxLat) maxLat = p.lat;
                    if (p.lng < minLng) minLng = p.lng;
                    if (p.lng > maxLng) maxLng = p.lng;
                  });
                  const latRange = maxLat - minLat || 0.0001;
                  const lngRange = maxLng - minLng || 0.0001;
                  const w = 360, h = 120, pad = 15;
                  let d = '';
                  trackPoints.forEach((p, idx) => {
                    const x = pad + ((p.lng - minLng) / lngRange) * (w - pad * 2);
                    const y = h - (pad + ((p.lat - minLat) / latRange) * (h - pad * 2));
                    d += idx === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
                  });
                  return (
                    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full">
                      <path d={d} fill="none" stroke="#facc15" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_0_8px_rgba(250,204,21,0.7)]" />
                    </svg>
                  );
                })()}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                Titel der GPX-Tour:
              </label>
              <input
                type="text"
                value={saveRouteTitle}
                onChange={(e) => setSaveRouteTitle(e.target.value)}
                placeholder="z.B. Schwarzwald Kurventraum"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  if (!saveRouteTitle.trim()) {
                    if (showAlert) showAlert('Fehler', 'Bitte gib einen Namen für deine Tour ein.', 'warning');
                    return;
                  }
                  const distStr = `${calculateTrackDistanceKm(trackPoints)} km`;
                  const gpxXml = generateGpxXml(saveRouteTitle, trackPoints);
                  if (onSaveRecordedRoute) {
                    onSaveRecordedRoute(saveRouteTitle, distStr, gpxXml);
                  }
                  setSaveRouteModalOpen(false);
                  setTrackPoints([]);
                  try {
                    localStorage.removeItem('app_live_track');
                  } catch (e) {}
                }}
                className="w-full py-3 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 text-black font-black uppercase text-xs shadow-xl transition-all border-0 cursor-pointer flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" /> als GPX-Tour veröffentlichen
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    const gpxXml = generateGpxXml(saveRouteTitle || 'Gefahrene-Route', trackPoints);
                    const blob = new Blob([gpxXml], { type: 'application/gpx+xml' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${(saveRouteTitle || 'Meine_Route').replace(/\s+/g, '_')}.gpx`;
                    a.click();
                    URL.revokeObjectURL(url);
                    if (showAlert) showAlert('GPX Download', 'GPX-Datei wurde auf dein Gerät heruntergeladen!', 'success');
                  }}
                  className="py-2.5 rounded-full bg-purple-900/80 hover:bg-purple-800 text-purple-200 font-extrabold uppercase text-[11px] border border-purple-500/50 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> GPX Herunterladen
                </button>

                <button
                  onClick={() => {
                    setSaveRouteModalOpen(false);
                    setTrackPoints([]);
                    try {
                      localStorage.removeItem('app_live_track');
                    } catch (e) {}
                    if (showAlert) showAlert('Info', 'Fahrt ohne Speichern beendet.', 'info');
                  }}
                  className="py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white font-extrabold uppercase text-[11px] border border-slate-800 cursor-pointer"
                >
                  Verwerfen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

