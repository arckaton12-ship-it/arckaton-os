import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory store for real-time leads and reports
interface StoredLead {
  id: string;
  name: string;
  email?: string;
  phone: string;
  project_type: string;
  budget?: string;
  message: string;
  source: string;
  statut: string;
  notes?: string;
  pole_assigned: string;
  country?: string;
  created_at: string;
}

interface StoredReport {
  id: string;
  client_name: string;
  sujet: string;
  pole: string;
  resume: string;
  intention: 'devis' | 'essai' | 'information';
  contact_info: string;
  created_at: string;
  status: 'non_traite' | 'en_cours' | 'converti';
  messages_count: number;
}

const leadsStore: StoredLead[] = [];
const reportsStore: StoredReport[] = [];

// ============================================================
// Supabase persistence layer (server-side only).
// Active si SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY sont définis
// dans .env. Sinon, le serveur retombe sur les stores en mémoire
// (comportement actuel de l'export AI Studio).
// ============================================================
let supabaseAdmin: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (supabaseAdmin) return supabaseAdmin;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key && key !== "MY_SUPABASE_SERVICE_ROLE_KEY") {
    supabaseAdmin = createClient(url, key);
    return supabaseAdmin;
  }
  return null;
}

const BOSS_WHATSAPP = "+237681462982";

// Modele Gemini utilise (modifiable via env). Les anciens noms type
// "gemini-3.8-flash" n'existaient pas et faisaient echouer tous les appels IA.
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// ============================================================
// Projets clients : persistance Supabase (source de verite du
// portail BAT et du suivi d'evolution des projets).
// ============================================================
interface StoredProject {
  id?: string;
  project_ref?: string | null;
  client_code?: string | null;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  service?: string;
  pole?: string;
  chef_de_projet?: string;
  statut?: string;
  forfait?: string;
  budget_estime?: string;
  deadline?: string;
  progression?: number;
  sorties_terrain_effectuees?: number;
  sorties_terrain_total?: number;
  jalons?: unknown[];
  sorties_terrain?: unknown[];
  feedbacks?: unknown[];
  deliverables?: unknown[];
  score?: number;
  notes?: string;
  notes_internes?: string;
}

const PROJECT_STATUTS = ['brouillon', 'qualifie', 'en_cours', 'livre', 'annule'];

function normalizeProjectStatut(value: unknown): string {
  const raw = String(value || '').toLowerCase();
  if (PROJECT_STATUTS.includes(raw)) return raw;
  // Anciennes valeurs du projet initial
  if (raw === 'active' || raw === 'en_pause') return 'en_cours';
  if (raw === 'livree' || raw === 'livre' || raw === 'termine') return 'livre';
  if (raw === 'archive' || raw === 'archivee') return 'annule';
  if (raw === 'clos') return 'livre';
  return 'en_cours';
}

function projectRow(p: StoredProject) {
  return {
    project_ref: p.project_ref || p.id || null,
    client_code: p.client_code || null,
    client_name: p.client_name,
    client_email: p.client_email || '',
    client_phone: p.client_phone || '',
    service: p.service || '',
    pole: p.pole || 'Direction',
    chef_de_projet: p.chef_de_projet || '',
    statut: normalizeProjectStatut(p.statut),
    forfait: p.forfait || '',
    budget_estime: p.budget_estime || '',
    deadline: p.deadline || '',
    progression: Number.isFinite(p.progression) ? Number(p.progression) : 0,
    sorties_terrain_effectuees: Number(p.sorties_terrain_effectuees || 0),
    sorties_terrain_total: Number(p.sorties_terrain_total || 0),
    deliverables: p.deliverables || [],
    score: Number(p.score || 0),
    jalons: p.jalons || [],
    sorties_terrain: p.sorties_terrain || [],
    feedbacks: p.feedbacks || [],
    notes_internes: p.notes || p.notes_internes || '',
    updated_at: new Date().toISOString(),
  };
}

async function fetchProjectsServer(): Promise<any[] | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(200);
  if (error) {
    console.warn("Supabase select projects:", error.message);
    return null;
  }
  return data || [];
}

async function persistProject(p: StoredProject): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const ref = p.project_ref || p.id;

  // upsert : un update sans ligne affectee ne renvoyait aucune erreur,
  // la creation initiale etait donc "reussie" alors que rien n'etait insere.
  const { data, error } = await sb
    .from('projects')
    .upsert(projectRow(p), { onConflict: 'project_ref' })
    .select('project_ref')
    .maybeSingle();

  if (error) {
    console.warn("Supabase upsert project:", error.message);
    return false;
  }
  if (!data && !ref) return false;
  return true;
}


interface OutboxEntry {
  client_ref: string;
  kind: 'lead' | 'report';
  to_numbers: string[];
  message: string;
}

async function persistLead(lead: StoredLead & { client_ref?: string }): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.from('leads').insert({
    client_ref: lead.client_ref || null,
    name: lead.name,
    email: lead.email || '',
    phone: lead.phone,
    project_type: lead.project_type,
    budget: lead.budget || '',
    message: lead.message || '',
    source: lead.source || 'site_v2_devis',
    statut: lead.statut || 'nouveau',
    notes: lead.notes || '',
    pole_assigned: lead.pole_assigned,
    country: lead.country || '',
  });
  if (error) console.warn("Supabase insert lead:", error.message);
  return !error;
}

async function persistReport(report: StoredReport & { client_ref?: string; recommendations?: string[] }) {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.from('agent_reports').insert({
    client_ref: report.client_ref || null,
    client_name: report.client_name,
    lead_name: report.client_name,
    sujet: report.sujet,
    pole: report.pole,
    resume: report.resume,
    recommendations: report.recommendations || [],
    intention: report.intention,
    contact_info: report.contact_info,
    status: report.status || 'non_traite',
    messages_count: report.messages_count || 1,
  });
  if (error) console.warn("Supabase insert agent_reports:", error.message);
  return !error;
}

