import { TileConfig } from '../types';

export const DEFAULT_TILES: TileConfig[] = [
  {
    id: 'gpx',
    title: 'GPX-Ausfahrten',
    subtitle: 'Routen entdecken und Tagestouren mit der Crew teilen.',
    iconName: 'Map',
    colorClass: 'text-yellow-400',
    bgIconClass: 'bg-yellow-400/10 text-yellow-400',
    viewTarget: 'gpx',
    colSpan: 1,
    minHeight: 160,
    visible: true,
    order: 0,
  },
  {
    id: 'forum',
    title: 'Wissensaustausch',
    subtitle: 'Technische Fragen, Schrauber-Hilfe und Tourentipps im Forum.',
    iconName: 'MessageSquare',
    colorClass: 'text-purple-400',
    bgIconClass: 'bg-purple-500/10 text-purple-400',
    viewTarget: 'forum',
    colSpan: 1,
    minHeight: 160,
    visible: true,
    order: 1,
  },
  {
    id: 'events',
    title: 'Exklusive Events',
    subtitle: 'Plane Ausfahrten und trage dich in Teilnehmerlisten ein.',
    iconName: 'Calendar',
    colorClass: 'text-red-400',
    bgIconClass: 'bg-red-500/10 text-red-400',
    viewTarget: 'events',
    colSpan: 1,
    minHeight: 160,
    visible: true,
    order: 2,
  },
  {
    id: 'map',
    title: 'PixelMap',
    subtitle: 'Finde andere Pixel Rider in deiner Region & Spot Check-ins.',
    iconName: 'MapPin',
    colorClass: 'text-emerald-400',
    bgIconClass: 'bg-emerald-500/10 text-emerald-400',
    viewTarget: 'map',
    colSpan: 1,
    minHeight: 160,
    visible: true,
    order: 3,
  },
  {
    id: 'garage',
    title: 'Pixel Garage',
    subtitle: 'Zeige dein Bike und entdecke die Umbauten der Crew.',
    iconName: 'Wrench',
    colorClass: 'text-yellow-400',
    bgIconClass: 'bg-yellow-400/10 text-yellow-400',
    viewTarget: 'garage',
    colSpan: 1,
    minHeight: 160,
    visible: true,
    order: 4,
  },
  {
    id: 'market',
    title: 'Flohmarkt',
    subtitle: 'Fahrzeuge, Teile und Kleidung kaufen und verkaufen.',
    iconName: 'ShoppingBag',
    colorClass: 'text-blue-400',
    bgIconClass: 'bg-blue-500/10 text-blue-400',
    viewTarget: 'market',
    colSpan: 1,
    minHeight: 160,
    visible: true,
    order: 5,
  },
];

const STORAGE_KEY = 'app_custom_tile_layout';

export function getSavedTileLayout(): TileConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_TILES;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_TILES;
    
    // Merge with defaults to ensure all properties exist
    return parsed.map((item: Partial<TileConfig>, idx: number) => {
      const matchDefault = DEFAULT_TILES.find((d) => d.id === item.id) || DEFAULT_TILES[idx] || DEFAULT_TILES[0];
      return {
        ...matchDefault,
        ...item,
        colSpan: item.colSpan ? Math.max(1, Math.min(3, item.colSpan)) : matchDefault.colSpan,
        minHeight: item.minHeight ? Math.max(120, Math.min(450, item.minHeight)) : matchDefault.minHeight,
        visible: item.visible !== undefined ? item.visible : true,
        order: item.order !== undefined ? item.order : idx,
      };
    }).sort((a, b) => a.order - b.order);
  } catch (e) {
    return DEFAULT_TILES;
  }
}

export function saveTileLayout(tiles: TileConfig[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tiles));
  } catch (e) {
    console.error('Error saving tile layout:', e);
  }
}

export function resetTileLayout(): TileConfig[] {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
  return DEFAULT_TILES;
}
