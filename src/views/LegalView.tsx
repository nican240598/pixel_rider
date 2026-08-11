import React from 'react';

interface LegalViewProps {
  type: 'impressum' | 'privacy';
  onBack: () => void;
}

export const LegalView: React.FC<LegalViewProps> = ({ type, onBack }) => {
  return (
    <div className="py-8 max-w-4xl mx-auto px-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-10 shadow-2xl space-y-6">
        <button
          onClick={onBack}
          className="text-xs font-bold uppercase text-amber-400 hover:underline bg-transparent border-0 cursor-pointer mb-4"
        >
          ← Zurück zur Startseite
        </button>

        {type === 'impressum' ? (
          <>
            <h1 className="text-3xl font-extrabold uppercase text-amber-400">Impressum</h1>

            <div>
              <h3 className="text-base font-bold text-white uppercase mb-1">Angaben gemäß § 5 DDG</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Nico Anschau<br />
                Alte Straße 19<br />
                66909 Hüffler
              </p>
            </div>

            <div>
              <h3 className="text-base font-bold text-white uppercase mb-1">Kontakt</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                E-Mail: info@pixel-rider.de
              </p>
            </div>

            <div>
              <h3 className="text-base font-bold text-white uppercase mb-1">Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Nico Anschau<br />
                Alte Straße 19<br />
                66909 Hüffler
              </p>
            </div>

            <div>
              <h3 className="text-base font-bold text-white uppercase mb-1">Haftung für Links</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
              </p>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-extrabold uppercase text-amber-400">Datenschutzerklärung</h1>

            <div>
              <h3 className="text-base font-bold text-white uppercase mb-1">1. Wer ist verantwortlich?</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Nico Anschau, Alte Straße 19, 66909 Hüffler<br />
                E-Mail: info@pixel-rider.de
              </p>
            </div>

            <div>
              <h3 className="text-base font-bold text-white uppercase mb-1">2. Welche Daten erfassen wir?</h3>
              <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
                <li><strong>Registrierung & Login:</strong> E-Mail-Adresse, Benutzername, Passwort (SHA-256 verschlüsselt).</li>
                <li><strong>Community-Inhalte:</strong> Bilder, Beiträge und Angebote in Flohmarkt, Garage & Forum.</li>
                <li><strong>PixelMap:</strong> Eingegebener Ort / PLZ zur Anzeige des Pins.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-base font-bold text-white uppercase mb-1">3. Drittanbieter</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Wir nutzen Supabase für die Datenbank und OpenStreetMap Nominatim für Geocoding.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