async function persistOutbox(entry: OutboxEntry): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const rows = entry.to_numbers.map((n) => ({
    client_ref: entry.client_ref,
    kind: entry.kind,
    to_number: n,
    message: entry.message,
    status: 'pending' as const,
    attempts: 0,
  }));
  const { error } = await sb
    .from('whatsapp_outbox')
    .upsert(rows, { onConflict: 'client_ref,to_number', ignoreDuplicates: true });
  if (error) console.warn("Supabase upsert outbox:", error.message);
}

// ============================================================
// Envoi WhatsApp AUTOMATIQUE — Meta WhatsApp Cloud API
// Config (optionnelle) :
//   WHATSAPP_TOKEN       → token d'accès longue durée Meta
//   WHATSAPP_PHONE_ID    → ID du numéro WhatsApp Business émetteur
//   WHATSAPP_API_VERSION → défaut v22.0
//   WHATSAPP_POLL_MS     → fréquence du worker (défaut 15000)
// Sans WHATSAPP_TOKEN / WHATSAPP_PHONE_ID, la file whatsapp_outbox
// reste at status='pending' (consultable) et le site garde le lien
// wa.me pré-rempli : aucun comportement cassé.
// ============================================================
const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v22.0';
const WHATSAPP_MAX_ATTEMPTS = 5;

interface OutboxRow {
  id: string;
  client_ref: string;
  kind: string;
  to_number: string;
  message: string;
  status: string;
  attempts: number;
}

function whatsappConfigured(): boolean {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  return Boolean(token && phoneId && token !== 'MY_WHATSAPP_TOKEN' && phoneId !== 'MY_WHATSAPP_PHONE_ID');
}

