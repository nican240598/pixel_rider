/**
 * Pixel Bikers WhatsApp Vetting & Inactivity Tracking Bot
 * Stack: Node.js, @whiskeysockets/baileys, @supabase/supabase-js, @google/genai, node-cron
 */

require('dotenv').config();

// Global Crash Prevention
process.on('uncaughtException', (err) => {
  console.error('⚠️ [CRASH-SCHUTZ: UncaughtException]', err.message || err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ [CRASH-SCHUTZ: UnhandledRejection]', reason);
});

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const { createClient } = require('@supabase/supabase-js');
const cron = require('node-cron');
const express = require('express');

// --- Supabase Client ---
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://anxhzeovqgokcorvjttu.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFueGh6ZW92cWdva2NvcnZqdHR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNTQ2MzQsImV4cCI6MjEwMDczMDYzNH0.cNXVM4y6_uCnHP6r53ZmqqSRQX2oLwk78fSPW9x0FJ4';

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️ HINWEIS: Keine SUPABASE_SERVICE_ROLE_KEY in der .env gefunden. Nutze Projekt-Key als Fallback.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Express Health Server ---
const app = express();
app.use(express.json());

// Enable CORS for dashboard and direct API calls
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const PORT = process.env.PORT || 3001;

// Global State
let sock = null;
let isWhatsAppConnected = false;
let lastQrCode = null;
let lastQrTimestamp = 0;
let connectionState = 'initializing';
let outboxIntervalStarted = false;
let botConfig = {
  is_active: true,
  auto_vetting_enabled: true,
  ai_strictness: 'balanced',
  min_score_auto_approve: 80,
  inactivity_threshold_days: 180, // 6 months
  vetting_questions: [
    'Welches Motorradmodell und wie viel Hubraum/PS fährst du aktuell?',
    'Aus welcher Stadt oder Region kommst du?',
    'Hast du Lust an gemeinsamen Ausfahrten, Events oder Schrauber-Treffen teilzunehmen?'
  ],
  welcome_message: 'Willkommen in der Pixel Bikers Gruppe! 🏍️ Bitte stelle dich kurz vor und halte dich an unsere Gruppenregeln. Allzeit gute Fahrt!',
  reject_message: 'Vielen Dank für dein Interesse. Deine Beitrittsanfrage konnte leider nicht automatisch genehmigt werden, da die Antworten unvollständig oder nicht passend waren. Ein Admin prüft deinen Antrag manuell.',
  inactivity_warning_message: 'Hi {name}! 🏍️ Wir haben bemerkt, dass du in den letzten 6 Monaten keine Nachricht in der Gruppe gesendet hast. Bitte melde dich kurz zurück, wenn du weiterhin dabei sein möchtest!'
};

// In-Memory state for candidates currently in the DM question flow
// Phone -> { step: 0, answers: [], requestedAt: timestamp }
const candidateSessions = new Map();

/**
 * Robust Phone Number Formatter
 */
function formatPhone(phone) {
  if (!phone) return '';
  const str = phone.toString().trim();
  const noJid = str.split('@')[0].split(':')[0];
  let digits = noJid.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = '49' + digits.slice(1);
  if (!digits.startsWith('49') && (digits.startsWith('15') || digits.startsWith('16') || digits.startsWith('17') || digits.startsWith('18') || digits.startsWith('19'))) {
    digits = '49' + digits;
  }
  return digits;
}

/**
 * Load latest bot config from Supabase
 */
async function loadConfig() {
  try {
    const { data } = await supabase.from('wa_bot_config').select('*').limit(1).single();
    if (data) {
      botConfig = {
        ...botConfig,
        ...data,
        vetting_questions: typeof data.vetting_questions === 'string' ? JSON.parse(data.vetting_questions) : data.vetting_questions
      };
      console.log('✅ Bot configuration loaded from Supabase');
    }
  } catch (err) {
    console.warn('⚠️ Could not load remote config, using defaults:', err.message);
  }
}

/**
 * Remove a member from all participating WhatsApp groups
 */
async function removeUserFromAllGroups(phone, username) {
  if (!sock) {
    console.warn('⚠️ WhatsApp Socket (sock) ist aktuell nicht verbunden!');
    return { success: false, botOnline: false, reason: 'WhatsApp bot socket is offline' };
  }

  let clean = formatPhone(phone);

  // Fallback: If phone is not provided, look it up in Supabase
  if (!clean && username) {
    console.log(`🔎 Suche Telefonnummer für Username "${username}" in Supabase...`);
    try {
      const { data: u } = await supabase.from('users').select('phone').ilike('username', username).maybeSingle();
      if (u && u.phone) {
        clean = formatPhone(u.phone);
        console.log(`   👉 Gefunden in 'users' Tabelle: ${clean}`);
      }
    } catch (e) {}

    if (!clean) {
      try {
        const { data: g } = await supabase.from('wa_group_members').select('phone, phone_number, display_name').ilike('display_name', `%${username}%`).limit(1);
        if (g && g.length > 0) {
          clean = formatPhone(g[0].phone || g[0].phone_number);
          console.log(`   👉 Gefunden in 'wa_group_members' Tabelle: ${clean}`);
        }
      } catch (e) {}
    }

    if (!clean) {
      try {
        const { data: a } = await supabase.from('allowed_members').select('phone_number, name').ilike('name', `%${username}%`).limit(1);
        if (a && a.length > 0) {
          clean = formatPhone(a[0].phone_number);
          console.log(`   👉 Gefunden in 'allowed_members' Tabelle: ${clean}`);
        }
      } catch (e) {}
    }
  }

  if (!clean && !username) {
    console.warn('⚠️ Weder Telefonnummer noch Benutzername für den Kick angegeben.');
    return { success: false, botOnline: true, reason: 'No phone or username provided' };
  }

  console.log(`\n=============================================================`);
  console.log(`🚫 GESAMT-COMMUNITY KICK: Entferne Biker "${username || ''}" (Tel: ${clean || phone || 'unbekannt'})...`);
  console.log(`=============================================================`);

  // Send polite farewell direct message before/during removal if phone is available
  if (clean && sock) {
    try {
      const userJid = `${clean}@s.whatsapp.net`;
      await sock.sendMessage(userJid, {
        text: `Hallo ${username ? `@${username}` : 'Biker'} 🏍️\n\nDein Account in der Pixel Rider WebApp wurde gelöscht. Wie vorgesehen wurdest du daher automatisch aus allen WhatsApp-Gruppen unserer Community entfernt.\n\nWir danken dir für deine Zeit in der Crew und wünschen dir weiterhin allzeit gute & unfallfreie Fahrt! ✌️`
      });
      console.log(`📨 Abschieds-Nachricht per WhatsApp Direktnachricht an ${userJid} gesendet.`);
    } catch (dmErr) {
      console.warn(`ℹ️ Konnte keine Abschieds-DM an ${clean} senden:`, dmErr.message);
    }
  }

  try {
    let groupMap = {};
    try {
      groupMap = await sock.groupFetchAllParticipating();
    } catch (gFetchErr) {
      console.warn('⚠️ groupFetchAllParticipating warning:', gFetchErr.message);
    }

    // Also include specific GROUP_JID from env or config if present
    const explicitGroupJid = process.env.GROUP_JID || botConfig.group_jid;
    if (explicitGroupJid && !groupMap[explicitGroupJid]) {
      try {
        const meta = await sock.groupMetadata(explicitGroupJid);
        if (meta) groupMap[explicitGroupJid] = meta;
      } catch (metaErr) {
        console.warn('⚠️ Could not fetch metadata for explicit group:', explicitGroupJid);
      }
    }

    const groupEntries = Object.entries(groupMap);
    if (!groupEntries.length) {
      console.warn('⚠️ Keine WhatsApp-Gruppen für den Bot gefunden.');
      return { success: false, botOnline: true, reason: 'No WhatsApp groups found where the bot is participating' };
    }

    let totalRemoved = 0;
    const targetLast8 = clean ? clean.slice(-8) : '';
    const botJidRaw = sock.user?.id || '';
    const botLidRaw = sock.user?.lid || '';
    const botPhone = botJidRaw.split('@')[0].split(':')[0].replace(/\D/g, '');
    const botLidClean = botLidRaw.split('@')[0].split(':')[0].replace(/\D/g, '');

    const groupsChecked = [];

    for (const [gId, group] of groupEntries) {
      let participants = group.participants || [];
      let groupName = group.subject || gId;

      // Always fetch fresh groupMetadata from WhatsApp servers to get real-time admin status & participants
      try {
        const freshMeta = await sock.groupMetadata(gId);
        if (freshMeta) {
          if (freshMeta.subject) groupName = freshMeta.subject;
          if (freshMeta.participants && freshMeta.participants.length > 0) {
            participants = freshMeta.participants;
          }
        }
      } catch (metaErr) {
        console.warn(`ℹ️ Nutze Cache für "${groupName}" (groupMetadata: ${metaErr.message})`);
      }

      // Check if Bot is Admin in this group
      const botPart = participants.find((p) => {
        const pId = p.id || '';
        const pRaw = pId.split('@')[0].split(':')[0].replace(/\D/g, '');
        const matchPhone = botPhone && (pRaw === botPhone || pId.includes(botPhone));
        const matchLid = botLidClean && (pRaw === botLidClean || pId.includes(botLidClean));
        const matchRaw = botJidRaw && pId.includes(botJidRaw.split(':')[0]);
        return matchPhone || matchLid || matchRaw;
      });

      const isBotAdmin = botPart ? (botPart.admin === 'admin' || botPart.admin === 'superadmin') : false;

      console.log(`📁 Gruppe "${groupName}" (${participants.length} Teilnehmer) | Bot-Status: ${isBotAdmin ? '✅ ADMIN' : '⚠️ KEIN ADMIN erkannt (Versuche Kick trotzdem)'}`);

      // Find matching participants in this specific group
      const targetJidsToKick = new Set();

      for (const p of participants) {
        const pId = p.id || '';
        const pRawDigits = pId.split('@')[0].split(':')[0].replace(/\D/g, '');

        // Match by phone digits (exact match, last 8 digits, or reverse match)
        let isMatch = false;
        if (clean) {
          if (pRawDigits === clean || (targetLast8 && pRawDigits.endsWith(targetLast8)) || (pRawDigits && clean.endsWith(pRawDigits))) {
            isMatch = true;
          }
        }

        // Match by participant notify/name
        if (!isMatch && username) {
          const uLower = username.toLowerCase();
          if (p.notify && p.notify.toLowerCase().includes(uLower)) isMatch = true;
          if (p.name && p.name.toLowerCase().includes(uLower)) isMatch = true;
        }

        if (isMatch) {
          targetJidsToKick.add(pId); // add original participant JID (supports LID or standard format)
          if (pRawDigits) {
            targetJidsToKick.add(`${pRawDigits}@s.whatsapp.net`);
          }
        }
      }

      // Also add normalized direct JIDs as attempt
      if (clean) {
        targetJidsToKick.add(`${clean}@s.whatsapp.net`);
      }

      const jidList = Array.from(targetJidsToKick);
      let groupKickSuccess = false;
      let kickDetails = null;

      if (jidList.length > 0) {
        console.log(`   🎯 Führe KICK-Versuch in "${groupName}" aus für:`, jidList);

        for (const jid of jidList) {
          try {
            const res = await sock.groupParticipantsUpdate(gId, [jid], 'remove');
            console.log(`   ✅ KICK-RESPONSE für ${jid} in "${groupName}":`, JSON.stringify(res));
            
            // Check Baileys response status
            if (Array.isArray(res) && res.length > 0) {
              const item = res[0];
              if (item.status === '200' || item.status === 200 || !item.status) {
                groupKickSuccess = true;
              }
            } else {
              groupKickSuccess = true;
            }
            kickDetails = res;
            if (groupKickSuccess) break; // one successful removal is enough
          } catch (kickErr) {
            console.warn(`   ⚠️ Kick für ${jid} in "${groupName}":`, kickErr.message);
            kickDetails = { error: kickErr.message };
          }
        }

        if (groupKickSuccess) {
          totalRemoved++;
        }
      } else {
        console.log(`   ℹ️ Biker (${clean || username}) ist kein Teilnehmer in "${groupName}".`);
      }

      groupsChecked.push({
        groupId: gId,
        groupName,
        isBotAdmin: !!isBotAdmin,
        participantCount: participants.length,
        matchedJids: jidList,
        removed: groupKickSuccess,
        details: kickDetails
      });
    }

    // Clean up in wa_group_members and allowed_members table
    if (clean || username) {
      try {
        if (clean) {
          await supabase.from('wa_group_members').delete().or(`phone.eq.${clean},phone_number.ilike.%${targetLast8 || clean}%`);
          await supabase.from('allowed_members').update({ status: 'removed' }).ilike('phone_number', `%${targetLast8 || clean}%`);
        }
        if (username) {
          await supabase.from('allowed_members').update({ status: 'removed' }).ilike('name', `%${username}%`);
        }
        console.log(`   🗑️ Mitglieds-Einträge in Supabase aktualisiert/gelöscht.`);
      } catch (e) {
        console.warn('Fehler bei DB-Bereinigung:', e.message);
      }
    }

    console.log(`🏁 KICK-VORGANG ABGESCHLOSSEN: ${totalRemoved} Gruppen-Entfernungen erfolgreich.`);
    console.log(`=============================================================\n`);
    return {
      success: true,
      botOnline: true,
      phoneClean: clean,
      username,
      totalRemoved,
      groupsChecked
    };
  } catch (err) {
    console.error('❌ Schwerer Fehler beim Kicken:', err);
    return { success: false, botOnline: true, error: err.message };
  }
}

// Anti-duplicate outbox lock & idempotency cache
let isProcessingOutbox = false;
const processedMessageCache = new Map(); // key -> timestamp

// Clean up processedMessageCache periodically (every 5 minutes, retain 10 min)
setInterval(() => {
  const now = Date.now();
  for (const [k, ts] of processedMessageCache.entries()) {
    if (now - ts > 10 * 60 * 1000) {
      processedMessageCache.delete(k);
    }
  }
}, 5 * 60 * 1000);

/**
 * Outbox & Action Queue Processor
 */
async function processOutboxQueue() {
  if (!sock || isProcessingOutbox) return;

  isProcessingOutbox = true;
  try {
    const { data: pendingTasks, error } = await supabase
      .from('wa_outbox')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10);

    if (error) {
      console.warn('⚠️ [wa_outbox] Supabase Abfrage-Warnung:', error.message);
      return;
    }
    if (!pendingTasks || pendingTasks.length === 0) return;

    // Check if WhatsApp socket is ready
    if (!isWhatsAppConnected || !sock.user) {
      console.log(`⏳ [wa_outbox] ${pendingTasks.length} offene(r) Task(s) warten in Supabase, aber der WhatsApp-Socket ist noch nicht verbunden (Status: ${connectionState}). Bitte QR-Code scannen.`);
      return;
    }

    // Immediately mark as processing in Supabase to prevent concurrent query overlap
    const taskIds = pendingTasks.map((t) => t.id);
    await supabase
      .from('wa_outbox')
      .update({ status: 'processing' })
      .in('id', taskIds);

    console.log(`📬 [wa_outbox] Verarbeite ${pendingTasks.length} offene Outbox-Tasks...`);

    for (const task of pendingTasks) {
      const { id, phone, username, code, message_type } = task;
      const formatted = formatPhone(phone);
      const userJid = formatted ? `${formatted}@s.whatsapp.net` : null;

      // Idempotency check: Don't send same code to same phone twice within 60s
      const dedupeKey = `${formatted}_${message_type || 'code'}_${code || ''}`;
      const lastSentTime = processedMessageCache.get(dedupeKey);
      const isDuplicate = lastSentTime && (Date.now() - lastSentTime < 60000);

      try {
        if (isDuplicate) {
          console.log(`🛡️ [Dedupe] Überspringe doppelten Sendevorgang für Task ${id} (${dedupeKey}), bereits vor ${Math.round((Date.now() - lastSentTime) / 1000)}s gesendet.`);
        } else if (message_type === 'verification_code' || (!message_type && code)) {
          // Send verification code
          if (userJid) {
            console.log(`📩 Sende WhatsApp-Code an ${userJid}...`);
            await sock.sendMessage(userJid, {
              text: `🏍️ *Pixel Rider Bestätigungscode*\n\nHallo ${username || 'Biker'},\ndein 6-stelliger Code lautet:\n\n👉 *${code}*\n\nGib diesen Code in der WebApp ein, um fortzufahren. (Gültig für 15 Minuten)`
            });
            processedMessageCache.set(dedupeKey, Date.now());
            console.log(`✅ Outbox-Code (${id}) an ${formatted} gesendet!`);
          }
        } else if (message_type === 'password_reset' || task.reset_url) {
          // Send password reset link
          if (userJid) {
            const resetLink = task.reset_url || `https://www.pixel-rider.de/#reset-pass-${code || id}`;
            console.log(`🔒 Sende WhatsApp Passwort-Reset-Link an ${userJid}...`);
            await sock.sendMessage(userJid, {
              text: `🔒 *Pixel Rider - Passwort Zurücksetzen*\n\nHallo @${username || 'Biker'},\n\ndu hast eine Passwort-Zurücksetzung für deinen Pixel Rider WebApp-Account angefordert.\n\nKlicke auf den folgenden Link, um dein neues Passwort festzulegen:\n👉 ${resetLink}\n\n_(Link ist 30 Minuten gültig)_`
            });
            processedMessageCache.set(dedupeKey, Date.now());
            console.log(`✅ Outbox-Reset-Link (${id}) an ${formatted} gesendet!`);
          }
        } else if (
          message_type === 'remove_member' ||
          message_type === 'account_deleted' ||
          message_type === 'delete_user' ||
          message_type === 'kick_member' ||
          message_type === 'purge_user'
        ) {
          // Remove user from all WhatsApp groups
          console.log(`🚫 Outbox-Befehl: Entferne Biker "${username || ''}" (${phone}) aus der gesamten Community...`);
          const kickRes = await removeUserFromAllGroups(phone, username);
          console.log(`   Kick-Status für Task ${id}:`, JSON.stringify(kickRes));
          processedMessageCache.set(dedupeKey, Date.now());
        } else if (message_type === 'inactivity_warning') {
          // Send warning message
          if (userJid) {
            await sock.sendMessage(userJid, {
              text: `Hi ${username}! 🏍️\n\nWir haben bemerkt, dass du in der Pixel Rider WhatsApp-Gruppe schon länger nicht mehr aktiv warst. Bitte melde dich kurz zurück, wenn du weiterhin dabei sein möchtest!`
            });
            processedMessageCache.set(dedupeKey, Date.now());
          }
        }

        // Mark outbox entry as sent/completed
        await supabase
          .from('wa_outbox')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', id);
        console.log(`🎉 Task ${id} erfolgreich als 'sent' in Supabase markiert.`);
      } catch (taskErr) {
        console.error(`Fehler bei Outbox-Task ${id}:`, taskErr.message);
        await supabase
          .from('wa_outbox')
          .update({ status: 'error', error_message: taskErr.message })
          .eq('id', id);
      }
    }
  } catch (pollErr) {
    // Quiet poll failure
  } finally {
    isProcessingOutbox = false;
  }
}

