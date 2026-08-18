import React, { useState, useEffect, useRef } from 'react';
import type { MapPin, Poi, User } from '../types';
import {
  MapPin as MapPinIcon,
  Search,
  Compass,
  Plus,
  RotateCw,
  RotateCcw,
  Navigation,
  Play,
  Square,
  Radio,
  Save,
  Download,
  Map,
  Route,
  MousePointerClick,
  Check,
  Crosshair,
  X,
  Globe,
  Edit,
  Trash2,
  AlertTriangle,
  Info,
  ShieldAlert,
  Filter,
  Sparkles,
  ExternalLink,
  Loader2,
  Zap,
} from 'lucide-react';
import L from 'leaflet';

interface MapViewProps {
  currentUser: User;
  mapPins: MapPin[];
  pois: Poi[];
  showAlert?: (title: string, message: string, type?: 'success' | 'warning' | 'danger') => void;
  showConfirm?: (title: string, message: string, onConfirm: () => void) => void;
  onSavePin: (zip: string, city: string, bikes: string) => void;
  onUpdateLivePin?: (lat: number, lng: number, isLive: boolean, liveNote?: string) => void;
  onAddPoi: (poi: Poi) => void;
  onEditPoi?: (poi: Poi) => void;
  onDeletePoi?: (idOrName: string, reason?: string, poi?: Poi) => void;
  onSaveRecordedRoute?: (title: string, distance: string, gpxText: string) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  currentUser,
  mapPins,
  pois,
  showAlert,
  showConfirm,
  onSavePin,
  onUpdateLivePin,
  onAddPoi,
  onEditPoi,
  onDeletePoi,
  onSaveRecordedRoute,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const poiGroupRef = useRef<L.LayerGroup | null>(null);
  const drawingLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const radiusCircleGroupRef = useRef<L.LayerGroup | null>(null);
  const livePolylineRef = useRef<L.Polyline | null>(null);
  const tempPickMarkerRef = useRef<L.Marker | null>(null);

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

  // Search & Radius Filter states
  const [radius, setRadius] = useState(50);
  const [isRadiusFilterActive, setIsRadiusFilterActive] = useState<boolean>(true);
  const [showTreffs, setShowTreffs] = useState(true);
  const [showPasses, setShowPasses] = useState(true);

  // Quick Address Jump & Search State (for drawing / picking HUD & Modal)
  const [poiSearchJumpInput, setPoiSearchJumpInput] = useState('');
  const [hudJumpInput, setHudJumpInput] = useState('');
  const [isJumpSearching, setIsJumpSearching] = useState(false);

  // Modal POI & Interactive Map Pinning (Add Mode)
  const [addPoiModalOpen, setAddPoiModalOpen] = useState(false);
  const [poiMode, setPoiMode] = useState<'address' | 'map' | 'route'>('address');
  const [isPickingOnMap, setIsPickingOnMap] = useState(false);
  const [selectedMapPoint, setSelectedMapPoint] = useState<{ lat: number; lng: number; address?: string } | null>(null);
  const [poiName, setPoiName] = useState('');
  const [poiCategory, setPoiCategory] = useState<'treff' | 'pass'>('treff');
  const [poiLocation, setPoiLocation] = useState('');
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  // Interactive Route Drawing Mode (for Kurvenstrecken / Pässe / Streckenverläufe)
  const [isDrawingRoute, setIsDrawingRoute] = useState(false);
  const [isEditDrawingRoute, setIsEditDrawingRoute] = useState(false);
  const [routeWaypoints, setRouteWaypoints] = useState<[number, number][]>([]); // Key clicked milestones / turn points
  const [routeDrawPoints, setRouteDrawPoints] = useState<[number, number][]>([]); // High-res road geometry polyline
  const [routeCalculatedKm, setRouteCalculatedKm] = useState<number>(0);
  const [snapToRoads, setSnapToRoads] = useState<boolean>(true); // Auto-snap & follow curvy roads using OSRM
  const [isRoutingLoading, setIsRoutingLoading] = useState<boolean>(false);

  const [selectedRouteCoords, setSelectedRouteCoords] = useState<[number, number][] | null>(null);
  const [selectedRawWaypoints, setSelectedRawWaypoints] = useState<[number, number][] | null>(null);
  const [selectedRouteDistance, setSelectedRouteDistance] = useState<number | undefined>(undefined);

  const [editSelectedRouteCoords, setEditSelectedRouteCoords] = useState<[number, number][] | null>(null);
  const [editSelectedRawWaypoints, setEditSelectedRawWaypoints] = useState<[number, number][] | null>(null);
  const [editSelectedRouteDistance, setEditSelectedRouteDistance] = useState<number | undefined>(undefined);

  // Modal POI & Interactive Map Pinning (Edit Mode)
  const [editPoiModalOpen, setEditPoiModalOpen] = useState(false);
  const [editingPoi, setEditingPoi] = useState<Poi | null>(null);
  const [editPoiName, setEditPoiName] = useState('');
  const [editPoiCategory, setEditPoiCategory] = useState<'treff' | 'pass'>('treff');
  const [editPoiLocation, setEditPoiLocation] = useState('');
  const [editPoiMode, setEditPoiMode] = useState<'address' | 'map' | 'route'>('address');
  const [editSelectedPoint, setEditSelectedPoint] = useState<{ lat: number; lng: number; address?: string } | null>(null);
  const [isEditPickingOnMap, setIsEditPickingOnMap] = useState(false);

