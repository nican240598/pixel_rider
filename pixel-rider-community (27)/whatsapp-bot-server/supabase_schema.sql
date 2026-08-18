-- 1. WhatsApp Bot Konfiguration
CREATE TABLE IF NOT EXISTS wa_bot_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  is_active BOOLEAN DEFAULT TRUE,
  bot_phone TEXT DEFAULT '',
  group_name TEXT DEFAULT 'Pixel Bikers Community',
  group_jid TEXT,
  server_endpoint TEXT,
  api_secret TEXT,
  auto_vetting_enabled BOOLEAN DEFAULT TRUE,
  ai_strictness TEXT DEFAULT 'balanced',
  min_score_auto_approve INTEGER DEFAULT 80,
  inactivity_threshold_days INTEGER DEFAULT 180,
  vetting_questions JSONB DEFAULT '["Welches Motorradmodell und wie viel Hubraum/PS fährst du aktuell?", "Aus welcher Stadt oder Region kommst du?", "Hast du Lust an gemeinsamen Ausfahrten, Events oder Schrauber-Treffen teilzunehmen?"]'::jsonb,
  welcome_message TEXT DEFAULT 'Willkommen in der Pixel Bikers Gruppe! 🏍️ Bitte stelle dich kurz vor und halte dich an unsere Gruppenregeln. Allzeit gute Fahrt!',
  reject_message TEXT DEFAULT 'Vielen Dank für dein Interesse. Deine Beitrittsanfrage konnte leider nicht automatisch genehmigt werden. Ein Admin prüft deinen Antrag manuell.',
  inactivity_warning_message TEXT DEFAULT 'Hi {name}! 🏍️ Wir haben bemerkt, dass du in den letzten 6 Monaten keine Nachricht in der Gruppe gesendet hast. Bitte melde dich kurz zurück, wenn du weiterhin dabei sein möchtest!',
  last_sync_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Beitrittsanfragen (Vetting-Log)
CREATE TABLE IF NOT EXISTS wa_join_requests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  phone_number TEXT NOT NULL,
  user_name TEXT,
  answers JSONB,
  ai_score INTEGER DEFAULT 0,
  ai_verdict TEXT DEFAULT 'needs_review',
  ai_reason TEXT,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected, manual_review
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ
);

-- 3. WhatsApp Gruppenmitglieder (Inaktivitäts-Tracking)
CREATE TABLE IF NOT EXISTS wa_group_members (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  phone_number TEXT UNIQUE NOT NULL,
  phone TEXT,
  display_name TEXT,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  total_messages INTEGER DEFAULT 1,
  is_warned BOOLEAN DEFAULT FALSE,
  warning_sent_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. WhatsApp Outbox & Action Queue
CREATE TABLE IF NOT EXISTS wa_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  username TEXT,
  code TEXT,
  message_type TEXT DEFAULT 'verification_code', -- 'verification_code', 'remove_member', 'account_deleted', 'inactivity_warning'
  payload JSONB,
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'error'
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- Realtime aktivieren für Tabellen
ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE wa_outbox;
ALTER PUBLICATION supabase_realtime ADD TABLE wa_group_members;

-- WICHTIG: Replica Identity FULL für users Tabelle, damit bei DELETE der alte Datensatz (inkl. Telefonnummer) über Realtime übergeben wird!
ALTER TABLE users REPLICA IDENTITY FULL;

-- RLS Berechtigungen freischalten (damit WebApp in wa_outbox schreiben kann)
ALTER TABLE wa_outbox ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on wa_outbox" ON wa_outbox;
CREATE POLICY "Allow all on wa_outbox" ON wa_outbox FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE wa_group_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on wa_group_members" ON wa_group_members;
CREATE POLICY "Allow all on wa_group_members" ON wa_group_members FOR ALL USING (true) WITH CHECK (true);