/**
 * Sync all group participants into Supabase wa_group_members
 */
async function syncAllGroupMembers() {
  if (!sock) return;
  try {
    const groups = await sock.groupFetchAllParticipating();
    const groupEntries = Object.entries(groups);
    if (!groupEntries.length) {
      console.log('ℹ️ Keine aktive WhatsApp-Gruppe gefunden zum Synchronisieren.');
      return;
    }

    console.log(`🔄 Synchronisiere Mitglieder aus ${groupEntries.length} WhatsApp-Gruppen...`);
    for (const [gJid, group] of groupEntries) {
      const participants = group.participants || [];
      console.log(`📦 Gruppe "${group.subject}": ${participants.length} Mitglieder`);

      for (const p of participants) {
        const rawPhone = p.id.split('@')[0].split(':')[0];
        const formatted = formatPhone(rawPhone);
        const plusPhone = `+${formatted}`;

        try {
          await supabase.from('wa_group_members').upsert([
            {
              phone_number: plusPhone,
              phone: formatted,
              role: p.admin ? 'admin' : 'member',
              display_name: p.notify || p.name || `+${formatted}`,
              updated_at: new Date().toISOString()
            }
          ], { onConflict: 'phone_number' });
        } catch (e) {
          // Ignore single row insert issue
        }
      }
    }
    console.log('✅ Gruppenmitglieder erfolgreich in Supabase synchronisiert.');
  } catch (err) {
    if (err.message && err.message.includes('rate-overlimit')) {
      console.log('ℹ️ WhatsApp Rate-Limit beim Gruppen-Initial-Sync erreicht. Warte kurz und synchronisiere im Hintergrund erneut.');
      setTimeout(syncAllGroupMembers, 20000);
    } else {
      console.warn('⚠️ Hinweis beim Gruppen-Sync:', err.message);
    }
  }
}

