import { CrewMember, Poi, CrewEvent, GpxRoute, ForumTopic, GarageBike, MarketItem, TripEntry, SpotCheckin, SpotOfTheWeek, FeedbackSuggestion, RidePing } from '../types';

export const INITIAL_CREW: CrewMember[] = [
  {
    id: '1',
    name: 'Nican',
    role: 'Founder & Admin',
    bio: 'Gründer der Pixel Rider Crew. Leidenschaftlicher Kurvenjäger & Schrauber.',
    image_url: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=1000',
    social_ig: 'https://instagram.com',
    social_youtube: 'https://youtube.com',
    sort_order: 1
  },
  {
    id: '2',
    name: 'Rider Zero',
    role: 'Moderator & Tourguide',
    bio: 'Organisiert Tagestouren im Schwarzwald & der Pfalz.',
    image_url: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?q=80&w=1000',
    social_ig: 'https://instagram.com',
    sort_order: 2
  }
];

export const INITIAL_POIS: Poi[] = [
  { id: 'poi-1', type: 'treff', name: 'Glemseck (Leonberg)', location: 'Leonberg', lat: 48.7711, lng: 9.0371, image: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=600', created_by: 'Nican' },
  { id: 'poi-2', type: 'treff', name: 'Torfhaus (Harz)', location: 'Harz', lat: 51.8016, lng: 10.5369, image: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?q=80&w=600', created_by: 'Nican' },
  { id: 'poi-3', type: 'treff', name: 'Fährhaus Sylvenstein', location: 'Sylvenstein', lat: 47.5794, lng: 11.5478, image: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=600', created_by: 'Rider Zero' },
  {
    id: 'poi-4',
    type: 'pass',
    name: 'Schwarzwaldhochstraße (B500)',
    location: 'B500 Schwarzwald',
    lat: 48.6019,
    lng: 8.2016,
    distance_km: 32.4,
    route_coords: [
      [48.6912, 8.2435],
      [48.6654, 8.212],
      [48.6289, 8.1985],
      [48.6019, 8.2016],
      [48.5621, 8.2198],
      [48.5124, 8.2415],
      [48.471, 8.2812],
    ],
    image: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?q=80&w=600',
    created_by: 'Nican',
  },
  {
    id: 'poi-5',
    type: 'pass',
    name: 'Feldbergpass',
    location: 'Feldberg B317',
    lat: 47.8594,
    lng: 8.0353,
    distance_km: 14.8,
    route_coords: [
      [47.882, 7.985],
      [47.865, 8.012],
      [47.8594, 8.0353],
      [47.848, 8.065],
      [47.835, 8.112],
    ],
    image: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=600',
    created_by: 'Nican',
  },
  {
    id: 'poi-6',
    type: 'pass',
    name: 'Sudelfeldpass & Kurvenparadies',
    location: 'Bayerische Alpen (B307)',
    lat: 47.675,
    lng: 12.036,
    distance_km: 11.5,
    route_coords: [
      [47.698, 11.985],
      [47.685, 12.012],
      [47.675, 12.036],
      [47.662, 12.062],
      [47.651, 12.095],
    ],
    image: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?q=80&w=600',
    created_by: 'Rider Zero',
  },
];

export const INITIAL_EVENTS: CrewEvent[] = [
  {
    id: 'ev-1',
    title: 'Saison-Eröffnung Schwarzwald',
    organizer: 'Nican',
    date_time: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 16),
    location: 'Glemseck Leonberg',
    description: 'Gemeinsame Ausfahrt durch den Nordschwarzwald mit Einkehr am Mummelsee.',
    distance_km: 180,
    image_data: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=1000',
    lat: 48.7711,
    lng: 9.0371,
    participants: ['nican@pixel-rider.de'],
    created_by: 'Nican'
  }
];

export const INITIAL_GPX: GpxRoute[] = [
  {
    id: 'gpx-1',
    title: 'Nordschwarzwald Kurven-Traum',
    distance: '142.5',
    start_lat: 48.7711,
    start_lng: 9.0371,
    created_by: 'Nican',
    gpx_data: `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="PixelRider">
  <trk><trkseg>
    <trkpt lat="48.7711" lon="9.0371"/>
    <trkpt lat="48.7000" lon="8.9000"/>
    <trkpt lat="48.6019" lon="8.2016"/>
  </trkseg></trk>
</gpx>`
  }
];

export const INITIAL_FORUM: ForumTopic[] = [
  {
    id: 'f-1',
    category: 'Schrauber-Ecke',
    title: 'Anzugsdrehmomente Kette & Hinterrad YZF-R6',
    content: 'Hallo Zusammen! Hat jemand die genauen Drehmomente für die Steckachse hinten parat?',
    author: 'Nican',
    replies: [
      { author: 'Rider Zero', text: 'Hey Nican, die Hinterradachse bekommt genau 110 Nm.', time: new Date().toISOString() }
    ]
  }
];

export const INITIAL_GARAGE: GarageBike[] = [
  {
    id: 'b-1',
    owner: 'Nican',
    model: 'Yamaha YZF-R6 (RJ15)',
    mods: 'Akrapovic Komplettanlage, Öhlins Fahrwerk, Gilles Fußrastenanlage',
    images: ['https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=1000'],
    likes: [],
    comments: []
  }
];

export const INITIAL_MARKET: MarketItem[] = [
  {
    id: 'm-1',
    author: 'Nican',
    item_name: 'Akrapovic Slip-On Schalldämpfer Titan',
    price: 450,
    category: 'Teile',
    description: 'Verkaufe gut erhaltenen Endtopf mit e-Nummer und dB-Killer.',
    images: [
      'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?q=80&w=800',
      'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=800',
      'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?q=80&w=800',
      'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=800',
      'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?q=80&w=800'
    ],
    link_ebay: 'https://ebay.de'
  }
];

export const INITIAL_TRIPS: TripEntry[] = [
  { id: 't-1', username: 'Nican', distance_km: 1420, created_at: '2026-08-01T10:00:00Z', title: 'Schwarzwald Kurventraum' },
  { id: 't-2', username: 'Alex Nitro', distance_km: 980, created_at: '2026-08-05T14:30:00Z', title: 'Pfälzerwald Ausfahrt' },
  { id: 't-3', username: 'Rider Zero', distance_km: 650, created_at: '2026-08-08T11:15:00Z', title: 'Glemseck Feierabendrunde' },
];

export const INITIAL_SPOT_OF_THE_WEEK: SpotOfTheWeek = {
  id: 'spot-johanniskreuz',
  name: 'Johanniskreuz (Pfälzerwald)',
  location: 'B48 / Trippstadt',
  lat: 49.3364,
  lng: 7.8228,
  image_url: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?q=80&w=1000',
  description: 'Beliebter Motorradtreff im Pfälzerwald. Kurvenreiche Anfahrt über die B48.'
};

export const INITIAL_SPOT_CHECKINS: SpotCheckin[] = [
  { id: 'sc-1', username: 'Nican', spot_id: 'spot-johanniskreuz', spot_name: 'Johanniskreuz (Pfälzerwald)', created_at: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: 'sc-2', username: 'Rider Zero', spot_id: 'spot-johanniskreuz', spot_name: 'Johanniskreuz (Pfälzerwald)', created_at: new Date(Date.now() - 3600000 * 5).toISOString() },
  { id: 'sc-3', username: 'Alex Nitro', spot_id: 'spot-johanniskreuz', spot_name: 'Johanniskreuz (Pfälzerwald)', created_at: new Date(Date.now() - 3600000 * 24).toISOString() },
];

export const INITIAL_FEEDBACKS: FeedbackSuggestion[] = [
  {
    id: 'fb-1',
    title: 'GPX Höhenprofil & Kurvendichte in Routenvorschau',
    description: 'Es wäre genial, wenn wir bei hochgeladenen GPX-Dateien direkt das Höhenprofil und eine geschätzte Kurvendichte sehen könnten.',
    category: 'webapp',
    author_username: 'Alex Nitro',
    is_anonymous: false,
    status: 'planned',
    admin_notes: 'Super Idee! Wird mit dem nächsten Karten-Update für Routen umgesetzt.',
    admin_updated_by: 'Nican',
    upvotes: ['Nican', 'Rider Zero', 'Biker_99'],
    created_at: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 'fb-2',
    title: 'Feste Feierabend-Runde jeden 2. Donnerstag',
    description: 'Wie wäre es mit einem festen Rhythmus für spontanere Feierabend-Runden im Nordschwarzwald ab 18:00 Uhr mit wechselnden Treffpunkten?',
    category: 'crew_rides',
    author_username: '',
    is_anonymous: true,
    status: 'in_review',
    admin_notes: 'Besprechen wir beim nächsten Treffen. Wir erstellen dafür eine Umfrage.',
    admin_updated_by: 'Rider Zero',
    upvotes: ['Alex Nitro', 'Nican'],
    created_at: new Date(Date.now() - 86400000 * 1).toISOString()
  },
  {
    id: 'fb-3',
    title: 'Garage Showroom Filter nach Motorradmarke',
    description: 'Wenn viele Bikes in der Garage stehen, wäre ein Schnellfilter nach Marke (Yamaha, Honda, BMW, Ducati, etc.) super praktisch.',
    category: 'webapp',
    author_username: 'Rider Zero',
    is_anonymous: false,
    status: 'new',
    upvotes: ['Nican'],
    created_at: new Date(Date.now() - 3600000 * 8).toISOString()
  }
];

export const INITIAL_PINGS: RidePing[] = [
  {
    id: 'ping-1',
    creator_username: 'Nican',
    title: 'Spontane Feierabendrunde Johanniskreuz',
    meeting_point: 'Aral Tankstelle Landau Nord',
    destination: 'Johanniskreuz (Café Nicklis)',
    departure_time: new Date(Date.now() + 1000 * 60 * 45).toISOString(), // in 45 mins
    pace: 'Flott',
    max_participants: 6,
    notes: 'Kurvenspaß durchs Elmsteiner Tal. Bitte vollgetankt erscheinen!',
    created_at: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    participants: [
      { username: 'Nican', status: 'going', created_at: new Date(Date.now() - 1000 * 60 * 20).toISOString() },
      { username: 'Alex Nitro', status: 'going', created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString() },
      { username: 'Rider Zero', status: 'maybe', created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString() }
    ]
  },
  {
    id: 'ping-2',
    creator_username: 'Rider Zero',
    title: 'After-Work Cruisen zur Nagoldtalsperre',
    meeting_point: 'Glemseck (Parkplatz)',
    destination: 'Erzgrube Nagoldtalsperre',
    departure_time: new Date(Date.now() + 1000 * 60 * 110).toISOString(), // in ~2 hours
    pace: 'Gemütlich',
    max_participants: null,
    notes: 'Entspannte Runde zum Abschalten. Ideal auch für Einsteiger.',
    created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    participants: [
      { username: 'Rider Zero', status: 'going', created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString() }
    ]
  }
];


