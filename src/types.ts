export type UserRole = 'member' | 'ehren pixel' | 'moderator' | 'admin';

export interface User {
  username: string;
  email: string;
  role: UserRole;
  isAdmin: boolean;
  isModerator: boolean;
  invite?: string;
  is_deactivated?: boolean;
  last_login?: string;
  last_active_at?: string;
  social_ig?: string;
  social_tiktok?: string;
  social_youtube?: string;
  avatar_url?: string;
}

export interface CrewMember {
  id: string;
  name: string;
  role: string;
  bio?: string;
  image_url?: string;
  social_ig?: string;
  social_tiktok?: string;
  social_youtube?: string;
  sort_order: number;
}

export interface CrewEvent {
  id: string;
  title: string;
  organizer: string;
  date_time: string;
  location?: string;
  description?: string;
  image_data?: string;
  lat?: number;
  lng?: number;
  participants: string[]; // array of emails or usernames
  created_by: string;
}

export interface GpxRoute {
  id: string;
  title: string;
  distance: string;
  gpx_data?: string;
  start_lat?: number;
  start_lng?: number;
  created_by: string;
}

export interface ForumReply {
  author: string;
  text: string;
  time: string;
}

export interface ForumTopic {
  id: string;
  category: 'Schrauber-Ecke' | 'Fahrtechnik' | 'Allgemeines' | string;
  title: string;
  content: string;
  author: string;
  replies: ForumReply[];
  created_at?: string;
}

export interface GarageBike {
  id: string;
  owner: string;
  model: string;
  mods?: string;
  images: string[]; // Array of base64/URL strings
  likes?: string[]; // Array of usernames
  comments?: { id: string; author: string; text: string; time: string }[];
}

export interface MarketItem {
  id: string;
  author: string;
  item_name: string;
  price: number;
  category: 'Fahrzeug' | 'Teile' | 'Kleidung' | 'Sonstiges' | string;
  description: string;
  images: string[];
  link_ebay?: string;
  link_kleinanzeigen?: string;
  link_facebook?: string;
  link_mobile?: string;
  is_deleted?: boolean;
  created_at?: string;
}

export interface MapPin {
  id?: string;
  email: string;
  username: string;
  city: string;
  bike: string;
  lat: number;
  lng: number;
  isLive?: boolean;
  lastLiveUpdate?: string;
  liveNote?: string;
}

export interface Poi {
  id?: string;
  type: 'treff' | 'pass';
  name: string;
  category?: string;
  location?: string;
  lat: number;
  lng: number;
  image?: string;
  image_data?: string;
  created_by?: string;
}

export interface UserNotification {
  id: string;
  target_username?: string;
  username?: string;
  message: string;
  reason?: string;
  type: 'warning' | 'danger' | 'success' | 'info' | 'inactivity_warning';
  is_read: boolean;
  created_by?: string;
  created_at: string;
}

export interface DirectMessage {
  id: string;
  sender: string;
  receiver: string;
  message: string;
  is_read?: boolean;
  created_at: string;
}

export interface MarketAppeal {
  id: string;
  item_id: string;
  author: string;
  appeal_reason: string;
  status: 'none' | 'pending' | 'accepted' | 'rejected';
  action_type: 'edit' | 'delete' | 'unknown';
  original_state?: Partial<MarketItem>;
  created_at?: string;
}

export interface TripEntry {
  id: string;
  user_id?: string;
  username: string;
  distance_km: number;
  created_at: string;
  proof_image_url?: string;
  title?: string;
  description?: string;
}

export interface SpotCheckin {
  id: string;
  username: string;
  spot_id: string;
  spot_name?: string;
  created_at: string;
}

export interface SpotOfTheWeek {
  id: string;
  name: string;
  location: string;
  lat: number;
  lng: number;
  image_url?: string;
  description?: string;
}

export interface PhotoOfTheWeek {
  id: string;
  title: string;
  author: string;
  image_url: string;
  description?: string;
  votes: string[]; // usernames of users who voted
  created_at?: string;
  is_winner?: boolean;
}

export type AppView =
  | 'landing'
  | 'dashboard'
  | 'garage'
  | 'market'
  | 'events'
  | 'gpx'
  | 'forum'
  | 'map'
  | 'admin'
  | 'crew_admin'
  | 'profile'
  | 'public_profile'
  | 'impressum'
  | 'privacy';

export interface TileConfig {
  id: string;
  title: string;
  subtitle: string;
  iconName: string;
  colorClass: string;
  bgIconClass: string;
  viewTarget?: AppView;
  colSpan: number; // 1 = ~33%, 2 = ~66%, 3 = 100%
  minHeight: number; // in pixels (e.g. 140 - 400)
  visible: boolean;
  order: number;
}