/**
 * Evaluate Candidate Answers using Gemini AI or Heuristic Fallback
 */
async function evaluateCandidateAnswers(answers, questions) {
  const prompt = `Du bist der Aufnahme-Prüfer für die deutsche Motorrad-Community "Pixel Bikers".
Bewerber beantworten folgende 3 Fragen:
${questions.map((q, idx) => `Frage ${idx + 1}: ${q}\nAntwort: ${answers[idx] || '<leer>'}`).join('\n\n')}

Bewerte die Antworten nach folgenden Kriterien:
1. Hat der Bewerber ein echtes/plausibles Motorrad oder ernsthaftes Interesse (z.B. A-Führerschein in Arbeit)?
2. Ist die Region plausibel angegeben?
3. Sind die Antworten höflich, sinnerfassend und nicht nur Spam/Bot/Einsilbig?

Antworte bitte NUR als valides JSON in folgendem Format:
{
  "score": 85,
  "verdict": "pass", 
  "reason": "Kurze Begründung auf Deutsch (max 2 Sätze)"
}
Hinweis für "verdict": Wenn score >= ${botConfig.min_score_auto_approve} dann "pass", wenn score < 50 dann "fail", dazwischen "needs_review".`;

  // Native Gemini REST API call if GEMINI_API_KEY exists
  if (process.env.GEMINI_API_KEY) {
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
      const apiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });
      if (apiRes.ok) {
        const apiData = await apiRes.json();
        const rawText = apiData?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const parsed = JSON.parse(rawText);
          return {
            score: parsed.score || 70,
            verdict: parsed.verdict || 'needs_review',
            reason: parsed.reason || 'Automatisch geprüft.'
          };
        }
      }
    } catch (e) {
      console.error('Gemini REST API evaluation error, using fallback:', e.message);
    }
  }

  // Heuristic Fallback
  let score = 40;
  const q1 = (answers[0] || '').toLowerCase();
  const q2 = (answers[1] || '').toLowerCase();
  const q3 = (answers[2] || '').toLowerCase();

  if (q1.length > 4 && (q1.includes('cc') || q1.includes('ps') || q1.includes('yamaha') || q1.includes('ktm') || q1.includes('honda') || q1.includes('kawasaki') || q1.includes('bmw') || q1.includes('suzuki') || q1.includes('ducati') || q1.includes('harley') || q1.includes('z900') || q1.includes('mt'))) {
    score += 30;
  }
  if (q2.length > 3) score += 20;
  if (q3.length > 3) score += 10;

  const scoreNum = Math.min(100, score);
  return {
    score: scoreNum,
    verdict: scoreNum >= botConfig.min_score_auto_approve ? 'pass' : scoreNum >= 60 ? 'needs_review' : 'fail',
    reason: `Heuristische Prüfung: Motorrad & Region ${scoreNum >= 75 ? 'gut' : 'nur teilweise'} ausgefüllt.`
  };
}