async function sendWhatsAppMessage(toNumber: string, bodyText: string): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const token = process.env.WHATSAPP_TOKEN!;
  const phoneId = process.env.WHATSAPP_PHONE_ID!;
  const cleanTo = toNumber.replace(/[^\d]/g, '');
  if (!cleanTo) return { ok: false, error: 'Numéro vide' };
  const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneId}/messages`;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: cleanTo,
        type: 'text',
        text: { body: bodyText.slice(0, 1024), preview_url: false },
      }),
    });
    const data: any = await resp.json().catch(() => ({}));
    if (resp.ok && data?.messages?.[0]?.id) {
      return { ok: true, messageId: data.messages[0].id };
    }
    const msg = data?.error?.message || data?.error?.error_user_msg || JSON.stringify(data).slice(0, 200);
    return { ok: false, error: `Meta ${resp.status}: ${msg}`.slice(0, 300) };
  } catch (err: any) {
    return { ok: false, error: String(err?.message || err).slice(0, 300) };
  }
}

async function drainWhatsAppOutbox(): Promise<void> {
  const sb = getSupabase();
  if (!sb || !whatsappConfigured()) return;
  const { data, error } = await sb
    .from('whatsapp_outbox')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(10);
  if (error) { console.warn('Outbox select:', error.message); return; }
  for (const row of (data || []) as OutboxRow[]) {
    const result = await sendWhatsAppMessage(row.to_number, row.message);
    const attempts = (row.attempts || 0) + 1;
    if (result.ok) {
      const { error: upErr } = await sb
        .from('whatsapp_outbox')
        .update({ status: 'sent', sent_at: new Date().toISOString(), attempts })
        .eq('id', row.id);
      if (upErr) console.warn('Outbox update (sent):', upErr.message);
      else console.log(`[WhatsApp] envoyé à ${row.to_number} (${row.kind}/${row.client_ref}) → ${result.messageId}`);
    } else {
      const finalStatus = attempts >= WHATSAPP_MAX_ATTEMPTS ? 'failed' : 'pending';
      const { error: upErr } = await sb
        .from('whatsapp_outbox')
        .update({ status: finalStatus, attempts })
        .eq('id', row.id);
      if (upErr) console.warn('Outbox update (retry):', upErr.message);
      else console.warn(`[WhatsApp] échec ${row.to_number}: ${result.error} (tentative ${attempts})`);
    }
  }
}

function startWhatsAppWorker(): void {
  if (!whatsappConfigured()) {
    console.log('[WhatsApp] non configuré (WHATSAPP_TOKEN / WHATSAPP_PHONE_ID manquants) — file conservée en pending, lien wa.me actif.');
    return;
  }
  const pollMs = Math.max(5000, Number(process.env.WHATSAPP_POLL_MS) || 15000);
  console.log(`[WhatsApp] worker actif — poll toutes les ${pollMs}ms via Meta WhatsApp Cloud API (${WHATSAPP_API_VERSION}).`);
  setTimeout(() => drainWhatsAppOutbox().catch(console.error), 2000);
  setInterval(() => drainWhatsAppOutbox().catch(console.error), pollMs);
}

async function fetchLeadsServer() {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(300);
  if (error) {
    console.warn("Supabase select leads:", error.message);
    return null;
  }
  return data || [];
}

async function fetchReportsServer() {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from('agent_reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(300);
  if (error) {
    console.warn("Supabase select agent_reports:", error.message);
    return null;
  }
  return data || [];
}

// ============================================================
// Supabase anon client — nécessaire au login membres (GoTrue).
// Requis : SUPABASE_ANON_KEY dans .env / variables Render.
// ============================================================
let supabaseAnon: SupabaseClient | null = null;
function getSupabaseAnon(): SupabaseClient | null {
  if (supabaseAnon) return supabaseAnon;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (url && key && key !== "MY_SUPABASE_ANON_KEY") {
    supabaseAnon = createClient(url, key);
    return supabaseAnon;
  }
  return null;
}

// ============================================================
// Auth membres, permissions & journal d'activité (Arckaton OS)
// Tables : members, activity_log, content_items (voir supabase/migrations)
// ============================================================
interface MemberRow {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  pole: string;
  poste_id?: string | null;
  poste_titre?: string | null;
  permissions: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface ContentRow {
  id: string;
  kind: string;
  slug: string;
  title?: string | null;
  published: boolean;
  position: number;
  data: any;
  created_at: string;
  updated_at: string;
}

async function getMemberByUserId(uid: string): Promise<MemberRow | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from('members').select('*').eq('id', uid).maybeSingle();
  if (error) {
    console.warn('members select:', error.message);
    return null;
  }
  return (data as MemberRow) || null;
}

function normalizePermissions(p: any): string[] {
  if (Array.isArray(p)) return p.map(String);
  if (p && typeof p === 'object') {
    return Object.entries(p).filter(([, v]) => v === true).map(([k]) => k);
  }
  return [];
}

function hasPerm(member: MemberRow, perm: string): boolean {
  if (!member.active) return false;
  if (member.role === 'admin') return true;
  return normalizePermissions(member.permissions).includes(perm);
}

type AuthReq = express.Request & { member?: MemberRow };

async function requireAuth(req: AuthReq, res: any, next: any): Promise<void> {
  const anon = getSupabaseAnon();
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!anon || !token) {
    return res.status(401).json({ error: 'Authentification requise' });
  }
  try {
    const { data, error } = await anon.auth.getUser(token);
    if (error || !data.user) {
      return res.status(401).json({ error: 'Session invalide ou expirée' });
    }
    const member = await getMemberByUserId(data.user.id);
    if (!member) return res.status(403).json({ error: 'Compte non habilité Arckaton OS' });
    if (!member.active) return res.status(403).json({ error: 'Compte désactivé par la direction' });
    req.member = member;
    next();
  } catch (err) {
    console.error('requireAuth error:', err);
    res.status(500).json({ error: 'Erreur authentification' });
  }
}

const requirePerm = (perm: string) => async (req: AuthReq, res: any, next: any) => {
  await requireAuth(req, res, () => {
    if (!req.member || !hasPerm(req.member, perm)) {
      return res.status(403).json({ error: 'Privilèges insuffisants' });
    }
    next();
  });
};

async function logActivity(actor: MemberRow, action: string, kind: string, ref: string, details?: any) {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from('activity_log').insert({
    actor_id: actor.id,
    actor_name: actor.name,
    action,
    kind,
    ref,
    details: details || {},
  });
  if (error) console.warn('activity_log insert:', error.message);
}

async function fetchContentItems(): Promise<ContentRow[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from('content_items').select('*').order('position', { ascending: true });
  if (error) {
    console.warn('content_items select:', error.message);
    return [];
  }
  return (data || []) as ContentRow[];
}

function groupContent(items: ContentRow[]): Record<string, any[]> {
  const grouped: Record<string, any[]> = {};
  for (const item of items) {
    const key = KIND_TO_RESPONSE_KEY[item.kind] || item.kind;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item.data);
  }
  return grouped;
}

// ============================================================
// API Auth (login membres Arckaton OS)
// ============================================================
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });
    const anon = getSupabaseAnon();
    if (!anon) {
      return res.status(500).json({ error: 'Authentification non configurée (SUPABASE_ANON_KEY manquante)' });
    }
    const { data, error } = await anon.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }
    const member = await getMemberByUserId(data.user.id);
    if (!member) return res.status(403).json({ error: 'Compte non habilité Arckaton OS. Contactez la direction.' });
    if (!member.active) return res.status(403).json({ error: 'Compte désactivé par la direction.' });
    await logActivity(member, 'login', 'member', member.id, {});
    res.json({ token: data.session.access_token, member });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Erreur de connexion' });
  }
});

app.post('/api/auth/logout', requireAuth, async (req: AuthReq, res) => {
  res.json({ success: true });
});

// ---- Bootstrap du premier admin (création du compte Directeur) ----
app.get('/api/auth/bootstrap', async (_req, res) => {
  try {
    const sb = getSupabase();
    if (!sb) return res.status(500).json({ error: 'Supabase non configuré' });
    const { data, error } = await sb.from('members').select('id').eq('role', 'admin').limit(1).maybeSingle();
    if (error) return res.status(500).json({ error: 'Base inaccessible: ' + error.message });
    res.json({ needs: !data });
  } catch (err) {
    res.status(500).json({ error: 'Erreur bootstrap' });
  }
});

app.post('/api/auth/bootstrap', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nom, email et mot de passe requis' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Mot de passe : 6 caractères minimum' });
    }
    const admin = getSupabase();
    const anon = getSupabaseAnon();
    if (!admin || !anon) return res.status(500).json({ error: 'Supabase non configuré' });

    const { data: existing } = await admin.from('members').select('id').eq('role', 'admin').limit(1).maybeSingle();
    if (existing) return res.status(403).json({ error: 'Un administrateur existe déjà (bootstrap effectué)' });

    const { data: userData, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });
    if (createErr || !userData?.user) {
      return res.status(400).json({ error: createErr?.message || 'Impossible de créer le compte' });
    }

    const { error: memberErr } = await admin.from('members').insert({
      id: userData.user.id,
      name,
      email,
      phone: phone || null,
      role: 'admin',
      pole: 'Direction',
      poste_titre: 'Directeur Général',
      permissions: [],
      active: true,
    });
    if (memberErr) {
      await admin.auth.admin.deleteUser(userData.user.id).catch(() => null);
      return res.status(500).json({ error: 'Échec enregistrement du membre: ' + memberErr.message });
    }

    const { data: session, error: signinErr } = await anon.auth.signInWithPassword({ email, password });
    if (signinErr || !session?.session) {
      return res.status(500).json({ error: 'Compte créé mais connexion impossible — réessayez.' });
    }
    const { data: memberRow } = await admin.from('members').select('*').eq('id', userData.user.id).maybeSingle();
    await admin
      .from('activity_log')
      .insert({
        actor_id: userData.user.id,
        actor_name: name,
        action: 'bootstrap admin',
        kind: 'member',
        ref: userData.user.id,
        details: { note: 'Création du compte Directeur (premier admin)' },
      });
    res.json({ token: session.session.access_token, member: memberRow });
  } catch (err: any) {
    console.error('Bootstrap error:', err);
    res.status(500).json({ error: 'Erreur initialisation' });
  }
});

app.get('/api/auth/me', requireAuth, (req: AuthReq, res) => {
  res.json({ member: req.member });
});

// ============================================================
// API Membres (admin — seul le boss ajoute / supprime / active)
// ============================================================
// Annuaire interne lisible par tout membre habilité (affectation de tâches,
// échanges inter-pôles) : uniquement les champs non sensibles, contrairement
// à /api/members qui reste réservé à la direction.
app.get('/api/members/directory', requireAuth, async (req: AuthReq, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(500).json({ error: 'Supabase non configurée' });
  const { data, error } = await sb
    .from('members')
    .select('id, name, role, pole, poste_titre, email, phone, active, avatar_url')
    .eq('active', true)
    .order('name', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ members: data || [] });
});

app.get('/api/members', requirePerm('admin'), async (_req, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(500).json({ error: 'Supabase non configurée' });
  const { data, error } = await sb.from('members').select('*').order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ members: data });
});

app.post('/api/members', requirePerm('admin'), async (req: AuthReq, res) => {
  try {
    const { name, email, password, role, pole, poste_id, poste_titre, phone, permissions } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Nom, email et mot de passe requis' });
    const sb = getSupabase();
    if (!sb) return res.status(500).json({ error: 'Supabase non configurée' });
    const { data: created, error: createErr } = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });
    if (createErr || !created.user) {
      return res.status(400).json({ error: createErr?.message || 'Échec création du compte' });
    }
    const perms = normalizePermissions(permissions);
    const { data: member, error: insErr } = await sb
      .from('members')
      .insert({
        id: created.user.id,
        name,
        email,
        phone: phone || null,
        role: role || 'membre',
        pole: pole || 'Direction',
        poste_id: poste_id || null,
        poste_titre: poste_titre || null,
        permissions: perms,
        active: true,
      })
      .select('*')
      .single();
    if (insErr) {
      await sb.auth.admin.deleteUser(created.user.id).catch(() => {});
      return res.status(400).json({ error: insErr.message });
    }
    await logActivity(req.member!, 'create', 'member', member.id, { name, email, role, pole });
    res.status(201).json({ member });
  } catch (err: any) {
    console.error('Create member error:', err);
    res.status(500).json({ error: String(err?.message || err) });
  }
});

app.patch('/api/members/:id', requirePerm('admin'), async (req: AuthReq, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, pole, poste_id, poste_titre, phone, permissions, active, password } = req.body;
    if (req.member!.id === id && (active === false || role === 'delete')) {
      return res.status(400).json({ error: 'Vous ne pouvez pas désactiver ou rétrograder votre propre compte administrateur.' });
    }
    const sb = getSupabase();
    if (!sb) return res.status(500).json({ error: 'Supabase non configurée' });
    const patch: any = { updated_at: new Date().toISOString() };
    if (name !== undefined) patch.name = name;
    if (email !== undefined) patch.email = email;
    if (phone !== undefined) patch.phone = phone;
    if (role !== undefined) patch.role = role;
    if (pole !== undefined) patch.pole = pole;
    if (poste_id !== undefined) patch.poste_id = poste_id;
    if (poste_titre !== undefined) patch.poste_titre = poste_titre;
    if (permissions !== undefined) patch.permissions = normalizePermissions(permissions);
    if (active !== undefined) patch.active = active;
    const { data: member, error } = await sb.from('members').update(patch).eq('id', id).select('*').single();
    if (error) return res.status(400).json({ error: error.message });
    if (password) await sb.auth.admin.updateUserById(id, { password }).catch(() => {});
    if (email !== undefined) await sb.auth.admin.updateUserById(id, { email }).catch(() => {});
    await logActivity(req.member!, 'update', 'member', id, { patch });
    res.json({ member });
  } catch (err: any) {
    res.status(500).json({ error: String(err?.message || err) });
  }
});

app.delete('/api/members/:id', requirePerm('admin'), async (req: AuthReq, res) => {
  try {
    const { id } = req.params;
    if (req.member!.id === id) return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte.' });
    const sb = getSupabase();
    if (!sb) return res.status(500).json({ error: 'Supabase non configurée' });
    await sb.auth.admin.deleteUser(id).catch(() => {});
    const { error } = await sb.from('members').delete().eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
    await logActivity(req.member!, 'delete', 'member', id, {});
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: String(err?.message || err) });
  }
});

app.get('/api/activity', requirePerm('admin'), async (_req, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(500).json({ error: 'Supabase non configurée' });
  const { data, error } = await sb.from('activity_log').select('*').order('created_at', { ascending: false }).limit(50);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ activity: data });
});

// ============================================================
// API Contenu (CMS public — lu publiquement, écrit par habilités)
// ============================================================
const CONTENT_KINDS = ['config', 'forfait', 'blog', 'realisation', 'temoignage'];

// Les `kind` stockes en base sont au singulier, les cles de reponse au pluriel
const KIND_TO_RESPONSE_KEY: Record<string, string> = {
  config: 'config',
  forfait: 'forfaits',
  blog: 'blog',
  realisation: 'realisations',
  temoignage: 'temoignages',
};

app.get('/api/content', async (_req, res) => {
  try {
    const items = await fetchContentItems();
    if (items.length === 0) {
      return res.json({ config: null, forfaits: [], blog: [], realisations: [], temoignages: [] });
    }
    const grouped = groupContent(items);
    res.json({
      config: grouped.config?.[0] || null,
      forfaits: grouped.forfaits || [],
      blog: grouped.blog || [],
      realisations: grouped.realisations || [],
      temoignages: grouped.temoignages || [],
    });
  } catch (err) {
    console.error('GET /api/content error:', err);
    res.status(500).json({ error: 'Erreur lecture du contenu' });
  }
});

app.put('/api/content/:kind/:slug', requirePerm('content'), async (req: AuthReq, res) => {
  try {
    const { kind, slug } = req.params;
    if (!CONTENT_KINDS.includes(kind)) return res.status(400).json({ error: 'Type de contenu inconnu' });
    const { data, title, published, position } = req.body;
    if (kind !== 'config' && data === undefined) return res.status(400).json({ error: 'Donnée manquante' });
    const sb = getSupabase();
    if (!sb) return res.status(500).json({ error: 'Supabase non configurée' });
    const payload: any = {
      kind,
      slug,
      title: title || null,
      published: published !== false,
      position: position ?? 0,
      updated_at: new Date().toISOString(),
    };
    if (data !== undefined) payload.data = data;
    const { data: row, error } = await sb
      .from('content_items')
      .upsert(payload, { onConflict: 'kind,slug' })
      .select('*')
      .single();
    if (error) return res.status(400).json({ error: error.message });
    await logActivity(req.member!, 'update', 'content', `${kind}/${slug}`, {});
    res.json({ item: row });
  } catch (err: any) {
    res.status(500).json({ error: String(err?.message || err) });
  }
});

app.post('/api/content/bulk', requirePerm('content'), async (req: AuthReq, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Items requis' });
    const sb = getSupabase();
    if (!sb) return res.status(500).json({ error: 'Supabase non configurée' });
    const rows = items.map((it: any, idx: number) => ({
      kind: it.kind,
      slug: it.slug,
      title: it.title || null,
      published: it.published !== false,
      position: it.position ?? idx,
      data: it.data || {},
    }));
    const { error } = await sb.from('content_items').upsert(rows, { onConflict: 'kind,slug' });
    if (error) return res.status(400).json({ error: error.message });
    await logActivity(req.member!, 'bulk_import', 'content', `${rows.length} items`, {
      kinds: [...new Set(rows.map((r) => r.kind))],
    });
    res.json({ success: true, imported: rows.length });
  } catch (err: any) {
    res.status(500).json({ error: String(err?.message || err) });
  }
});

app.delete('/api/content/:kind/:slug', requirePerm('content'), async (req: AuthReq, res) => {
  try {
    const { kind, slug } = req.params;
    const sb = getSupabase();
    if (!sb) return res.status(500).json({ error: 'Supabase non configurée' });
    const { error } = await sb.from('content_items').delete().match({ kind, slug });
    if (error) return res.status(400).json({ error: error.message });
    await logActivity(req.member!, 'delete', 'content', `${kind}/${slug}`, {});
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: String(err?.message || err) });
  }
});

// Gemini Client Lazy Initializer
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (aiClient) return aiClient;
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    return aiClient;
  }
  return null;
}

// Knowledge Base Rules for Public Agent
const SYSTEM_PROMPT_AGENT = `
Tu es le Conseiller Digital Officiel de l'agence Arckaton à Yaoundé (Cameroun, Mimboman).
Arckaton livre des "systèmes digitaux complets" pour PME africaines et internationales : sites premium, e-commerce Mobile Money (MTN/Orange), identité, marketing et le logiciel SaaS ARKA-PME (gestion stock/ventes/clients).

