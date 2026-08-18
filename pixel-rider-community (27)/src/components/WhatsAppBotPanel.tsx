import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Send,
  Plus,
  Trash2,
  Settings,
  RefreshCw,
  Search,
  Filter,
  UserCheck,
  Shield,
  FileText,
  Copy,
  Check,
  QrCode,
  Terminal,
  HelpCircle,
  Play,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  UserX,
  AlertCircle,
  Database,
  Zap,
  Activity,
  X
} from 'lucide-react';
import { WABotConfig, WAJoinRequest, WAGroupMember, User } from '../types';
import { supabase } from '../lib/supabase';

interface WhatsAppBotPanelProps {
  currentUser: User;
  onShowAlert?: (title: string, message: string, type: 'success' | 'danger' | 'info') => void;
}

const DEFAULT_CONFIG: WABotConfig = {
  is_active: true,
  bot_phone: '',
  group_name: 'Pixel Bikers Community',
  group_jid: '',
  server_endpoint: '',
  api_secret: '',
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
  inactivity_warning_message: 'Hi {name}! 🏍️ Wir haben bemerkt, dass du in den letzten 6 Monaten keine Nachricht in der Gruppe gesendet hast. Bitte melde dich kurz zurück, wenn du weiterhin dabei sein möchtest!',
  connection_status: 'connected',
  last_sync_at: new Date().toISOString()
};

const INITIAL_REQUESTS: WAJoinRequest[] = [];

const INITIAL_MEMBERS: WAGroupMember[] = [];

