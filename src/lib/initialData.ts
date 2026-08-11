import { CrewMember, Poi, CrewEvent, GpxRoute, ForumTopic, GarageBike, MarketItem } from '../types';

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
  { type: 'treff', name: 'Glemseck (Leonberg)', lat: 48.7711, lng: 9.0371, image: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=600' },
  { type: 'treff', name: 'Torfhaus (Harz)', lat: 51.8016, lng: 10.5369, image: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?q=80&w=600' },
  { type: 'treff', name: 'Fährhaus Sylvenstein', lat: 47.5794, lng: 11.5478, image: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=600' },
  { type: 'pass', name: 'Schwarzwaldhochstraße', lat: 48.6019, lng: 8.2016, image: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?q=80&w=600' },
  { type: 'pass', name: 'Feldbergpass', lat: 47.8594, lng: 8.0353, image: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=600' },
  { type: 'pass', name: 'Sudelfeld', lat: 47.675, lng: 12.036, image: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?q=80&w=600' }
];

export const INITIAL_EVENTS: CrewEvent[] = [
  {
    id: 'ev-1',
    title: 'Saison-Eröffnung Schwarzwald',
    organizer: 'Nican',
    date_time: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 16),
    location: 'Glemseck Leonberg',
    description: 'Gemeinsame Ausfahrt durch den Nordschwarzwald mit Einkehr am Mummelsee.',
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