/**
 * Start Baileys WhatsApp Connection
 */
async function startWhatsAppBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    auth: state,
    browser: ['Pixel Bikers Bot', 'Chrome', '1.0.0']
  });

  sock.ev.on('creds.update', saveCreds);

  // Connection Lifecycle
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      lastQrCode = qr;
      lastQrTimestamp = Date.now();
      isWhatsAppConnected = false;
      connectionState = 'awaiting_qr_scan';
      console.log('\n=============================================');
      console.log('📱 SCANNE DIESEN QR-CODE MIT WHATSAPP:');
      console.log('WhatsApp -> Einstellungen -> Verknüpfte Geräte');
      console.log('Oder öffne http://<server-ip>:' + PORT + '/qr im Browser!');
      console.log('=============================================\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      isWhatsAppConnected = false;
      connectionState = 'disconnected';
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log('❌ Connection closed due to', lastDisconnect?.error, ', reconnecting:', shouldReconnect);
      if (shouldReconnect) {
        connectionState = 'reconnecting';
        setTimeout(startWhatsAppBot, 5000);
      } else {
        console.log('⚠️ Device logged out. Please restart container and scan new QR code.');
        connectionState = 'logged_out';
      }
    } else if (connection === 'open') {
      isWhatsAppConnected = true;
      lastQrCode = null;
      connectionState = 'connected';
      console.log('🚀 Pixel WhatsApp Bot erfolgreich mit WhatsApp verbunden!');
      console.log(`👤 Bot-Account: ${sock.user?.id || sock.user?.name || 'Verbunden'}`);
      await loadConfig();
      setTimeout(syncAllGroupMembers, 3000);
    }
  });

  // 1. Group Participants Update Listener:
  // Detect when someone LEAVES or is REMOVED from the WhatsApp Group -> Lock their WebApp Account
  sock.ev.on('group-participants.update', async (event) => {
    console.log('📢 group-participants.update Event:', event);
    const { id: groupJid, participants, action } = event;

    if (action === 'remove' || action === 'leave') {
      for (const userJid of participants) {
        const rawPhone = userJid.split('@')[0].split(':')[0];
        const formatted = formatPhone(rawPhone);
        const plusPhone = `+${formatted}`;
        const last8 = formatted ? formatted.slice(-8) : '';
        const phoneVariations = [plusPhone, formatted, `0${formatted.slice(2)}`, `+49${formatted.slice(2)}`];

        console.log(`🚪 [WHATSAPP-LEAVE] Biker ${plusPhone} (${userJid}) hat die Gruppe verlassen oder wurde entfernt (Aktion: ${action}).`);

        // a) Remove from wa_group_members & allowed_members table
        try {
          if (last8) {
            await supabase.from('wa_group_members').delete().or(`phone_number.ilike.%${last8}%,phone.ilike.%${last8}%`);
            await supabase.from('allowed_members').update({ status: 'removed' }).ilike('phone_number', `%${last8}%`);
          } else {
            await supabase.from('wa_group_members').delete().or(`phone_number.in.(${phoneVariations.map(p => `"${p}"`).join(',')}),phone.in.(${phoneVariations.map(p => `"${p}"`).join(',')})`);
          }
        } catch (dbErr) {
          console.error('Error removing from wa_group_members:', dbErr);
        }

        // b) Lock/Deactivate user in WebApp 'users' table
        try {
          let { data: matchedUsers } = await supabase
            .from('users')
            .select('id, username, phone, is_deactivated')
            .in('phone', phoneVariations);

          if (!matchedUsers || matchedUsers.length === 0) {
            if (last8) {
              const { data: byLast8 } = await supabase
                .from('users')
                .select('id, username, phone, is_deactivated')
                .ilike('phone', `%${last8}%`);
              if (byLast8 && byLast8.length > 0) matchedUsers = byLast8;
            }
          }

          if (!matchedUsers || matchedUsers.length === 0) {
            const { data: allUsers } = await supabase.from('users').select('id, username, phone, is_deactivated');
            if (allUsers) {
              matchedUsers = allUsers.filter(u => {
                const uDigits = (u.phone || '').replace(/\D/g, '');
                return uDigits && last8 && (uDigits.endsWith(last8) || formatted.endsWith(uDigits));
              });
            }
          }

          if (matchedUsers && matchedUsers.length > 0) {
            for (const u of matchedUsers) {
              if (u.username.toLowerCase() === 'nican') continue;

              await supabase
                .from('users')
                .update({
                  is_deactivated: true,
                  deactivated_reason: 'WhatsApp-Gruppe verlassen'
                })
                .eq('id', u.id);

              await supabase.from('user_notifications').insert([{
                target_username: 'SYSTEM_ADMIN',
                username: 'SYSTEM_ADMIN',
                message: `⛔ <strong>Account automatisch gesperrt:</strong> @${u.username} (${u.phone || plusPhone}) hat die WhatsApp-Gruppe verlassen. Der WebApp-Zugang wurde gesperrt.`,
                action_type: 'member_left_group',
                action_payload: u.username,
                is_read: false,
                type: 'warning'
              }]);

              console.log(`🔒 WebApp-Account von @${u.username} (${u.phone || plusPhone}) wurde automatisch gesperrt (is_deactivated = true).`);
            }
          } else {
            console.log(`ℹ️ Kein registrierter WebApp-Account für Telefonnummer ${plusPhone} (Endung ${last8}) gefunden.`);
          }
        } catch (lockErr) {
          console.error('Error deactivating WebApp user on group leave:', lockErr);
        }
      }
    } else if (action === 'add') {
      for (const userJid of participants) {
        const rawPhone = userJid.split('@')[0].split(':')[0];
        const formatted = formatPhone(rawPhone);
        const plusPhone = `+${formatted}`;

        try {
          await supabase.from('wa_group_members').upsert([
            {
              phone_number: plusPhone,
              phone: formatted,
              role: 'member',
              display_name: `+${formatted}`,
              updated_at: new Date().toISOString()
            }
          ], { onConflict: 'phone_number' });
        } catch (e) {}
      }
    }
  });

  // 2. Messages Upsert Listener: Inactivity Tracking & DM Question Flow
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const fromJid = msg.key.remoteJid;
      const isGroup = fromJid.endsWith('@g.us');
      const senderJid = isGroup ? msg.key.participant : fromJid;
      if (!senderJid) continue;

      const rawSenderPhone = senderJid.split('@')[0].split(':')[0];
      const cleanSenderPhone = formatPhone(rawSenderPhone);

      // Track Activity in Group
      if (isGroup) {
        try {
          const { error } = await supabase.rpc('track_wa_message', {
            p_phone_number: `+${cleanSenderPhone}`,
            p_display_name: msg.pushName || `+${cleanSenderPhone}`,
            p_phone: cleanSenderPhone
          });
          if (error) {
            await supabase.from('wa_group_members').upsert([
              {
                phone_number: `+${cleanSenderPhone}`,
                phone: cleanSenderPhone,
                display_name: msg.pushName || `+${cleanSenderPhone}`,
                last_message_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
            ], { onConflict: 'phone_number' });
          }
        } catch (e) {}
      }

      // Vetting DM Flow for new join candidates
      if (!isGroup && candidateSessions.has(fromJid)) {
        const session = candidateSessions.get(fromJid);
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

        session.answers.push(text);
        session.step += 1;

        if (session.step < botConfig.vetting_questions.length) {
          const nextQ = botConfig.vetting_questions[session.step];
          await sock.sendMessage(fromJid, {
            text: `📝 *Frage ${session.step + 1}/${botConfig.vetting_questions.length}:*\n${nextQ}`
          });
        } else {
          await sock.sendMessage(fromJid, {
            text: '⏳ Vielen Dank! Deine Antworten werden jetzt automatisch von unserer KI ausgewertet...'
          });

          const evalResult = await evaluateCandidateAnswers(session.answers, botConfig.vetting_questions);
          console.log(`🤖 KI-Ergebnis für ${fromJid}: Score ${evalResult.score}%, Verdict: ${evalResult.verdict}`);

          const requestRecord = {
            phone_number: `+${cleanSenderPhone}`,
            user_name: msg.pushName || `+${cleanSenderPhone}`,
            answers: JSON.stringify(session.answers.map((a, i) => ({ question: botConfig.vetting_questions[i], answer: a }))),
            ai_score: evalResult.score,
            ai_verdict: evalResult.verdict,
            ai_reason: evalResult.reason,
            status: evalResult.verdict === 'pass' ? 'approved' : evalResult.verdict === 'fail' ? 'rejected' : 'manual_review',
            requested_at: session.requestedAt,
            reviewed_by: 'KI Auto-Bot',
            reviewed_at: new Date().toISOString()
          };

          try {
            await supabase.from('wa_join_requests').insert([requestRecord]);
          } catch (e) {
            console.error('Failed to save join request in Supabase:', e);
          }

          if (evalResult.verdict === 'pass') {
            try {
              await sock.groupRequestParticipantsUpdate(session.groupJid, [fromJid], 'approve');
              await sock.sendMessage(fromJid, { text: botConfig.welcome_message });
            } catch (e) {
              console.error('Approval failed:', e);
            }
          } else if (evalResult.verdict === 'fail') {
            try {
              await sock.groupRequestParticipantsUpdate(session.groupJid, [fromJid], 'reject');
              await sock.sendMessage(fromJid, { text: botConfig.reject_message });
            } catch (e) {
              console.error('Rejection failed:', e);
            }
          } else {
            await sock.sendMessage(fromJid, {
              text: 'Deine Antworten wurden an das Admin-Team weitergeleitet. Du wirst freigeschaltet, sobald ein Moderator drüber geschaut hat.'
            });
          }

          candidateSessions.delete(fromJid);
        }
      }
    }
  });
}