RÈGLES CAPITALES STRICTES :
1. Tu ne dois JAMAIS inventer de prix, de tarif sur mesure ou de chiffre financier non officiel.
2. Tu ne donnes PAS de prix directement pour un devis personnalisé : tu présentes les 3 forfaits de base officiels (leurs noms et ce qu'ils incluent) et tu orientes toujours le client vers le formulaire de devis interactif multi-étapes pour chiffrage humain par l'équipe.
3. Les 3 forfaits officiels sont :
   - Forfait Initiation : 380 000 FCFA création + 160 000 FCFA/mois (mini-site 3-5 pages, charte simplifiée, 6 sorties terrain/mois, délai 10-15 jours ouvrés).
   - Forfait Synergie (le plus choisi) : 750 000 FCFA création + 350 000 FCFA/mois (site 5-8 pages UX/UI, charte détaillée, 9 sorties terrain/mois + reporting mensuel, délai 3-4 semaines).
   - Forfait Architecture : 2 900 000 FCFA création + 580 000 FCFA/mois (e-commerce 50 produits, Mobile Money MTN/Orange, 3 vidéos/semaine, délai 6-10 semaines).
4. ARKA-PME : Logiciel SaaS de gestion de stock, caisse, clients et Mobile Money, conçu pour fonctionner même avec une connexion internet faible ou intermittente. Essai GRATUIT de 30 jours disponible. Fait passer l'inventaire de 3h au cahier à ~12 minutes.
5. LIVRAISON : Partout dans le monde ðŸŒ (le digital n'a pas de frontière). Travail 100% à distance avec support réactif.
6. PAIEMENT : FCFA, Mobile Money (MTN MoMo, Orange Money) ou virement bancaire. Acompte au démarrage + solde à la livraison. Le budget publicitaire est toujours séparé des honoraires.
7. PREUVES & CONTACT : +337% de conversion chez Maison Kotto, 12 840 000 FCFA consolidés chez Districash Nord, note 4.9/5 sur Google. WhatsApp : +237 681 46 29 82, email : ARCKATON12@gmail.com, bureau Mimboman Yaoundé.
8. INSTITUTIONNEL : Arckaton est la filiale technologique de SLOMAH SARL. Cette information peut être partagée de manière factuelle si le client l'évoque.

Ton style : Professionnel, chaleureux, concis, orienté conseil et conversion. Réponds en français soigné.
`;

// Helper for fallback intelligent responses when offline or without key
function generateSmartFallbackResponse(pole: string, userMessage: string): string {
  const msg = userMessage.toLowerCase();
  
  if (msg.includes('prix') || msg.includes('combien') || msg.includes('tarif') || msg.includes('coût') || msg.includes('cout')) {
    return `Chez Arckaton, nous fonctionnons avec 3 forfaits de référence clairs et transparents :

1. **Initiation** (Création 380 000 FCFA + 160 000 FCFA/mois) : Idéal pour démarrer avec un mini-site pro, charte simplifiée et 6 sorties terrain/mois.
2. **Synergie** (Création 750 000 FCFA + 350 000 FCFA/mois — *Le plus choisi*) : Système complet avec site UX/UI 5–8 pages, 9 sorties terrain, 2–3 infographies/semaine et reporting mensuel.
3. **Architecture** (Création 2,9 M FCFA + 580 000 FCFA/mois) : Plateforme e-commerce sur-mesure avec paiement direct Mobile Money MTN & Orange, synchronisation ARKA-PME et 3 vidéos/semaine.

Pour un chiffrage précis selon vos besoins spécifiques, je vous invite à cliquer sur **"Obtenir mon devis"** pour remplir notre formulaire interactif sans engagement. Notre équipe vous répond sous 24h !`;
  }

  if (msg.includes('arka') || msg.includes('logiciel') || msg.includes('stock') || msg.includes('inventaire') || msg.includes('essai')) {
    return `**ARKA-PME** est notre solution logicielle tout-en-un conçue pour les commerces et PME africaines.
    
Elle permet de gérer stocks, caisse, clients et encaissements Mobile Money (MTN et Orange) en un seul cockpit, avec un fonctionnement optimisé même sur **connexion faible ou intermittente**.
Notre référence Districash Nord gère 12 000 références et a réduit le temps d'inventaire de 3 heures à **12 minutes seulement**.

Vous bénéficiez d'un **essai gratuit de 30 jours sans engagement**. Souhaitez-vous que je vous ouvre le formulaire d'essai immédiat ?`;
  }

  if (msg.includes('cameroun') || msg.includes('yaoundé') || msg.includes('france') || msg.includes('étranger') || msg.includes('monde') || msg.includes('diaspora') || msg.includes('livraison')) {
    return `Absolument ! Bien que notre bureau principal soit situé à **Yaoundé (Mimboman, Cameroun)**, nous livrons nos systèmes digitaux **partout dans le monde ðŸŒ**.
Le digital n'a pas de frontières : nous accompagnons les entrepreneurs locaux comme la diaspora (Afrique Centrale, Europe, Amérique du Nord) à 100% à distance avec des points réguliers par visioconférence et WhatsApp dédié.`;
  }

  if (msg.includes('mobile money') || msg.includes('orange') || msg.includes('mtn') || msg.includes('paiement') || msg.includes('acompte')) {
    return `Nous acceptons les règlements en **FCFA**, par **Mobile Money (MTN MoMo, Orange Money)** et par virement bancaire. 
Nos modalités standard prévoient un acompte au démarrage du projet et le solde à la livraison après validation. À noter : le budget publicitaire des campagnes reste toujours distinct de nos honoraires.`;
  }

  return `Bonjour ! En tant que conseiller du pôle **${pole || 'Arckaton'}**, je suis à votre écoute pour concevoir votre système digital complet (site vitrine UX/UI, e-commerce Mobile Money MTN/Orange, identité visuelle, ou le logiciel SaaS ARKA-PME).

Quelle est votre activité et quel objectif souhaitez-vous atteindre en priorité ? Vous pouvez également demander directement une simulation via notre formulaire de devis interactif.`;
}

