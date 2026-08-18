export type UserRole = 'member' | 'ehren pixel' | 'moderator' | 'admin';

export interface User {
  username: string;
  email: string;
  phone?: string;
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
  bio?: string;
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
  distance_km?: number;
  participants: string[]; // array of emails or usernames
  created_by: string;
  is_archived?: boolean;
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
  created_at?: string;
  route_coords?: [number, number][]; // Array of [lat, lng] representing the marked curve route/course
  raw_waypoints?: [number, number][]; // Array of [lat, lng] clicked turn points/waypoints
  distance_km?: number; // Total length of marked curve stretch in km
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
  action_type?: 'edit_photo_of_the_week' | 'open_modal' | 'none';
  action_payload?: string; // photo id
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
  updated_at?: string;
  is_winner?: boolean;
  cycle_id?: string;
  winner_notified?: boolean;
}

export type FeedbackCategory = 'webapp' | 'crew_rides' | 'events' | 'general' | 'other';

export type FeedbackStatus = 'new' | 'in_review' | 'planned' | 'implemented' | 'declined';

export interface FeedbackSuggestion {
  id: string;
  title: string;
  description: string;
  category: FeedbackCategory;
  author_username?: string; // empty if anonymous
  is_anonymous: boolean;
  status: FeedbackStatus;
  admin_notes?: string;
  admin_updated_by?: string;
  upvotes?: string[]; // Array of usernames who voted for this idea
  created_at: string;
  updated_at?: string;
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

// Feierabend-Ping (Spontaneous Rideouts)
export type RidePace = 'Gemütlich' | 'Flott' | 'Sportlich';
export type PingParticipantStatus = 'going' | 'maybe';

export interface PingParticipant {
  user_id?: string;
  username: string;
  status: PingParticipantStatus;
  created_at?: string;
}

export interface RidePing {
  id: string;
  creator_id?: string;
  creator_username: string;
  creator_avatar?: string;
  title: string;
  meeting_point: string;
  destination: string;
  departure_time: string; // ISO 8601 string
  pace: RidePace;
  max_participants?: number | null;
  notes?: string;
  created_at: string;
  participants: PingParticipant[];
}

// WhatsApp Bot Interfaces
export interface WABotConfig {
  id?: string;
  is_active: boolean;
  bot_phone: string;
  group_name: string;
  group_jid?: string;
  server_endpoint?: string;
  api_secret?: string;
  auto_vetting_enabled: boolean;
  ai_strictness: 'lenient' | 'balanced' | 'strict';
  min_score_auto_approve: number; // e.g. 75 (%)
  inactivity_threshold_days: number; // default 180 (6 months)
  vetting_questions: string[];
  welcome_message: string;
  reject_message: string;
  inactivity_warning_message: string;
  last_sync_at?: string;
  connection_status?: 'connected' | 'waiting_qr' | 'disconnected' | 'pairing';
}

export interface WAJoinRequest {
  id: string;
  phone_number: string;
  user_name: string;
  answers: { question: string; answer: string }[];
  ai_score: number; // 0 - 100
  ai_verdict: 'pass' | 'fail' | 'needs_review';
  ai_reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'manual_review';
  requested_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
}

export interface WAGroupMember {
  id: string;
  phone_number: string;
  display_name: string;
  role: 'admin' | 'member';
  joined_at: string;
  last_message_at: string;
  total_messages: number;
  is_warned?: boolean;
  warning_sent_at?: string;
}

