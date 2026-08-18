import React from 'react';
import { LegalConfig, getStoredLegalConfig } from '../lib/legalConfig';

interface LegalViewProps {
  type: 'impressum' | 'privacy';
  legalConfig?: LegalConfig;
  onBack: () => void;
}

export const LegalView: React.FC<LegalViewProps> = ({ type, legalConfig, onBack }) => {
  const config = legalConfig || getStoredLegalConfig();
  const { impressum, privacy } = config;

  return (
    <div className="py-8 max-w-4xl mx-auto px-4 pb-28">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-10 shadow-2xl space-y-6">
        <button
          onClick={onBack}
          className="text-xs font-bold uppercase text-amber-400 hover:underline bg-transparent border-0 cursor-pointer mb-4 inline-flex items-center gap-1.5"
        >
          ← Zurück
        </button>

        {type === 'impressum' ? (
          <>
            <div className="border-b border-slate-800 pb-4 mb-4">
              <h1 className="text-3xl font-extrabold uppercase text-amber-400">Impressum</h1>
              <p className="text-xs text-slate-400 mt-1">{impressum.site_name || 'Pixel Rider Community'}</p>
            </div>

            <div>
              <h3 className="text-base font-bold text-white uppercase mb-1">Angaben gemäß § 5 DDG</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                {impressum.operator_name}<br />
                {impressum.street}<br />
                {impressum.city_zip}
              </p>
            </div>

            <div>
              <h3 className="text-base font-bold text-white uppercase mb-1">Kontakt</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                E-Mail: <a href={`mailto:${impressum.email}`} className="text-amber-400 hover:underline">{impressum.email}</a>
                {impressum.phone && (
                  <>
                    <br />
                    Telefon: {impressum.phone}
                  </>
                )}
              </p>
            </div>

            <div>
              <h3 className="text-base font-bold text-white uppercase mb-1">Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h3>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {impressum.responsible_content || `${impressum.operator_name}\n${impressum.street}\n${impressum.city_zip}`}
              </p>
            </div>

            <div>
              <h3 className="text-base font-bold text-white uppercase mb-1">Haftung für Inhalte und Links</h3>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {impressum.disclaimer || 'Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen.'}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="border-b border-slate-800 pb-4 mb-4">
              <h1 className="text-3xl font-extrabold uppercase text-amber-400">Datenschutzerklärung</h1>
              <p className="text-xs text-slate-400 mt-1">Transparenz & Datenschutz in der {impressum.site_name || 'Pixel Rider Community'}</p>
            </div>

            <div>
              <h3 className="text-base font-bold text-white uppercase mb-1">1. Wer ist verantwortlich?</h3>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {privacy.responsible_name || `${impressum.operator_name}, ${impressum.street}, ${impressum.city_zip}`}<br />
                E-Mail: <a href={`mailto:${privacy.contact_email || impressum.email}`} className="text-amber-400 hover:underline">{privacy.contact_email || impressum.email}</a>
              </p>
            </div>

            <div>
              <h3 className="text-base font-bold text-white uppercase mb-1">2. Welche Daten erfassen & speichern wir?</h3>
              <p className="text-sm text-slate-300 leading-relaxed mb-2">
                {privacy.data_storage_info}
              </p>
              <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
                <li><strong>Registrierung & Login:</strong> Benutzername, E-Mail-Adresse, Passwort (verschlüsselt), Telefonnummer (WhatsApp-Vetting).</li>
                <li><strong>Community-Inhalte:</strong> Hochgeladene Fotos (Garage, Profil, Fotowettbewerb), Flohmarkt-Inserate, Forenbeiträge, Ausfahrten.</li>
                <li><strong>PixelMap:</strong> Eingegebener Ort / Koordinaten zur Anzeige deines Crew-Pins.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-bold text-white uppercase mb-1">3. Hosting & Drittanbieter</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                {privacy.hosting_location}
              </p>
            </div>

            <div>
              <h3 className="text-base font-bold text-white uppercase mb-1">4. Deine Rechte & Datenlöschung (Art. 17 DSGVO)</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                {privacy.user_rights_info}
              </p>
            </div>

            {privacy.custom_privacy_text && (
              <div>
                <h3 className="text-base font-bold text-white uppercase mb-1">5. Zusätzliche Hinweise</h3>
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                  {privacy.custom_privacy_text}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