// API Routes
app.get("/api/health", async (_req, res) => {
  // Diagnostic Supabase (aucun secret expose) : etat du client service +Volume de contenu
  const supabase: { adminClient: boolean; anonClient: boolean; contentItems: number | null; error: string | null } = {
    adminClient: false,
    anonClient: false,
    contentItems: null,
    error: null,
  };
  try {
    const sb = getSupabase();
    supabase.adminClient = Boolean(sb);
    supabase.anonClient = Boolean(getSupabaseAnon());
    if (sb) {
      const { count, error } = await sb.from('content_items').select('*', { count: 'exact', head: true });
      if (error) supabase.error = error.message;
      else supabase.contentItems = count ?? 0;
    }
  } catch (err: any) {
    supabase.error = err?.message || 'exception inattendue';
  }
  res.json({ status: "ok", service: "Arckaton Express Backend", supabase });
});

// Agent Chat endpoint
app.post("/api/ai/agent-chat", async (req, res) => {
  try {
    const { pole, message, history } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message requis" });
    }

    const ai = getGeminiClient();
    if (ai) {
      try {
        const fullPrompt = `${SYSTEM_PROMPT_AGENT}\n\nPôle sollicité: ${pole || 'Direction'}\nHistorique récent: ${JSON.stringify(history || [])}\n\nClient: ${message}\nConseiller Arckaton:`;
        const response = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: fullPrompt,
        });

        const replyText = response.text || generateSmartFallbackResponse(pole, message);
        return res.json({ reply: replyText, source: "gemini" });
      } catch (geminiError) {
        console.warn("Gemini API call fell back to knowledge base:", geminiError);
        const fallback = generateSmartFallbackResponse(pole, message);
        return res.json({ reply: fallback, source: "knowledge_base" });
      }
    } else {
      const fallback = generateSmartFallbackResponse(pole, message);
      return res.json({ reply: fallback, source: "knowledge_base" });
    }
  } catch (err: any) {
    console.error("Agent chat error:", err);
    res.status(500).json({ error: "Erreur traitement chat" });
  }
});