// Start queue and realtime once
if (!outboxIntervalStarted) {
  outboxIntervalStarted = true;
  setInterval(processOutboxQueue, 3000);

  let outboxDebounceTimer = null;
  supabase
    .channel('bot_outbox_instant_trigger')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'wa_outbox' },
      () => {
        if (outboxDebounceTimer) clearTimeout(outboxDebounceTimer);
        outboxDebounceTimer = setTimeout(() => {
          console.log('⚡ Entprellter Outbox-Trigger via Realtime!');
          processOutboxQueue();
        }, 400);
      }
    )
    .subscribe();
}

/**
 * 6-Month Inactivity Check (Cron Job)
 */
cron.schedule('0 0 1 * *', async () => {
  console.log('⏰ Führe monatliche 6-Monats-Inaktivitätsprüfung durch...');
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setDate(sixMonthsAgo.getDate() - (botConfig.inactivity_threshold_days || 180));

    const { data: inactiveMembers } = await supabase
      .from('wa_group_members')
      .select('*')
      .lt('last_message_at', sixMonthsAgo.toISOString());

    if (inactiveMembers && inactiveMembers.length > 0) {
      console.log(`⚠️ ${inactiveMembers.length} inaktive Mitglieder gefunden (> 6 Monate ohne Nachricht).`);

      const adminPhone = process.env.ADMIN_PHONE;
      if (adminPhone && sock) {
        const report = `📋 *6-Monats-Inaktivitätsbericht (${new Date().toLocaleDateString('de-DE')}):*\n\n` +
          `Es gibt *${inactiveMembers.length}* Mitglieder, die seit über 180 Tagen keine Nachricht gesendet haben:\n` +
          inactiveMembers.slice(0, 15).map(m => `• ${m.display_name} (${m.phone_number}) - Zuletzt: ${new Date(m.last_message_at).toLocaleDateString('de-DE')}`).join('\n') +
          (inactiveMembers.length > 15 ? `\n...und ${inactiveMembers.length - 15} weitere.` : '') +
          `\n\nDu kannst diese im Web-Admin-Panel verwalten.`;

        await sock.sendMessage(`${adminPhone.replace('+', '')}@s.whatsapp.net`, { text: report });
      }
    }
  } catch (err) {
    console.error('Inactivity check failed:', err);
  }
});

