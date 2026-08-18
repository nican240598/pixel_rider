import { TripEntry, User } from '../types';

/**
 * Haversine formula to compute distance in meters between two GPS coordinates
 */
export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Format distance in meters or kilometers nicely
 */
export function formatDistanceText(meters: number): string {
  if (meters < 1000) {
    return `${meters} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Compute total seasonal KM for a specific user
 */
export function getUserTotalKm(username: string, trips: TripEntry[], seasonStartIso = '2026-01-01T00:00:00Z'): number {
  if (!username) return 0;
  const uClean = username.trim().toLowerCase();
  const seasonStartMs = new Date(seasonStartIso).getTime();

  return trips
    .filter((t) => {
      const isUser = t.username && t.username.trim().toLowerCase() === uClean;
      const isSeason = new Date(t.created_at).getTime() >= seasonStartMs;
      return isUser && isSeason;
    })
    .reduce((sum, t) => sum + (Number(t.distance_km) || 0), 0);
}

/**
 * Get ISO week string 'YYYY-WW' for a Date
 */
function getIsoYearWeek(d: Date): string {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/**
 * Calculate consecutive weeks streak where user logged at least one trip
 */
export function getUserStreakWeeks(username: string, trips: TripEntry[]): number {
  if (!username || !trips || trips.length === 0) return 0;
  const uClean = username.trim().toLowerCase();
  const userTrips = trips.filter((t) => t.username && t.username.trim().toLowerCase() === uClean);
  if (userTrips.length === 0) return 0;

  const tripWeeks = new Set<string>();
  userTrips.forEach((t) => {
    const d = new Date(t.created_at);
    if (!isNaN(d.getTime())) {
      tripWeeks.add(getIsoYearWeek(d));
    }
  });

  // Count backwards week by week starting from current week or previous week
  let curr = new Date();
  let streak = 0;
  let allowedSkips = 1; // Check current and previous week

  for (let i = 0; i < 52; i++) {
    const wStr = getIsoYearWeek(curr);
    if (tripWeeks.has(wStr)) {
      streak++;
    } else {
      if (i === 0 && allowedSkips > 0) {
        // current week has no trip yet, check if previous week did
      } else {
        break;
      }
    }
    // Move to previous week (7 days prior)
    curr.setDate(curr.getDate() - 7);
  }

  return streak;
}

export interface LeaderboardUser {
  rank: number;
  username: string;
  totalKm: number;
  tripCount: number;
  lastTripDate?: string;
  avatar_url?: string;
  bike?: string;
  streakWeeks: number;
}

/**
 * Compute Leaderboard array sorted descending by sum of distance_km
 */
export function getLeaderboard(trips: TripEntry[], allUsers: User[] = [], seasonStartIso = '2026-01-01T00:00:00Z'): LeaderboardUser[] {
  const mapByUser = new Map<string, { totalKm: number; count: number; lastDate: string }>();

  const seasonStartMs = new Date(seasonStartIso).getTime();

  trips.forEach((t) => {
    if (!t.username) return;
    const uClean = t.username.trim();
    if (new Date(t.created_at).getTime() < seasonStartMs) return;

    const km = Number(t.distance_km) || 0;
    const existing = mapByUser.get(uClean) || { totalKm: 0, count: 0, lastDate: '' };
    existing.totalKm += km;
    existing.count += 1;
    if (!existing.lastDate || new Date(t.created_at) > new Date(existing.lastDate)) {
      existing.lastDate = t.created_at;
    }
    mapByUser.set(uClean, existing);
  });

  // Ensure default demo users exist in list if trips present
  if (mapByUser.size === 0) {
    mapByUser.set('Nican', { totalKm: 1420, count: 5, lastDate: new Date().toISOString() });
    mapByUser.set("Alex 'Nitro' Becker", { totalKm: 980, count: 3, lastDate: new Date().toISOString() });
    mapByUser.set('Rider Zero', { totalKm: 650, count: 2, lastDate: new Date().toISOString() });
  }

  const sorted = Array.from(mapByUser.entries())
    .map(([username, data]) => {
      const userObj = allUsers.find((u) => u.username.toLowerCase() === username.toLowerCase());
      return {
        rank: 0,
        username,
        totalKm: Math.round(data.totalKm),
        tripCount: data.count,
        lastTripDate: data.lastDate,
        avatar_url: userObj?.avatar_url,
        streakWeeks: getUserStreakWeeks(username, trips),
      };
    })
    .sort((a, b) => b.totalKm - a.totalKm);

  return sorted.map((item, idx) => ({ ...item, rank: idx + 1 }));
}