// Generate conversation report for Arckaton OS Dashboard
app.post("/api/ai/generate-report", async (req, res) => {
  try {
    const { clientName, leadName, messages, pole, contactInfo, client_ref, summary: summaryOverride, recommendations, intention: intentionOverride, to_numbers } = req.body;
    
    // Determine intent
    const textAll = (messages || []).map((m: any) => m.text || m.content || '').join(' ').toLowerCase();
    let intention: 'devis' | 'essai' | 'information' = 'information';
    if (intentionOverride === 'devis' || intentionOverride === 'essai' || intentionOverride === 'information') {
      intention = intentionOverride;
    } else if (textAll.includes('essai') || textAll.includes('arka') || textAll.includes('tester') || textAll.includes('30 jours')) {
      intention = 'essai';
    } else if (textAll.includes('devis') || textAll.includes('budget') || textAll.includes('forfait') || textAll.includes('site') || textAll.includes('e-commerce') || textAll.includes('projet')) {
      intention = 'devis';
    }

    const summary = summaryOverride || `Échange avec ${clientName || 'visiteur'}. Le client s'est renseigné sur les solutions du pôle ${pole || 'Tech'}. Intention détectée : ${intention}. Recommandation : prise de contact par WhatsApp sous 24h.`;

    const report: StoredReport = {
      id: `rep-${Date.now()}`,
      client_name: clientName || leadName || 'Prospect Site Web',
      sujet: `Qualification ${intention.toUpperCase()} — Pôle ${pole || 'Direction'}`,
      pole: pole || 'Tech',
      resume: summary,
      intention,
      contact_info: contactInfo || 'À recueillir via WhatsApp',
      created_at: 'À l\'instant',
      status: 'non_traite',
      messages_count: Array.isArray(messages) ? messages.length : 1
    };

    const persisted = await persistReport({ ...report, client_ref: client_ref || report.id, recommendations: recommendations || [] });

    const bossNumber = BOSS_WHATSAPP.replace(/[^\d]/g, '');
    const targets = Array.isArray(to_numbers) && to_numbers.length
      ? to_numbers.map((n: string) => n.replace(/[^\d]/g, ''))
      : [bossNumber];
    if (!targets.includes(bossNumber)) targets.unshift(bossNumber);

    await persistOutbox({
      client_ref: client_ref || report.id,
      kind: 'report',
      to_numbers: targets,
      message: `Rapport IA (${intention.toUpperCase()}) — Pôle ${report.pole} — ${report.client_name} : ${report.resume}`.slice(0, 600),
    });

    reportsStore.unshift(report);

    res.json({ success: true, report, persisted });
  } catch (err: any) {
    console.error("Erreur génération rapport:", err);
    res.status(500).json({ error: "Erreur génération rapport" });
  }
});