// REST API for Web Dashboard
app.get('/status', (req, res) => {
  res.json({
    status: isWhatsAppConnected ? 'online' : 'waiting_for_qr',
    isWhatsAppConnected,
    connectionState,
    hasQr: !!lastQrCode,
    qr: lastQrCode,
    botUser: sock?.user || null,
    config: botConfig,
    activeCandidates: candidateSessions.size,
    uptimeSeconds: Math.floor(process.uptime())
  });
});

// Visual Web Dashboard & QR-Code Scanner Page
app.get(['/', '/qr'], (req, res) => {
  const qrEncoded = lastQrCode ? encodeURIComponent(lastQrCode) : '';
  const qrImgUrl = qrEncoded ? `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${qrEncoded}` : '';

  res.send(`<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pixel WhatsApp Bot Server Status</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 30px; max-width: 480px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); text-align: center; }
    .badge { display: inline-block; padding: 6px 14px; border-radius: 9999px; font-weight: bold; font-size: 13px; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.05em; }
    .badge-online { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); }
    .badge-waiting { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); }
    .badge-offline { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); }
    h1 { font-size: 20px; margin: 0 0 8px 0; color: #fff; }
    p { color: #94a3b8; font-size: 14px; line-height: 1.5; margin: 0 0 20px 0; }
    .qr-container { background: #fff; padding: 16px; border-radius: 12px; display: inline-block; margin-bottom: 20px; }
    .qr-img { width: 240px; height: 240px; display: block; }
    .info-box { background: #0f172a; border: 1px solid #334155; border-radius: 10px; padding: 12px; font-family: monospace; font-size: 12px; text-align: left; margin-bottom: 20px; color: #cbd5e1; }
    .btn { display: inline-block; background: #fbbf24; color: #0f172a; font-weight: bold; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 13px; }
  </style>
</head>
<body>
  <div class="card">
    ${isWhatsAppConnected
      ? `<div class="badge badge-online">🟢 WhatsApp Verbunden</div>
         <h1>Pixel WhatsApp Bot ist Online!</h1>
         <p>Der Bot ist mit WhatsApp gekoppelt und verarbeitet eingehende Anfragen sowie Gruppen-Kicks in Echtzeit.</p>
         <div class="info-box">
           <strong>Bot-User:</strong> ${sock?.user?.name || sock?.user?.id || 'Verbunden'}<br>
           <strong>Server-Port:</strong> ${PORT}<br>
           <strong>Uptime:</strong> ${Math.floor(process.uptime())}s
         </div>`
      : lastQrCode
      ? `<div class="badge badge-waiting">⏳ QR-Code Scan erforderlich</div>
         <h1>WhatsApp Bot koppeln</h1>
         <p>Öffne WhatsApp auf deinem Smartphone → <strong>Einstellungen → Verknüpfte Geräte</strong> und scanne diesen Code:</p>
         <div class="qr-container">
           <img class="qr-img" src="${qrImgUrl}" alt="WhatsApp QR-Code" />
         </div>
         <p style="font-size: 12px; color: #64748b;">Code aktualisiert sich automatisch bei Neuladen.</p>`
      : `<div class="badge badge-offline">🔴 Bot startet...</div>
         <h1>Verbindung wird aufgebaut</h1>
         <p>Der Bot initialisiert gerade die WhatsApp-Baileys-Verbindung. Bitte lade diese Seite in wenigen Sekunden neu.</p>`
    }
    <div>
      <a class="btn" href="javascript:location.reload()">🔄 Status aktualisieren</a>
    </div>
  </div>
</body>
</html>`);
});