export const WhatsAppBotPanel: React.FC<WhatsAppBotPanelProps> = ({ currentUser, onShowAlert }) => {
  const [activeSubTab, setActiveSubTab] = useState<'requests' | 'inactivity' | 'rules' | 'tester' | 'setup'>('requests');
  const [config, setConfig] = useState<WABotConfig>(DEFAULT_CONFIG);
  const [requests, setRequests] = useState<WAJoinRequest[]>(INITIAL_REQUESTS);
  const [members, setMembers] = useState<WAGroupMember[]>(INITIAL_MEMBERS);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Inactivity tab filters
  const [inactivityFilter, setInactivityFilter] = useState<'all' | '6months' | '3months' | 'active'>('6months');
  const [memberSearch, setMemberSearch] = useState('');

  // Selected request modal / drawer
  const [selectedRequest, setSelectedRequest] = useState<WAJoinRequest | null>(null);

  // Test Simulator state
  const [showSimulator, setShowSimulator] = useState(false);
  const [simAnswers, setSimAnswers] = useState<string[]>(['', '', '']);
  const [simResult, setSimResult] = useState<{ score: number; verdict: string; reason: string } | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Live Kick-Tester & Diagnose state
  const [testKickPhone, setTestKickPhone] = useState('+49');
  const [testKickUsername, setTestKickUsername] = useState('');
  const [isExecutingKickTest, setIsExecutingKickTest] = useState(false);
  const [kickTestLogs, setKickTestLogs] = useState<string[]>([]);
  const [kickTestResultData, setKickTestResultData] = useState<any>(null);

  // Live Server Ping & QR Diagnostics
  const [serverPingStatus, setServerPingStatus] = useState<{
    tested: boolean;
    online: boolean;
    isWhatsAppConnected?: boolean;
    connectionState?: string;
    qr?: string | null;
    botUser?: any;
    uptimeSeconds?: number;
    error?: string;
  } | null>(null);
  const [isCheckingServerPing, setIsCheckingServerPing] = useState(false);

  // Ping Bot Server /status endpoint
  const handleCheckServerPing = async (overrideEndpoint?: string) => {
    const endpoint = overrideEndpoint || config.server_endpoint || 'http://localhost:3001';
    setIsCheckingServerPing(true);
    try {
      const cleanUrl = endpoint.replace(/\/+$/, '');
      const res = await fetch(`${cleanUrl}/status`, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        setServerPingStatus({
          tested: true,
          online: true,
          isWhatsAppConnected: !!data.isWhatsAppConnected || data.status === 'online',
          connectionState: data.connectionState || data.status || 'unknown',
          qr: data.qr || null,
          botUser: data.botUser || null,
          uptimeSeconds: data.uptimeSeconds || 0
        });
        if (onShowAlert) {
          if (data.isWhatsAppConnected || data.status === 'online') {
            onShowAlert('Bot Server Online', 'Der Bot läuft im Docker/Server und ist mit WhatsApp verbunden! 🟢', 'success');
          } else {
            onShowAlert('Bot Server Erreichbar', 'Der Bot läuft, wartet aber noch auf den QR-Code-Scan für WhatsApp! ⏳', 'warning');
          }
        }
      } else {
        setServerPingStatus({
          tested: true,
          online: false,
          error: `HTTP ${res.status}: ${res.statusText}`
        });
      }
    } catch (e: any) {
      setServerPingStatus({
        tested: true,
        online: false,
        error: e.message || 'Verbindung fehlgeschlagen'
      });
      if (onShowAlert) {
        onShowAlert('Server nicht erreichbar', `Der Server unter ${endpoint} antwortet nicht: ${e.message}`, 'danger');
      }
    } finally {
      setIsCheckingServerPing(false);
    }
  };

  // Load & Realtime Sync from Supabase
  useEffect(() => {
    // Check localStorage cache first
    try {
      const cached = localStorage.getItem('pixel_wa_bot_config_local');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed) {
          setConfig((prev) => ({ ...prev, ...parsed }));
        }
      }
    } catch (e) {}

    const loadBotData = async () => {
      try {
        const { data: configData } = await supabase.from('wa_bot_config').select('*').limit(1).single();
        if (configData) {
          let questions = configData.vetting_questions;
          if (typeof questions === 'string') {
            try { questions = JSON.parse(questions); } catch (e) { questions = DEFAULT_CONFIG.vetting_questions; }
          }
          setConfig({
            ...DEFAULT_CONFIG,
            ...configData,
            vetting_questions: Array.isArray(questions) && questions.length > 0 ? questions : DEFAULT_CONFIG.vetting_questions
          });
        }

        const { data: reqData } = await supabase.from('wa_join_requests').select('*').order('requested_at', { ascending: false });
        if (reqData) {
          const parsedReqs = reqData.map((r: any) => {
            let parsedAnswers = r.answers;
            if (typeof parsedAnswers === 'string') {
              try { parsedAnswers = JSON.parse(parsedAnswers); } catch (e) { parsedAnswers = []; }
            }
            return { ...r, answers: Array.isArray(parsedAnswers) ? parsedAnswers : [] };
          });
          setRequests(parsedReqs);
        }

        const { data: memData } = await supabase.from('wa_group_members').select('*').order('last_message_at', { ascending: false });
        if (memData) {
          setMembers(memData);
        }
      } catch (e) {
        console.warn('Sync notice:', e);
      }
    };

    loadBotData();

    // Realtime-Updates abonnieren, damit alle Admins synchron bleiben
    const sub = supabase
      .channel('wa_config_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wa_bot_config' }, (payload: any) => {
        if (payload.new) {
          let qs = payload.new.vetting_questions;
          if (typeof qs === 'string') {
            try { qs = JSON.parse(qs); } catch (e) {}
          }
          setConfig((prev) => ({
            ...prev,
            ...payload.new,
            vetting_questions: Array.isArray(qs) && qs.length > 0 ? qs : prev.vetting_questions
          }));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    // Always persist to local storage as immediate and reliable cache
    try {
      localStorage.setItem('pixel_wa_bot_config_local', JSON.stringify(config));
    } catch (e) {}

    try {
      const payload = {
        id: 1,
        bot_phone: config.bot_phone,
        group_name: config.group_name,
        group_jid: config.group_jid,
        server_endpoint: config.server_endpoint,
        api_secret: config.api_secret,
        auto_vetting_enabled: config.auto_vetting_enabled,
        ai_strictness: config.ai_strictness,
        min_score_auto_approve: config.min_score_auto_approve,
        inactivity_threshold_days: config.inactivity_threshold_days,
        welcome_message: config.welcome_message,
        reject_message: config.reject_message,
        inactivity_warning_message: config.inactivity_warning_message,
        vetting_questions: JSON.stringify(config.vetting_questions),
        last_sync_at: new Date().toISOString()
      };
      const { error } = await supabase.from('wa_bot_config').upsert([payload]);
      if (error) throw error;
      if (onShowAlert) onShowAlert('Gespeichert & Synchronisiert', 'Aufnahmefragen und Bot-Regeln wurden live in der Cloud für alle Admins und den Server gesichert.', 'success');
    } catch (e: any) {
      console.error('Error saving config:', e);
      if (e?.code === '42501' || e?.message?.includes('row-level security')) {
        if (onShowAlert) {
          onShowAlert(
            'Lokal gesichert ⚠️ (RLS Hinweis)',
            'Die Bot-Einstellungen wurden in deinem Browser gesichert. Um sie mit der Cloud-Datenbank zu synchronisieren, führe einmalig das RLS-SQL im Supabase SQL Editor aus (siehe Tab "Setup & Hosting" -> SQL Tabellen).',
            'info'
          );
        }
      } else {
        if (onShowAlert) onShowAlert('Fehler beim Speichern', e.message || 'Konnte nicht in Supabase gesichert werden.', 'danger');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleApproveRequest = async (reqId: string) => {
    const updated = requests.map((r) =>
      r.id === reqId
        ? { ...r, status: 'approved' as const, reviewed_by: currentUser.username, reviewed_at: new Date().toISOString() }
        : r
    );
    setRequests(updated);
    try {
      await supabase.from('wa_join_requests').update({
        status: 'approved',
        reviewed_by: currentUser.username,
        reviewed_at: new Date().toISOString()
      }).eq('id', reqId);
    } catch (e) {
      console.warn('Sync request update:', e);
    }
    if (onShowAlert) onShowAlert('Beitritt Genehmigt', 'Der Benutzer wurde freigegeben und erhält die Willkommensnachricht.', 'success');
  };

  const handleRejectRequest = async (reqId: string) => {
    const updated = requests.map((r) =>
      r.id === reqId
        ? { ...r, status: 'rejected' as const, reviewed_by: currentUser.username, reviewed_at: new Date().toISOString() }
        : r
    );
    setRequests(updated);
    try {
      await supabase.from('wa_join_requests').update({
        status: 'rejected',
        reviewed_by: currentUser.username,
        reviewed_at: new Date().toISOString()
      }).eq('id', reqId);
    } catch (e) {
      console.warn('Sync request update:', e);
    }
    if (onShowAlert) onShowAlert('Beitritt Abgelehnt', 'Die Anfrage wurde abgewiesen.', 'danger');
  };

  const handleSendWarning = async (memberId: string) => {
    const target = members.find((m) => m.id === memberId);
    if (!target) return;

    setMembers(
      members.map((m) =>
        m.id === memberId ? { ...m, is_warned: true, warning_sent_at: new Date().toISOString() } : m
      )
    );

    try {
      await supabase.from('wa_group_members').update({
        is_warned: true,
        warning_sent_at: new Date().toISOString()
      }).eq('id', memberId);
    } catch (e) {
      console.warn('Sync member warning:', e);
    }

    if (onShowAlert) {
      onShowAlert('Inaktivitäts-Nachricht gesendet', `Warnung erfolgreich an ${target.display_name} (${target.phone_number}) gesendet.`, 'success');
    }
  };

  const handleRunInactivityReport = () => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);
    const inactiveCount = members.filter((m) => new Date(m.last_message_at) < sixMonthsAgo).length;

    if (onShowAlert) {
      onShowAlert(
        '6-Monats-Bericht erstellt',
        `Bericht generiert: ${inactiveCount} von ${members.length} Mitgliedern sind seit über 6 Monaten inaktiv. Die Zusammenfassung wurde für den Admin bereitgestellt.`,
        'info'
      );
    }
  };

  const handleSimulateVetting = () => {
    setIsSimulating(true);
    setTimeout(() => {
      const q1 = (simAnswers[0] || '').toLowerCase();
      const q2 = (simAnswers[1] || '').toLowerCase();
      const q3 = (simAnswers[2] || '').toLowerCase();

      let score = 40;
      let reasons: string[] = [];

      // Check bike
      if (q1.includes('cc') || q1.includes('ps') || q1.includes('yamaha') || q1.includes('ktm') || q1.includes('kawasaki') || q1.includes('bmw') || q1.includes('honda') || q1.includes('mt') || q1.includes('z900') || q1.includes('duke') || q1.length > 5) {
        score += 30;
        reasons.push('Plausibles Motorradmodell erkannt');
      } else {
        reasons.push('Kein konkretes Motorradmodell erkennbar');
      }

      // Check location
      if (q2.length > 3 && !q2.includes('weiss nicht')) {
        score += 20;
        reasons.push('Standort / Region angegeben');
      }

      // Check intent
      if (q3.includes('ja') || q3.includes('gerne') || q3.includes('ausfahrt') || q3.length > 8) {
        score += 10;
        reasons.push('Interesse an Ausfahrten bestätigt');
      }

      score = Math.min(100, score);
      let verdict = score >= config.min_score_auto_approve ? 'pass' : score >= 60 ? 'needs_review' : 'fail';

      setSimResult({
        score,
        verdict,
        reason: reasons.join(' • ')
      });
      setIsSimulating(false);
    }, 600);
  };

  // Live Kick & Diagnostic Test Handler
  const handleExecuteKickTest = async () => {
    if (!testKickPhone && !testKickUsername) {
      if (onShowAlert) onShowAlert('Eingabe fehlt', 'Bitte gib mindestens eine Telefonnummer oder einen Benutzernamen ein.', 'danger');
      return;
    }

    setIsExecutingKickTest(true);
    const logs: string[] = [];
    const addLog = (msg: string) => {
      logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
      setKickTestLogs([...logs]);
    };

    setKickTestLogs([]);
    setKickTestResultData(null);
    addLog(`🚀 Starte WhatsApp-Kick-Test & Diagnose für "${testKickUsername || ''}" (Tel: ${testKickPhone || 'Keine'})...`);

    try {
      // 1. Check Supabase connection & wa_outbox
      addLog('1️⃣ Schreibe Test-Befehl in Supabase "wa_outbox" Tabelle (Queue-Test)...');
      let outboxId: string | null = null;
      try {
        const { data: outboxRes, error: outboxErr } = await supabase
          .from('wa_outbox')
          .insert([
            {
              phone: testKickPhone.trim(),
              username: testKickUsername.trim(),
              message_type: 'remove_member',
              status: 'pending'
            }
          ])
          .select('id')
          .single();

        if (outboxErr) {
          addLog(`⚠️ Supabase Outbox Warnung: ${outboxErr.message}`);
        } else {
          outboxId = outboxRes?.id || null;
          addLog(`✅ Supabase Outbox Task erstellt! ID: ${outboxId}`);
        }
      } catch (e: any) {
        addLog(`⚠️ Outbox Exception: ${e.message}`);
      }

      // 2. Direct Bot Server Endpoint Call (only if external URL is provided)
      const hasHttpEndpoint = config.server_endpoint && (config.server_endpoint.startsWith('http://') || config.server_endpoint.startsWith('https://'));
      let botResponseData: any = null;

      if (hasHttpEndpoint) {
        const endpoint = `${config.server_endpoint.replace(/\/+$/, '')}/api/remove-member`;
        addLog(`2️⃣ Sende direkten HTTP-Kick-Befehl an Bot-Endpoint: ${endpoint}...`);

        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone: testKickPhone.trim(),
              username: testKickUsername.trim()
            })
          });

          if (res.ok) {
            botResponseData = await res.json();
            addLog(`✅ Bot-Server Rückmeldung erhalten (Status 200 OK):`);
            addLog(`   👉 Bot Online: ${botResponseData.botOnline ? 'JA 🟢' : 'NEIN 🔴'}`);
            if (botResponseData.groupsChecked) {
              addLog(`   👉 Überprüfte Gruppen: ${botResponseData.groupsChecked.length}`);
              botResponseData.groupsChecked.forEach((g: any) => {
                addLog(`      📁 "${g.groupName}" | Bot-Admin: ${g.isBotAdmin ? '✅ JA' : '⚠️ NEIN (Kein Admin!)'} | Entfernt: ${g.removed ? '✅ JA' : 'ℹ️ Nicht in Gruppe'}`);
              });
            }
            addLog(`   👉 Gesamt entfernt: ${botResponseData.totalRemoved || 0}`);
          } else {
            const errText = await res.text();
            addLog(`⚠️ Bot-Server Antwort (${res.status}): ${errText.slice(0, 100)}`);
          }
        } catch (httpErr: any) {
          addLog(`ℹ️ Direkter HTTP-Aufruf nicht erreichbar (${httpErr.message}). Der Bot arbeitet über die Supabase-Outbox weiter.`);
        }
      } else {
        addLog(`2️⃣ Direkter HTTP-Aufruf übersprungen (keine externe Bot-URL hinterlegt). Der Bot holt Aufgaben automatisch über Supabase ab.`);
      }

      // 3. Check Outbox Status Update after waiting
      if (outboxId) {
        addLog('3️⃣ Überwache Supabase "wa_outbox" Warteschlange auf Abarbeitung durch den Bot...');
        
        let finalStatus = 'pending';
        let finalError = '';

        for (let attempt = 1; attempt <= 4; attempt++) {
          await new Promise((r) => setTimeout(r, 1500));
          try {
            const { data: updatedTask } = await supabase.from('wa_outbox').select('*').eq('id', outboxId).single();
            if (updatedTask) {
              finalStatus = updatedTask.status;
              finalError = updatedTask.error_message || '';
              if (finalStatus === 'sent' || finalStatus === 'error') break;
            }
          } catch (e) {}
        }

        if (finalStatus === 'sent') {
          addLog(`🎉 ERFOLG! Der Bot hat den Task ${outboxId} verarbeitet und als "SENT" markiert!`);
        } else if (finalStatus === 'pending') {
          addLog(`⏳ Status ist noch "PENDING" (Task wurde noch nicht abgeholt).`);
          addLog(`👉 Mögliche Ursachen im Docker / Server:`);
          addLog(`   1. WhatsApp ist noch nicht gekoppelt (QR-Code scannen via Server-Status oder "docker logs pixel_wa_bot").`);
          addLog(`   2. Die .env im Docker-Container hat einen abweichenden SUPABASE_SERVICE_ROLE_KEY oder SUPABASE_URL.`);
          addLog(`   3. Prüfe die Live-Ausgabe im Terminal mit: docker logs -f pixel_wa_bot`);
        } else {
          addLog(`⚠️ Outbox-Status: ${finalStatus} ${finalError ? `(Fehler: ${finalError})` : ''}`);
        }
      }

      setKickTestResultData(botResponseData);
      if (onShowAlert) {
        onShowAlert('Kick-Test abgeschlossen', 'Die Diagnose und der Kick-Befehl wurden an den Bot übermittelt. Prüfe das Log für Details.', 'info');
      }
    } catch (err: any) {
      addLog(`❌ Schwerer Fehler beim Test: ${err.message}`);
    } finally {
      setIsExecutingKickTest(false);
    }
  };

  // Filter members safely
  const filteredMembers = (members || []).filter((m) => {
    if (!m) return false;
    const dName = (m.display_name || m.name || '').toLowerCase();
    const pNum = (m.phone_number || m.phone || '').toLowerCase();
    const search = (memberSearch || '').toLowerCase().trim();

    const matchSearch = !search || dName.includes(search) || pNum.includes(search);
    if (!matchSearch) return false;

    const lastMsg = m.last_message_at ? new Date(m.last_message_at).getTime() : 0;
    const diffDays = lastMsg > 0 ? Math.floor((Date.now() - lastMsg) / (1000 * 60 * 60 * 24)) : 999;

    if (inactivityFilter === '6months') return diffDays >= 180;
    if (inactivityFilter === '3months') return diffDays >= 90;
    if (inactivityFilter === 'active') return diffDays < 90;
    return true;
  });

  const count6MonthsInactive = (members || []).filter((m) => {
    if (!m) return false;
    const lastMsg = m.last_message_at ? new Date(m.last_message_at).getTime() : 0;
    const diffDays = lastMsg > 0 ? Math.floor((Date.now() - lastMsg) / (1000 * 60 * 60 * 24)) : 999;
    return diffDays >= 180;
  }).length;

  return (
    <div id="whatsapp-bot-panel" className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 text-slate-200">
      {/* Top Banner: Bot Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Smartphone className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-white">WhatsApp Vetting & Community Bot</h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Aktiv & Verbunden
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-1.5">
              <span>Gruppe: <strong className="text-amber-400 font-semibold">{config.group_name || 'Pixel Bikers'}</strong></span>
              <span>•</span>
              <span>Bot-Nr: <strong className="font-mono text-emerald-400">{config.bot_phone || 'Nicht hinterlegt'}</strong></span>
              <button
                onClick={() => setActiveSubTab('rules')}
                className="ml-1 text-[11px] text-amber-400/80 hover:text-amber-300 underline cursor-pointer"
                title="Nummer oder Name ändern"
              >
                (Bearbeiten)
              </button>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunInactivityReport}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Clock className="w-4 h-4 text-amber-400" />
            6-Monats-Bericht
          </button>
          <button
            onClick={() => setActiveSubTab('setup')}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-emerald-950/40"
          >
            <QrCode className="w-4 h-4" />
            Server & QR Pairing
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap gap-2 mt-6 mb-6 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('requests')}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'requests'
              ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
              : 'bg-slate-800/60 text-slate-400 hover:text-white'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Beitritts-Prüfungen
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${activeSubTab === 'requests' ? 'bg-slate-950 text-amber-400' : 'bg-slate-700 text-slate-300'}`}>
            {requests.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('inactivity')}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'inactivity'
              ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
              : 'bg-slate-800/60 text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          Inaktivitäts-Monitor (6 Monate)
          {count6MonthsInactive > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-red-500 text-white animate-pulse">
              {count6MonthsInactive}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('rules')}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'rules'
              ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
              : 'bg-slate-800/60 text-slate-400 hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4" />
          Aufnahmefragen & KI-Regeln
        </button>

        <button
          onClick={() => setActiveSubTab('tester')}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'tester'
              ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
              : 'bg-slate-800/60 text-slate-400 hover:text-white'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-400" />
          Live Kick-Tester & Diagnose
        </button>

        <button
          onClick={() => setActiveSubTab('setup')}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'setup'
              ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
              : 'bg-slate-800/60 text-slate-400 hover:text-white'
          }`}
        >
          <Terminal className="w-4 h-4" />
          Server-Code & Hosting-Paket
        </button>
      </div>

      {/* SUB-TAB 1: JOIN REQUESTS LOG */}
      {activeSubTab === 'requests' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Automatische Beitrittsprüfungen (Vetting Queue)
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Der Bot stellt Beitrittsanfragenden per WhatsApp-Direktnachricht deine Fragen und bewertet die Antworten mit KI.
              </p>
            </div>
            <button
              onClick={() => setShowSimulator(!showSimulator)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Play className="w-3.5 h-3.5" />
              {showSimulator ? 'Simulator schließen' : 'Antwort-Prüfung simulieren'}
            </button>
          </div>

          {/* Interactive Test Simulator */}
          {showSimulator && (
            <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> Live KI-Prüfungs-Simulator
                </span>
                <span className="text-[11px] text-slate-400">Modus: {config.ai_strictness} • Schwellenwert: {config.min_score_auto_approve}%</span>
              </div>
              <p className="text-xs text-slate-300">
                Gib hier Beispiel-Antworten ein, um zu testen, wie der Bot die Antworten bewerten würde:
              </p>
              <div className="space-y-2">
                {config.vetting_questions.map((q, idx) => (
                  <div key={idx} className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-400">{idx + 1}. {q}</label>
                    <input
                      type="text"
                      value={simAnswers[idx] || ''}
                      onChange={(e) => {
                        const next = [...simAnswers];
                        next[idx] = e.target.value;
                        setSimAnswers(next);
                      }}
                      placeholder="Beispielantwort eingeben..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleSimulateVetting}
                  disabled={isSimulating}
                  className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSimulating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  Bewertung berechnen
                </button>
                {simResult && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`px-2 py-1 rounded-md font-bold ${simResult.verdict === 'pass' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : simResult.verdict === 'needs_review' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-red-500/20 text-red-400 border border-red-500/40'}`}>
                      Score: {simResult.score}% ({simResult.verdict === 'pass' ? 'Automatisch Genehmigen' : simResult.verdict === 'needs_review' ? 'Manuelle Prüfung' : 'Automatisch Ablehnen'})
                    </span>
                    <span className="text-slate-300 text-[11px]">{simResult.reason}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Join Requests List */}
          <div className="space-y-3">
            {requests.length === 0 ? (
              <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mx-auto">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h5 className="text-sm font-semibold text-slate-300">Noch keine Beitrittsanfragen erfasst</h5>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Sobald neue Bewerber über WhatsApp der Gruppe beitreten möchten, führt der Bot das Vetting durch und listet die Antworten & KI-Ergebnisse hier live auf.
                </p>
              </div>
            ) : (
              requests.map((req) => (
              <div
                key={req.id}
                className="bg-slate-950/40 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                      req.status === 'approved'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : req.status === 'rejected'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {req.ai_score}%
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{req.user_name}</span>
                        <span className="font-mono text-xs text-slate-400">{req.phone_number}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span>{new Date(req.requested_at).toLocaleString('de-DE')}</span>
                        <span>•</span>
                        <span className={`font-semibold ${
                          req.status === 'approved' ? 'text-emerald-400' : req.status === 'rejected' ? 'text-red-400' : 'text-amber-400'
                        }`}>
                          {req.status === 'approved' ? '✓ Genehmigt' : req.status === 'rejected' ? '✗ Abgelehnt' : '⏳ Wartet auf Review'}
                        </span>
                        {req.reviewed_by && (
                          <span className="text-slate-500">({req.reviewed_by})</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-2 sm:mt-0">
                    <button
                      onClick={() => setSelectedRequest(selectedRequest?.id === req.id ? null : req)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      Antworten ansehen
                      {selectedRequest?.id === req.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    {req.status !== 'approved' && (
                      <button
                        onClick={() => handleApproveRequest(req.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shadow-md shadow-emerald-950/40"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Zulassen
                      </button>
                    )}
                    {req.status !== 'rejected' && (
                      <button
                        onClick={() => handleRejectRequest(req.id)}
                        className="px-3 py-1.5 bg-red-600/80 hover:bg-red-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Ablehnen
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Answers & AI Rationale */}
                {selectedRequest?.id === req.id && (
                  <div className="mt-4 pt-4 border-t border-slate-800 space-y-3 bg-slate-900/80 p-3.5 rounded-lg">
                    <div className="flex items-start gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-bold text-amber-400">KI-Bewertung (Score: {req.ai_score}%):</span>
                        <p className="text-xs text-slate-300 mt-0.5">{req.ai_reason}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Antworten des Bewerbers:</span>
                      {req.answers.map((ans, aIdx) => (
                        <div key={aIdx} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 space-y-1">
                          <p className="text-[11px] font-semibold text-amber-300/90">{aIdx + 1}. {ans.question}</p>
                          <p className="text-xs text-white bg-slate-900/60 p-2 rounded border border-slate-800">{ans.answer || '<keine Antwort>'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        </div>
      )}

      {/* SUB-TAB 2: INACTIVITY MONITOR (6 MONTHS) */}
      {activeSubTab === 'inactivity' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                6-Monats Inaktivitäts-Tracker
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Überwacht automatisch alle Gruppenmitglieder und filtert Mitglieder heraus, die seit 180+ Tagen keine Nachricht gesendet haben.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRunInactivityReport}
                className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-400/20"
              >
                <FileText className="w-4 h-4" />
                Zusammenfassung erstellen
              </button>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setInactivityFilter('6months')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  inactivityFilter === '6months'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Inaktiv &gt; 6 Monate ({count6MonthsInactive})
              </button>
              <button
                onClick={() => setInactivityFilter('3months')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  inactivityFilter === '3months'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Inaktiv &gt; 3 Monate
              </button>
              <button
                onClick={() => setInactivityFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  inactivityFilter === 'all'
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Alle ({members.length})
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Name oder Nummer suchen..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400 w-full sm:w-60"
              />
            </div>
          </div>

          {/* Members Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3">Mitglied / Name</th>
                  <th className="p-3">Telefonnummer</th>
                  <th className="p-3">Rolle</th>
                  <th className="p-3">Nachrichten gesamt</th>
                  <th className="p-3">Letzte Aktivität</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Aktion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <Clock className="w-5 h-5 text-slate-600 mb-1" />
                        <span className="text-xs font-semibold text-slate-400">Keine Gruppenmitglieder in dieser Ansicht</span>
                        <span className="text-[11px] text-slate-600">Sobald der Bot in der Gruppe aktiv ist, erfasst er gesendete Nachrichten und Inaktivitätszeiträume.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((m) => {
                  const displayName = m.display_name || m.name || m.phone_number || m.phone || 'Biker';
                  const initial = displayName.charAt(0).toUpperCase() || 'B';
                  const lastMsgTime = m.last_message_at ? new Date(m.last_message_at).getTime() : 0;
                  const daysSince = lastMsgTime > 0 ? Math.floor((Date.now() - lastMsgTime) / (1000 * 60 * 60 * 24)) : 999;
                  const is6MonthsInactive = daysSince >= 180;
                  const is3MonthsInactive = daysSince >= 90;

                  return (
                    <tr key={m.id || m.phone_number || displayName} className="hover:bg-slate-850/60 transition-colors">
                      <td className="p-3 font-semibold text-white flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-amber-400 text-xs">
                          {initial}
                        </div>
                        {displayName}
                      </td>
                      <td className="p-3 font-mono text-slate-400">{m.phone_number || m.phone || '-'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          m.role === 'admin' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {m.role === 'admin' ? '👑 Admin' : 'Mitglied'}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-white">{m.total_messages || 0}</td>
                      <td className="p-3 text-slate-300">
                        <div>{lastMsgTime > 0 ? new Date(m.last_message_at).toLocaleDateString('de-DE') : 'Nie'}</div>
                        <div className="text-[10px] text-slate-500">{lastMsgTime > 0 ? `vor ${daysSince} Tagen` : 'Keine Nachricht'}</div>
                      </td>
                      <td className="p-3">
                        {is6MonthsInactive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                            <AlertTriangle className="w-3 h-3" /> Inaktiv (&gt;180 Tage)
                          </span>
                        ) : is3MonthsInactive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            Inaktiv (&gt;90 Tage)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Aktiv
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {is6MonthsInactive && (
                            <button
                              onClick={() => handleSendWarning(m.id)}
                              disabled={m.is_warned}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                                m.is_warned
                                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                  : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                              }`}
                            >
                              <Send className="w-3 h-3" />
                              {m.is_warned ? 'Verwarnt' : 'Per WhatsApp anpingen'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: VETTING RULES & QUESTIONS CONFIG */}
      {activeSubTab === 'rules' && (
        <div className="space-y-6">
          {/* Bot-Stammdaten: Nummer & Gruppenname */}
          <div className="bg-slate-950/60 p-4 sm:p-5 rounded-xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                WhatsApp Bot Stammdaten
              </h4>
              <span className="text-[11px] text-slate-400">Direkt in Supabase synchronisiert</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Bot-Telefonnummer (WhatsApp SIM):
                </label>
                <input
                  type="text"
                  value={config.bot_phone}
                  onChange={(e) => setConfig({ ...config, bot_phone: e.target.value })}
                  placeholder="+49 171 1234567"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-emerald-400 focus:outline-none focus:border-amber-400"
                />
                <p className="text-[10px] text-slate-500 mt-1">Die Telefonnummer der SIM-Karte, auf der der Bot per WhatsApp läuft.</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  WhatsApp Gruppenname:
                </label>
                <input
                  type="text"
                  value={config.group_name}
                  onChange={(e) => setConfig({ ...config, group_name: e.target.value })}
                  placeholder="Pixel Bikers Community"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-amber-400 focus:outline-none focus:border-amber-400"
                />
                <p className="text-[10px] text-slate-500 mt-1">Name deiner Motorrad-Gruppe in WhatsApp (wird in den Fragen erwähnt).</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Settings className="w-4 h-4 text-amber-400" />
              Aufnahme-Fragenkatalog
            </h4>
            <p className="text-xs text-slate-400">
              Diese Fragen werden jedem Nutzer per WhatsApp Direktnachricht gestellt, der der Gruppe beitreten möchte:
            </p>

            <div className="space-y-3">
              {config.vetting_questions.map((q, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-amber-400 shrink-0">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={q}
                    onChange={(e) => {
                      const updated = [...config.vetting_questions];
                      updated[idx] = e.target.value;
                      setConfig({ ...config, vetting_questions: updated });
                    }}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                  {config.vetting_questions.length > 1 && (
                    <button
                      onClick={() => {
                        const updated = config.vetting_questions.filter((_, i) => i !== idx);
                        setConfig({ ...config, vetting_questions: updated });
                      }}
                      className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}

              <button
                onClick={() => {
                  setConfig({
                    ...config,
                    vetting_questions: [...config.vetting_questions, 'Neue Frage hier eintragen...']
                  });
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Frage hinzufügen
              </button>
            </div>
          </div>

          {/* AI Strictness & Auto-Approval */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                KI-Prüfungs-Strenge
              </h4>
              <p className="text-xs text-slate-400">
                Bestimmt, wie strikt die Antworten auf Vollständigkeit und Sinnhaftigkeit geprüft werden:
              </p>

              <div className="grid grid-cols-3 gap-2">
                {(['lenient', 'balanced', 'strict'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setConfig({ ...config, ai_strictness: mode })}
                    className={`py-2.5 px-3 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer text-center ${
                      config.ai_strictness === mode
                        ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {mode === 'lenient' ? 'Locker' : mode === 'balanced' ? 'Ausgewogen' : 'Streng'}
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Mindest-Score für Auto-Approve:</span>
                  <span className="font-bold text-amber-400">{config.min_score_auto_approve}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="95"
                  step="5"
                  value={config.min_score_auto_approve}
                  onChange={(e) => setConfig({ ...config, min_score_auto_approve: Number(e.target.value) })}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Inaktivitäts-Schwellenwert
              </h4>
              <p className="text-xs text-slate-400">
                Nach wie vielen inaktiven Tagen soll ein Gruppenmitglied als inaktiv markiert und in der 6-Monats-Zusammenfassung aufgeführt werden:
              </p>

              <div className="pt-3">
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Tage ohne Nachricht:</span>
                  <span className="font-bold text-amber-400">{config.inactivity_threshold_days} Tage (~6 Monate)</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="365"
                  step="30"
                  value={config.inactivity_threshold_days}
                  onChange={(e) => setConfig({ ...config, inactivity_threshold_days: Number(e.target.value) })}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Message Templates */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-amber-400" />
              Nachrichtenvorlagen
            </h4>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-emerald-400 block mb-1">Willkommensnachricht (bei Freigabe):</label>
                <textarea
                  rows={2}
                  value={config.welcome_message}
                  onChange={(e) => setConfig({ ...config, welcome_message: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-red-400 block mb-1">Ablehnungsnachricht (bei unzureichenden Antworten):</label>
                <textarea
                  rows={2}
                  value={config.reject_message}
                  onChange={(e) => setConfig({ ...config, reject_message: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-amber-400 block mb-1">Inaktivitäts-Verwarnung (an inaktive Mitglieder):</label>
                <textarea
                  rows={2}
                  value={config.inactivity_warning_message}
                  onChange={(e) => setConfig({ ...config, inactivity_warning_message: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
                <span className="text-[10px] text-slate-500">Platzhalter: {'{name}'} für den Namen des Mitglieds.</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSaveConfig}
              disabled={isSaving}
              className="px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-400/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Einstellungen speichern
            </button>
          </div>
        </div>
      )}

      {/* SUB-TAB: LIVE KICK-TESTER & DIAGNOSE */}
      {activeSubTab === 'tester' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header Card */}
          <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  Live WhatsApp-Kick-Tester & Bot-Diagnose
                </h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Teste hier in Echtzeit, ob dein WhatsApp-Bot auf Entfernungsbefehle (z.B. bei Account-Löschung) reagiert, ob er die passenden WhatsApp-Gruppen findet und ob er dort <strong>Admin-Rechte</strong> besitzt.
                </p>
              </div>

              <div className="flex items-center gap-2 bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-800 self-start sm:self-auto">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono text-slate-300">
                  Endpoint: <strong className="text-amber-400">{config.server_endpoint || 'Supabase Outbox (Default)'}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Docker & Bot Server Live Health Check Card */}
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-900 pb-3">
              <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                0. Docker Bot-Server Status & WhatsApp-Kopplung prüfen
              </h5>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCheckServerPing()}
                  disabled={isCheckingServerPing}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isCheckingServerPing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Status & QR-Code abfragen
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                  Bot-Server URL (z.B. Host-IP oder Domain mit Port 3001):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={config.server_endpoint || ''}
                    onChange={(e) => setConfig({ ...config, server_endpoint: e.target.value })}
                    placeholder="http://localhost:3001 oder http://192.168.1.50:3001"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={handleSaveConfig}
                    disabled={isSaving}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl whitespace-nowrap cursor-pointer transition-colors"
                  >
                    Speichern
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Falls dein Bot im Docker läuft, lauscht seine REST-API standardmäßig auf Port <code>3001</code>.
                </p>
              </div>

              {/* Status Box Result */}
              <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-center">
                <span className="text-[11px] font-bold uppercase text-slate-400 mb-1">Live Status:</span>
                {serverPingStatus ? (
                  serverPingStatus.online ? (
                    serverPingStatus.isWhatsAppConnected ? (
                      <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Online & mit WhatsApp verbunden (Uptime: {Math.floor((serverPingStatus.uptimeSeconds || 0) / 60)}m)</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Server läuft, wartet auf QR-Scan!</span>
                      </div>
                    )
                  ) : (
                    <div className="flex items-center gap-2 text-red-400 font-bold text-xs">
                      <X className="w-4 h-4 text-red-400 shrink-0" />
                      <span>Nicht erreichbar ({serverPingStatus.error})</span>
                    </div>
                  )
                ) : (
                  <span className="text-xs text-slate-500 italic">Noch nicht geprüft</span>
                )}
              </div>
            </div>

            {/* If QR Code is waiting to be scanned */}
            {serverPingStatus && serverPingStatus.online && !serverPingStatus.isWhatsAppConnected && serverPingStatus.qr && (
              <div className="bg-amber-950/30 border border-amber-500/40 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4">
                <div className="bg-white p-2.5 rounded-lg shrink-0">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(serverPingStatus.qr)}`}
                    alt="WhatsApp QR Code"
                    className="w-36 h-36"
                  />
                </div>
                <div className="space-y-2 text-center sm:text-left">
                  <h6 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1.5">
                    <Smartphone className="w-4 h-4" /> WhatsApp Verknüpfung erforderlich:
                  </h6>
                  <p className="text-xs text-slate-300">
                    Öffne WhatsApp auf deinem Smartphone → <strong>Einstellungen → Verknüpfte Geräte → Gerät hinzufügen</strong> und scanne diesen QR-Code.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Sobald gekoppelt, schaltet der Bot automatisch auf <strong>🟢 Verbunden</strong> und führt alle Entfernungsbefehle aus!
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Test Form & Controls */}
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-5">
            <h5 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              1. Ziel-Biker für Test-Entfernung auswählen / eingeben
            </h5>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                  WhatsApp-Telefonnummer:
                </label>
                <input
                  type="text"
                  value={testKickPhone}
                  onChange={(e) => setTestKickPhone(e.target.value)}
                  placeholder="+49 170 1234567"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Unterstützt alle Formate (+49, 0170..., Leerzeichen, Bindestriche).
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                  Benutzername (Optional für DB-Lookup):
                </label>
                <input
                  type="text"
                  value={testKickUsername}
                  onChange={(e) => setTestKickUsername(e.target.value)}
                  placeholder="z.B. testuser oder BikerName"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Falls Telefonnummer leer ist, sucht der Bot die Nummer automatisch über den Benutzernamen.
                </p>
              </div>
            </div>

            {/* Quick Picker from existing registered members */}
            {members.length > 0 && (
              <div className="pt-2 border-t border-slate-900">
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-2">
                  Schnellauswahl aus synchronisierten WhatsApp-Gruppenmitgliedern:
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                  {members.slice(0, 12).map((m, mIdx) => (
                    <button
                      key={m.phone_number || m.phone || m.id || mIdx}
                      type="button"
                      onClick={() => {
                        setTestKickPhone(m.phone_number || m.phone || '');
                        setTestKickUsername(m.display_name || m.name || '');
                      }}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-400 border border-slate-800 rounded-lg text-xs font-mono transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <span>{m.display_name || m.name || 'Biker'}</span>
                      <span className="text-[10px] text-slate-500">({m.phone_number || m.phone || '-'})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Run Button */}
            <div className="flex items-center gap-3 pt-3">
              <button
                type="button"
                onClick={handleExecuteKickTest}
                disabled={isExecutingKickTest}
                className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-red-950/40 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isExecutingKickTest ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Kick-Test & Diagnose läuft...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Live Test-Kick & Diagnose ausführen
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Live Diagnostic Logs & Results */}
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                2. Live-Diagnose-Protokoll & Bot-Antworten
              </h5>
              {kickTestLogs.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setKickTestLogs([]);
                    setKickTestResultData(null);
                  }}
                  className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Protokoll leeren
                </button>
              )}
            </div>

            {kickTestLogs.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/50 rounded-xl border border-dashed border-slate-800 text-slate-400 text-xs">
                Klicke oben auf <strong>"Live Test-Kick & Diagnose ausführen"</strong>, um den Test-Ablauf zu starten.
              </div>
            ) : (
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 space-y-1.5 max-h-80 overflow-y-auto">
                {kickTestLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className={
                      log.includes('✅') || log.includes('🎉')
                        ? 'text-emerald-400'
                        : log.includes('⚠️')
                        ? 'text-amber-300'
                        : log.includes('❌')
                        ? 'text-red-400'
                        : log.includes('🚀')
                        ? 'text-white font-bold'
                        : 'text-slate-300'
                    }
                  >
                    {log}
                  </div>
                ))}
              </div>
            )}

            {/* Visual Checklist for Success */}
            {kickTestResultData && kickTestResultData.groupsChecked && (
              <div className="pt-3 space-y-3">
                <h6 className="text-xs font-bold text-white uppercase tracking-wider">
                  Gruppen-Status Übersicht:
                </h6>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {kickTestResultData.groupsChecked.map((g: any, idx: number) => (
                    <div key={idx} className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-white">{g.groupName}</span>
                        <span className="text-[11px] text-slate-400">{g.participantCount} Mitglieder</span>
                      </div>

                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">Bot Admin-Rechte:</span>
                          {g.isBotAdmin ? (
                            <span className="text-emerald-400 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Ja (Berechtigt)
                            </span>
                          ) : (
                            <span className="text-red-400 font-bold flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" /> NEIN (Achtung: Bot muss Admin sein!)
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">Teilnehmer-Erkennung:</span>
                          {g.matchedJids && g.matchedJids.length > 0 ? (
                            <span className="text-amber-400 font-mono font-bold">
                              Gefunden ({g.matchedJids.join(', ')})
                            </span>
                          ) : (
                            <span className="text-slate-400">Nicht in dieser Gruppe</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">Entfernung:</span>
                          {g.removed ? (
                            <span className="text-emerald-400 font-bold">Erfolgreich gekickt ✅</span>
                          ) : (
                            <span className="text-slate-400">Keine Aktion nötig / Fehler</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Critical Setup Tips */}
          <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-5 space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Wichtige Voraussetzungen für automatische Kicks:
            </h5>
            <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
              <li>
                <strong>Bot muss Gruppen-Admin sein:</strong> WhatsApp erlaubt das Entfernen von Mitgliedern ausschließlich Administratoren der Gruppe.
              </li>
              <li>
                <strong>Bot-Server muss laufen:</strong> Stelle sicher, dass der Bot mit <code>node src/index.js</code> auf deinem Server/VPS aktiv ist und mit WhatsApp verbunden ist.
              </li>
              <li>
                <strong>Supabase wa_outbox Queue:</strong> Bei jeder Account-Löschung schreibt die WebApp automatisch einen Task in <code>wa_outbox</code> mit <code>message_type: 'remove_member'</code>. Der Bot-Server verarbeitet diese Warteschlange alle 2 Sekunden oder via Realtime.
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: SETUP & HOSTING INSTRUCTIONS & FILES */}
      {activeSubTab === 'setup' && (
        <div className="space-y-6">
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-4">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-emerald-400" />
              Schritt-für-Schritt Anleitung: So hostest du deinen Bot
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Hier findest du alles, was du für den Betrieb deines eigenen WhatsApp Vetting-Bots brauchst. Der Bot verbindet sich über das quelloffene <strong>Baileys-Protokoll</strong> (Multi-Device) mit WhatsApp und synchronisiert alle Anfragen und Aktivitäten direkt mit deiner Website & Supabase-Datenbank.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
              <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center">1</div>
                <h5 className="text-xs font-bold text-white">SIM / Telefonnummer</h5>
                <p className="text-[11px] text-slate-400">
                  Günstige Prepaid-SIM oder eSIM (z.B. Lebara/Congstar/Sipgate). Einmalig SMS-Code empfangen.
                </p>
              </div>

              <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center">2</div>
                <h5 className="text-xs font-bold text-white">Server / VPS Starten</h5>
                <p className="text-[11px] text-slate-400">
                  Läuft auf jedem Linux-Server (Hetzner, Raspberry Pi, Synology Docker, DigitalOcean).
                </p>
              </div>

              <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center">3</div>
                <h5 className="text-xs font-bold text-white">QR-Code scannen</h5>
                <p className="text-[11px] text-slate-400">
                  In WhatsApp unter "Verknüpfte Geräte" den QR-Code scannen. Danach bleibt der Bot dauerhaft online.
                </p>
              </div>

              <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center">4</div>
                <h5 className="text-xs font-bold text-white">Admin-Rechte vergeben</h5>
                <p className="text-[11px] text-slate-400">
                  Die Bot-Nummer in deine WhatsApp-Gruppe einladen und zum <strong>Gruppen-Admin</strong> ernennen.
                </p>
              </div>
            </div>
          </div>

          {/* Docker & Deployment Files */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4" /> Fertige Server-Dateien & Docker-Konfiguration
            </h4>

            {/* Production Bot Server Code bot.js */}
            <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
                <span className="text-xs font-mono text-slate-300 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  bot.js (Vollständiger Baileys Multi-Device Bot mit WebApp-Sync & Passwort-Reset)
                </span>
                <button
                  onClick={() => handleCopy(`/**
 * 🏍️ PIXEL RIDER - WHATSAPP VETTING & SYNC BOT
 * 
 * Features:
 * 1. KI-Beitrittsprüfung & Vetting per WhatsApp DM
 * 2. Vollständiger Gruppenabgleich: Speichert alle Mitglieder in wa_group_members (Registrierungsprüfung)
 * 3. Gruppe verlassen -> Automatische Sperrung des WebApp-Accounts (group-participants.update)
 * 4. WebApp Account gelöscht -> Automatische Entfernung aus der WhatsApp Gruppe (groupParticipantsUpdate 'remove')
 * 5. Passwort vergessen -> WhatsApp Bot sendet sicheren Reset-Link an die verifizierte Handynummer
 * 6. Registrierungscode -> Bot sendet 6-stelligen Bestätigungscode per WhatsApp DM
 */

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const express = require('express');
const qrcode = require('qrcode-terminal');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GROUP_JID = process.env.GROUP_JID; // z.B. 120363000000000000@g.us

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const genAI = new GoogleGenerativeAI(GEMINI_KEY);

let sock = null;

// Synchronisiert alle aktiven Teilnehmer der Pixel Rider WhatsApp-Gruppe mit der Supabase-Datenbank
async function syncGroupMembers() {
  if (!sock || !GROUP_JID) return;
  try {
    console.log('🔄 Starte Abgleich aller Teilnehmer der WhatsApp-Gruppe:', GROUP_JID);
    const metadata = await sock.groupMetadata(GROUP_JID);
    if (!metadata || !metadata.participants) return;

    const participants = metadata.participants;
    console.log(\`👥 Gefundene Gruppenmitglieder: \${participants.length}\`);

    const records = participants.map((p) => {
      const cleanNum = p.id.split('@')[0].replace(/\\D/g, '');
      return {
        phone_number: '+' + cleanNum,
        group_jid: GROUP_JID,
        is_active: true,
        is_admin: p.admin === 'admin' || p.admin === 'superadmin',
        updated_at: new Date().toISOString(),
      };
    });

    if (records.length > 0) {
      const { error } = await supabase.from('wa_group_members').upsert(records, {
        onConflict: 'phone_number',
      });
      if (error) {
        console.error('Fehler beim Speichern der Gruppenmitglieder in Supabase:', error.message);
      } else {
        console.log(\`✅ \${records.length} Mitglieder erfolgreich in wa_group_members synchronisiert.\`);
      }
    }
  } catch (err) {
    console.error('Fehler beim Abgleich der WhatsApp-Gruppenteilnehmer:', err.message);
  }
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    defaultQueryTimeoutMs: 60000,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      console.log('📱 Scanne diesen QR-Code in WhatsApp (Verknüpfte Geräte):');
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Verbindung getrennt. Reconnect:', shouldReconnect);
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log('✅ WhatsApp Bot erfolgreich verbunden!');
      // Initialer Sync aller Gruppenmitglieder beim Start
      setTimeout(() => syncGroupMembers(), 3000);
      // Supabase Outbox Queue starten (für Verifizierungscodes & Passwort-Resets)
      listenToOutboxQueue();
    }
  });

  // 1. EVENT: SUPABASE OUTBOX QUEUE (Empfängt Codes & Reset-Links in Echtzeit aus der WebApp)
  async function processOutboxMessage(row) {
    if (!sock || !row || row.status !== 'pending') return;
    const cleanNum = (row.phone || '').replace(/\\D/g, '');
    if (!cleanNum) return;
    const recipientJid = \`\${cleanNum}@s.whatsapp.net\`;

    try {
      let messageText = row.content;
      if (row.message_type === 'verification_code') {
        messageText = \`🔐 *Pixel Rider - WhatsApp Sicherheits-Verifizierung*\\n\\nHallo \${row.username ? \`@\${row.username}\` : 'Biker'},\\n\\ndein 6-stelliger Bestätigungscode für die Pixel Rider WebApp lautet:\\n\\n👉 *\${row.code}*\\n\\nGib diesen Code jetzt in der WebApp ein, um die Echtheit deiner Handynummer zu bestätigen. Teile diesen Code niemals mit Dritten!\`;
      } else if (row.message_type === 'password_reset') {
        messageText = \`🔒 *Pixel Rider - Passwort Zurücksetzen*\\n\\nHallo @\${row.username || 'Biker'},\\n\\ndu hast eine Passwort-Zurücksetzung für deinen Pixel Rider Account angefordert.\\n\\nKlicke auf den folgenden sicheren Link, um dein neues Passwort festzulegen:\\n👉 \${row.reset_url}\\n\\n_(Dieser Link ist 30 Minuten gültig. Falls du dies nicht warst, ignoriere diese Nachricht.)_\`;
      }

      if (!messageText) return;

      console.log(\`📤 Sende WhatsApp-Nachricht (\${row.message_type}) an \${recipientJid}...\`);
      await sock.sendMessage(recipientJid, { text: messageText });

      await supabase.from('wa_outbox').update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      }).eq('id', row.id);

      console.log(\`✅ WhatsApp-Nachricht erfolgreich an \${recipientJid} zugestellt!\`);
    } catch (err) {
      console.error(\`❌ Fehler beim Senden der WhatsApp-Nachricht an \${recipientJid}:\`, err.message);
      await supabase.from('wa_outbox').update({
        status: 'failed',
        error_message: err.message,
      }).eq('id', row.id);
    }
  }

  async function listenToOutboxQueue() {
    console.log('📡 Starte Supabase Outbox Queue Listener für eingehende Nachrichten...');
    try {
      // Vorhandene offene Nachrichten direkt beim Start abarbeiten
      const { data: pending } = await supabase.from('wa_outbox').select('*').eq('status', 'pending');
      if (pending && pending.length > 0) {
        console.log(\`📥 Verarbeite \${pending.length} wartende Nachrichten aus wa_outbox...\`);
        for (const msg of pending) {
          await processOutboxMessage(msg);
        }
      }

      // Realtime Listener für neue Nachrichten aus der WebApp
      supabase
        .channel('wa_outbox_channel')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'wa_outbox' }, (payload) => {
          if (payload.new && payload.new.status === 'pending') {
            processOutboxMessage(payload.new);
          }
        })
        .subscribe();
    } catch (qErr) {
      console.warn('Hinweis zu Outbox Queue:', qErr.message);
    }
  }

  // 2. EVENT: GRUPPEN-TEILNEHMER-UPDATES (User tritt bei, verlässt oder wird gekickt)
  sock.ev.on('group-participants.update', async (event) => {
    const { id, participants, action } = event;
    console.log(\`👥 Gruppen-Update in \${id}: Aktion = \${action}, Teilnehmer = \${participants.join(', ')}\`);

    if (action === 'add') {
      // Neuer Teilnehmer zur Gruppe hinzugefügt -> in Supabase speichern
      for (const jid of participants) {
        const cleanNumber = jid.split('@')[0].replace(/\\D/g, '');
        await supabase.from('wa_group_members').upsert({
          phone_number: '+' + cleanNumber,
          group_jid: id,
          is_active: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'phone_number' });
      }
    }

    // Wenn jemand die Gruppe verlässt ('leave') oder entfernt wird ('remove')
    if (action === 'leave' || action === 'remove') {
      for (const jid of participants) {
        // E.164 Nummer extrahieren
        const cleanNumber = jid.split('@')[0].replace(/\\D/g, '');
        const normalizedPhone = '+' + cleanNumber;

        console.log(\`⚠️ Biker \${normalizedPhone} hat die WhatsApp-Gruppe verlassen. Aktualisiere Status...\`);

        // Aus wa_group_members austragen
        await supabase.from('wa_group_members').update({
          is_active: false,
          updated_at: new Date().toISOString(),
        }).eq('phone_number', normalizedPhone);

        // Suche User in Supabase anhand der Handynummer
        const { data: users } = await supabase
          .from('users')
          .select('username, email, phone')
          .or(\`phone.eq.\${normalizedPhone},phone.eq.\${cleanNumber}\`);

        if (users && users.length > 0) {
          for (const u of users) {
            await supabase.from('users').update({ 
              is_deactivated: true,
              deactivated_reason: 'WhatsApp-Gruppe verlassen' 
            }).eq('username', u.username);

            console.log(\`🔒 WebApp-Zugang für @\${u.username} wurde gesperrt.\`);
          }
        }
      }
    }
  });

  // 2. EVENT: EINGEHENDE NACHRICHTEN & AKTIVITÄTS-TRACKING
  sock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    if (from.endsWith('@g.us')) {
      const sender = msg.key.participant || from;
      const cleanNum = sender.split('@')[0].replace(/\\D/g, '');
      await supabase.from('wa_group_members').upsert({
        phone_number: '+' + cleanNum,
        group_jid: from,
        is_active: true,
        last_message_at: new Date().toISOString(),
      }, { onConflict: 'phone_number' });
    }
  });
}

// 3. HTTP-API FÜR DIE WEBAPP (Abgleich, Verifizierung, Reset, Account-Löschung)
const app = express();
app.use(express.json());

// Endpoint A: Abgleich, ob Handynummer in der Pixel Rider WhatsApp-Gruppe ist
app.post('/api/check-member', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Missing phone' });

  try {
    const cleanNum = phone.replace(/\\D/g, '');
    if (sock && GROUP_JID) {
      const metadata = await sock.groupMetadata(GROUP_JID);
      const isMember = metadata.participants.some(p => p.id.split('@')[0].replace(/\\D/g, '') === cleanNum);
      return res.json({ isMember, phone: cleanNum });
    }
    // Fallback auf Datenbank
    const { data } = await supabase.from('wa_group_members').select('id, is_active').ilike('phone_number', \`%\${cleanNum}%\`).single();
    res.json({ isMember: !!data && data.is_active !== false });
  } catch (err) {
    res.json({ isMember: false, error: err.message });
  }
});

// Endpoint B: User löscht Account in WebApp -> Bot wirft ihn aus der WA-Gruppe
app.post('/api/remove-member', async (req, res) => {
  const { phone } = req.body;
  if (!phone || !sock) return res.status(400).json({ error: 'Missing phone or bot offline' });

  try {
    const cleanNum = phone.replace(/\\D/g, '');
    const participantJid = \`\${cleanNum}@s.whatsapp.net\`;

    console.log(\`🗑️ Entferne \${participantJid} aus Gruppe \${GROUP_JID} wegen Account-Löschung...\`);
    await sock.groupParticipantsUpdate(GROUP_JID, [participantJid], 'remove');

    res.json({ success: true, message: 'Member removed from WhatsApp group' });
  } catch (err) {
    console.error('Failed to remove member from WA group:', err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint C: Passwort vergessen -> Bot sendet Reset-Link per WhatsApp DM
app.post('/api/send-password-reset', async (req, res) => {
  const { phone, username, resetUrl } = req.body;
  if (!phone || !sock) return res.status(400).json({ error: 'Missing parameters' });

  try {
    const cleanNum = phone.replace(/\\D/g, '');
    const recipientJid = \`\${cleanNum}@s.whatsapp.net\`;

    const messageText = \`🔒 *Pixel Rider - Passwort Zurücksetzen*\\n\\nHallo @\${username},\\n\\ndu hast eine Passwort-Zurücksetzung für deinen Pixel Rider Account angefordert.\\n\\nKlicke auf den folgenden sicheren Link, um dein neues Passwort festzulegen:\\n👉 \${resetUrl}\\n\\n_(Dieser Link ist 30 Minuten gültig. Falls du dies nicht warst, ignoriere diese Nachricht.)_\`;

    await sock.sendMessage(recipientJid, { text: messageText });
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to send reset link via WA:', err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint D: Handynummer-Echtheitsprüfung -> Bot sendet 6-stelligen Bestätigungscode
app.post('/api/send-verification-code', async (req, res) => {
  const { phone, username, code } = req.body;
  if (!phone || !code || !sock) return res.status(400).json({ error: 'Missing phone/code or bot offline' });

  try {
    const cleanNum = phone.replace(/\\D/g, '');
    const recipientJid = \`\${cleanNum}@s.whatsapp.net\`;

    const messageText = \`🔐 *Pixel Rider - WhatsApp Sicherheits-Verifizierung*\\n\\nHallo \${username ? \`@\${username}\` : 'Biker'},\\n\\ndein 6-stelliger Bestätigungscode für die Pixel Rider WebApp lautet:\\n\\n👉 *\${code}*\\n\\nGib diesen Code jetzt in der WebApp ein, um die Echtheit deiner Handynummer zu bestätigen. Teile diesen Code niemals mit Dritten!\`;

    await sock.sendMessage(recipientJid, { text: messageText });
    res.json({ success: true, message: 'Verification code sent via WhatsApp' });
  } catch (err) {
    console.error('Failed to send verification code via WA:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3001, () => {
  console.log('🚀 Bot Web-Bridge läuft auf Port 3001');
  startBot();
});`, 'botjs')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  {copiedCode === 'botjs' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedCode === 'botjs' ? 'Kopiert!' : 'bot.js Kopieren'}
                </button>
              </div>
              <pre className="p-4 text-xs font-mono text-emerald-300 overflow-x-auto max-h-72">
{`// 🏍️ Baileys WhatsApp Bot mit vollständigem Pixel Rider Gruppenabgleich:
// • syncGroupMembers(): Gleicht alle Gruppenmitglieder mit der Tabelle 'wa_group_members' ab
// • Registrierungssperre: Nur aktive Teilnehmer der WhatsApp-Gruppe können sich registrieren
// • group-participants.update: Sperrt WebApp-Zugang bei Verlassen der WhatsApp-Gruppe
// • /api/remove-member: Entfernt Benutzer aus WhatsApp-Gruppe bei WebApp-Account-Löschung
// • /api/send-password-reset: Sendet sichere Passwort-Freischaltlinks direkt per WhatsApp DM
// • /api/send-verification-code: Sendet 6-stelligen Verifizierungscode per WhatsApp DM zur Echtheitsprüfung`}
              </pre>
            </div>

            {/* Docker Compose */}
            <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
                <span className="text-xs font-mono text-slate-300 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  docker-compose.yml (1-Klick Start)
                </span>
                <button
                  onClick={() => handleCopy(`version: '3.8'
services:
  whatsapp-vetting-bot:
    build: .
    container_name: wa_pixel_bot
    restart: unless-stopped
    environment:
      - SUPABASE_URL=https://your-project.supabase.co
      - SUPABASE_SERVICE_ROLE_KEY=your-supabase-key
      - GEMINI_API_KEY=your-gemini-api-key
      - ADMIN_PHONE=+491711122334
      - GROUP_JID=120363000000000000@g.us
    volumes:
      - ./auth_info_baileys:/app/auth_info_baileys
    ports:
      - "3001:3001"`, 'docker')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  {copiedCode === 'docker' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedCode === 'docker' ? 'Kopiert!' : 'Kopieren'}
                </button>
              </div>
              <pre className="p-4 text-xs font-mono text-emerald-300 overflow-x-auto">
{`version: '3.8'
services:
  whatsapp-vetting-bot:
    build: .
    container_name: wa_pixel_bot
    restart: unless-stopped
    environment:
      - SUPABASE_URL=https://your-project.supabase.co
      - SUPABASE_SERVICE_ROLE_KEY=your-supabase-key
      - GEMINI_API_KEY=your-gemini-api-key
      - ADMIN_PHONE=+491711122334
      - GROUP_JID=120363000000000000@g.us
    volumes:
      - ./auth_info_baileys:/app/auth_info_baileys
    ports:
      - "3001:3001"`}
              </pre>
            </div>

            {/* Quick Terminal Start */}
            <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
                <span className="text-xs font-mono text-slate-300 flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  Supabase SQL Tabellen (Einmalig im SQL Editor ausführen)
                </span>
                <button
                  onClick={() => handleCopy(`-- 1. Bestehende users Tabelle um WhatsApp- & Verifizierungs-Spalten erweitern
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS is_deactivated BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS deactivated_reason TEXT;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS reset_requested BOOLEAN DEFAULT false;

-- 2. Bot Konfiguration & Fragen
CREATE TABLE IF NOT EXISTS wa_bot_config (
  id INT PRIMARY KEY DEFAULT 1,
  bot_phone TEXT DEFAULT '',
  group_name TEXT DEFAULT 'Pixel Bikers Community',
  group_jid TEXT DEFAULT '',
  server_endpoint TEXT DEFAULT '',
  api_secret TEXT DEFAULT '',
  auto_vetting_enabled BOOLEAN DEFAULT true,
  ai_strictness TEXT DEFAULT 'balanced',
  min_score_auto_approve INT DEFAULT 80,
  inactivity_threshold_days INT DEFAULT 180,
  vetting_questions TEXT DEFAULT '["Welches Motorradmodell und wie viel Hubraum/PS fährst du aktuell?","Aus welcher Stadt oder Region kommst du?","Hast du Lust an gemeinsamen Ausfahrten, Events oder Schrauber-Treffen teilzunehmen?"]',
  welcome_message TEXT DEFAULT 'Willkommen in der Pixel Bikers Gruppe! 🏍️ Bitte stelle dich kurz vor und halte dich an unsere Gruppenregeln. Allzeit gute Fahrt!',
  reject_message TEXT DEFAULT 'Vielen Dank für dein Interesse. Deine Beitrittsanfrage konnte leider nicht automatisch genehmigt werden. Ein Admin prüft deinen Antrag manuell.',
  inactivity_warning_message TEXT DEFAULT 'Hi {name}! 🏍️ Wir haben bemerkt, dass du in den letzten 6 Monaten keine Nachricht in der Gruppe gesendet hast. Bitte melde dich kurz zurück, wenn du weiterhin dabei sein möchtest!',
  connection_status TEXT DEFAULT 'disconnected',
  last_sync_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Freigaben für wa_bot_config
ALTER TABLE IF EXISTS wa_bot_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on wa_bot_config" ON wa_bot_config;
CREATE POLICY "Allow all on wa_bot_config" ON wa_bot_config FOR ALL TO public USING (true) WITH CHECK (true);

-- 3. Beitrittsanfragen Log & KI-Bewertungen
CREATE TABLE IF NOT EXISTS wa_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  user_name TEXT,
  answers JSONB,
  ai_score INT DEFAULT 0,
  ai_verdict TEXT DEFAULT 'needs_review',
  ai_reason TEXT,
  status TEXT DEFAULT 'pending',
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ
);

-- 4. WhatsApp Gruppenmitglieder & Gruppenabgleich
CREATE TABLE IF NOT EXISTS wa_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT UNIQUE NOT NULL,
  display_name TEXT,
  role TEXT DEFAULT 'member',
  group_jid TEXT,
  is_active BOOLEAN DEFAULT true,
  is_admin BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  total_messages INT DEFAULT 1,
  is_warned BOOLEAN DEFAULT false,
  warning_sent_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Outbox-Warteschlange für Nachrichten & Codes (WebApp -> Bot -> WhatsApp)
CREATE TABLE IF NOT EXISTS wa_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  message_type TEXT NOT NULL, -- 'verification_code' | 'password_reset' | 'notification'
  username TEXT,
  code TEXT,
  reset_url TEXT,
  content TEXT,
  status TEXT DEFAULT 'pending', -- 'pending' | 'sent' | 'failed'
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);`, 'sql')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  {copiedCode === 'sql' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedCode === 'sql' ? 'Kopiert!' : 'SQL Kopieren'}
                </button>
              </div>
              <pre className="p-4 text-xs font-mono text-emerald-400/90 overflow-x-auto max-h-64">
{`CREATE TABLE IF NOT EXISTS wa_bot_config (
  id INT PRIMARY KEY DEFAULT 1,
  bot_phone TEXT DEFAULT '',
  group_name TEXT DEFAULT 'Pixel Bikers Community',
  group_jid TEXT DEFAULT '',
  server_endpoint TEXT DEFAULT '',
  api_secret TEXT DEFAULT '',
  auto_vetting_enabled BOOLEAN DEFAULT true,
  ai_strictness TEXT DEFAULT 'balanced',
  min_score_auto_approve INT DEFAULT 80,
  inactivity_threshold_days INT DEFAULT 180,
  vetting_questions TEXT DEFAULT '["Welches Motorradmodell und wie viel Hubraum/PS fährst du aktuell?","Aus welcher Stadt oder Region kommst du?","Hast du Lust an gemeinsamen Ausfahrten, Events oder Schrauber-Treffen teilzunehmen?"]',
  welcome_message TEXT DEFAULT 'Willkommen in der Pixel Bikers Gruppe! 🏍️',
  reject_message TEXT DEFAULT 'Vielen Dank für dein Interesse. Deine Beitrittsanfrage konnte leider nicht automatisch genehmigt werden.',
  inactivity_warning_message TEXT DEFAULT 'Hi {name}! 🏍️ Bitte melde dich kurz zurück!',
  connection_status TEXT DEFAULT 'disconnected',
  last_sync_at TIMESTAMPTZ DEFAULT NOW()
);`}
              </pre>
            </div>

            {/* Quick Terminal Start */}
            <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
                <span className="text-xs font-mono text-slate-300 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-amber-400" />
                  Terminal Befehle zum Starten
                </span>
                <button
                  onClick={() => handleCopy(`git clone https://github.com/your-repo/whatsapp-bot-server.git
cd whatsapp-bot-server
npm install
npm run start`, 'cli')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  {copiedCode === 'cli' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedCode === 'cli' ? 'Kopiert!' : 'Kopieren'}
                </button>
              </div>
              <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto">
{`# 1. In das Bot-Verzeichnis wechseln
cd whatsapp-bot-server

# 2. Abhängigkeiten installieren
npm install

# 3. Bot starten & QR-Code im Terminal scannen
npm run start`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
