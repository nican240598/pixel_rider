# 🏍️ Pixel Bikers WhatsApp Vetting & Inaktivitäts-Bot

Ein eigenständiger, selbst gehosteter WhatsApp-Bot für Gruppen-Admin-Aufgaben:
1. **Automatische Beitrittsprüfung (Vetting)**: Stellt Bewerbern per WhatsApp-DM automatisierte Fragen (z. B. nach Motorradmodell, Region, Motivation) und bewertet die Antworten mit **Google Gemini KI**.
2. **Automatische Freigabe / Ablehnung**: Genehmigt passende Bewerber direkt in der WhatsApp-Gruppe oder leitet Zweifelsfälle zur manuellen Freigabe an das Web-Admin-Panel weiter.
3. **6-Monats-Inaktivitäts-Tracker**: Erfasst jede Gruppennachricht und erstellt alle 6 Monate (oder auf Knopfdruck) eine Auswertung über inaktive Mitglieder (> 180 Tage ohne Nachricht), inklusive automatischer WhatsApp-Verwarnung.
4. **Zentrales Web-Admin-Panel**: Steuerung aller Fragen, Schwellenwerte und Logs direkt über die Website.

---

## 📋 Was du brauchst

1. **Eine eigene Telefonnummer (Prepaid-SIM / eSIM)**:
   * z. B. günstige Prepaid-SIM (Lebara, Congstar, Aldi Talk, Sipgate etc.).
   * Du musst lediglich **einmalig** einen SMS-Verifizierungscode erhalten, um WhatsApp auf der Nummer zu aktivieren.
   * Das Smartphone muss danach **nicht** dauerhaft online oder eingeschaltet sein.
2. **Einen Linux-Server / VPS / Raspberry Pi**:
   * Hetzner Cloud, Netcup, DigitalOcean, Synology NAS mit Docker oder Raspberry Pi.
3. **Admin-Rechte in deiner WhatsApp-Gruppe**:
   * Die Bot-Telefonnummer muss Mitglied der WhatsApp-Gruppe sein und die Rolle **Gruppen-Admin** haben, um Beitrittsanfragen annehmen/ablehnen zu können.

---

## 🚀 Schnelleinrichtung (In 5 Minuten)

### 1. Repository / Bot-Dateien auf deinen Server kopieren
```bash
cd /opt
# Bot-Ordner anlegen oder klonen
mkdir pixel-wa-bot && cd pixel-wa-bot
```

### 2. Konfiguration anlegen (.env)
Erstelle eine `.env` Datei mit deinen Zugangsdaten:
```bash
cp .env.example .env
nano .env
```
Trage dort ein:
* `SUPABASE_URL`: Deine Supabase Projekt-URL
* `SUPABASE_SERVICE_ROLE_KEY`: Dein Supabase Secret Key
* `GEMINI_API_KEY`: Dein Google Gemini API-Key (kostenlos bei Google AI Studio)
* `ADMIN_PHONE`: Deine persönliche Telefonnummer (z. B. `+491711122334`)

### 3. Datenbank-Tabellen in Supabase anlegen
Führe den Inhalt von `supabase_schema.sql` im **Supabase SQL Editor** aus.

### 4. Bot mit Docker starten
```bash
docker-compose up -d
```
Schau dir die Logs an, um den QR-Code zu scannen:
```bash
docker-compose logs -f
```

### 5. Einmalig QR-Code mit WhatsApp scannen
1. Öffne WhatsApp auf dem Smartphone mit der Bot-Nummer.
2. Gehe auf **Einstellungen -> Verknüpfte Geräte -> Gerät hinzufügen**.
3. Scanne den im Terminal angezeigten QR-Code.
4. Sobald `🚀 Pixel WhatsApp Bot erfolgreich mit WhatsApp verbunden!` erscheint, läuft der Bot dauerhaft im Hintergrund!

---

## ⚙️ Wie die Beitrittsprüfung funktioniert

1. Ein Nutzer klickt auf deinen WhatsApp-Gruppeneinladungslink und stellt eine **Beitrittsanfrage**.
2. Der Bot erkennt die Anfrage und schreibt den Nutzer sofort per **Direktnachricht** an:
   * *"Frage 1: Welches Motorradmodell und wie viel Hubraum/PS fährst du aktuell?"*
   * *"Frage 2: Aus welcher Stadt oder Region kommst du?"*
   * *"Frage 3: Hast du Lust an gemeinsamen Ausfahrten oder Events teilzunehmen?"*
3. Sobald der Bewerber alle Fragen beantwortet hat, bewertet die **Gemini KI** die Angaben (0–100 %):
   * **Score >= 80 %**: Bot genehmigt die Anfrage automatisch (`approve`) und sendet die Willkommensnachricht.
   * **Score < 50 %**: Bot lehnt die Anfrage ab (`reject`) und informiert den Bewerber.
   * **Score 50–79 %**: Antrag landet im Web-Admin-Panel für 1-Klick Manuelle Prüfung.

---

## ⏰ 6-Monats Inaktivitäts-Bericht

* Ein integrierter Cron-Job scannt monatlich alle Mitglieder.
* Mitglieder mit `letzte Nachricht > 180 Tage` werden markiert.
* Der Bot sendet dir eine kompakte Zusammenfassung per WhatsApp und zeigt alle Details im Web-Dashboard an.