// Leads API
app.post("/api/leads", async (req, res) => {
  try {
    const { name, email, phone, project_type, budget, message, source, country, statut, notes, pole_assigned, client_ref, to_numbers } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: "Nom et téléphone obligatoires" });
    }

    let poleAssigned = pole_assigned || 'Direction';
    const pType = (project_type || '').toLowerCase();
    if (pType.includes('e-commerce') || pType.includes('arka') || pType.includes('mobile money') || pType.includes('tech')) {
      poleAssigned = 'Tech';
    } else if (pType.includes('logo') || pType.includes('identité') || pType.includes('créat') || pType.includes('visuel')) {
      poleAssigned = 'Creatif';
    } else if (pType.includes('seo') || pType.includes('vitrine') || pType.includes('marketing') || pType.includes('ads')) {
      poleAssigned = 'Digital';
    } else if (pType.includes('terrain') || pType.includes('compte') || pType.includes('formation')) {
      poleAssigned = 'Client';
    }

    const newLead: StoredLead = {
      id: `lead-${Date.now()}`,
      name,
      email: email || '',
      phone,
      project_type: project_type || 'Système digital sur mesure',
      budget: budget || 'Sur devis',
      message: message || 'Demande transmise depuis le site public.',
      source: source || 'site_v2_devis',
      statut: statut || 'nouveau',
      notes: notes || '',
      pole_assigned: poleAssigned,
      country: country || 'Cameroun / International',
      created_at: 'À l\'instant'
    };

    // Persistance durable (Supabase si configuré, sinon mémoire)
    const persisted = await persistLead({ ...newLead, client_ref: client_ref || newLead.id });

    // File WhatsApp automatique (idempotente) : boss + pôle assigné
    const bossNumber = BOSS_WHATSAPP.replace(/[^\d]/g, '');
    const targets = Array.isArray(to_numbers) && to_numbers.length
      ? to_numbers.map((n: string) => n.replace(/[^\d]/g, ''))
      : [bossNumber];
    if (!targets.includes(bossNumber)) targets.unshift(bossNumber);

    await persistOutbox({
      client_ref: client_ref || newLead.id,
      kind: 'lead',
      to_numbers: targets,
      message: `Nouveau lead (${source || 'site_v2_devis'}) — ${name} — ${project_type || 'Projet digital'} — Tél: ${phone} — ${message || ''}`.slice(0, 600),
    });

    leadsStore.unshift(newLead);

    const waText = encodeURIComponent(
      `Bonjour Arckaton ! Je suis ${name}. J'ai configuré un projet de ${project_type || 'création digitale'}. Mon contact est le ${phone}. Merci de me recontacter.`
    );
    const waLink = `https://wa.me/237681462982?text=${waText}`;
    res.json({
      success: true,
      lead: newLead,
      whatsappLink: waLink,
      persisted,
    });
  } catch (err: any) {
    console.error("Erreur enregistrement lead:", err);
    res.status(500).json({ error: "Erreur enregistrement lead" });
  }
});

// La lecture des leads contient des noms, telephones et emails clients :
// elle est reservee aux membres habilites. L'ecriture (POST) reste publique
// car le formulaire de contact du site vitrine alimente le CRM.
app.get("/api/leads", requireAuth, async (_req, res) => {
  try {
    const serverLeads = await fetchLeadsServer();
    if (serverLeads !== null) {
      return res.json({ leads: serverLeads });
    }
  } catch (err) {
    console.warn("fetchLeadsServer fallback:", err);
  }
  res.json({ leads: leadsStore });
});

app.get("/api/reports", requireAuth, async (_req, res) => {
  try {
    const serverReports = await fetchReportsServer();
    if (serverReports !== null) {
      return res.json({ reports: serverReports });
    }
  } catch (err) {
    console.warn("fetchReportsServer fallback:", err);
  }
  res.json({ reports: reportsStore });
});