app.post('/api/manual-approve', async (req, res) => {
  const { phone, groupJid } = req.body;
  if (!sock) return res.status(500).json({ error: 'Bot not running' });

  try {
    const userJid = `${phone.replace('+', '')}@s.whatsapp.net`;
    await sock.groupRequestParticipantsUpdate(groupJid || process.env.GROUP_JID, [userJid], 'approve');
    await sock.sendMessage(userJid, { text: botConfig.welcome_message });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Direct verification code API endpoint with anti-duplicate protection
app.post('/api/send-verification-code', async (req, res) => {
  const { phone, username, code } = req.body;
  if (!phone || !code) return res.status(400).json({ success: false, error: 'Phone and code required' });

  const formatted = formatPhone(phone);
  if (!formatted) return res.status(400).json({ success: false, error: 'Invalid phone format' });

  const dedupeKey = `${formatted}_verification_code_${code}`;
  const lastSentTime = processedMessageCache.get(dedupeKey);

  // If sent in the last 60s, return success immediately without double sending
  if (lastSentTime && (Date.now() - lastSentTime < 60000)) {
    console.log(`🛡️ [API Dedupe] Code bereits vor ${Math.round((Date.now() - lastSentTime) / 1000)}s an ${formatted} gesendet. Kein doppelter Versand.`);
    return res.json({ success: true, deduplicated: true });
  }

  if (!sock || !isWhatsAppConnected) {
    // Socket not ready, but it is already queued in wa_outbox
    return res.json({ success: true, queued: true, note: 'Bot socket offline, will be sent via outbox once connected' });
  }

  try {
    const userJid = `${formatted}@s.whatsapp.net`;
    await sock.sendMessage(userJid, {
      text: `🏍️ *Pixel Rider Bestätigungscode*\n\nHallo ${username || 'Biker'},\ndein 6-stelliger Code lautet:\n\n👉 *${code}*\n\nGib diesen Code in der WebApp ein, um fortzufahren. (Gültig für 15 Minuten)`
    });
    processedMessageCache.set(dedupeKey, Date.now());
    console.log(`✅ [API] Verification Code an ${userJid} gesendet.`);
    res.json({ success: true });
  } catch (e) {
    console.error('Failed to send verification code via API:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// API to remove a member from WhatsApp group when account is deleted in WebApp
app.post('/api/remove-member', async (req, res) => {
  const { phone, username } = req.body;
  if (!sock) return res.status(503).json({ success: false, botOnline: false, error: 'Bot not running or socket offline' });
  if (!phone && !username) return res.status(400).json({ success: false, error: 'Phone number or username required' });

  try {
    const result = await removeUserFromAllGroups(phone, username);
    res.json(result);
  } catch (e) {
    console.error('Error in /api/remove-member:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// Diagnostic check endpoint
app.post('/api/diagnose', async (req, res) => {
  if (!sock) return res.json({ botOnline: false, error: 'Socket offline' });
  try {
    const groups = await sock.groupFetchAllParticipating();
    const groupSummaries = Object.entries(groups).map(([id, g]) => ({
      id,
      name: g.subject,
      participantsCount: g.participants?.length || 0
    }));
    res.json({
      botOnline: true,
      botUser: sock.user,
      groupsCount: groupSummaries.length,
      groups: groupSummaries
    });
  } catch (e) {
    res.json({ botOnline: true, error: e.message });
  }
});

// Start Bot & Express Server
const server = app.listen(PORT, () => {
  console.log(`🌐 Bot Webhook & API Server läuft auf Port ${PORT}`);
  startWhatsAppBot();
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.warn(`⚠️ Port ${PORT} ist bereits belegt (z. B. durch alten Prozess oder Docker).`);
    console.warn(`🚀 WhatsApp Bot wird trotzdem gestartet...`);
    startWhatsAppBot();
  } else {
    console.error('Server Listen Fehler:', e);
  }
});