  // Jump to Address / City / Mountain Pass on map
  const jumpToAddress = async (query: string, zoom = 14) => {
    if (!query || !query.trim()) return null;
    setIsJumpSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([lat, lon], zoom, { duration: 1.2 });
        }
        setIsJumpSearching(false);
        return { lat, lng: lon, name: data[0].display_name };
      } else {
        if (showAlert) showAlert('Ort nicht gefunden', `Keine Position für "${query}" gefunden. Bitte überprüfe die Schreibweise.`, 'warning');
      }
    } catch (err) {
      console.error('Jump search error:', err);
      if (showAlert) showAlert('Suchfehler', 'Fehler bei der Ortssuche aufgetreten.', 'warning');
    }
    setIsJumpSearching(false);
    return null;
  };

  // Haversine Distance helper between 2 coordinate points (in km)
  const getHaversineDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  };

  // Calculate distance from user center to a POI (or shortest distance to its route)
  const getPoiDistanceToUser = (poi: Poi, userLat?: number, userLng?: number) => {
    if (userLat === undefined || userLng === undefined) return null;
    if (poi.route_coords && poi.route_coords.length > 0) {
      let minD = Infinity;
      for (const [rLat, rLng] of poi.route_coords) {
        const d = getHaversineDistanceKm(userLat, userLng, rLat, rLng);
        if (d < minD) minD = d;
      }
      return Math.round(minD * 10) / 10;
    }
    return getHaversineDistanceKm(userLat, userLng, poi.lat, poi.lng);
  };

  // Helper function to calculate distance along a route polyline in kilometers
  const calculatePolylineDistanceKm = (coords?: [number, number][] | null) => {
    if (!coords || coords.length < 2) return 0;
    let totalKm = 0;
    for (let i = 0; i < coords.length - 1; i++) {
      const [lat1, lng1] = coords[i];
      const [lat2, lng2] = coords[i + 1];
      const R = 6371; // Earth radius in km
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLng = ((lng2 - lng1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      totalKm += R * c;
    }
    return Math.round(totalKm * 10) / 10;
  };

  // Road Routing calculation using OpenStreetMap OSRM driving engine
  const computeRoadRoute = async (waypoints: [number, number][], snap: boolean) => {
    if (waypoints.length === 0) {
      setRouteDrawPoints([]);
      setRouteCalculatedKm(0);
      return;
    }
    if (waypoints.length === 1) {
      setRouteDrawPoints(waypoints);
      setRouteCalculatedKm(0);
      return;
    }

    if (!snap) {
      setRouteDrawPoints(waypoints);
      setRouteCalculatedKm(calculatePolylineDistanceKm(waypoints));
      return;
    }

    setIsRoutingLoading(true);
    try {
      // OSRM coordinates format: lng,lat;lng,lat...
      const coordsParam = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(';');
      const url = `https://router.project-osrm.org/route/v1/driving/${coordsParam}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('OSRM routing request not ok');
      const data = await res.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const rawGeojsonCoords = route.geometry.coordinates as [number, number][]; // [lng, lat]
        const latLngCoords = rawGeojsonCoords.map(([lng, lat]) => [lat, lng] as [number, number]);
        const distanceKm = Math.round((route.distance / 1000) * 10) / 10;
        setRouteDrawPoints(latLngCoords);
        setRouteCalculatedKm(distanceKm);
        setIsRoutingLoading(false);
        return;
      }
    } catch (err) {
      console.warn('OSRM routing request failed, falling back to direct line:', err);
    }
    // Fallback: direct polyline between points
    setRouteDrawPoints(waypoints);
    setRouteCalculatedKm(calculatePolylineDistanceKm(waypoints));
    setIsRoutingLoading(false);
  };

  // Start Drawing Route for new or edited POI
  const startRouteDrawing = (isEdit: boolean = false) => {
    if (isEdit) {
      setIsEditDrawingRoute(true);
      setIsEditPickingOnMap(false);
      setEditPoiModalOpen(false);
      const existingRaw = editSelectedRawWaypoints || editingPoi?.raw_waypoints || [];
      const existingCoords = editSelectedRouteCoords || (editingPoi?.route_coords ? [...editingPoi.route_coords] : []);
      const initialWaypoints =
        existingRaw.length > 0
          ? existingRaw
          : existingCoords.length <= 6
          ? existingCoords
          : existingCoords.length > 0
          ? [existingCoords[0], existingCoords[existingCoords.length - 1]]
          : [];
      setRouteWaypoints(initialWaypoints);
      setRouteDrawPoints(existingCoords);
      setRouteCalculatedKm(editingPoi?.distance_km || calculatePolylineDistanceKm(existingCoords));
      if (existingCoords.length >= 2 && mapInstanceRef.current) {
        mapInstanceRef.current.fitBounds(existingCoords, { padding: [60, 60] });
      }
    } else {
      setIsDrawingRoute(true);
      setIsPickingOnMap(false);
      setAddPoiModalOpen(false);
      const existingRaw = selectedRawWaypoints || [];
      const existingCoords = selectedRouteCoords || [];
      const initialWaypoints =
        existingRaw.length > 0
          ? existingRaw
          : existingCoords.length <= 6
          ? existingCoords
          : existingCoords.length > 0
          ? [existingCoords[0], existingCoords[existingCoords.length - 1]]
          : [];
      setRouteWaypoints(initialWaypoints);
      setRouteDrawPoints(existingCoords);
      setRouteCalculatedKm(selectedRouteDistance || calculatePolylineDistanceKm(existingCoords));
      if (existingCoords.length >= 2 && mapInstanceRef.current) {
        mapInstanceRef.current.fitBounds(existingCoords, { padding: [60, 60] });
      }
    }
  };

  // Finish drawing route and return to modal
  const finishRouteDrawing = async () => {
    if (routeWaypoints.length < 2 && routeDrawPoints.length < 2) {
      if (showAlert) showAlert('Hinweis', 'Bitte markiere mindestens 2 Punkte für den Streckenverlauf (Start & Ziel/Abbiegung).', 'warning');
      return;
    }

    const startPoint = routeDrawPoints[0] || routeWaypoints[0];
    const midPoint = routeDrawPoints[Math.floor(routeDrawPoints.length / 2)] || routeWaypoints[Math.floor(routeWaypoints.length / 2)];
    const finalDistance = routeCalculatedKm > 0 ? routeCalculatedKm : calculatePolylineDistanceKm(routeDrawPoints);

    // Reverse geocode start/mid point for auto-suggestion if needed
    let suggestedLoc = '';
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${startPoint[0]}&lon=${startPoint[1]}&zoom=14`);
      const data = await res.json();
      if (data && data.display_name) {
        const addr = data.address;
        const primary = addr?.amenity || addr?.tourism || addr?.mountain_pass || addr?.road || addr?.village || addr?.town || addr?.city;
        const cityPart = addr?.city || addr?.town || addr?.village || addr?.municipality || addr?.state;
        if (primary && cityPart && primary !== cityPart) {
          suggestedLoc = `${primary}, ${cityPart}`;
        } else if (primary) {
          suggestedLoc = primary;
        } else {
          suggestedLoc = data.display_name.split(',').slice(0, 2).join(', ').trim();
        }
      }
    } catch (e) {}

    if (isDrawingRoute) {
      setSelectedRouteCoords(routeDrawPoints);
      setSelectedRawWaypoints(routeWaypoints);
      setSelectedRouteDistance(finalDistance);
      setSelectedMapPoint({ lat: midPoint[0], lng: midPoint[1], address: suggestedLoc });
      if (!poiLocation && suggestedLoc) setPoiLocation(suggestedLoc);
      if (!poiName && suggestedLoc) setPoiName(suggestedLoc);
      setPoiCategory('pass');
      setPoiMode('route');
      setIsDrawingRoute(false);
      setAddPoiModalOpen(true);
    } else if (isEditDrawingRoute) {
      setEditSelectedRouteCoords(routeDrawPoints);
      setEditSelectedRawWaypoints(routeWaypoints);
      setEditSelectedRouteDistance(finalDistance);
      setEditSelectedPoint({ lat: midPoint[0], lng: midPoint[1], address: suggestedLoc });
      if (!editPoiLocation && suggestedLoc) setEditPoiLocation(suggestedLoc);
      setEditPoiCategory('pass');
      setEditPoiMode('route');
      setIsEditDrawingRoute(false);
      setEditPoiModalOpen(true);
    }

    if (drawingLayerGroupRef.current) {
      drawingLayerGroupRef.current.clearLayers();
    }
  };

  // Deletion Modal with Reason (Admins / Moderators)
  const [deleteModalPoi, setDeleteModalPoi] = useState<Poi | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deletePresetReason, setDeletePresetReason] = useState('');

  // POI List Filters
  const [poiSearchQuery, setPoiSearchQuery] = useState('');
  const [poiTabFilter, setPoiTabFilter] = useState<'all' | 'treff' | 'pass' | 'mine'>('all');

  const liveRidersCount = mapPins.filter((p) => p.isLive).length;

  // Check if current user can manage a POI (Author OR Admin OR Mod)
  const canManagePoi = (poi: Poi) => {
    if (currentUser.isAdmin || currentUser.isModerator) return true;
    if (
      poi.created_by &&
      (poi.created_by.toLowerCase() === currentUser.username.toLowerCase() ||
        (currentUser.email && poi.created_by.toLowerCase() === currentUser.email.toLowerCase()))
    ) {
      return true;
    }
    return false;
  };

  const isPoiAuthor = (poi: Poi) => {
    return Boolean(
      poi.created_by &&
        (poi.created_by.toLowerCase() === currentUser.username.toLowerCase() ||
          (currentUser.email && poi.created_by.toLowerCase() === currentUser.email.toLowerCase()))
    );
  };

  // Start Edit POI
  const startEditPoi = (poi: Poi) => {
    setEditingPoi(poi);
    setEditPoiName(poi.name);
    setEditPoiCategory(poi.type);
    setEditPoiLocation(poi.location || '');
    setEditPoiMode(poi.route_coords && poi.route_coords.length >= 2 ? 'route' : 'address');
    setEditSelectedPoint({ lat: poi.lat, lng: poi.lng, address: poi.location });
    setEditSelectedRouteCoords(poi.route_coords ? [...poi.route_coords] : null);
    setEditSelectedRawWaypoints(poi.raw_waypoints ? [...poi.raw_waypoints] : null);
    setEditSelectedRouteDistance(poi.distance_km);
    setIsEditPickingOnMap(false);
    setIsEditDrawingRoute(false);
    setEditPoiModalOpen(true);
  };

  // Start Delete POI
  const triggerDeletePoi = (poi: Poi) => {
    const isAuthor = isPoiAuthor(poi);

    // If Admin or Moderator: always open modal to enter mandatory deletion reason
    if (currentUser.isAdmin || currentUser.isModerator) {
      setDeleteModalPoi(poi);
      setDeleteReason('');
      setDeletePresetReason('');
    } else if (isAuthor) {
      // Regular user deleting their own created POI
      if (showConfirm) {
        showConfirm(
          'POI Löschen',
          `Möchtest du deinen erstellten Spot "${poi.name}" wirklich von der PixelMap entfernen?`,
          () => {
            if (onDeletePoi) {
              onDeletePoi(poi.id || poi.name, 'Vom Ersteller gelöscht', poi);
            }
          }
        );
      } else {
        if (window.confirm(`Möchtest du deinen Spot "${poi.name}" wirklich löschen?`)) {
          if (onDeletePoi) {
            onDeletePoi(poi.id || poi.name, 'Vom Ersteller gelöscht', poi);
          }
        }
      }
    }
  };

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

      const bikesArr = (myPin.bike || '').split('\n');
      const padded = [...bikesArr, '', '', '', '', ''].slice(0, 5);
      setBikeLines(padded);
    }
  }, [myPin]);

  // Handle Form Submission for Home-Pin
  const handleSaveHomePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!zip || !city) {
      if (showAlert) showAlert('Fehler', 'Bitte PLZ und Ort eingeben.', 'warning');
      return;
    }
    const cleanBikes = bikeLines.map((b) => b.trim()).filter(Boolean).join('\n');
    onSavePin(zip, city, cleanBikes);
  };

  // Acquire current GPS position
  const performLocationUpdate = () => {
    if (!navigator.geolocation) {
      if (showAlert) showAlert('Fehler', 'Geolocation wird von deinem Browser nicht unterstützt.', 'danger');
      return;
    }

    setIsLocating(true);

    const handleSuccess = (pos: GeolocationPosition) => {
      setIsLocating(false);
      const { latitude, longitude } = pos.coords;
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const isoStr = new Date().toISOString();
      setLastLiveTime(nowStr);

      // Record Track Point
      setTrackPoints((prev) => {
        const updated = [...prev, { lat: latitude, lng: longitude, time: isoStr }];
        try {
          localStorage.setItem('app_live_track', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });

      if (onUpdateLivePin) {
        onUpdateLivePin(latitude, longitude, true, liveNoteInput);
      }

      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([latitude, longitude], 13);
      }
    };

    const handleError = (err: GeolocationPositionError) => {
      // If high-accuracy timed out or failed, try standard accuracy fallback once
      if (err.code === 3 || err.code === 2) {
        navigator.geolocation.getCurrentPosition(
          handleSuccess,
          (fallbackErr) => {
            setIsLocating(false);
            const errMsg = fallbackErr.code === 1
              ? 'Standortzugriff verweigert. Bitte Berechtigung im Browser erteilen.'
              : 'Standort konnte nicht ermittelt werden. Bitte GPS/Standortdienste aktivieren.';
            console.warn('GPS location unavailable:', fallbackErr.message || fallbackErr.code);
            if (showAlert) {
              showAlert('GPS Hinweis', errMsg, 'warning');
            }
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
        );
        return;
      }

      setIsLocating(false);
      const errMsg = err.code === 1
        ? 'Standortzugriff verweigert. Bitte Berechtigung im Browser erteilen.'
        : 'Standort konnte nicht ermittelt werden. Bitte GPS/Standortdienste aktivieren.';
      console.warn('GPS location error:', err.message || err.code);
      if (showAlert) {
        showAlert('GPS Hinweis', errMsg, 'warning');
      }
    };

    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      handleError,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
    );
  };

  // Live Location Background Interval
  useEffect(() => {
    let intervalId: any = null;
    if (isLiveMode) {
      performLocationUpdate();
      const ms = Math.max(1, intervalMinutes) * 60 * 1000;
      intervalId = setInterval(() => {
        performLocationUpdate();
      }, ms);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isLiveMode, intervalMinutes]);

  // Toggle Live Ride
  const toggleLiveRide = () => {
    if (!isLiveMode) {
      setIsLiveMode(true);
      setLiveModalOpen(false);
      setTrackPoints([]);
      try {
        localStorage.removeItem('app_live_track');
      } catch (e) {}
      performLocationUpdate();
      if (showAlert) {
        showAlert('Live-Fahrt gestartet 🏍️', 'Dein Standort & deine gefahrene Route werden jetzt live geteilt!', 'success');
      }
    } else {
      setIsLiveMode(false);
      if (myPin && onUpdateLivePin) {
        onUpdateLivePin(myPin.lat, myPin.lng, false);
      }

      if (trackPoints.length >= 2) {
        setSaveRouteTitle(`Feierabendrunde ${new Date().toLocaleDateString('de-DE')}`);
        setSaveRouteModalOpen(true);
      } else {
        setTrackPoints([]);
        try {
          localStorage.removeItem('app_live_track');
        } catch (e) {}
        if (showAlert) {
          showAlert('Live-Modus beendet', 'Dein Live-Standort wurde deaktiviert.', 'info');
        }
      }
    }
  };

  // Interactive Map Picking & Route Drawing Handler
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (isPickingOnMap || isEditPickingOnMap) {
      map.getContainer().style.cursor = 'crosshair';

      const handleMapClick = async (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;

        // Create or update temporary glowing marker
        if (tempPickMarkerRef.current) {
          tempPickMarkerRef.current.remove();
        }

        const pickIcon = L.divIcon({
          className: 'custom-poi-pick-marker',
          html: `
            <div style="position:relative; width:38px; height:38px; display:flex; align-items:center; justify-content:center; background:#f59e0b; border:3px solid #ffffff; border-radius:50%; box-shadow:0 0 22px rgba(245,158,11,1); cursor:pointer;">
              <div style="position:absolute; inset:-8px; border-radius:50%; background:#f59e0b; opacity:0.6; animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
              <span style="position:relative; z-index:10; font-size:18px;">📍</span>
            </div>
          `,
          iconSize: [38, 38],
          iconAnchor: [19, 19],
        });

        const newMarker = L.marker([lat, lng], { icon: pickIcon }).addTo(map);
        tempPickMarkerRef.current = newMarker;

        setIsReverseGeocoding(true);
        let placeName = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14`);
          const data = await res.json();
          if (data && data.display_name) {
            const addr = data.address;
            const primary = addr?.amenity || addr?.tourism || addr?.mountain_pass || addr?.road || addr?.village || addr?.town || addr?.city;
            const cityPart = addr?.city || addr?.town || addr?.village || addr?.municipality || addr?.state;
            if (primary && cityPart && primary !== cityPart) {
              placeName = `${primary}, ${cityPart}`;
            } else if (primary) {
              placeName = primary;
            } else {
              placeName = data.display_name.split(',').slice(0, 2).join(',').trim();
            }
          }
        } catch (err) {
          console.warn('Reverse geocode error:', err);
        } finally {
          setIsReverseGeocoding(false);
        }

        if (isPickingOnMap) {
          setSelectedMapPoint({ lat, lng, address: placeName });
          setPoiLocation(placeName);
          setPoiMode('map');
          setIsPickingOnMap(false);
          setAddPoiModalOpen(true);
        } else if (isEditPickingOnMap) {
          setEditSelectedPoint({ lat, lng, address: placeName });
          setEditPoiLocation(placeName);
          setEditPoiMode('map');
          setIsEditPickingOnMap(false);
          setEditPoiModalOpen(true);
        }
      };

      map.on('click', handleMapClick);

      return () => {
        map.off('click', handleMapClick);
        if (map.getContainer()) {
          map.getContainer().style.cursor = '';
        }
      };
    } else if (isDrawingRoute || isEditDrawingRoute) {
      map.getContainer().style.cursor = 'crosshair';

      const handleRouteDrawClick = (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        setRouteWaypoints((prev) => {
          const next: [number, number][] = [...prev, [lat, lng]];
          computeRoadRoute(next, snapToRoads);
          return next;
        });
      };

      map.on('click', handleRouteDrawClick);

      return () => {
        map.off('click', handleRouteDrawClick);
        if (map.getContainer()) {
          map.getContainer().style.cursor = '';
        }
      };
    } else {
      if (map.getContainer()) {
        map.getContainer().style.cursor = '';
      }
    }
  }, [isPickingOnMap, isEditPickingOnMap, isDrawingRoute, isEditDrawingRoute, snapToRoads]);

  // Update Live Route Drawing Layers on Leaflet Map
  useEffect(() => {
    if (!drawingLayerGroupRef.current) return;
    drawingLayerGroupRef.current.clearLayers();

    if (!isDrawingRoute && !isEditDrawingRoute) return;
    if (routeWaypoints.length === 0) return;

    // Draw connecting polyline along the road curves
    if (routeDrawPoints.length >= 2) {
      // Glow background line
      const glowLine = L.polyline(routeDrawPoints, {
        color: '#000000',
        weight: 9,
        opacity: 0.65,
        lineCap: 'round',
        lineJoin: 'round',
      });
      drawingLayerGroupRef.current.addLayer(glowLine);

      // Bright vibrant road polyline
      const polyline = L.polyline(routeDrawPoints, {
        color: '#f59e0b',
        weight: 5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      });
      drawingLayerGroupRef.current.addLayer(polyline);
    }

    // Render numbered Waypoint markers for each clicked milestone (Start, Turn 1, Turn 2, Finish)
    routeWaypoints.forEach((point, index) => {
      const isStart = index === 0;
      const isEnd = index === routeWaypoints.length - 1 && routeWaypoints.length > 1;

      let iconHtml = '';
      if (isStart) {
        iconHtml = `
          <div style="background:#10b981; color:#000000; font-weight:900; font-size:11px; padding:3px 8px; border-radius:12px; border:2px solid #ffffff; box-shadow:0 0 15px rgba(16,185,129,0.9); white-space:nowrap; display:flex; align-items:center; gap:3px;">
            <span>🟢</span> <span>Start (1)</span>
          </div>
        `;
      } else if (isEnd) {
        iconHtml = `
          <div style="background:#f59e0b; color:#000000; font-weight:900; font-size:11px; padding:3px 8px; border-radius:12px; border:2px solid #ffffff; box-shadow:0 0 15px rgba(245,158,11,0.9); white-space:nowrap; display:flex; align-items:center; gap:3px;">
            <span>🏁</span> <span>Ziel (${index + 1})</span>
          </div>
        `;
      } else {
        iconHtml = `
          <div style="background:#0f172a; color:#fbbf24; font-weight:900; font-size:10px; padding:2px 7px; border-radius:10px; border:2px solid #f59e0b; box-shadow:0 2px 8px rgba(0,0,0,0.6); white-space:nowrap; display:flex; align-items:center; gap:3px;">
            <span>📍</span> <span>Abbiegung ${index}</span>
          </div>
        `;
      }

      const marker = L.marker(point, {
        icon: L.divIcon({
          className: 'route-draw-waypoint',
          html: iconHtml,
          iconSize: isStart || isEnd ? [65, 24] : [80, 20],
          iconAnchor: isStart || isEnd ? [32, 12] : [40, 10],
        }),
      });

      drawingLayerGroupRef.current?.addLayer(marker);
    });
  }, [routeWaypoints, routeDrawPoints, isDrawingRoute, isEditDrawingRoute]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView([51.1657, 10.4515], 6);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      radiusCircleGroupRef.current = L.layerGroup().addTo(map);
      markersGroupRef.current = L.layerGroup().addTo(map);
      poiGroupRef.current = L.layerGroup().addTo(map);
      drawingLayerGroupRef.current = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
    }

    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 300);
  }, []);

  // Update Radius Circle on Leaflet Map
  useEffect(() => {
    if (!mapInstanceRef.current || !radiusCircleGroupRef.current) return;
    radiusCircleGroupRef.current.clearLayers();

    if (isRadiusFilterActive && myPin && myPin.lat && myPin.lng) {
      const circle = L.circle([myPin.lat, myPin.lng], {
        radius: radius * 1000,
        color: '#f59e0b',
        fillColor: '#fbbf24',
        fillOpacity: 0.08,
        weight: 2,
        dashArray: '6, 8',
      });
      radiusCircleGroupRef.current.addLayer(circle);
    }
  }, [isRadiusFilterActive, radius, myPin]);

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

    // User center coordinates for radius calculation
    const userCenter = myPin ? { lat: myPin.lat, lng: myPin.lng } : null;

    // Filter User Pins by Radius
    const visiblePins = mapPins.filter((p) => {
      const isMe = p.email === currentUser.email || p.username === currentUser.username;
      if (isMe) return true; // Always show current user's pin
      if (isRadiusFilterActive && userCenter) {
        const dist = getHaversineDistanceKm(userCenter.lat, userCenter.lng, p.lat, p.lng);
        return dist <= radius;
      }
      return true;
    });

    // Render User Pins
    visiblePins.forEach((p) => {
      const isMe = p.email === currentUser.email || p.username === currentUser.username;
      const markerIcon = p.isLive ? liveIcon : isMe ? redIcon : blueIcon;
      const marker = L.marker([p.lat, p.lng], { icon: markerIcon });
      const distFromMe = userCenter && !isMe ? getHaversineDistanceKm(userCenter.lat, userCenter.lng, p.lat, p.lng) : null;

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
          ${distFromMe !== null ? `<div style="font-size:11px; font-weight:bold; color:#d97706; margin-bottom:4px;">📏 ~${distFromMe} km entfernt</div>` : ''}
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

    // Filter POIs by Category and Radius
    const visiblePois = pois.filter((poi) => {
      if (poi.type === 'treff' && !showTreffs) return false;
      if (poi.type === 'pass' && !showPasses) return false;
      if (isRadiusFilterActive && userCenter) {
        const dist = getPoiDistanceToUser(poi, userCenter.lat, userCenter.lng);
        if (dist !== null && dist > radius) return false;
      }
      return true;
    });

    // Render POIs
    visiblePois.forEach((poi) => {
      const icon = poi.type === 'treff' ? greenIcon : goldIcon;
      const marker = L.marker([poi.lat, poi.lng], { icon });
      const label = poi.type === 'treff' ? '☕ Bikertreff / Café' : '🏔️ Pass / Kurventraum';
      const isAuthor = isPoiAuthor(poi);
      const canManage = canManagePoi(poi);
      const poiKey = poi.id || poi.name;
      const hasRoute = Boolean(poi.route_coords && poi.route_coords.length >= 2);
      const routeDist = poi.distance_km || (hasRoute ? calculatePolylineDistanceKm(poi.route_coords!) : 0);
      const poiDistFromUser = userCenter ? getPoiDistanceToUser(poi, userCenter.lat, userCenter.lng) : null;

        const buildPopupHtml = () => `
          <div style="font-family:sans-serif; min-width:210px; padding:2px;">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px; gap:4px;">
              <span style="background:${poi.type === 'treff' ? '#059669' : '#d97706'}; color:#ffffff; font-size:10px; font-weight:800; padding:2px 6px; border-radius:6px; text-transform:uppercase;">
                ${label}
              </span>
              ${
                hasRoute
                  ? `<span style="background:#0f172a; color:#fbbf24; font-size:10px; font-weight:800; padding:2px 6px; border-radius:6px; border:1px solid rgba(251,191,36,0.4);">
                       🏁 ${routeDist} km
                     </span>`
                  : ''
              }
            </div>
            <strong style="color:#f59e0b; font-size:13px; display:block; margin-bottom:2px;">${poi.name}</strong>
            <div style="font-size:11px; color:#475569; margin-bottom:4px;">📍 ${poi.location || 'Kartenposition'}</div>
            ${
              hasRoute
                ? `<div style="font-size:10px; color:#38bdf8; font-weight:bold; margin-bottom:6px; background:#0f172a; padding:4px 8px; border-radius:6px;">
                     🛣️ Streckenverlauf markiert (${poi.route_coords?.length} Wegpunkte)
                   </div>`
                : ''
            }
            ${
              poi.created_by
                ? `<div style="font-size:10px; color:#64748b; margin-bottom:6px; border-top:1px solid #e2e8f0; padding-top:4px;">Erstellt von: <b style="color:#b45309;">@${poi.created_by}</b> ${isAuthor ? '(Du)' : ''}</div>`
                : ''
            }
            ${
              hasRoute
                ? `<button id="poi-zoom-${encodeURIComponent(poiKey)}" style="background:#0f172a; color:#fbbf24; border:1px solid rgba(251,191,36,0.5); border-radius:6px; padding:4px 8px; font-size:10px; font-weight:800; cursor:pointer; width:100%; margin-bottom:4px;">
                     🔍 Ganze Strecke anzeigen
                   </button>`
                : ''
            }
            ${
              canManage
                ? `
              <div style="display:flex; gap:6px; margin-top:6px; padding-top:6px; border-top:1px solid #cbd5e1;">
                <button id="poi-edit-${encodeURIComponent(poiKey)}" style="background:#f59e0b; color:#000000; border:none; border-radius:6px; padding:4px 8px; font-size:10px; font-weight:800; cursor:pointer; flex:1;">
                  ✏️ Bearbeiten
                </button>
                <button id="poi-del-${encodeURIComponent(poiKey)}" style="background:#ef4444; color:#ffffff; border:none; border-radius:6px; padding:4px 8px; font-size:10px; font-weight:800; cursor:pointer; flex:1;">
                  🗑️ Löschen
                </button>
              </div>
            `
                : ''
            }
          </div>
        `;

        const bindHandlers = () => {
          const zoomBtn = document.getElementById(`poi-zoom-${encodeURIComponent(poiKey)}`);
          if (zoomBtn && poi.route_coords) {
            zoomBtn.onclick = () => {
              if (mapInstanceRef.current && poi.route_coords) {
                const bounds = L.latLngBounds(poi.route_coords);
                mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
              }
            };
          }
          if (canManage) {
            const editBtn = document.getElementById(`poi-edit-${encodeURIComponent(poiKey)}`);
            const delBtn = document.getElementById(`poi-del-${encodeURIComponent(poiKey)}`);
            if (editBtn) {
              editBtn.onclick = () => {
                marker.closePopup();
                startEditPoi(poi);
              };
            }
            if (delBtn) {
              delBtn.onclick = () => {
                marker.closePopup();
                triggerDeletePoi(poi);
              };
            }
          }
        };

        marker.bindPopup(buildPopupHtml());
        marker.on('popupopen', bindHandlers);

        // If POI has a drawn curve route, render the route polyline & endpoints
        if (hasRoute && poi.route_coords) {
          const shadowPolyline = L.polyline(poi.route_coords, {
            color: '#000000',
            weight: 8,
            opacity: 0.6,
            lineCap: 'round',
            lineJoin: 'round',
          });
          poiGroupRef.current?.addLayer(shadowPolyline);

          const routePolyline = L.polyline(poi.route_coords, {
            color: poi.type === 'pass' ? '#f59e0b' : '#10b981',
            weight: 5,
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round',
          });

          routePolyline.bindPopup(buildPopupHtml());
          routePolyline.on('popupopen', bindHandlers);
          poiGroupRef.current?.addLayer(routePolyline);

          // Route Start & End Badges
          const startCoord = poi.route_coords[0];
          const endCoord = poi.route_coords[poi.route_coords.length - 1];

          const startBadge = L.divIcon({
            className: 'route-start-badge',
            html: `<div style="background:#10b981; color:#000000; font-weight:900; font-size:10px; padding:2px 6px; border-radius:10px; border:2px solid #ffffff; box-shadow:0 2px 8px rgba(0,0,0,0.5); white-space:nowrap; cursor:pointer;">🟢 Start</div>`,
            iconSize: [42, 20],
            iconAnchor: [21, 20],
          });

          const endBadge = L.divIcon({
            className: 'route-end-badge',
            html: `<div style="background:#f59e0b; color:#000000; font-weight:900; font-size:10px; padding:2px 6px; border-radius:10px; border:2px solid #ffffff; box-shadow:0 2px 8px rgba(0,0,0,0.5); white-space:nowrap; cursor:pointer;">🏁 Ende (${routeDist} km)</div>`,
            iconSize: [80, 20],
            iconAnchor: [40, 20],
          });

          const startMarker = L.marker(startCoord, { icon: startBadge });
          const endMarker = L.marker(endCoord, { icon: endBadge });

          startMarker.bindPopup(buildPopupHtml());
          startMarker.on('popupopen', bindHandlers);
          endMarker.bindPopup(buildPopupHtml());
          endMarker.on('popupopen', bindHandlers);

          poiGroupRef.current?.addLayer(startMarker);
          poiGroupRef.current?.addLayer(endMarker);
        }

        poiGroupRef.current?.addLayer(marker);
    });

    if (myPin && !isLiveMode) {
      mapInstanceRef.current.setView([myPin.lat, myPin.lng], 9);
    }
  }, [mapPins, pois, showTreffs, showPasses, currentUser, isLiveMode, isRadiusFilterActive, radius, myPin]);

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

  // Filtered POIs for list
  const userCenter = myPin ? { lat: myPin.lat, lng: myPin.lng } : null;

  const filteredPois = pois.filter((poi) => {
    const matchesSearch =
      poi.name.toLowerCase().includes(poiSearchQuery.toLowerCase()) ||
      (poi.location && poi.location.toLowerCase().includes(poiSearchQuery.toLowerCase())) ||
      (poi.created_by && poi.created_by.toLowerCase().includes(poiSearchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (poiTabFilter === 'treff') return poi.type === 'treff';
    if (poiTabFilter === 'pass') return poi.type === 'pass';
    if (poiTabFilter === 'mine') return isPoiAuthor(poi);

    if (isRadiusFilterActive && userCenter) {
      const dist = getPoiDistanceToUser(poi, userCenter.lat, userCenter.lng);
      if (dist !== null && dist > radius) return false;
    }

    return true;
  });

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

        {liveRidersCount > 0 && (
          <div className="bg-purple-950/80 border border-purple-600/60 text-purple-200 text-xs font-extrabold px-3.5 py-2 rounded-full flex items-center gap-2 shadow-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <span>{liveRidersCount} Rider gerade LIVE unterwegs</span>
          </div>
        )}
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
                Teile deinen Live-Standort während deiner Tour mit der Community und zeichne deine gefahrene Strecke automatisch auf.
              </p>

              {isLiveMode && (
                <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-amber-300">
                  <span>⏱️ Letzter GPS-Fix: <b>{lastLiveTime || 'Gerade eben'}</b></span>
                  <span>📍 Aufgezeichnete Punkte: <b>{trackPoints.length}</b></span>
                  <span>🛣️ Distanz: <b>{calculateTrackDistanceKm(trackPoints)} km</b></span>
                  {myPin?.liveNote && <span>💬 Status: "<i>{myPin.liveNote}</i>"</span>}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0 w-full md:w-auto justify-end">
            {!isLiveMode ? (
              <button
                onClick={() => setLiveModalOpen(true)}
                className="w-full md:w-auto px-6 py-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold text-xs uppercase shadow-xl transition-all flex items-center justify-center gap-2 border-0 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" /> Live-Fahrt Starten
              </button>
            ) : (
              <div className="flex items-center gap-2 w-full md:w-auto">
                <button
                  onClick={performLocationUpdate}
                  disabled={isLocating}
                  className="p-3 bg-purple-900 hover:bg-purple-800 text-purple-200 rounded-full border border-purple-500/50 transition-all cursor-pointer"
                  title="GPS-Standort jetzt manuell aktualisieren"
                >
                  <RotateCw className={`w-4 h-4 ${isLocating ? 'animate-spin text-amber-400' : ''}`} />
                </button>
                <button
                  onClick={toggleLiveRide}
                  className="flex-1 md:flex-initial px-6 py-3 rounded-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs uppercase shadow-xl transition-all flex items-center justify-center gap-2 border-0 cursor-pointer"
                >
                  <Square className="w-4 h-4 fill-current" /> Fahrt Beenden & Speichern
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Left Sidebar Form / Filters + Right Map Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Sidebar */}
        <div className="space-y-6 bg-slate-900 border border-slate-800 p-5 rounded-2xl h-fit shadow-xl">
          {/* Home Pin Settings */}
          <div>
            <h3 className="text-sm font-bold uppercase text-amber-400 mb-3 flex items-center gap-1.5">
              <MapPinIcon className="w-4 h-4" /> Mein Heimat-Standort
            </h3>
            <form onSubmit={handleSaveHomePin} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 uppercase font-bold mb-1">PLZ</label>
                  <input
                    type="text"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    placeholder="70173"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 uppercase font-bold mb-1">Ort</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Stuttgart"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 uppercase font-bold mb-1">
                  Deine Motorräder (Bis zu 5)
                </label>
                <div className="space-y-1.5">
                  {bikeLines.map((line, idx) => (
                    <input
                      key={idx}
                      type="text"
                      value={line}
                      onChange={(e) => {
                        const updated = [...bikeLines];
                        updated[idx] = e.target.value;
                        setBikeLines(updated);
                      }}
                      placeholder={`Motorrad #${idx + 1} (z.B. Yamaha R6)`}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-extrabold uppercase text-xs shadow-md transition-all border-0 cursor-pointer"
              >
                Standort Aktualisieren
              </button>
            </form>
          </div>

          {/* Search Radius & Umkreis-Filter */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase text-amber-400 flex items-center gap-1.5">
                <Search className="w-4 h-4" /> Umkreis-Filter
              </h3>
              <button
                type="button"
                onClick={() => setIsRadiusFilterActive(!isRadiusFilterActive)}
                className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border cursor-pointer transition-all ${
                  isRadiusFilterActive
                    ? 'bg-amber-500 text-black border-amber-400 font-extrabold shadow-sm'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                {isRadiusFilterActive ? 'Filter Aktiv' : 'Filter Aus (Alle)'}
              </button>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Suchradius:</span>
                <span className="font-bold text-amber-400">{radius} km</span>
              </div>
              <input
                type="range"
                min="10"
                max="300"
                step="10"
                value={radius}
                disabled={!isRadiusFilterActive}
                onChange={(e) => setRadius(parseInt(e.target.value))}
                className="w-full accent-amber-500 bg-slate-950 cursor-pointer disabled:opacity-40"
              />
            </div>

            {myPin ? (
              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 text-[11px] space-y-1 text-slate-300">
                <div className="flex justify-between items-center text-slate-400">
                  <span>Zentrum:</span>
                  <span className="font-bold text-amber-400">📍 {myPin.city}</span>
                </div>
                {isRadiusFilterActive && (
                  <button
                    type="button"
                    onClick={() => {
                      if (mapInstanceRef.current && myPin) {
                        mapInstanceRef.current.flyTo([myPin.lat, myPin.lng], 9, { duration: 1 });
                      }
                    }}
                    className="w-full mt-1.5 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Crosshair className="w-3 h-3" /> Auf Suchkreis zentrieren
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl text-[11px] text-amber-300">
                💡 Trage oben deine PLZ & Ort ein, um deinen persönlichen Umkreisfilter zu aktivieren.
              </div>
            )}
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
        <div className="lg:col-span-2 h-[500px] lg:h-auto min-h-[480px] bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden relative group">
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Floating Quick Action Buttons on Map */}
          {!isPickingOnMap && !isEditPickingOnMap && !isDrawingRoute && !isEditDrawingRoute && (
            <div className="absolute top-3 right-3 z-[400] flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setPoiMode('address');
                  setAddPoiModalOpen(true);
                }}
                className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase px-3.5 py-2 rounded-xl transition-all shadow-xl flex items-center gap-1.5 border-0 cursor-pointer"
                title="Neuen POI, Treffpunkt oder Kurvenpass eintragen"
              >
                <Plus className="w-4 h-4" />
                <span>POI Hinzufügen</span>
              </button>

              <button
                onClick={() => startRouteDrawing(false)}
                className="bg-slate-900/90 hover:bg-amber-500 hover:text-black text-amber-400 border border-amber-500/50 backdrop-blur-md px-3.5 py-2 rounded-xl text-xs font-extrabold shadow-xl flex items-center gap-1.5 transition-all cursor-pointer"
                title="Zeichne den Streckenverlauf einer Kurvenstrecke oder eines Passes"
              >
                <Route className="w-4 h-4 text-amber-400" />
                <span>Kurvenstrecke zeichnen</span>
              </button>

              <button
                onClick={() => {
                  setPoiMode('map');
                  setAddPoiModalOpen(false);
                  setIsPickingOnMap(true);
                }}
                className="bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 backdrop-blur-md px-3 py-2 rounded-xl text-xs font-bold shadow-xl flex items-center gap-1.5 transition-all cursor-pointer"
                title="Klicke direkt auf die Karte, um einen POI Punkt zu markieren"
              >
                <MousePointerClick className="w-3.5 h-3.5 text-amber-400" />
                <span>Punkt setzen</span>
              </button>
            </div>
          )}

          {/* Interactive Route Drawing Mode Unified Floating HUD Window */}
          {(isDrawingRoute || isEditDrawingRoute) && (
            <div className="absolute top-3 left-3 right-3 sm:left-4 sm:right-4 sm:max-w-2xl sm:mx-auto z-[500] bg-slate-950/95 border-2 border-amber-500 backdrop-blur-xl p-4 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.85)] space-y-3 animate-fadeIn">
              {/* Header with Title, Routing Info and Live Metrics */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/40 flex-shrink-0">
                    <Route className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm uppercase tracking-wide text-amber-400">
                        {isEditDrawingRoute ? 'Streckenverlauf bearbeiten' : 'Kurvenstrecke auf Karte zeichnen'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Klicke Start & Ziel – Straßen & Kurven werden automatisch exakt nachgefahren!
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 self-start sm:self-center">
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                    📍 <span>{routeWaypoints.length} {routeWaypoints.length === 1 ? 'Punkt' : 'Wegpunkte'}</span>
                  </span>
                  <span className="bg-slate-900 text-emerald-400 border border-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-mono">
                    🛣️ <span>~{routeCalculatedKm || calculatePolylineDistanceKm(routeDrawPoints)} km</span>
                  </span>
                </div>
              </div>

              {/* Quick Jump Search Box in Drawing HUD */}
              <div className="flex items-center gap-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
                <Search className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <input
                  type="text"
                  value={hudJumpInput}
                  onChange={(e) => setHudJumpInput(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      await jumpToAddress(hudJumpInput, 14);
                    }
                  }}
                  placeholder="Ort / Bergpass / Straße suchen & direkt anfliegen..."
                  className="bg-transparent border-0 text-xs text-white placeholder-slate-500 focus:outline-none w-full"
                />
                <button
                  type="button"
                  disabled={isJumpSearching || !hudJumpInput.trim()}
                  onClick={async () => {
                    await jumpToAddress(hudJumpInput, 14);
                  }}
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-30 text-black text-[10px] font-black rounded-lg uppercase cursor-pointer flex items-center gap-1 flex-shrink-0"
                >
                  {isJumpSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Anfliegen'}
                </button>
              </div>

              {/* Routing Mode Toggle & Status Indicator */}
              <div className="flex items-center justify-between gap-2 bg-slate-900/80 px-3 py-2 rounded-xl border border-slate-800/80 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-bold hidden sm:inline">Modus:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const nextSnap = !snapToRoads;
                      setSnapToRoads(nextSnap);
                      computeRoadRoute(routeWaypoints, nextSnap);
                    }}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition-all border cursor-pointer ${
                      snapToRoads
                        ? 'bg-amber-500 text-black border-amber-400 shadow-md'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                    title="Folgt automatisch dem Straßenverlauf anhand von OpenStreetMap Routing"
                  >
                    <Zap className="w-3 h-3" />
                    <span>{snapToRoads ? 'Straßen automatisch folgen (Aktiv)' : 'Direktlinie (Offroad)'}</span>
                  </button>
                </div>

                {isRoutingLoading ? (
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px] animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Berechne Straßenverlauf...</span>
                  </div>
                ) : (
                  <span className="text-slate-400 text-[11px] hidden sm:inline">
                    {routeWaypoints.length === 0
                      ? 'Klicke 1. Punkt (Start)'
                      : routeWaypoints.length === 1
                      ? 'Klicke 2. Punkt (Ziel / Abbiegung)'
                      : 'Klicke weitere Punkte für Abzweigungen'}
                  </span>
                )}
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={routeWaypoints.length === 0}
                    onClick={() => {
                      setRouteWaypoints((prev) => {
                        const next = prev.slice(0, -1);
                        computeRoadRoute(next, snapToRoads);
                        return next;
                      });
                    }}
                    className="px-3 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all border border-slate-700 cursor-pointer flex items-center gap-1.5"
                    title="Letzten gesetzten Punkt zurücknehmen"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-400" /> Letzten Punkt löschen
                  </button>

                  <button
                    type="button"
                    disabled={routeWaypoints.length === 0}
                    onClick={() => {
                      setRouteWaypoints([]);
                      setRouteDrawPoints([]);
                      setRouteCalculatedKm(0);
                    }}
                    className="px-3 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-400 hover:text-red-400 rounded-xl text-xs font-bold transition-all border border-slate-700 cursor-pointer"
                    title="Alle bisherigen Punkte löschen"
                  >
                    Zurücksetzen
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDrawingRoute(false);
                      setIsEditDrawingRoute(false);
                      setRouteWaypoints([]);
                      setRouteDrawPoints([]);
                      if (drawingLayerGroupRef.current) drawingLayerGroupRef.current.clearLayers();
                      if (isEditDrawingRoute) setEditPoiModalOpen(true);
                      else setAddPoiModalOpen(true);
                    }}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold border border-slate-800 cursor-pointer"
                  >
                    Abbrechen
                  </button>

                  <button
                    type="button"
                    disabled={routeWaypoints.length < 2 && routeDrawPoints.length < 2}
                    onClick={finishRouteDrawing}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:opacity-35 disabled:cursor-not-allowed text-black font-black rounded-xl text-xs uppercase shadow-xl transition-all border-0 cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" /> Strecke übernehmen ({routeWaypoints.length} Pkt)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Interactive Picking Active Floating Top Banner (Add Mode) */}
          {isPickingOnMap && (
            <div className="absolute top-3 left-3 right-3 sm:left-6 sm:right-6 sm:max-w-xl sm:mx-auto z-[500] bg-slate-950/95 border-2 border-amber-500 backdrop-blur-xl p-3.5 rounded-2xl shadow-2xl space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-amber-400">
                  <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/40 flex-shrink-0">
                    <Crosshair className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <span className="font-extrabold text-xs uppercase text-amber-400 block">
                      Punkt auf Karte setzen
                    </span>
                    <span className="text-xs text-slate-300">
                      Klicke auf die gewünschte Stelle auf der Karte!
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsPickingOnMap(false);
                    setAddPoiModalOpen(true);
                    if (tempPickMarkerRef.current) {
                      tempPickMarkerRef.current.remove();
                      tempPickMarkerRef.current = null;
                    }
                  }}
                  className="bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs px-3 py-2 rounded-xl uppercase font-bold border border-slate-700 cursor-pointer flex items-center gap-1 flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" /> Abbrechen
                </button>
              </div>

              {/* Quick Jump Search Box in Picking HUD */}
              <div className="flex items-center gap-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
                <Search className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <input
                  type="text"
                  value={hudJumpInput}
                  onChange={(e) => setHudJumpInput(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      await jumpToAddress(hudJumpInput, 14);
                    }
                  }}
                  placeholder="Ort / Straße suchen & direkt anfliegen..."
                  className="bg-transparent border-0 text-xs text-white placeholder-slate-500 focus:outline-none w-full"
                />
                <button
                  type="button"
                  disabled={isJumpSearching || !hudJumpInput.trim()}
                  onClick={async () => {
                    await jumpToAddress(hudJumpInput, 14);
                  }}
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-30 text-black text-[10px] font-black rounded-lg uppercase cursor-pointer flex items-center gap-1 flex-shrink-0"
                >
                  {isJumpSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Anfliegen'}
                </button>
              </div>
            </div>
          )}

          {/* Interactive Picking Active Floating Top Banner (Edit Mode) */}
          {isEditPickingOnMap && (
            <div className="absolute top-3 left-3 right-3 sm:left-6 sm:right-6 sm:max-w-xl sm:mx-auto z-[500] bg-slate-950/95 border-2 border-purple-500 backdrop-blur-xl p-3.5 rounded-2xl shadow-2xl space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-purple-300">
                  <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl border border-purple-500/40 flex-shrink-0">
                    <Crosshair className="w-5 h-5 animate-pulse text-amber-400" />
                  </div>
                  <div>
                    <span className="font-extrabold text-xs uppercase text-purple-300 block">
                      Neue Position wählen
                    </span>
                    <span className="text-xs text-slate-300">
                      Klicke auf die neue Position für "{editPoiName || 'POI'}"
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsEditPickingOnMap(false);
                    setEditPoiModalOpen(true);
                    if (tempPickMarkerRef.current) {
                      tempPickMarkerRef.current.remove();
                      tempPickMarkerRef.current = null;
                    }
                  }}
                  className="bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs px-3 py-2 rounded-xl uppercase font-bold border border-slate-700 cursor-pointer flex items-center gap-1 flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" /> Abbrechen
                </button>
              </div>

              {/* Quick Jump Search Box in Edit Picking HUD */}
              <div className="flex items-center gap-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
                <Search className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <input
                  type="text"
                  value={hudJumpInput}
                  onChange={(e) => setHudJumpInput(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      await jumpToAddress(hudJumpInput, 14);
                    }
                  }}
                  placeholder="Ort / Straße suchen & direkt anfliegen..."
                  className="bg-transparent border-0 text-xs text-white placeholder-slate-500 focus:outline-none w-full"
                />
                <button
                  type="button"
                  disabled={isJumpSearching || !hudJumpInput.trim()}
                  onClick={async () => {
                    await jumpToAddress(hudJumpInput, 14);
                  }}
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-30 text-black text-[10px] font-black rounded-lg uppercase cursor-pointer flex items-center gap-1 flex-shrink-0"
                >
                  {isJumpSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Anfliegen'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Community POI & Spot Explorer / Management Section */}
      <div className="mt-8 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h3 className="text-xl font-black uppercase text-amber-400 flex items-center gap-2">
              <Compass className="w-6 h-6" /> Community POIs & Spots ({pois.length})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Übersicht aller Bikertreffs & Traumstraßen. Eigene Spots und Spots als Admin/Moderator bearbeiten oder löschen.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={poiSearchQuery}
                onChange={(e) => setPoiSearchQuery(e.target.value)}
                placeholder="Spot oder Ort suchen..."
                className="w-full bg-slate-950 border border-slate-800 rounded-full pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex bg-slate-950 p-1 rounded-full border border-slate-800 text-xs font-bold">
              <button
                onClick={() => setPoiTabFilter('all')}
                className={`px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                  poiTabFilter === 'all' ? 'bg-amber-500 text-black shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Alle ({pois.length})
              </button>
              <button
                onClick={() => setPoiTabFilter('treff')}
                className={`px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                  poiTabFilter === 'treff' ? 'bg-emerald-500 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                ☕ Treffs
              </button>
              <button
                onClick={() => setPoiTabFilter('pass')}
                className={`px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                  poiTabFilter === 'pass' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                🏔️ Pässe
              </button>
              <button
                onClick={() => setPoiTabFilter('mine')}
                className={`px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                  poiTabFilter === 'mine' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                🌟 Meine Spots ({pois.filter(isPoiAuthor).length})
              </button>
            </div>
          </div>
        </div>

        {/* POI Cards Grid */}
        {filteredPois.length === 0 ? (
          <div className="text-center py-12 bg-slate-950/50 rounded-2xl border border-slate-800/80">
            <Compass className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-300">Keine Spots gefunden</p>
            <p className="text-xs text-slate-500 mt-1">Passe deine Filtersuche an oder erstelle deinen ersten POI.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPois.map((poi, idx) => {
              const isAuthor = isPoiAuthor(poi);
              const canManage = canManagePoi(poi);

              return (
                <div
                  key={poi.id || `poi-card-${idx}`}
                  className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex flex-col justify-between transition-all group shadow-md hover:shadow-xl relative"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                          poi.type === 'treff'
                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-600/40'
                            : 'bg-amber-950/60 text-amber-300 border-amber-600/40'
                        }`}
                      >
                        {poi.type === 'treff' ? '☕ Bikertreff / Café' : '🏔️ Pass / Traumstrecke'}
                      </span>

                      {isAuthor ? (
                        <span className="bg-purple-950/70 text-purple-300 border border-purple-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          🌟 Von dir
                        </span>
                      ) : poi.created_by ? (
                        <span className="text-[11px] text-slate-400 font-medium">
                          von <b className="text-amber-400">@{poi.created_by}</b>
                        </span>
                      ) : null}
                    </div>

                    <h4 className="text-base font-extrabold text-white group-hover:text-amber-400 transition-colors">
                      {poi.name}
                    </h4>

                    <div className="flex items-center justify-between gap-2 mt-1">
                      <p className="text-xs text-slate-400 flex items-center gap-1 min-w-0">
                        <MapPinIcon className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        <span className="truncate">{poi.location || 'Kartenkoordinaten'}</span>
                      </p>
                      {userCenter && (
                        <span className="text-[11px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/30 flex-shrink-0 whitespace-nowrap">
                          ~{getPoiDistanceToUser(poi, userCenter.lat, userCenter.lng)} km
                        </span>
                      )}
                    </div>

                    {poi.route_coords && poi.route_coords.length >= 2 && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-300 bg-amber-950/40 border border-amber-500/30 rounded-xl px-2.5 py-1">
                        <Route className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                        <span className="font-bold">
                          {poi.distance_km || calculatePolylineDistanceKm(poi.route_coords)} km Streckenverlauf
                        </span>
                        <span className="text-[10px] text-slate-400">({poi.route_coords.length} Wegpunkte)</span>
                      </div>
                    )}

                    <div className="text-[10px] text-slate-500 mt-2 font-mono">
                      GPS: {poi.lat.toFixed(4)}, {poi.lng.toFixed(4)}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-900 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        if (mapInstanceRef.current) {
                          if (poi.route_coords && poi.route_coords.length >= 2) {
                            mapInstanceRef.current.fitBounds(poi.route_coords, { padding: [50, 50] });
                          } else {
                            mapInstanceRef.current.setView([poi.lat, poi.lng], 13);
                          }
                          window.scrollTo({ top: 120, behavior: 'smooth' });
                        }
                      }}
                      className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-xl border border-amber-500/30 transition-all cursor-pointer"
                    >
                      {poi.route_coords && poi.route_coords.length >= 2 ? (
                        <>
                          <Route className="w-3.5 h-3.5" /> Strecke ansehen
                        </>
                      ) : (
                        <>
                          <Navigation className="w-3.5 h-3.5" /> Auf Karte
                        </>
                      )}
                    </button>

                    {canManage && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => startEditPoi(poi)}
                          className="p-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer"
                          title="POI Bearbeiten"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => triggerDeletePoi(poi)}
                          className="p-1.5 rounded-xl bg-red-950/60 hover:bg-red-900/80 text-red-400 border border-red-500/30 text-xs font-bold transition-all cursor-pointer"
                          title={isAuthor ? 'Eigenen POI löschen' : 'POI mit Begründung löschen (Mod/Admin)'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
              <div className="p-3 bg-purple-900/40 text-purple-400 rounded-xl border border-purple-500/40">
                <Radio className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase text-purple-400">Live-Fahrt Starten</h3>
                <p className="text-xs text-slate-400">Standort in Echtzeit für andere Biker freigeben</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase text-slate-300 mb-1">
                  Status-Notiz für andere Biker:
                </label>
                <input
                  type="text"
                  value={liveNoteInput}
                  onChange={(e) => setLiveNoteInput(e.target.value)}
                  placeholder="z.B. Unterwegs Richtung Mummelsee ☕"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-300 mb-1">
                  Update-Intervall:
                </label>
                <select
                  value={intervalMinutes}
                  onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value={1}>Jede 1 Minute (Sehr genau, höherer Akkuverbrauch)</option>
                  <option value={3}>Alle 3 Minuten (Empfohlen)</option>
                  <option value={5}>Alle 5 Minuten (Akkuschonend)</option>
                  <option value={10}>Alle 10 Minuten</option>
                </select>
              </div>

              <div className="bg-purple-950/40 border border-purple-800/40 p-3 rounded-xl text-purple-200">
                💡 <b>Tipp:</b> Halte dein Smartphone am Motorrad während der Fahrt entsperrt oder lass den Tab im Browser geöffnet, damit das GPS-Signal kontinuierlich übertragen wird.
              </div>

              <div className="pt-2">
                <button
                  onClick={toggleLiveRide}
                  className="w-full py-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold uppercase text-xs shadow-xl transition-all border-0 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" /> Los Geht's — Live Übertragen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: POI Hinzufügen (Option 1 & Option 2) */}
      {addPoiModalOpen && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="max-w-md w-full rounded-3xl bg-slate-950 border border-amber-500/70 p-6 relative shadow-2xl">
            <button
              onClick={() => {
                setAddPoiModalOpen(false);
                setSelectedMapPoint(null);
                if (tempPickMarkerRef.current) {
                  tempPickMarkerRef.current.remove();
                  tempPickMarkerRef.current = null;
                }
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white border-0 bg-transparent cursor-pointer text-lg"
            >
              ✕
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/40">
                <Compass className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase text-amber-400">POI Hinzufügen</h3>
                <p className="text-xs text-slate-400">Neuen Treffpunkt oder Kurvenpass eintragen</p>
              </div>
            </div>

            {/* Selection Tabs: Option 1 (Search Address) vs Option 2 (Mark on Map) vs Option 3 (Draw Route) */}
            <div className="grid grid-cols-3 gap-1.5 mb-4 p-1 bg-slate-900 rounded-2xl border border-slate-800 text-center">
              <button
                type="button"
                onClick={() => setPoiMode('address')}
                className={`py-2 px-2 rounded-xl text-[11px] font-black uppercase transition-all flex flex-col sm:flex-row items-center justify-center gap-1 border-0 cursor-pointer ${
                  poiMode === 'address'
                    ? 'bg-amber-500 text-black shadow-lg'
                    : 'text-slate-400 hover:text-white bg-transparent'
                }`}
              >
                <Search className="w-3.5 h-3.5" /> <span>1: Suche</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPoiMode('map');
                }}
                className={`py-2 px-2 rounded-xl text-[11px] font-black uppercase transition-all flex flex-col sm:flex-row items-center justify-center gap-1 border-0 cursor-pointer ${
                  poiMode === 'map'
                    ? 'bg-amber-500 text-black shadow-lg'
                    : 'text-slate-400 hover:text-white bg-transparent'
                }`}
              >
                <MousePointerClick className="w-3.5 h-3.5" /> <span>2: Punkt</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPoiMode('route');
                }}
                className={`py-2 px-2 rounded-xl text-[11px] font-black uppercase transition-all flex flex-col sm:flex-row items-center justify-center gap-1 border-0 cursor-pointer ${
                  poiMode === 'route' || (selectedRouteCoords && selectedRouteCoords.length >= 2)
                    ? 'bg-amber-500 text-black shadow-lg'
                    : 'text-amber-400 hover:text-white bg-transparent'
                }`}
              >
                <Route className="w-3.5 h-3.5" /> <span>3: Strecke</span>
              </button>
            </div>

            {/* Option 2 & 3 Pre-jump Address Helper */}
            {(poiMode === 'map' || poiMode === 'route') && (
              <div className="mb-4 p-3 bg-slate-900/90 rounded-2xl border border-slate-800 text-xs space-y-2">
                <span className="font-bold text-amber-400 block text-[11px] uppercase flex items-center gap-1">
                  <Search className="w-3.5 h-3.5" /> Ort vorab suchen & anfliegen (optional):
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={poiSearchJumpInput}
                    onChange={(e) => setPoiSearchJumpInput(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (poiSearchJumpInput.trim()) {
                          await jumpToAddress(poiSearchJumpInput, 14);
                          if (poiMode === 'map') {
                            setAddPoiModalOpen(false);
                            setIsPickingOnMap(true);
                          } else {
                            startRouteDrawing(false);
                          }
                        }
                      }
                    }}
                    placeholder="z.B. Feldberg, Kyffhäuser, Nürburgring..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    disabled={isJumpSearching}
                    onClick={async () => {
                      if (poiSearchJumpInput.trim()) {
                        await jumpToAddress(poiSearchJumpInput, 14);
                      }
                      if (poiMode === 'map') {
                        setAddPoiModalOpen(false);
                        setIsPickingOnMap(true);
                      } else {
                        startRouteDrawing(false);
                      }
                    }}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-extrabold text-[10px] uppercase rounded-xl border-0 cursor-pointer flex items-center gap-1"
                  >
                    {isJumpSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Anfliegen & Starten'}
                  </button>
                </div>
              </div>
            )}

            {/* Selected Coordinate Banner for Option 2 (Point) */}
            {poiMode === 'map' && selectedMapPoint && (
              <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-amber-300">
                  <Crosshair className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <div>
                    <span className="font-bold block">Ausgewählte Karten-Position:</span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {selectedMapPoint.lat.toFixed(5)}, {selectedMapPoint.lng.toFixed(5)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAddPoiModalOpen(false);
                    setIsPickingOnMap(true);
                  }}
                  className="px-2.5 py-1 bg-amber-500 text-black rounded-lg font-bold text-[10px] uppercase border-0 cursor-pointer hover:bg-amber-400"
                >
                  Neu wählen
                </button>
              </div>
            )}

            {/* Selected Route Coordinates Banner (Option 3) */}
            {selectedRouteCoords && selectedRouteCoords.length >= 2 && (
              <div className="mb-4 p-3 bg-amber-950/40 border border-amber-500/50 rounded-2xl flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-amber-300">
                  <Route className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <div>
                    <span className="font-bold block text-white">🛣️ Streckenverlauf markiert:</span>
                    <span className="text-[11px] text-amber-300">
                      {selectedRouteCoords.length} Wegpunkte | ~{calculatePolylineDistanceKm(selectedRouteCoords)} km Gesamtlänge
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => startRouteDrawing(false)}
                    className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-[10px] font-bold cursor-pointer"
                  >
                    Anpassen
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRouteCoords(null)}
                    className="px-2 py-1 bg-slate-800 hover:bg-red-950/60 text-slate-400 hover:text-red-300 rounded-lg text-[10px] font-bold cursor-pointer"
                  >
                    Entfernen
                  </button>
                </div>
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!poiName.trim()) {
                  if (showAlert) showAlert('Fehler', 'Bitte gib einen Namen für den POI ein.', 'warning');
                  return;
                }

                if (poiMode === 'map' && selectedMapPoint) {
                  // Direct coordinate creation (Single Point)
                  onAddPoi({
                    name: poiName.trim(),
                    type: poiCategory,
                    location: poiLocation.trim() || selectedMapPoint.address || 'Kartenposition',
                    lat: selectedMapPoint.lat,
                    lng: selectedMapPoint.lng,
                    created_by: currentUser.username,
                  });
                  setAddPoiModalOpen(false);
                  setPoiName('');
                  setPoiLocation('');
                  setSelectedMapPoint(null);
                  setSelectedRouteCoords(null);
                  if (tempPickMarkerRef.current) {
                    tempPickMarkerRef.current.remove();
                    tempPickMarkerRef.current = null;
                  }
                } else if ((poiMode === 'route' || selectedRouteCoords) && selectedRouteCoords && selectedRouteCoords.length >= 2) {
                  // Route Drawing Mode creation
                  const mid = selectedRouteCoords[Math.floor(selectedRouteCoords.length / 2)];
                  const distKm = calculatePolylineDistanceKm(selectedRouteCoords);

                  onAddPoi({
                    name: poiName.trim(),
                    type: poiCategory,
                    location: poiLocation.trim() || 'Kurvenstrecke / Pass',
                    lat: selectedMapPoint ? selectedMapPoint.lat : mid[0],
                    lng: selectedMapPoint ? selectedMapPoint.lng : mid[1],
                    route_coords: selectedRouteCoords,
                    distance_km: distKm,
                    created_by: currentUser.username,
                  });
                  setAddPoiModalOpen(false);
                  setPoiName('');
                  setPoiLocation('');
                  setSelectedMapPoint(null);
                  setSelectedRouteCoords(null);
                  if (tempPickMarkerRef.current) {
                    tempPickMarkerRef.current.remove();
                    tempPickMarkerRef.current = null;
                  }
                } else {
                  // Address Search Geocoding (Option 1)
                  if (!poiLocation.trim()) {
                    if (showAlert) showAlert('Fehler', 'Bitte gib einen Ort oder eine Adresse ein.', 'warning');
                    return;
                  }
                  try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(poiLocation)}`);
                    const data = await res.json();
                    if (data && data[0]) {
                      onAddPoi({
                        name: poiName.trim(),
                        type: poiCategory,
                        location: poiLocation.trim(),
                        lat: parseFloat(data[0].lat),
                        lng: parseFloat(data[0].lon),
                        created_by: currentUser.username,
                      });
                      setAddPoiModalOpen(false);
                      setPoiName('');
                      setPoiLocation('');
                      setSelectedRouteCoords(null);
                    } else {
                      if (showAlert) {
                        showAlert('Ort nicht gefunden', 'Der eingegebene Ort konnte nicht gefunden werden. Bitte versuche Option 2 (Klick auf Karte) oder 3 (Strecke).', 'warning');
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
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                  Name des Treffpunkts / Spots *
                </label>
                <input
                  type="text"
                  value={poiName}
                  onChange={(e) => setPoiName(e.target.value)}
                  placeholder="z.B. Bikertreff Platte Löwenstein oder B500 Kurventraum"
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                  Kategorie *
                </label>
                <select
                  value={poiCategory}
                  onChange={(e) => setPoiCategory(e.target.value as 'treff' | 'pass')}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="treff">☕ Bikertreff / Café / Treffpunkt</option>
                  <option value="pass">🏔️ Traumstraße / Pass / Kurvenstrecke</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                  {poiMode === 'map' || poiMode === 'route' ? 'Ortsbezeichnung / Straße (optional):' : 'Adresse / Ort für Suche *:'}
                </label>
                <input
                  type="text"
                  value={poiLocation}
                  onChange={(e) => setPoiLocation(e.target.value)}
                  placeholder={poiMode === 'map' || poiMode === 'route' ? 'z.B. Schwarzwaldhochstraße' : 'z.B. Löwenstein, Deutschland'}
                  required={poiMode === 'address'}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
                {(poiMode === 'map' || poiMode === 'route') && (
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Wird automatisch aus der gewählten Kartenposition ermittelt.
                  </span>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={poiMode === 'map' && !selectedMapPoint}
                  className="w-full py-3.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:opacity-50 disabled:cursor-not-allowed text-black font-extrabold uppercase text-sm shadow-xl transition-all border-0 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {selectedRouteCoords && selectedRouteCoords.length >= 2
                    ? `Kurvenstrecke Speichern (${selectedRouteCoords.length} Pkt)`
                    : poiMode === 'map'
                    ? 'POI mit Karten-Position Speichern'
                    : 'POI Suchen & Speichern'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: POI Bearbeiten (Creator / Admin / Mod) */}
      {editPoiModalOpen && editingPoi && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="max-w-md w-full rounded-3xl bg-slate-950 border border-amber-500 p-6 relative shadow-2xl space-y-4">
            <button
              onClick={() => {
                setEditPoiModalOpen(false);
                setEditingPoi(null);
                if (tempPickMarkerRef.current) {
                  tempPickMarkerRef.current.remove();
                  tempPickMarkerRef.current = null;
                }
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white border-0 bg-transparent cursor-pointer text-lg"
            >
              ✕
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/40">
                <Edit className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase text-amber-400">POI Bearbeiten</h3>
                <p className="text-xs text-slate-400">
                  {isPoiAuthor(editingPoi) ? 'Deinen eigenen Spot bearbeiten' : `Bearbeiten als Moderator/Admin`}
                </p>
              </div>
            </div>

            {/* Position / Location Info & Re-pick trigger */}
            <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Hauptkoordinaten:</span>
                <span className="font-mono text-amber-400 font-bold">
                  {editSelectedPoint ? `${editSelectedPoint.lat.toFixed(4)}, ${editSelectedPoint.lng.toFixed(4)}` : `${editingPoi.lat.toFixed(4)}, ${editingPoi.lng.toFixed(4)}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditPoiModalOpen(false);
                  setIsEditPickingOnMap(true);
                }}
                className="w-full py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <MousePointerClick className="w-3.5 h-3.5" /> Neue Position auf Karte markieren
              </button>
            </div>

            {/* Streckenverlauf / Route Section in Edit Modal */}
            <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-bold flex items-center gap-1.5">
                  <Route className="w-4 h-4 text-amber-400" /> Kurvenstrecke / Streckenverlauf:
                </span>
                {editSelectedRouteCoords && editSelectedRouteCoords.length >= 2 ? (
                  <span className="text-emerald-400 text-[11px] font-bold">
                    {editSelectedRouteCoords.length} Pkt (~{calculatePolylineDistanceKm(editSelectedRouteCoords)} km)
                  </span>
                ) : (
                  <span className="text-slate-500 text-[11px]">Keine Strecke</span>
                )}
              </div>

              {editSelectedRouteCoords && editSelectedRouteCoords.length >= 2 ? (
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => startRouteDrawing(true)}
                    className="flex-1 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Route className="w-3.5 h-3.5" /> Streckenverlauf auf Karte anpassen
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditSelectedRouteCoords(null)}
                    className="px-3 py-2 bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    title="Strecke von POI entfernen (wird reiner Einzelpunkt)"
                  >
                    Strecke löschen
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => startRouteDrawing(true)}
                  className="w-full py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Route className="w-3.5 h-3.5" /> Streckenverlauf auf Karte einzeichnen
                </button>
              )}
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!editPoiName.trim()) return;

                let finalLat = editingPoi.lat;
                let finalLng = editingPoi.lng;

                // If user selected a new point via map
                if (editSelectedPoint) {
                  finalLat = editSelectedPoint.lat;
                  finalLng = editSelectedPoint.lng;
                } else if (editPoiLocation.trim() && editPoiLocation !== editingPoi.location) {
                  // Re-geocode if location string changed
                  try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(editPoiLocation)}`);
                    const data = await res.json();
                    if (data && data[0]) {
                      finalLat = parseFloat(data[0].lat);
                      finalLng = parseFloat(data[0].lon);
                    }
                  } catch (e) {}
                }

                const updated: Poi = {
                  ...editingPoi,
                  name: editPoiName.trim(),
                  type: editPoiCategory,
                  location: editPoiLocation.trim() || editingPoi.location,
                  lat: finalLat,
                  lng: finalLng,
                  route_coords: editSelectedRouteCoords && editSelectedRouteCoords.length >= 2 ? editSelectedRouteCoords : undefined,
                  distance_km: editSelectedRouteCoords && editSelectedRouteCoords.length >= 2 ? calculatePolylineDistanceKm(editSelectedRouteCoords) : undefined,
                };

                if (onEditPoi) {
                  onEditPoi(updated);
                }

                setEditPoiModalOpen(false);
                setEditingPoi(null);
                if (tempPickMarkerRef.current) {
                  tempPickMarkerRef.current.remove();
                  tempPickMarkerRef.current = null;
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                  Name des Spots *
                </label>
                <input
                  type="text"
                  value={editPoiName}
                  onChange={(e) => setEditPoiName(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                  Kategorie *
                </label>
                <select
                  value={editPoiCategory}
                  onChange={(e) => setEditPoiCategory(e.target.value as 'treff' | 'pass')}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="treff">☕ Bikertreff / Café / Treffpunkt</option>
                  <option value="pass">🏔️ Traumstraße / Pass / Kurvenstrecke</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                  Ortsbezeichnung / Adresse:
                </label>
                <input
                  type="text"
                  value={editPoiLocation}
                  onChange={(e) => setEditPoiLocation(e.target.value)}
                  placeholder="z.B. Johanniskreuz B48"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-extrabold uppercase text-sm shadow-xl transition-all border-0 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" /> Änderungen Speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: POI Löschen mit Pflicht-Begründung (Admins / Moderators) */}
      {deleteModalPoi && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="max-w-md w-full rounded-3xl bg-slate-950 border border-red-500/70 p-6 relative shadow-2xl space-y-4">
            <button
              onClick={() => {
                setDeleteModalPoi(null);
                setDeleteReason('');
                setDeletePresetReason('');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white border-0 bg-transparent cursor-pointer text-lg"
            >
              ✕
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-500/20 text-red-400 rounded-2xl border border-red-500/40">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase text-red-400">POI Löschen (Mod/Admin)</h3>
                <p className="text-xs text-slate-400">
                  Erfordert eine Begründung für das Moderationsprotokoll
                </p>
              </div>
            </div>

            {/* Target POI details */}
            <div className="p-3.5 bg-slate-900 rounded-2xl border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase">{deleteModalPoi.name}</span>
                <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                  {deleteModalPoi.type === 'treff' ? 'Bikertreff' : 'Pass'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">📍 {deleteModalPoi.location || 'Kartenposition'}</p>
              {deleteModalPoi.created_by && (
                <p className="text-[11px] text-slate-300">
                  Erstellt von: <b className="text-amber-400">@{deleteModalPoi.created_by}</b>
                </p>
              )}
            </div>

            {/* Reason Presets */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-300 mb-2">
                Häufige Gründe (Schnellauswahl):
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Duplikat / bereits vorhanden',
                  'Ort geschlossen / existiert nicht',
                  'Falsche / ungenaue GPS-Koordinaten',
                  'Kein Motorrad-Bezug / Spam',
                  'Unangemessener Inhalt',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setDeletePresetReason(preset);
                      setDeleteReason(preset);
                    }}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                      deleteReason === preset
                        ? 'bg-red-500/20 text-red-300 border-red-500/60 font-bold'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Reason Textarea (Pflichtfeld) */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!deleteReason.trim()) {
                  if (showAlert) showAlert('Fehler', 'Bitte gib eine Begründung für die Löschung an.', 'warning');
                  return;
                }
                if (onDeletePoi) {
                  onDeletePoi(deleteModalPoi.id || deleteModalPoi.name, deleteReason.trim(), deleteModalPoi);
                }
                setDeleteModalPoi(null);
                setDeleteReason('');
                setDeletePresetReason('');
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                  Begründung für die Löschung * (Pflichtfeld)
                </label>
                <textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="z.B. Dieser Bikertreff existiert nicht mehr oder liegt an falschen Koordinaten..."
                  rows={3}
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  💡 Der Ersteller (@{deleteModalPoi.created_by || 'Community'}) erhält automatisch eine Benachrichtigung mit deiner Begründung.
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteModalPoi(null);
                    setDeleteReason('');
                    setDeletePresetReason('');
                  }}
                  className="flex-1 py-3 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold uppercase border border-slate-800 cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={!deleteReason.trim()}
                  className="flex-1 py-3 rounded-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-50 text-white font-black text-xs uppercase shadow-xl transition-all border-0 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" /> Endgültig Löschen
                </button>
              </div>
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
                  let minLat = Infinity,
                    maxLat = -Infinity,
                    minLng = Infinity,
                    maxLng = -Infinity;
                  trackPoints.forEach((p) => {
                    if (p.lat < minLat) minLat = p.lat;
                    if (p.lat > maxLat) maxLat = p.lat;
                    if (p.lng < minLng) minLng = p.lng;
                    if (p.lng > maxLng) maxLng = p.lng;
                  });
                  const latRange = maxLat - minLat || 0.0001;
                  const lngRange = maxLng - minLng || 0.0001;
                  const w = 360,
                    h = 120,
                    pad = 15;
                  let d = '';
                  trackPoints.forEach((p, idx) => {
                    const x = pad + ((p.lng - minLng) / lngRange) * (w - pad * 2);
                    const y = h - (pad + ((p.lat - minLat) / latRange) * (h - pad * 2));
                    d += idx === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
                  });
                  return (
                    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full">
                      <path
                        d={d}
                        fill="none"
                        stroke="#facc15"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="drop-shadow-[0_0_8px_rgba(250,204,21,0.7)]"
                      />
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