// ------------------------------------------------------------
// Projets clients (portail BAT + suivi d'evolution)
// Toutes les routes exigent une session Arckaton OS valide :
// lecture pour tout membre habilité, ecriture reservee a la direction.
// ------------------------------------------------------------
app.get("/api/projects", requireAuth, async (_req, res) => {
  try {
    const serverProjects = await fetchProjectsServer();
    if (serverProjects !== null) {
      return res.json({ projects: serverProjects });
    }
  } catch (err) {
    console.warn("fetchProjectsServer fallback:", err);
  }
  res.json({ projects: [] });
});

app.post("/api/projects", requirePerm('admin'), async (req: AuthReq, res) => {
  try {
    const body = req.body || {};
    if (!body.client_name) {
      return res.status(400).json({ error: "Nom du client obligatoire" });
    }
    const ref = body.project_ref || body.id || `prj-${Date.now()}`;
    const project: StoredProject = {
      ...body,
      id: body.id || ref,
      project_ref: ref,
      client_code: body.client_code || (String(ref).startsWith('PRJ-') ? String(ref) : `PRJ-${String(ref).replace(/^prj-/, '')}`),
      progression: Number(body.progression || 0),
      jalons: Array.isArray(body.jalons) ? body.jalons : [],
      sorties_terrain: Array.isArray(body.sorties_terrain) ? body.sorties_terrain : [],
      feedbacks: Array.isArray(body.feedbacks) ? body.feedbacks : [],
    };
    const persisted = await persistProject(project);
    res.json({ success: true, project: { ...project, project_ref: ref }, persisted });
  } catch (err: any) {
    console.error("Erreur enregistrement projet:", err);
    res.status(500).json({ error: "Erreur enregistrement projet" });
  }
});

app.put("/api/projects/:ref", requirePerm('admin'), async (req: AuthReq, res) => {
  try {
    const ref = req.params.ref;
    if (!ref) return res.status(400).json({ error: "Référence projet manquante" });
    const body = req.body || {};
    const project: StoredProject = { ...body, id: body.id || ref, project_ref: ref };
    const persisted = await persistProject(project);
    res.json({ success: true, project, persisted });
  } catch (err: any) {
    console.error("Erreur mise a jour projet:", err);
    res.status(500).json({ error: "Erreur mise a jour projet" });
  }
});

app.delete("/api/projects/:ref", requirePerm('admin'), async (req: AuthReq, res) => {
  try {
    const sb = getSupabase();
    if (!sb) return res.status(501).json({ error: "Supabase non configure" });
    const { error } = await sb.from('projects').delete().eq('project_ref', req.params.ref);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    console.error("Erreur suppression projet:", err);
    res.status(500).json({ error: "Erreur suppression projet" });
  }
});

// Copilot for Dashboard
app.post("/api/ai/copilot", async (req, res) => {
  try {
    // Le client envoie `message`, l'ancien code attendait `query` : on accepte les deux
    const { pole, pathname, role } = req.body;
    const query: string = req.body.query || req.body.message || "";
    if (!query) {
      return res.status(400).json({ error: "Question requise" });
    }
    const ai = getGeminiClient();
    
    if (ai) {
      try {
        const cockpit = req.body.leadsSummary || req.body.tasksSummary
          ? `\n\nContexte cockpit : ${JSON.stringify({ leads: req.body.leadsSummary, taches: req.body.tasksSummary })}`
          : "";
        const prompt = `Tu es le Copilote Opérationnel Arckaton OS pour le pôle ${pole || 'Direction'}.
L'utilisateur est ${role || 'membre'}, actuellement sur l'écran : ${pathname || 'Dashboard'}.${cockpit}
Question de l'utilisateur : ${query}.
Donne une recommandation concise, experte et orientée rentabilité/qualité en 100-150 mots maximum en français.`;

        const response = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: prompt,
        });

        const text = response.text || "Conseil Arckaton OS généré.";
        return res.json({ reply: text, advice: text, source: 'gemini', aiEnabled: true });
      } catch (err) {
        console.warn("Copilot Gemini indisponible:", err);
      }
    }

    // Default quick advice per pole
    const defaults: Record<string, string> = {
      Direction: "Priorisez la clôture des devis Synergie en cours et assurez le suivi du taux de marge brute (cible > 65%). Vérifiez l'avancement des 17 postes de l'organigramme.",
      Tech: "Pour ARKA-PME, maintenez le protocole de synchronisation hors-ligne pour garantir l'inventaire en 12 minutes. Validez les clés d'API Mobile Money MTN/Orange.",
      Creatif: "Préparez les 2 à 3 infographies hebdomadaires pour les clients Synergie et organisez le matériel photo pour la prochaine sortie terrain.",
      Digital: "Surveillez les requêtes locales SEO sur Yaoundé et Douala. Ajustez les audiences des campagnes d'acquisition pour maintenir le coût par lead qualifié sous 3 500 FCFA.",
      Client: "Contactez les prospects dès réception d'un lead sous 2h sur WhatsApp. Un temps de réponse rapide multiplie par 3 le taux de conversion en projet validé."
    };

    const advice = defaults[pole] || "Recommandation Arckaton OS : continuez l'excellence opérationnelle et le respect des 24h de réponse client.";
    // `aiEnabled` permet a l'UI d'afficher « IA non configuree » au lieu d'un silence
    res.json({ reply: advice, advice, source: 'knowledge_base', aiEnabled: Boolean(ai) });
  } catch (err) {
    res.status(500).json({ error: "Erreur copilote" });
  }
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));

    // PWA : service worker (jamais mis en cache long) & manifest
    app.get('/sw.js', (_req, res) => {
      res.setHeader('Content-Type', 'application/javascript');
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(distPath, 'sw.js'));
    });
    app.get('/manifest.webmanifest', (_req, res) => {
      res.setHeader('Content-Type', 'application/manifest+json');
      res.sendFile(path.join(distPath, 'manifest.webmanifest'));
    });
    app.get('/icons/:file', (req, res) => {
      res.sendFile(path.join(distPath, 'icons', req.params.file));
    });

    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    startWhatsAppWorker();
  });
}

startServer();
