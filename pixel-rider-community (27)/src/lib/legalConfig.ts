export interface ImpressumData {
  site_name: string;
  operator_name: string;
  street: string;
  city_zip: string;
  email: string;
  phone?: string;
  responsible_content: string;
  disclaimer: string;
}

export interface PrivacyData {
  responsible_name: string;
  contact_email: string;
  hosting_location: string;
  data_storage_info: string;
  user_rights_info: string;
  custom_privacy_text?: string;
}

export interface LegalConfig {
  impressum: ImpressumData;
  privacy: PrivacyData;
}

export const DEFAULT_LEGAL_CONFIG: LegalConfig = {
  impressum: {
    site_name: 'Pixel Rider Community',
    operator_name: 'Nico Anschau',
    street: 'Alte Straße 19',
    city_zip: '66909 Hüffler',
    email: 'info@pixel-rider.de',
    phone: '',
    responsible_content: 'Nico Anschau, Alte Straße 19, 66909 Hüffler',
    disclaimer:
      'Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.',
  },
  privacy: {
    responsible_name: 'Nico Anschau, Alte Straße 19, 66909 Hüffler',
    contact_email: 'info@pixel-rider.de',
    hosting_location: 'Supabase Cloud (EU / Frankfurt am Main), OpenStreetMap Nominatim',
    data_storage_info:
      'Registrierung & Authentifizierung (E-Mail, SHA-256 Passwort-Hash, Telefonnummer zur WhatsApp-Verifizierung), Garagen-Bikes mit Fotos, Flohmarkt-Inserate, Forum-Beiträge & Antworten, PixelMap Standort-Koordinaten.',
    user_rights_info:
      'Du hast jederzeit das Recht auf unentgeltliche Auskunft über deine gespeicherten personenbezogenen Daten sowie ein Recht auf Berichtigung, Sperrung oder vollständige Löschung deines Kontos (Art. 17 DSGVO) direkt über deine Profileinstellungen.',
    custom_privacy_text:
      'Wir speichern keinerlei Werbetracker oder Weitergaben an Werbenetzwerke. Alle Daten dienen ausschließlich dem Betrieb der Pixel Rider Motorrad-Community.',
  },
};

const STORAGE_KEY = 'pixel_rider_legal_config';

export function getStoredLegalConfig(): LegalConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        impressum: { ...DEFAULT_LEGAL_CONFIG.impressum, ...(parsed.impressum || {}) },
        privacy: { ...DEFAULT_LEGAL_CONFIG.privacy, ...(parsed.privacy || {}) },
      };
    }
  } catch (e) {
    console.error('Failed to load legal config from storage', e);
  }
  return DEFAULT_LEGAL_CONFIG;
}

export function saveStoredLegalConfig(config: LegalConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save legal config to storage', e);
  }
}
