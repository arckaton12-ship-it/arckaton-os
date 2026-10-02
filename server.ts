import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

// Acces aux donnees et authentification : PostgreSQL autonome.
//
// Le SDK Supabase a ete retire le <date>. L'inventaire de ce fichier
// avait montre qu'il n'y servait QUE de client PostgREST generique
// (11 tables, zero jointure) plus 6 appels d'identite. `src/db/adapter`
// reproduit la surface PostgREST utilisee, au-dessus de `pg` et en SQL
// parametre ; `src/db/auth` remplace GoTrue par des JWT maison.
//
// L'autorisation, elle, n'a pas bouge : `requirePerm`, `peutLireDevis`
// et `contentVisibility` restent la seule source de verite. Voir
// migrations/001_roles.sql pour pourquoi il n'y a pas de RLS.
import { from as dbFrom, query as dbQuery, isUniqueViolation, violatedConstraint, enLignes, enLigne } from "./src/db/adapter";
import {
  emettreJetons,
  verifierJetonAcces,
  verifierJetonRefresh,
  verifierMotDePasse,
  definirIdentifiants,
  supprimerIdentifiants,
  nouvelIdentifiantMembre,
  verifierIntegriteAuth,
} from "./src/db/auth";

// Chargement du .env.
//
// En test, on ne charge RIEN. Sans cette precaution, la suite de tests
// heredite des secrets du poste de developpement (SUPABASE_SERVICE_ROLE_KEY,
// GEMINI_API_KEY) et finit par appeler de vraies API : les tests deviennent
// dependants du reseau, consomment du quota Gemini, ecrivent eventuellement
// en base de production, et surtout passent au vert sur la machine du
// developpeur alors qu'ils echoueraient en CI.
//
// `process.env.NODE_ENV === 'test'` est positionne par vitest.config.ts
// avant tout import du module.
if (process.env.NODE_ENV !== 'test') {
  dotenv.config();
}

const app = express();

// Le port venait d'etre code en dur a 3000. Deux consequences :
//   - sur Render, la plateforme attribue un port via la variable
//     d'environnement `PORT` ; l'ignorer rend le deploiement dependant
//     d'une coincidence ;
//   - impossible de lancer une seconde instance locale (recette + appli
//     principale) sans modifier le source.
//
// `Number(...)` sur une variable absente ou vide donne NaN, d'ou le repli
// explicite : un `PORT` mal defini ne doit pas empecher le serveur de
// demarrer sur une valeur connue.
const PORT_PORT_ENV = Number(process.env.PORT);
const PORT = Number.isInteger(PORT_PORT_ENV) && PORT_PORT_ENV > 0 && PORT_PORT_ENV < 65536
  ? PORT_PORT_ENV
  : 3000;

// P0 — `trust proxy` manquant.
//
// Render place toutes les requetes derriere un proxy. Sans cette ligne,
// Express considere que req.ip vaut l'IP du proxy et ignore
// X-Forwarded-For. Le rateLimit ci-dessous se fie justement a
// X-Forwarded-For, mais en se dispensant de `trust proxy` il ne pouvait pas
// distinguer un vrai client d'un attaquant : la limitation etait contournable
// en une requete.
//
// `1` signifie « faire confiance au premier saut ». C'est le reglage
// correct pour un deploiement derriere un seul reverse proxy (Render). Ne pas
// mettre `true` : cela ferait confiance a la totalite de la chaine.
//
// HYPOTHESE DE SECURITE A NE PAS OUBLIER : cette valeur n'est sure que si
// le proxy de peripherie AJOUTE sa propre valeur a X-Forwarded-For
// (comportement standard de Render et Nginx). Avec `1`, Express prend le
// dernier segment ; si le proxy ne faisait que relayer l'en-tete tel quel
// fourni par le client, ce dernier segment serait choisi par l'attaquant et
// la limitation par IP serait contournable en changeant d'en-tete a chaque
// requete — comportement observe en local sur cette application.
//
// C'est precisement pour cela que la connexion dispose en plus d'un plafond
// par COMPTE (voir accountAttempts), qui ne depend d'aucune information
// reseau fournie par le client.
app.set('trust proxy', 1);

// P0 — En-tetes de securite et CORS strict.
//
// helmet n'etait pas installe : la reponse ne comportait ni
// X-Content-Type-Options, ni Referrer-Policy, ni protection contre le
// clickjacking, et exposait le framework dans X-Powered-By.
//
// Plutot que d'ajouter une dependance, on pose les en-tetes explicitement.
//
// La CSP n'est posee qu'en PRODUCTION. En developpement, @vitejs/plugin-react
// injecte un script inline dans index.html (le « preamble » de React
// Refresh) ; avec `script-src 'self'`, ce script etait bloque et
// `npm run dev` ne demarrait plus l'application. Les autres en-tetes
// (nosniff, DENY, Referrer-Policy) restent poses partout : ils ne cassent
// rien en developpement.
//
// Les origines listees sont celles reellement utilisees par le front,
// verifiees dans index.html et les composants : aucune image hors
// images.unsplash.com, aucun script inline, aucun eval, aucun iframe. Seul
// pair est manquant, ce qui est volontaire.
if (process.env.NODE_ENV === 'production') {
  app.use((_req, res, next) => {
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        // Vite compile les styles dans le bundle, mais Tailwind injecte
        // aussi des styles inline au runtime : 'unsafe-inline' est requis
        // pour style-src. Il ne l'est PAS pour script-src.
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' data: https://fonts.gstatic.com",
        "img-src 'self' data: blob: https://images.unsplash.com",
        "script-src 'self'",
        // Le front n'appelle que des URL same-origin via le proxy /api.
        "connect-src 'self'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; ')
    );
    next();
  });
}

app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

app.use(express.json({ limit: '256kb' }));

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
// Couche de persistance — PostgreSQL
//
// Le contrat est volontairement identique a celui de l'ancien
// `getSupabase()` : un objet null quand la base n'est pas configuree,
// pour que les replis en memoire et le mode degrade des tests
// continuent de fonctionner sans modification.
//
// Le `from` expose la meme surface que `.from(table)` du SDK
// (`select`, `eq`, `order`, `upsert`, `maybeSingle`…). Voir
// src/db/adapter.ts pour le detail, et la liste des methodes
// reellement utilisees par ce fichier.
let coucheDonnees: { from: typeof dbFrom; query: typeof dbQuery } | null = null;

function getSupabase() {
  if (coucheDonnees) return coucheDonnees;
  // Sans configuration, `dbFrom` retourne quand meme un objet : les
  // requetes echoueront avec une erreur explicite (« Base non
  // configuree »), ce qui est plus clair qu'un `null` a propager dans
  // 41 endpoints. On garde donc le test de configuration ici.
  const configuree =
    (process.env.DATABASE_URL && process.env.DATABASE_URL !== "MY_DATABASE_URL") ||
    (process.env.PGUSER && process.env.PGPASSWORD && process.env.PGDATABASE);
  if (!configuree) return null;
  coucheDonnees = { from: dbFrom, query: dbQuery };
  return coucheDonnees;
}

const BOSS_WHATSAPP = "+237681462982";

// Modeles Gemini (modifiable via env, dans l'ordre de preference).
//
// "gemini-2.5-flash" etait le defaut, mais Google le refuse aux nouveaux
// comptes : l'API repond 404 "no longer available to new users". Tous les
// appels IA echouaient donc en silence et le service tombait sur la base de
// connaissances, en renvoyant toujours source="knowledge_base".
//
// Mesures relevees sur le tier gratuit (5 appels simultanes par modele,
// 2026-09-27) :
//
//   modele                       200/5   latence   tokens   conformite
//   gemini-flash-lite-latest      5/5     2,2 s     377      3/3 forfaits
//   gemini-3.5-flash              5/5    14,8 s     ~900     3/3
//   gemini-3-flash-preview        5/5    15,4 s     886      3/3
//   gemini-flash-latest           4/5       -         -      surcharge
//   gemini-pro-latest             0/5       -         -      quota epuise
//   gemini-2.5-flash-lite         0/5       -         -      retire aux nouveaux comptes
//
// "flash-lite" est retenu en tete : 7x plus rapide, deux fois moins de tokens
// pour une reponse plus complete, et il encaisse la rafale la ou les autres
// renvoient 429. Les suivants servent de secours : quand un modele est
// indisponible (quota, surcharge), le chatbot ne doit pas basculer sur la base
// de connaissances, il doit essayer le suivant.
const GEMINI_MODELS = (
  process.env.GEMINI_MODELS || 'gemini-flash-lite-latest,gemini-3.5-flash,gemini-3-flash-preview'
)
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);
const GEMINI_MODEL = GEMINI_MODELS[0];

// Un echec "modele indisponible" ne justifie pas de reessayer le meme modele,
// mais un echec de cle ou de prompt, si.
//
// Le 404 compte volontairement : c'est la reponse de Google pour un modele
// retire ("no longer available to new users"), ce qui est exactement ce que
// renvoie "gemini-2.5-flash". Sans lui, une simple faute de frappe dans
// GEMINI_MODELS suffisait a faire tomber le chatbot sur la base de
// connaissances, alors qu'un modele valide attendait sur la ligne suivante.
function estIndisponible(err: any): boolean {
  const m = String(err?.message || err || '');
  return /quota|rate.?limit|\b429\b|overload|high demand|capacity|UNAVAILABLE|RESOURCE_EXHAUSTED|NOT_FOUND|\b404\b|\b500\b|\b502\b|\b503\b|\b504\b|no longer available|not found|timeout|ECONNRESET|fetch failed|socket hang up/i.test(m);
}

/**
 * Appelle Gemini en essayant les modeles de la chaine l'un apres l'autre.
 * Renvoie le texte et le modele reellement utilise, afin que la reponse
 * indique a l'appelant quel modele a repondu.
 */
async function generateWithFallback(
  ai: GoogleGenAI,
  request: Record<string, any>
): Promise<{ texte: string; model: string }> {
  // Sans borne de temps, un modele qui ne repond jamais bloque la chaine
  // entiere. Mesures en production : 2,2 s pour gemini-flash-lite-latest,
  // mais jusqu a 160 s pour gemini-3.5-flash quand le premier modele a
  // echoue. On borne donc chaque essai, et un depassement est traite comme
  // une indisponibilite : on passe au modele suivant au lieu d immobiliser
  // l'utilisateur.
  const budget = Number(process.env.GEMINI_TIMEOUT_MS) > 0
    ? Number(process.env.GEMINI_TIMEOUT_MS)
    : 60000;
  let dernierErreur: any = null;
  for (const model of GEMINI_MODELS) {
    try {
      const depart = Date.now();
      const reponse: any = await Promise.race([
        ai.models.generateContent({ ...request, model } as any),
        new Promise((_, rejeter) =>
          setTimeout(
            () => rejeter(new Error(`Timeout : delai depasse (${budget} ms) sur le modele ${model}`)),
            budget
          )
        ),
      ]);
      console.log(`[Gemini] ${model} a repondu en ${Date.now() - depart} ms`);
      const texte = (reponse?.text || '').toString().trim();
      if (texte) return { texte, model };
      dernierErreur = new Error(`Réponse vide du modèle ${model}`);
      console.warn(`[Gemini] ${model} a renvoyé une réponse vide`);
    } catch (err) {
      dernierErreur = err;
      if (!estIndisponible(err)) throw err;
      console.warn(
        `[Gemini] ${model} indisponible (${String(err?.message || err).slice(0, 120)}) → modèle suivant`
      );
    }
  }
  throw dernierErreur || new Error('Aucun modèle Gemini disponible');
}

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
    console.warn("Select projects:", error.message);
    return null;
  }
  return enLignes(data);
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
// Client « anon » : disparu.
//
// Il n'existait que pour appeler GoTrue (`auth.signInWithPassword`,
// `auth.getUser`, `auth.admin.*`). Ces six appels sont desormais
// locaux : `verifierMotDePasse` et `verifierJetonAcces`
// (src/db/auth.ts).
//
// Consequence searchingly utile : `requireAuth` ne fait plus un
// aller-retour reseau par requete authentifiee pour valider le
// jeton. La signature est verifiee en memoire, et le membre est
// charge en une seule requete. Le chemin authentifie passe de deux
// requetes reseau a une.

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

// Forme minimale necessaire pour decider d'une permission. Volontairement
// structurelle plutot que `MemberRow` : `id`, `name`, `email` et `pole` ne
// jouent aucun role dans une decision d'autorisation, et les lister
// obligerait les tests a fabriquer des enregistrements factices complets.
type ContentVisibilityMember = {
  active?: boolean;
  role?: string;
  permissions?: unknown;
};

// Accepte une forme structurelle plutot que `MemberRow` : seuls `active`,
// `role` et `permissions` determinent une permission. Cela permet aux
// regles metier derivees (comme `contentVisibility`) d'etre testees avec un
// objet minimal, sans passer par un cast.
function hasPerm(member: ContentVisibilityMember, perm: string): boolean {
  if (!member.active) return false;
  if (member.role === 'admin') return true;
  return normalizePermissions(member.permissions).includes(perm);
}

type AuthReq = express.Request & { member?: MemberRow };

// Variante non bloquante de `requireAuth`, pour les routes qui servent le
// MEME contenu a deux publics.
//
// `GET /api/content` alimente a la fois le site vitrine (public) et le
// back-office du CMS (membres ayant la permission `content`). Or le filtre
// anti-fuite de brouillons doit s'appliquer au public seulement : sinon
// l'editeur ne voit plus ses propres brouillons et ne peut plus les
// modifier.
//
// Cette fonction ne bloque jamais : en cas de jeton absent, invalide ou de
// configuration Supabase absente, elle laisse simplement `req.member` non
// defini, et la route sert alors la version publique.
//
// Court-circuit avant tout appel reseau : un jeton qui n'a pas la forme d'un
// JWT est rejete sans joindre Supabase. `GET /api/content` est publique, donc
// n'importe qui peut l'appeler ; sans ce filtre, une rafale de requetes
// anonymes portant `Authorization: Bearer n'importe-quoi` transformait une
// route de site vitrine en generateur d'appels sortants vers GoTrue, depuis
// des IP non authentifiees, pour un resultat toujours identique. Le plafond
// de 120/min par IP limite le debit mais n'empeche pas d'atteindre le quota
// de session d'un tiers partageant la meme adresse.
const JWT_RE = /^[\w-]+\.[\w-]+\.[\w-]+$/;
const MAX_TOKEN_LENGTH = 4096;

// `false` = jeton manifestement invalide, inutile d'aller le valider.
// Exporte pour etre teste directement : `optionalAuth` ne bloque jamais, donc
// le code HTTP de la reponse est identique (200) que le jeton ait ete
// ecarte ou valide. Un test base sur le statut ne prouve donc RIEN — c'est
// precisement pour ca que la regle est isolee ici.
function looksLikeJwt(token: string): boolean {
  return token.length <= MAX_TOKEN_LENGTH && JWT_RE.test(token);
}

async function optionalAuth(req: AuthReq, _res: any, next: any): Promise<void> {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return next();
  // Un jeton valide est un JWT : trois segments base64url separes par des
  // points. Un segment unique, ou un format inattendu, ne peut pas venir de
  // l'emittrice, inutile donc de l'aller demonter.
  //
  // Ce filtre garde sa valeur meme si la verification est devenue locale :
  // ecarter un `Authorization: Bearer <10 Ko de parasite>` sans meme
  // hmac fait gagner un calcul cryptographique sur chaque appel.
  if (!looksLikeJwt(token)) return next();
  try {
    // Verification locale : signature + expiration, sans appel reseau.
    const memberId = verifierJetonAcces(token);
    if (!memberId) return next();
    const member = await getMemberByUserId(memberId);
    if (member && member.active) req.member = member;
  } catch (err) {
    // Un jeton douteux ne doit jamais faire echouer la lecture publique.
    console.warn('optionalAuth: jeton ignore:', err);
  }
  return next();
}

async function requireAuth(req: AuthReq, res: any, next: any): Promise<void> {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    return res.status(401).json({ error: 'Authentification requise' });
  }

  // Base configuree ? Sans elle, aucune session n'a pu etre emise, et
  // repondre 503 distingue « service casse » de « jeton invalide ».
  if (!getSupabase()) {
    return res.status(503).json({ error: 'Service momentanément indisponible' });
  }

  try {
    // Signature et expiration verifiees en memoire : c'etait un aller-retour
    // vers GoTrue, donc la moitie des I/O du chemin authentifie.
    const memberId = verifierJetonAcces(token);
    if (!memberId) {
      return res.status(401).json({ error: 'Session invalide ou expirée' });
    }
    const member = await getMemberByUserId(memberId);
    if (!member) return res.status(403).json({ error: 'Compte non habilité Arckaton OS' });
    if (!member.active) return res.status(403).json({ error: 'Compte désactivé par la direction' });
    req.member = member;
    await next();
  } catch (err) {
    console.error('requireAuth error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Erreur authentification' });
  }
}

// ── Limitation de débit ────────────────────────────────────────────────
// Les routes IA du site public (agent, génération de rapport) sont
// volontairement ouvertes : elles sont utilisées par les visiteurs avant
// toute authentification. Sans plafond, une seule personne peut épuiser le
// quota Gemini et faire tomber le service pour tous les leads.
//
// Le compteur est en mémoire : il protège contre l'usage abusif courant
// sans ajouter de dépendance ni de coût. Il repart au redémarrage, ce qui
// est acceptable ici.
//
// P0 — le seau est identifie par (route, IP) et non par la seule IP.
//
// Le code precedent mutualisait un compteur unique pour toutes les routes
// protegees, partage par IP. Consequence concrete : un seul compteur pour
// `/api/leads` (5/min), `/api/ai/agent-chat` (10/min), `/api/auth/login`
// (10/15min) et le bootstrap. Un attaquant pouvait donc epuiser le quota de
// connexion en 10 requetes et, ce faisant, bloquer les depot de leads du
// site public — une deni de service laterally, de la page de contact vers
// l'authentification interne. Inversement, un attaquant pouvait siphonner le
// quota de leads pour faire echouer les tests de connexion.
//
// Chaque route a donc son propre compteur : le plafond que l'on declare
// est exactement celui qui s'applique a cette route.
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

// La recette multi-comptes enchaine 8+ connexions depuis une seule IP, et
// la limite de `/api/auth/login` est de 10 par quart d'heure. Deux consequences
// en local : la recette se bloque elle-meme, et il faut redemarrer le serveur
// pour vider les compteurs en memoire.
//
// `RATE_LIMIT_OFF=1` desactive ces plafonds, mais ONLY si la base visee est
// locale. En production, meme avec la variable posee, la parade reste active :
// un administrateur qui la poserait par megarde n'affaiblirait pas la
// securite. C'est la meme logique de verrouillage que dans les scripts de recette.
//
// La detection de « local » ne se base plus sur SUPABASE_URL, qui n'existe
// plus. Elle repose sur l'hote de la base, ce qui est la seule chose qui
// decide reellement ou atterrissent les donnees.
//
// Les trois conditions sont cumulatives et toutes obligatoires :
//   - `RATE_LIMIT_OFF=1` pose explicitement ;
//   - un hote de boucle locale (127.0.0.1, ::1, localhost) ;
//   - `NODE_ENV` different de `production`.
//
// La derniere est une ceinture sur une ceinture. Si la chaine de connexion
// designe un tunnel SSH, un proxy local ou un alias d'hote, les deux premieres
// conditions peuvent passer alors que la base est reellement distante. Comme
// le desactivation ne renvoie aucun signal a l'appelant — la reponse est
// identique — le seul remede serait de couper les plafonds sans le voir venir.
const HOSTS_LOCAUX = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

function hoteBaseCible(): string {
  // `DATABASE_URL` prime : c'est la forme utilisee en production, et elle
  // peut designer un hote distant meme si PGHOST dit local.
  const url = process.env.DATABASE_URL;
  if (url) {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return '';
    }
  }
  return (process.env.PGHOST || '').toLowerCase();
}

const BASE_LOCALE =
  HOSTS_LOCAUX.has(hoteBaseCible()) && process.env.NODE_ENV !== 'production';

const RATE_LIMIT_OFF = rateLimitsDesactives(process.env);

if (process.env.RATE_LIMIT_OFF === '1' && !RATE_LIMIT_OFF) {
  console.warn(
    '[rate-limit] RATE_LIMIT_OFF=1 IGNORE. Base cible : ' +
      (hoteBaseCible() || '(inconnue)') +
      ', NODE_ENV=' +
      (process.env.NODE_ENV || '(non defini)') +
      '. Les plafonds restent actifs.'
  );
}

function rateLimit(opts: { windowMs: number; max: number; message: string; scope: string }) {
  return (req: any, res: any, next: any) => {
    if (RATE_LIMIT_OFF) return next();
    // Render place tous les appels derrière un proxy : l'IP réelle est
    // dans X-Forwarded-For, et req.ip sinon vaudrait toujours le proxy.
    //
    // P0 : on ne lit plus le premier X-Forwarded-For fourni par le client.
    // Ce code en prenait la partie gauche, que l'attaquant controle
    // entierement : `X-Forwarded-For: 1.2.3.4` suffisait a repartir d'un
    // compteur neuf a chaque requete, ce qui neutralisait completement la
    // limitation.
    //
    // On lit `req.ip`, resolu par Express via la chaine de confiance
    // declaree par `app.set('trust proxy', 1)`. Avec la valeur 1, c'est le
    // dernier segment de X-Forwarded-For que le proxy de peripherie a
    // ajoute — donc l'IP reelle, et non une valeur choisie par le client.
    //
    // Attention : si le proxy de periphere ne fait qu'ecrire l'en-tete sans
    // y ajouter sa propre valeur, `req.ip` redevient pilotable par le
    // client. C'est pourquoi la connexion protege en plus les COMPTES
    // (accountAttempts), qui ne s'appuient sur aucune donnee reseau.
    const ip = req.ip || req.socket?.remoteAddress || 'inconnu';
    const key = `${opts.scope}|${ip}`;

    const now = Date.now();
    const bucket = rateBuckets.get(key);

    if (!bucket || now > bucket.resetAt) {
      rateBuckets.set(key, { count: 1, resetAt: now + opts.windowMs });
      return next();
    }

    bucket.count += 1;
    if (bucket.count > opts.max) {
      const wait = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(wait));
      return res.status(429).json({ error: opts.message });
    }
    next();
  };
}

// P0 — plafond par COMPTE, en complément du plafond par IP.
//
// Le plafond par IP repose sur `req.ip`, donc sur l'en-tete
// X-Forwarded-For. Or, avec `trust proxy = 1`, Express retient le dernier
// segment de cet en-tete : un client peut en choisir la valeur et
// repartager un compteur neuf a chaque tentative. Verifie sur cette
// application : deux appels avec le meme numero mais des
// X-Forwarded-For differents passent tous les deux.
//
// Consequence : le plafond par IP, seul, n'arrete PAS le bourrage
// d'identifiants (credential stuffing), qui vise un compte precis depuis
// un grand nombre d'adresses.
//
// On ajoute donc un second compteur indexe sur l'adresse email visee. Il
// resiste a la rotation d'IP : au bout de N echecs sur le meme compte,
// celui-ci est refuse quel que soit l'IP d'origine. C'est la parade
// standard, et elle se combine avec le plafond par IP : le robot distribue
// ses tentatives sur plusieurs IP (bloque par IP) et Concentre ensuite son
// reste sur une cible (bloque par compte).
const accountAttempts = new Map<string, { count: number; resetAt: number }>();

// 8 echecs sur 15 minutes : au-dela, le compte est temporairement verrouille
// pour cette fenetre. Assez tolerant pour un membre legitime qui se trompe
// de mot de passe, assez strict pour que le bourrage d'un compte ne soit pas
// rentable. Le compteur se remise a zero des la premiere reussite.
const ACCOUNT_MAX_FAILURES = 8;
const ACCOUNT_WINDOW_MS = 15 * 60_000;

function accountLocked(email: string): { locked: boolean; retryAfter: number } {
  // Meme condition que les plafonds par IP : local uniquement.
  if (RATE_LIMIT_OFF) return { locked: false, retryAfter: 0 };
  const entry = accountAttempts.get(email);
  if (!entry) return { locked: false, retryAfter: 0 };
  if (Date.now() > entry.resetAt) {
    accountAttempts.delete(email);
    return { locked: false, retryAfter: 0 };
  }
  if (entry.count >= ACCOUNT_MAX_FAILURES) {
    return {
      locked: true,
      retryAfter: Math.ceil((entry.resetAt - Date.now()) / 1000),
    };
  }
  return { locked: false, retryAfter: 0 };
}

function recordFailedAttempt(email: string) {
  const entry = accountAttempts.get(email);
  if (!entry || Date.now() > entry.resetAt) {
    accountAttempts.set(email, { count: 1, resetAt: Date.now() + ACCOUNT_WINDOW_MS });
    return;
  }
  entry.count += 1;
}

function clearFailedAttempts(email: string) {
  accountAttempts.delete(email);
}

// Purge périodique des compteurs.
//
// `accountAttempts` doit etre purge ici, et pas seulement lors d'une
// nouvelle tentative sur la meme adresse : sinon un attaquant qui envoie des
// adresses email arbitraires (et invalides) fait croitre la Map sans
// borne — une adresse n'est nettoyee que si on la re-teste apres expiration,
// ce que personne ne fera pour une adresse fantome.
setInterval(() => {
  const now = Date.now();
  rateBuckets.forEach((b, k) => {
    if (now > b.resetAt) rateBuckets.delete(k);
  });
  accountAttempts.forEach((a, k) => {
    if (now > a.resetAt) accountAttempts.delete(k);
  });
}, 60_000).unref?.();

// Verrou de bootstrap : voir la route POST /api/auth/bootstrap. Empeche
// deux creations d'administrateur concurrentes sur cette instance.
let bootstrapInProgress = false;

/**
 * Nom de l'index unique partiel interdisant deux administrateurs.
 *
 * Centralise ici parce que le code doit le comparer a `error.constraint`
 * pour distinguer « un admin existe deja » d'« email deja pris » : les
 * deux sont des violations d'unicite (23505), et le message de
 * PostgreSQL ne dit pas laquelle. Le nom du parametre `esbuild` etant
 * minifie, la comparaison doit se faire AVANT.
 *
 * Le nom ci-dessous doit correspondre a celui pose dans
 * migrations/002_schema.sql. Il est verifie par un test sur la base
 * reelle (tests/schema.constraints.test.ts) : si la migration est
 * renommee sans que le code soit suivi, le test echoue au lieu que
 * la reponse HTTP bascule silencieusement sur le mauvais message.
 */
const CONTRAINTE_ADMIN_UNIQUE = 'members_un_seul_admin';

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

// `onlyPublished` existe parce que le client de lecture utilise le role
// `service_role`, qui contourne les politiques RLS. La policy
// « content_items public read » (published = true) ne protege donc que les
// appels directs a Supabase depuis le navigateur : elle ne protegeait pas
// cette API, qui renvoyait les brouillons a tout le monde.
//
//   - appel public  → onlyPublished: true  (filtre applique par le serveur)
//   - appel admin   → onlyPublished: false (le back-office voit les brouillons)
//
// Le filtre est pose dans la CHAINE DE REQUETE, jamais en JavaScript ensuite :
// c'est la seule facon de garantir que les brouillons ne sont jamais
// transites, meme s'ils resident en memoire pendant le traitement.
//
// `fetchItems` est injectable pour que le test observe les contraintes
// reellement posees sur la requete. Une double de jeu qui applique
// elle-meme `filter(published)` resterait verte avec le `.eq` supprime — ce
// qui est exactement le defaut d'origine.
async function fetchContentItems(
  options: { onlyPublished?: boolean } = {},
  fetchItems: (sb: unknown, opts: { onlyPublished?: boolean }) => Promise<ContentRow[]> = queryContentItems
): Promise<ContentRow[]> {
  const sb = getSupabase();
  if (!sb) return [];
  return fetchItems(sb, options);
}

// Requete reelle. Le `.eq('published', true)` est LA ligne qui empeche la
// fuite : c'est elle que les tests doivent surveiller.
async function queryContentItems(
  sb: unknown,
  options: { onlyPublished?: boolean }
): Promise<ContentRow[]> {
  const client = sb as { from: (table: string) => ChainableQuery };
  let query = client.from('content_items').select('*').order('position', { ascending: true });
  if (options.onlyPublished) {
    query = query.eq('published', true);
  }
  // Le client Supabase reel est un thenable : `await` declenche `then`, qui
  // resout la requete. Les tests fournissent une chaine non-thenable
  // dotee de `execute()`, d'ou l'appel explicite ci-dessous.
  const result = typeof query.execute === 'function'
    ? await query.execute()
    : await query;
  const { data, error } = result as { data: unknown[] | null; error: { message: string } | null };
  if (error) {
    console.warn('content_items select:', error.message);
    return [];
  }
  return (data || []) as ContentRow[];
}

// Sous-ensemble du client Supabase utilise par `queryContentItems`.
//
// `then` rend la chaine awaitable, comme le client reel. `execute` est un
// point d'arret explicite, absent du client reel : il permet aux tests de
// fournir une chaine non-thenable. Sans lui, `await` sur une telle chaine
// ne declencherait aucune resolution et renverrait l'objet brut.
interface ChainableQuery {
  select: (columns: string) => ChainableQuery;
  order: (column: string, options: { ascending: boolean }) => ChainableQuery;
  eq: (column: string, value: boolean) => ChainableQuery;
  execute?: () => Promise<{ data: unknown[] | null; error: { message: string } | null }>;
  then: <T>(
    onFulfilled: (value: { data: unknown[] | null; error: { message: string } | null }) => T
  ) => Promise<T>;
}

// Repartit les elements par famille pour la reponse de `GET /api/content`.
//
// Deux precautions, toutes deux publiees par le reviewer :
//
// 1. Seules les familles DECLARES dans `KIND_TO_RESPONSE_KEY` sont retenues.
//    Avant, un `kind` inconnu (ou introduit par erreur) créait une clé
//    dynamique dans la reponse publique : un brouillon portant un `kind`
//    hors liste se retrouvait donc exposé sous sa propre clé, meme avec le
//    filtre `published` intact.
//
// 2. Le dictionnaire est cree avec `Object.create(null)`. Sur un objet
//    litteral, un `kind` valant `__proto__` ou `constructor` faisait
//    retourner `Object.prototype` a `grouped[key]` — truthy — et le
//    `.push()` suivant polluait le prototype global du processus. Le risque
//    suppose un acces direct a la table (le `service_role` ignore les
//    policies RLS), mais la parade coute trois caracteres.
function groupContent(items: ContentRow[]): Partial<Record<ContentResponseKey, unknown[]>> {
  const grouped = Object.create(null) as Partial<Record<ContentResponseKey, unknown[]>>;
  for (const item of items) {
    // `hasOwnProperty` est indispensable : sur un objet litteral,
    // `KIND_TO_RESPONSE_KEY['constructor']` renvoie la fonction `Object`, et
    // `['toString']` la methode heritee — toutes deux truthy. Un simple test
    // de presence laissait donc passer ces pseudo-familles, dont la cle
    // convoluee devenait "[object Object]". Une ligne `kind: 'toString'`
    // suffisait a creer une cle parasite dans la reponse publique.
    const key = Object.prototype.hasOwnProperty.call(KIND_TO_RESPONSE_KEY, item.kind)
      ? KIND_TO_RESPONSE_KEY[item.kind]
      : undefined;
    // Famille inconnue : ignoree volontairement (voir point 1).
    if (!key) continue;
    if (!grouped[key]) grouped[key] = [];
    grouped[key]!.push(item.data);
  }
  return grouped;
}

// ============================================================
// API Auth (login membres Arckaton OS)
// ============================================================
// P0 — limitation de debit sur l'authentification.
//
// `/api/auth/login` n'etait pas plafonnee : la seule parade etait la
// protection de Supabase Auth, elle-meme submetue a ses propres quotas.
// Un attaquant pouvait donc tester des couples email/mot de passe sans
// limite, ce qui est la premiere etape d'une prise de controle.
//
// 10 tentatives par quart d'heure et par IP : assez large pour qu'un membre
// legitime se trompe de mot de passe plusieurs fois, assez serre pour
// rendre le forcage_brut inefficace. La reponse d'echec reste identique
// (401 "Identifiants invalides") quel que soit le motif, pour ne pas
// reveler quelles adresses existent.
app.post(
  '/api/auth/login',
  rateLimit({
    windowMs: 15 * 60_000,
    max: 10,
    scope: 'auth:login',
    message: 'Trop de tentatives de connexion. Reessayez dans quelques minutes.',
  }),
  async (req, res) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });
      if (typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'Email et mot de passe requis' });
      }

      // Normalise l'identifiant avant tout comptage : `  Direction@Test.COM`
      // et `direction@test.com` doivent peser sur le meme compteur, sinon la
      // parade par compte se contourne en changeant la casse ou en ajoutant
      // des espaces.
      const normalizedEmail = email.trim().toLowerCase().slice(0, 200);

      // Verrou par compte, valable quelle que soit l'IP d'origine. Ce
      // controle est place AVANT la verification du backend : un compte
      // verrouille doit rester verrouille meme si l'authentification est
      // momentanement indisponible, et la parade ne peut pas dependre de la
      // disponibilite d'un service tiers.
      const lock = accountLocked(normalizedEmail);
      if (lock.locked) {
        res.setHeader('Retry-After', String(lock.retryAfter));
        return res.status(429).json({
          error: 'Compte temporairement verrouille apres trop de tentatives. Reessayez plus tard.',
        });
      }

      if (!getSupabase()) {
        // Erreur d'infrastructure : on ne compte PAS cet essai. Compter ici
        // permettrait a quiconque de verrouiller un compte tiers en provoquant
        // des pannes, ou en attaquant pendant que l'auth est indisponible.
        return res.status(500).json({ error: 'Authentification non configurée (DATABASE_URL / PGUSER manquants)' });
      }

      // Verification locale du mot de passe (bcrypt) contre
      // `member_credentials`. Remplace `auth.signInWithPassword`.
      const memberId = await verifierMotDePasse(normalizedEmail, password.slice(0, 200));
      if (!memberId) {
        recordFailedAttempt(normalizedEmail);
        return res.status(401).json({ error: 'Identifiants invalides' });
      }
      // Reussite : on rend le compteur au compte.
      clearFailedAttempts(normalizedEmail);

      const member = await getMemberByUserId(memberId);
      if (!member) return res.status(403).json({ error: 'Compte non habilité Arckaton OS. Contactez la direction.' });
      if (!member.active) return res.status(403).json({ error: 'Compte désactivé par la direction.' });

      const session = emettreJetons(member.id);
      if (!session) {
        // JWT_SECRET absent ou trop court : on ne peut pas emettre de jeton
        // sur une cle devinee, donc pas de session.
        console.error('Login: JWT_SECRET absent ou trop court.');
        return res.status(500).json({ error: 'Authentification non configurée (JWT_SECRET manquant)' });
      }

      await logActivity(member, 'login', 'member', member.id, {});
      // Le refresh token est renvoyé au navigateur : sans lui, la session
      // expire au bout d'une heure et l'utilisateur reste affiche comme
      // connecte alors que toutes les requetes renvoient 401.
      res.json({
        token: session.token,
        refreshToken: session.refreshToken,
        expiresIn: session.expiresIn,
        member,
      });
    } catch (err: any) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Erreur de connexion' });
    }
  }
);

/**
 * Renouvellement de session.
 *
 * Supabase expire les jetons d'accès au bout d'une heure environ. Sans cet
 * appel, l'utilisateur reste connecté côté interface mais perd l'accès à
 * toutes les données, et l'onglet Membres affiche "session invalide"
 * suivi de "aucun membre trouvé", ce qui donne l'impression que l'annuaire
 * est vide alors que c'est la session qui est périmée.
 */
// P0 — plafond sur le renouvellement. Sans lui, un refresh token vole
// pouvait etre rejoue indefiniment pour renouveler une session volee.
app.post(
  '/api/auth/refresh',
  rateLimit({
    windowMs: 15 * 60_000,
    max: 30,
    scope: 'auth:refresh',
    message: 'Trop de renouvellements de session. Reessayez dans quelques minutes.',
  }),
  async (req, res) => {
    const { refreshToken } = req.body || {};
    if (!refreshToken || typeof refreshToken !== 'string') {
      return res.status(400).json({ error: 'Refresh token manquant' });
    }
    if (!getSupabase()) return res.status(500).json({ error: 'Authentification non configurée' });
    try {
      // Remplace `auth.refreshSession`. Deux changements par rapport a
      // GoTrue :
      //
      //  - le membre est re-verifie. GoTrue ne le faisait pas : un refresh
      //    rejoue sur un compte desactivé rendait un access token valide,
      //    rejete ensuite par requireAuth (403). Le comportement visible
      //    est identique, mais on evite d'emettre un jeton pour un compte
      //    qui n'a plus le droit d'en avoir un.
      //
      //  - un nouveau refresh token est emis. GoTrue rotait aussi, mais
      //    ici c'est explicite : le client remplace son jeton, donc un
      //    ancien reste valide jusqu'a expiration (comportement
      //    identique a celui d'aujourd'hui, documente dans src/db/auth).
      const memberId = verifierJetonRefresh(refreshToken);
      if (!memberId) {
        return res.status(401).json({ error: 'Session non renouvelable, reconnectez-vous' });
      }

      const member = await getMemberByUserId(memberId);
      if (!member || !member.active) {
        return res.status(401).json({ error: 'Session non renouvelable, reconnectez-vous' });
      }

      const session = emettreJetons(member.id);
      if (!session) {
        console.error('Refresh: JWT_SECRET absent ou trop court.');
        return res.status(500).json({ error: 'Authentification non configurée' });
      }

      res.json({
        token: session.token,
        refreshToken: session.refreshToken,
        expiresIn: session.expiresIn,
      });
    } catch (err: any) {
      console.error('Refresh error:', err);
      res.status(500).json({ error: 'Erreur de renouvellement' });
    }
  }
);

app.post('/api/auth/logout', requireAuth, async (req: AuthReq, res) => {
  res.json({ success: true });
});

// ---- Bootstrap du premier admin (création du compte Directeur) ----
//
// P0 — plafond sur les deux routes. Le bootstrap cree un compte
// administrateur depuis Internet : sans limite, un attaquant pouvait
// inonder la route pendant la fenetre de premier demarrage. 5 tentatives
// par heure suffisent largement a un directeur.
app.get(
  '/api/auth/bootstrap',
  rateLimit({ windowMs: 60 * 60_000, max: 5, scope: 'auth:bootstrap:status', message: 'Trop de tentatives. Réessayez plus tard.' }),
  async (_req, res) => {
    try {
      const sb = getSupabase();
      if (!sb) return res.status(500).json({ error: 'Base de données non configurée' });
      const { data, error } = await sb.from('members').select('id').eq('role', 'admin').limit(1).maybeSingle();
      if (error) return res.status(500).json({ error: 'Base inaccessible: ' + error.message });
      res.json({ needs: !data });
    } catch (err) {
      res.status(500).json({ error: 'Erreur bootstrap' });
    }
  }
);

app.post(
  '/api/auth/bootstrap',
  rateLimit({ windowMs: 60 * 60_000, max: 5, scope: 'auth:bootstrap:create', message: 'Trop de tentatives. Réessayez plus tard.' }),
  async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nom, email et mot de passe requis' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Mot de passe : 6 caractères minimum' });
    }
    const admin = getSupabase();
    if (!admin) return res.status(500).json({ error: 'Base de données non configurée' });

    const { data: existing } = await admin.from('members').select('id').eq('role', 'admin').limit(1).maybeSingle();
    if (existing) return res.status(403).json({ error: 'Un administrateur existe déjà (bootstrap effectué)' });

    // P0 — course entre deux bootstraps concurrents.
    //
    // Le controle ci-dessus (SELECT) et l'INSERT sont deux requetes
    // distinctes : deux requetes simultanees lisaient toutes deux
    // « aucun admin », puis toutes deux creaient un compte. Resultat :
    // plusieurs administrateurs, dont un cree par un tiers depuis
    // Internet.
    //
    // Le verrou applicatif ci-dessous evite de faire deux hachages
    // bcrypt (cout 12, ~200 ms chacun) sur une requete qui sera
    // rejetee. Il ne suffit pas : il est local au process, donc sans
    // effet sur une seconde instance. La garantie reelle est la
    // contrainte `members_un_seul_admin` (UNIQUE partielle sur
    // `role = 'admin'`) posee dans migrations/002_schema.sql. Deux
    // instances concurrentes se disputent cette contrainte, et l'une
    // recoit une violation d'unicite — traduite plus bas en 409.
    const withBootstrapLock = async <T>(fn: () => Promise<T>): Promise<T | 'busy'> => {
      if (bootstrapInProgress) return 'busy';
      bootstrapInProgress = true;      try {
        return await fn();
      } finally {
        bootstrapInProgress = false;
      }
    };

    const result = await withBootstrapLock(async () => {
      // Second controle, cette fois sous verrou : si un administrateur
      // existe, on refuse sans bcrypt.
      //
      // ATTENTION — cette condition etait inversee. Le code d'origine
      // portait `if (!stillNone) return 'busy'`, c'est-a-dire « s'il
      // n'y a AUCUN administrateur, refuse ». Le bootstrap repondait
      // donc toujours 409 « Initialisation deja en cours », y compris
      // sur une base vide et au tout premier lancement. Personne ne
      // pouvait donc creer le premier compte, et la seule facon de
      // sortir de l'etat « pas d'admin » etait l'interface
      // d'accueil, qui appelait une autre route.
      //
      // Le test de recette ne l'avait pas vu : il demarrait avec un
      // admin deja en base, donc la branche n'etait jamais prise.
      const { data: stillNone } = await admin.from('members').select('id').eq('role', 'admin').limit(1).maybeSingle();
      if (stillNone) {
        return { conflict: true, message: 'Un administrateur existe déjà (bootstrap effectué)' } as const;
      }

      // L'identifiant est genere ici : GoTrue le faisait, et
      // `members.id` le recyclait tel quel. Format inchange (uuid).
      const memberId = nouvelIdentifiantMembre();

      // Le membre est insere AVANT les identifiants, pour que
      // `member_credentials.member_id` (ON DELETE CASCADE) ait une
      // cible. L'inverse laisserait des identifiants orphelins si
      // l'INSERT membre echouait.
      //
      // Note : `isUniqueViolation` distingue le cas « un autre admin
      // vient d'etre cree » (409, le client doit recharger) d'une
      // erreur de saisie (400). Sans cette distinction, un email deja
      // pris et un bootstrap rejoue renvoyaient la meme erreur, et le
      // second cas ressemblerait a une panne alors que la base etait
      // parfaitement saine.
      const { data: memberRow, error: memberErr } = await admin
        .from('members')
        .insert({
          id: memberId,
          name,
          email,
          phone: phone || null,
          role: 'admin',
          pole: 'Direction',
          poste_titre: 'Directeur Général',
          permissions: [],
          active: true,
        })
        .select('*')
        .single();
      if (memberErr) {
        if (isUniqueViolation(memberErr)) {
          return { conflict: true, message: 'Un administrateur existe déjà (bootstrap effectué)' } as const;
        }
        return { failure: 'Échec enregistrement du membre: ' + memberErr.message } as const;
      }

      // Remplace `auth.admin.createUser` : l'email vit desormais dans
      // `member_credentials` (et dans `members` pour l'affichage), et
      // le hash bcrypt ici. Le compte n'existe que si les deux INSERT
      // reussissent.
      const ok = await definirIdentifiants(memberId, String(email), String(password));
      if (!ok) {
        // Remise en etat : sans le membre, les identifiants n'ont plus
        // de cible et le compte n'existe pas. Sans ce nettoyage, on
        // laisserait un admin sans mot de passe — un compte que
        // personne ne peut ouvrir, et que le bootstrap refuse ensuite
        // de recreer (l'admin existe deja).
        await admin.from('members').delete().eq('id', memberId);
        return { failure: 'Compte créé mais connexion impossible — réessayez.' } as const;
      }

      // Emission directe plutot qu'un second appel `signInWithPassword`
      // : le mot de passe vient d'etre verifie, le refaire serait un
      // bcrypt de plus pour obtenir exactement le meme resultat.
      const session = emettreJetons(memberId);
      if (!session) {
        await supprimerIdentifiants(memberId);
        await admin.from('members').delete().eq('id', memberId);
        return { failure: 'Authentification non configurée (JWT_SECRET manquant)' } as const;
      }

      await admin
        .from('activity_log')
        .insert({
          actor_id: memberId,
          actor_name: name,
          action: 'bootstrap admin',
          kind: 'member',
          ref: memberId,
          details: { note: 'Création du compte Directeur (premier admin)' },
        });

      return { token: session.token, member: memberRow } as const;
    });
    if (result === 'busy') {
      return res.status(409).json({ error: 'Initialisation déjà en cours. Réessayez dans un instant.' });
    }
    if ('conflict' in result) {
      return res.status(409).json({ error: result.message });
    }
    if ('failure' in result) {
      return res.status(400).json({ error: result.failure });
    }
    res.json({ token: result.token, member: result.member });
  } catch (err: any) {
    console.error('Bootstrap error:', err);
    res.status(500).json({ error: 'Erreur initialisation' });
  }
  }
);

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
  if (!sb) return res.status(500).json({ error: 'Base de données non configurée' });
  const { data, error } = await sb
    .from('members')
    .select('id, name, role, pole, poste_titre, email, phone')
    .eq('active', true)
    .order('name', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ members: data || [] });
});

app.get('/api/members', requirePerm('admin'), async (_req, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(500).json({ error: 'Base de données non configurée' });
  const { data, error } = await sb.from('members').select('*').order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ members: data });
});

app.post('/api/members', requirePerm('admin'), async (req: AuthReq, res) => {
  try {
    const { name, email, password, role, pole, poste_id, poste_titre, phone, permissions } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Nom, email et mot de passe requis' });
    const sb = getSupabase();
    if (!sb) return res.status(500).json({ error: 'Base de données non configurée' });

    const perms = normalizePermissions(permissions);
    // L'identifiant est genere ici (GoTrue le faisait puis le code
    // recyclait comme `members.id`). Format inchange : uuid.
    const memberId = nouvelIdentifiantMembre();

    // Membre d'abord, identifiants ensuite : `member_credentials` est
    // lie a `members` par ON DELETE CASCADE, donc les identifiants
    // n'ont pas de cible si le membre n'existe pas.
    const { data: member, error: insErr } = await sb
      .from('members')
      .insert({
        id: memberId,
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
      // Un email deja utilise, ou un second admin, echouent ici — la
      // base tranche avant qu'on ne fasse un bcrypt inutile. La
      // violation d'unicite est traduite en 409 pour qu'elle se
      // distingue d'une erreur de saisie.
      if (isUniqueViolation(insErr)) {
        const contrainte = violatedConstraint(insErr);
        return res.status(409).json({
          error:
            contrainte === CONTRAINTE_ADMIN_UNIQUE
              ? 'Un administrateur existe déjà (bootstrap effectué)'
              : 'Cette adresse email est déjà utilisée.',
        });
      }
      return res.status(400).json({ error: insErr.message });
    }

    // Remplace `auth.admin.createUser` : bcrypt + INSERT dans
    // `member_credentials`.
    const ok = await definirIdentifiants(memberId, String(email), String(password));
    if (!ok) {
      // Remise en etat. Sans ce DELETE, le membre existerait sans
      // identifiants : un compte que personne ne peut ouvrir, que
      // l'admin devrait supprimer a la main.
      await sb.from('members').delete().eq('id', memberId);
      return res.status(400).json({ error: 'Échec création du compte' });
    }

    await logActivity(req.member!, 'create', 'member', enLigne(member)?.id, { name, email, role, pole });
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
    if (!sb) return res.status(500).json({ error: 'Base de données non configurée' });
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
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
    if (error) {
      if (isUniqueViolation(error) && violatedConstraint(error) === CONTRAINTE_ADMIN_UNIQUE) {
        return res.status(409).json({ error: 'Un administrateur existe déjà (bootstrap effectué)' });
      }
      return res.status(400).json({ error: error.message });
    }

    // Remplace `auth.admin.updateUserById`.
    //
    // ATTENTION — correction d'un bug de l'ancien code. Les deux
    // appels `updateUserById` portaient un `.catch(() => {})` : leurs
    // erreurs etaient avalees. Un changement d'email ou de mot de
    // passe qui echouait (email deja pris chez GoTrue) laissait la
    // reponse 200 : l'admin croyait avoir change le mot de passe,
    // alors que l'ancien restait actif. C'est le genre d'echec qui se
    // decouvre des la premiere connexion ratsee par l'utilisateur.
    //
    // On propage donc l'echec, en distinguant l'unicite (409) des
    // autres cas. Le mot de passe est reecrit integralement, donc
    // l'ancien est invalide immediatement.
    if (password !== undefined && password !== null && password !== '') {
      const cible = member as { email?: string } | null;
      const emailCible = email !== undefined ? String(email) : cible?.email;
      if (!emailCible) {
        return res.status(400).json({ error: 'Email manquant : impossible de définir un mot de passe' });
      }
      const ok = await definirIdentifiants(id, emailCible, String(password));
      if (!ok) {
        return res.status(400).json({ error: 'Échec de la mise à jour du mot de passe' });
      }
    }
    if (email !== undefined) {
      // L'email est aussi la clef de connexion : sans cette mise a
      // jour, `member_credentials` garderait l'ancien et le membre ne
      // pourrait plus se connecter avec sa nouvelle adresse.
      const { error: credErr } = await sb
        .from('member_credentials')
        .update({ email: String(email).toLowerCase() })
        .eq('member_id', id);
      if (credErr) {
        if (isUniqueViolation(credErr)) {
          return res.status(409).json({ error: 'Cette adresse email est déjà utilisée.' });
        }
        return res.status(400).json({ error: credErr.message });
      }
    }

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
    if (!sb) return res.status(500).json({ error: 'Base de données non configurée' });

    // Remplace `auth.admin.deleteUser(id)` puis `members.delete()`.
    //
    // Deux requetes etaient necessaires parce que le compte vivait dans
    // `auth.users` et le membre dans `members`, sans lien entre eux :
    // si le second DELETE echouait, le compte d'authentification
    // survivait sans profil. Ici, les identifiants sont lies a
    // `members` par ON DELETE CASCADE : un seul DELETE suffit et il
    // est atomique. Il n'y a plus d'etat intermediaire ou l'orphanelin
    // est possible.
    const { error } = await sb.from('members').delete().eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
    await logActivity(req.member!, 'delete', 'member', id, {});
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: String(err?.message || err) });
  }
});

// ==============================================================
// Devis : lecture restreinte
//
// Le serveur controle l'ecriture mais laissait la lecture ouverte a
// tout membre connecte : un stagiaire lisait l'integralite des devis
// commerciaux (clients, montants, marges). La lecture est desormais
// limitee aux trois postes qui en ont besoin dans leur travail :
//
//   p1  Chef d'Agence            pilotage et rentabilite
//   p11 Directeur Commercial     emission et suivi des devis
//   p14 Comptable / Expert Fiscal facturation et TVA
//
// Le role admin passe toujours : c'est la direction.
//
// On separe `poste` et `pole` volontairement. Les trois postes sont
// aujourd'hui tous en pole "Direction", mais ajouter un pole Direction
// (un Responsable administratif, par exemple) ne doit pas ouvrir
// l'acces aux devis par effets de bord.
const POSTES_AUTORISES_DEVIS = ['p1', 'p11', 'p14'];

function peutLireDevis(member: MemberRow): boolean {
  if (!member || !member.active) return false;
  if (member.role === 'admin') return true;
  return !!member.poste_id && POSTES_AUTORISES_DEVIS.includes(String(member.poste_id));
}

const requireDevis = async (req: AuthReq, res: any, next: any) => {
  await requireAuth(req, res, () => {
    if (!peutLireDevis(req.member!)) {
      return res.status(403).json({
        error: 'Accès aux devis réservé au Chef d\'Agence, au Directeur Commercial et à la Comptabilité',
      });
    }
    next();
  });
};

// ==============================================================
// Taches (tableau Kanban) et messagerie interne
//
// Ces deux fonctions vivaient uniquement dans le localStorage : une
// tache ou un message n'existait que dans le navigateur de son auteur.
// Le directeur ouvrait l'OS sur son telephone et trouvait un tableau
// vide. Elles passent en base, avec reponse en cache local pour
// continuer a fonctionner hors connexion.
// ==============================================================

interface TaskRow {
  id: string;
  titre: string;
  description?: string;
  statut: string;
  priorite?: string;
  pole?: string;
  assigne_a?: string | null;
  assigne_nom?: string | null;
  cree_par?: string | null;
  cree_par_nom?: string | null;
  echeance?: string;
  relances?: number;
  dernier_relance_at?: string | null;
  termine_at?: string | null;
  cree_le?: string;
}

// La forme attendue par l'interface historique. `statut` et `status`
// coexistent dans les filtres et les colonnes du Kanban : on renvoie les
// deux, sinon une carte updatée disparait d'une colonne.
function taskVersUi(row: TaskRow) {
  return {
    ...row,
    title: row.titre,
    status: row.statut,
    assigne: row.assigne_nom || '',
    due: row.echeance || '',
    created_at: row.cree_le || null,
  };
}

app.get('/api/tasks', requireAuth, async (req: AuthReq, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'Base de données non configurée' });
  try {
    // Le directeur voit tout. Les autres voient ce qu'elles ont cree,
    // ce qui leur est assigne, et leur pole : c'est la lecture qui evite
    // de noyer un stagiaire sous le backlog de l'agence.
    const m = req.member!;
    let q = sb.from('tasks').select('*').order('cree_le', { ascending: false });
    if (m.role !== 'admin' && m.poste_id !== 'p1') {
      // Remplace `.or('cree_par.eq.X,assigne_a.eq.X,pole.eq.Y')`.
      //
      // La version chaine interpolait directement `m.id` et `m.pole`
      // dans une chaine de langage PostgREST. Un pole contenant une
      // virgule (« Tech, Digital ») aurait coupe la chaine en deux
      // branches et produit `pole.eq.Tech` — donc elargi la lecture a
      // TOUTES les taches du pole Tech, pour un membre du pole « Tech,
      // Digital ». Le second defaut : ces valeurs ne sont pas
      // echappees, donc un nom de pole contenant `)` suffisait a
      // injecter une condition.
      //
      // La forme structuree passe les trois valeurs en parametres
      // lies, donc l'injection est impossible par construction. See
      // src/db/adapter.ts (`orChamps`).
      q = q.orChamps([
        { colonne: 'cree_par', valeur: m.id },
        { colonne: 'assigne_a', valeur: m.id },
        { colonne: 'pole', valeur: m.pole },
      ]);
    }
    const { data, error } = await q;
    if (error) throw error;
    res.json((data || []).map(taskVersUi));
  } catch (err: any) {
    res.status(500).json({ error: String(err?.message || err) });
  }
});

app.post('/api/tasks', requireAuth, async (req: AuthReq, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'Base de données non configurée' });
  try {
    const m = req.member!;
    // L'interface envoie `title`/`status`, la colonne `titre`/`statut`.
    const titre = String(req.body.titre || req.body.title || '').trim();
    if (!titre) return res.status(400).json({ error: 'Titre de tâche requis' });
    const statut = req.body.statut || req.body.status || 'a_faire';
    if (!['a_faire', 'en_cours', 'en_attente', 'termine'].includes(statut)) {
      return res.status(400).json({ error: 'Statut invalide' });
    }
    const ligne: any = {
      id: `t-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
      titre: titre.slice(0, 200),
      description: String(req.body.description || '').slice(0, 2000),
      statut,
      priorite: req.body.priorite || req.body.priority || 'normale',
      // P0 — `pole` ne vient plus du corps de requete.
      //
      // La lecture des taches (ligne 1370) filtre sur `pole.eq.<pole du
      // membre>`. Un membre pouvait donc envoyer `pole: 'Tech'` et creer une
      // tache dans un autre pole : elle echappait a sa propre vue et
      // apparaisait dans celle d'un autre pole, ou elle n'a ni les
      // informations ni la legitimite pour etre traitee.
      //
      // Seul un administrateur peut affecter une tache a un autre pole.
      // Pour tout le monde, la tache appartient au pole de son auteur.
      pole: m.role === 'admin' && typeof req.body.pole === 'string' && req.body.pole.trim()
        ? req.body.pole.trim().slice(0, 60)
        : m.pole,
      assigne_a: req.body.assigne_a || null,
      assigne_nom: req.body.assigne_nom || req.body.assigne || null,
      cree_par: m.id,
      cree_par_nom: m.name,
      echeance: String(req.body.echeance || req.body.due || ''),
      termine_at: statut === 'termine' ? new Date().toISOString() : null,
    };
    const { data, error } = await sb.from('tasks').insert(ligne).select('*').single();
    if (error) throw error;
    await logActivity(m, 'create', 'task', ligne.id, { titre: ligne.titre });
    res.status(201).json(taskVersUi(data as TaskRow));
  } catch (err: any) {
    res.status(500).json({ error: String(err?.message || err) });
  }
});

app.patch('/api/tasks/:id', requireAuth, async (req: AuthReq, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'Base de données non configurée' });
  try {
    const { id } = req.params;
    const { data: avantBrut, error: findErr } = await sb.from('tasks').select('*').eq('id', id).maybeSingle();
    if (findErr) throw findErr;
    const avant = enLigne(avantBrut);
    if (!avant) return res.status(404).json({ error: 'Tâche introuvable' });

    // Meme regle de lecture que le GET : on ne modifie pas une tache
    // d'un autre pole.
    const m = req.member!;
    const visible =
      m.role === 'admin' ||
      m.poste_id === 'p1' ||
      avant.cree_par === m.id ||
      avant.assigne_a === m.id ||
      avant.pole === m.pole;
    if (!visible) return res.status(403).json({ error: 'Tâche hors de votre périmètre' });

    const patch: any = { modifie_le: new Date().toISOString() };
    const statut = req.body.statut || req.body.status;
    if (statut) {
      if (!['a_faire', 'en_cours', 'en_attente', 'termine'].includes(statut)) {
        return res.status(400).json({ error: 'Statut invalide' });
      }
      patch.statut = statut;
      // `termine_at` ne se remet pas a zero si la tache revient en cours.
      if (statut === 'termine') patch.termine_at = new Date().toISOString();
      else if (avant.statut === 'termine') patch.termine_at = null;
    }
    if (req.body.titre || req.body.title) patch.titre = String(req.body.titre || req.body.title).slice(0, 200);
    if (req.body.priorite || req.body.priority) patch.priorite = req.body.priorite || req.body.priority;
    if (req.body.echeance !== undefined || req.body.due !== undefined) {
      patch.echeance = String(req.body.echeance ?? req.body.due ?? '');
    }
    if (req.body.assigne_nom !== undefined || req.body.assigne !== undefined) {
      patch.assigne_nom = req.body.assigne_nom ?? req.body.assigne ?? null;
    }
    // La relance compte est un compteur : on l'incremente cote serveur
    // pour que deux navigateurs ne repartent pas de la meme valeur.
    if (req.body.relancer || req.body.remind) {
      patch.relances = Number(avant.relances || 0) + 1;
      patch.dernier_relance_at = new Date().toISOString();
    }

    const { data, error } = await sb.from('tasks').update(patch).eq('id', id).select('*').single();
    if (error) throw error;
    res.json(taskVersUi(data as TaskRow));
  } catch (err: any) {
    res.status(500).json({ error: String(err?.message || err) });
  }
});

// ---- Messagerie interne ----

// Retirer un message envoye par erreur, ou une tache qui n'existait pas.
// Sans cela le membre ne pouvait corriger ni l'un ni l'autre : un message
// envoye dans le mauvais canal etait definitif.
app.delete('/api/messages/:id', requireAuth, async (req: AuthReq, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'Base de données non configurée' });
  try {
    const m = req.member!;
    const { data: ligneBrute } = await sb
      .from('messages')
      .select('id, expediteur_id')
      .eq('id', req.params.id)
      .maybeSingle();
    const ligne = enLigne(ligneBrute);
    if (!ligne) return res.status(404).json({ error: 'Message introuvable' });
    // Son auteur, ou la direction. Un message ecrit par quelqu un d'autre
    // n est pas effacable par un simple membre.
    if (ligne.expediteur_id !== m.id && m.role !== 'admin' && m.poste_id !== 'p1') {
      return res.status(403).json({ error: 'Vous ne pouvez supprimer que vos propres messages' });
    }
    const { error } = await sb.from('messages').delete().eq('id', req.params.id);
    if (error) throw error;
    await logActivity(m, 'delete', 'message', req.params.id, {});
    res.json({ deleted: true, id: req.params.id });
  } catch (err: any) {
    res.status(500).json({ error: String(err?.message || err) });
  }
});

app.delete('/api/tasks/:id', requireAuth, async (req: AuthReq, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'Base de données non configurée' });
  try {
    const m = req.member!;
    const { data: ligneBrute } = await sb
      .from('tasks')
      .select('id, cree_par, assigne_a, pole')
      .eq('id', req.params.id)
      .maybeSingle();
    const ligne = enLigne(ligneBrute);
    if (!ligne) return res.status(404).json({ error: 'Tâche introuvable' });
    // Meme perimetre que la modification : auteur, assignee, ou direction.
    const autorise =
      m.role === 'admin' ||
      m.poste_id === 'p1' ||
      ligne.cree_par === m.id ||
      ligne.assigne_a === m.id;
    if (!autorise) return res.status(403).json({ error: 'Vous ne pouvez supprimer que vos propres tâches' });
    const { error } = await sb.from('tasks').delete().eq('id', req.params.id);
    if (error) throw error;
    await logActivity(m, 'delete', 'task', req.params.id, {});
    res.json({ deleted: true, id: req.params.id });
  } catch (err: any) {
    res.status(500).json({ error: String(err?.message || err) });
  }
});

function messageVersUi(row: any) {
  return {
    ...row,
    channel_id: row.canal,
    content: row.contenu,
    sender_name: row.expediteur_nom,
    sender_role: row.expediteur_role,
    sender_id: row.expediteur_id,
    created_at: row.cree_le,
  };
}

// Un canal est un regroupement, pas une cloture de securite. Restreindre
// chaque pole a son propre canal empechait le scenario prevu par l'OS
// ("Tech transmet la maquette au Creatif puis au Client") et interdisait au
// Directeur Commercial de répondre sur un canal de production. Tout membre
// connecte lit et ecrit dans tous les canaux ; la confidentialite reelle
// (devis, releves) est traitee par requireDevis ailleurs.
//
// Les identifiants sont ceux de l'interface de messagerie (c-general,
// c-tech, ...) : le serveur ne doit pas inventer un autre vocabulaire, sinon
// un message ecrit depuis l'UI atterrit dans un canal que personne ne lit.
const CANAUX = ['c-general', 'c-direction', 'c-tech', 'c-creatif', 'c-digital', 'c-client'];
const canalConnu = (c: string) => CANAUX.includes(c);

app.get('/api/messages', requireAuth, async (req, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'Base de données non configurée' });
  try {
    const canal = String(req.query.canal || req.query.channel || 'c-general');
    if (!canalConnu(canal)) return res.status(400).json({ error: 'Canal inconnu' });
    const { data, error } = await sb
      .from('messages')
      .select('*')
      .eq('canal', canal)
      .order('cree_le', { ascending: true })
      .limit(500);
    if (error) throw error;
    res.json((data || []).map(messageVersUi));
  } catch (err: any) {
    res.status(500).json({ error: String(err?.message || err) });
  }
});

app.post('/api/messages', requireAuth, async (req: AuthReq, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'Base de données non configurée' });
  try {
    const m = req.member!;
    const canal = String(req.body.canal || req.body.channel_id || 'c-general');
    const contenu = String(req.body.contenu || req.body.content || '').trim();
    if (!contenu) return res.status(400).json({ error: 'Message vide' });
    if (contenu.length > 4000) return res.status(400).json({ error: 'Message trop long' });
    if (!canalConnu(canal)) return res.status(400).json({ error: 'Canal inconnu' });
    const ligne = {
      id: `m-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
      canal,
      contenu,
      expediteur_id: m.id,
      expediteur_nom: m.name,
      expediteur_role: m.poste_titre || m.role,
      pole: m.pole,
      simule: Boolean(req.body.simule),
    };
    const { data, error } = await sb.from('messages').insert(ligne).select('*').single();
    if (error) throw error;
    res.status(201).json(messageVersUi(data));
  } catch (err: any) {
    res.status(500).json({ error: String(err?.message || err) });
  }
});


app.get('/api/activity', requirePerm('admin'), async (_req, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(500).json({ error: 'Base de données non configurée' });
  const { data, error } = await sb.from('activity_log').select('*').order('created_at', { ascending: false }).limit(50);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ activity: data });
});

// ============================================================
// API Contenu (CMS public — lu publiquement, écrit par habilités)
// ============================================================
const CONTENT_KINDS = ['config', 'forfait', 'blog', 'realisation', 'temoignage'];

// Les `kind` stockes en base sont au singulier, les cles de reponse au pluriel
// Les seules familles de contenu exposees par `GET /api/content`.
// `groupContent` ignore tout `kind` absent de cette table : une famille
// inconnue ne doit jamais creee de cle dans la reponse publique.
type ContentResponseKey = 'config' | 'forfaits' | 'blog' | 'realisations' | 'temoignages';

const KIND_TO_RESPONSE_KEY: Record<string, ContentResponseKey> = {
  config: 'config',
  forfait: 'forfaits',
  blog: 'blog',
  realisation: 'realisations',
  temoignage: 'temoignages',
};

// P0 — fuite de brouillons corrigee.
//
// Cette route est publique (elle alimente le site vitrine). Elle renvoyait
// tous les enregistrements, brouillons compris : un article non publie, une
// realisation en cours de redaction ou un temoignage en attente de
// validation etaient lisibles par n'importe quel visiteur, et meme
// indexables par un moteur de recherche.
//
// Le filtre est applique cote serveur, parce que l'acces est en
// `service_role`/`arckaton_app` et n'est filtre par aucune politique SQL
// (cf. fetchContentItems et migrations/001_roles.sql).
//
// Deux publics, une seule route :
//   - visiteur sans jeton, ou membre SANS la permission `content`
//         → uniquement le contenu publie ;
//   - membre avec la permission `content`
//         → tout le contenu, brouillons inclus, sinon l'editeur ne
//           verrait plus ce qu'il est en train d'ecrire et ne pourrait
//           plus le modifier.
// P0 — plafond sur la lecture du contenu.
//
// Ce plafond etait pose parce que `optionalAuth` validait chaque jeton
// aupres de GoTrue : une rafale de requetes anonymes portant un jeton
// bidon transformait cette route publique en generateur d'appels
// sortants, depuis une IP non authentifiee.
//
// La verification est devenue locale (HMAC, src/db/auth.ts), donc le
// risque d'amplification a disparu. Le plafond est NEANMOINS conserve :
// c'est une route publique dont le cout dominant reste la requete SQL.
// Le retirer « parce que le probleme qu'il corrigeait n'existe plus »
// serait imbrique.
//
// 120/min par IP : tres au-dessus de la navigation normale d'un visiteur
// (une requete au chargement), et assez bas pour interdire l'amplification.
// Note : ce plafond repose sur `req.ip`, donc sur X-Forwarded-For — voir
// l'avertissement de securite pose sur `app.set('trust proxy', 1)`.
app.get(
  '/api/content',
  rateLimit({ windowMs: 60_000, max: 120, scope: 'content:read', message: 'Trop de requetes. Reessayez dans un instant.' }),
  optionalAuth,
  async (req: AuthReq, res) => {
  try {
    // Toute la decision — quel filtre appliquer, quoi mettre dans la reponse —
    // vit dans une seule fonction, `serveContentFor`. C'est ce qui rend le P0.6
    // verifiable : tant que la route faisait elle-meme l'appel
    // `fetchContentItems({ onlyPublished })`, un test ne pouvait qu'observer
    // une reponse vide et passerait meme avec le filtre supprime.
    res.json(await serveContentFor(req.member, fetchContentItems));
  } catch (err) {
    console.error('GET /api/content error:', err);
    res.status(500).json({ error: 'Erreur lecture du contenu' });
  }
  }
);

app.put('/api/content/:kind/:slug', requirePerm('content'), async (req: AuthReq, res) => {
  try {
    const { kind, slug } = req.params;
    if (!CONTENT_KINDS.includes(kind)) return res.status(400).json({ error: 'Type de contenu inconnu' });
    const { data, title, published, position } = req.body;
    if (kind !== 'config' && data === undefined) return res.status(400).json({ error: 'Donnée manquante' });
    const sb = getSupabase();
    if (!sb) return res.status(500).json({ error: 'Base de données non configurée' });
    const payload: any = {
      kind,
      slug,
      title: title || null,
      published: published !== false,
      position: position ?? 0,
      updated_at: new Date().toISOString(),
    };
    if (data !== undefined) {
      if (kind === 'config' && data && typeof data === 'object' && !Array.isArray(data)) {
        // La config du site tient sur UNE seule ligne. Un upsert remplacait
        // donc tout le blob : corriger le hero supprimait contact, annonce
        // et le reste du site pour tous les visiteurs. On fusionne a plat :
        // la config est un objet de sections, chaque section est remplacee
        // entierement, ce qui evite aussi de melanger un ancien et un
        // nouveau hero.
        const { data: existante } = await sb
          .from('content_items')
          .select('data')
          .eq('kind', 'config')
          .eq('slug', slug)
          .maybeSingle();
        const avantBrute = enLigne(existante)?.data;
        const avant =
          avantBrute && typeof avantBrute === 'object' ? avantBrute : {};
        payload.data = { ...avant, ...data };
      } else {
        payload.data = data;
      }
    }
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
    if (!sb) return res.status(500).json({ error: 'Base de données non configurée' });

    // Un item sans `data` ne doit pas vider la ligne : `data: it.data || {}`
    // transformait un import incomplet en effacement du contenu existant.
    // On relit d'abord, et on ne touche que les cles fournies.
    const { data: existantes } = await sb
      .from('content_items')
      .select('kind,slug,data,title')
      .in('slug', items.map((i: any) => i.slug));
    const avantParCle = new Map<string, any>();
    for (const ex of enLignes(existantes)) avantParCle.set(`${ex.kind}/${ex.slug}`, ex);

    const rows = items.map((it: any, idx: number) => {
      const cle = `${it.kind}/${it.slug}`;
      const avant = avantParCle.get(cle);
      const ancienData = avant && typeof avant.data === 'object' ? avant.data : undefined;
      const data =
        it.data !== undefined
          ? it.kind === 'config' && ancienData
            ? { ...ancienData, ...it.data }
            : it.data
          : ancienData !== undefined
            ? ancienData
            : {};
      return {
        kind: it.kind,
        slug: it.slug,
        title: it.title ?? (avant ? avant.title : null),
        published: it.published !== false,
        position: it.position ?? idx,
        data,
      };
    });
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
    if (!sb) return res.status(500).json({ error: 'Base de données non configurée' });
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
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  // Une valeur de substitution ne doit pas passer pour une cle configuree :
  // le client serait cree, l'appel echouerait, et l'ecran afficherait une IA
  // "active" alors qu'elle repondrait par la base de connaissances.
  const estPlaceholder = !apiKey || /^my[_-]|^your[_-]|^changeme|^xxx+$/i.test(apiKey);
  if (!estPlaceholder) {
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
5. LIVRAISON : Partout dans le monde (le digital n'a pas de frontière). Travail 100% à distance avec support réactif.
6. PAIEMENT : FCFA, Mobile Money (MTN MoMo, Orange Money) ou virement bancaire. Acompte au démarrage + solde à la livraison. Le budget publicitaire est toujours séparé des honoraires.
  7. PREUVES & CONTACT : +337% de conversion chez Maison Kotto, 12 840 000 FCFA consolidés chez Districash Nord, note 4.9/5 sur Google. WhatsApp : +237 681 46 29 82, email : ARCKATON12@gmail.com, bureau Mimboman Yaoundé.
  8. INSTITUTIONNEL : Arckaton est la filiale technologique de SLOMAH HOLDING. Cette information peut être partagée de manière factuelle si le client l'évoque.

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
    return `Absolument ! Bien que notre bureau principal soit situé à **Yaoundé (Mimboman, Cameroun)**, nous livrons nos systèmes digitaux **partout dans le monde.**.
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
app.get("/api/health", async (req: AuthReq, res) => {
  // Sonde publique : un tiers doit pouvoir vérifier que le service répond
  // (montée, sonde de disponibilité) sans obtenir la topologie interne.
  // Le diagnostic complet reste réservé aux membres authentifiés.
  //
  // La présence d'un en-tête ne suffisait pas : n'importe quelle chaîne
  // renvoyait déjà l'état de la base et de l'IA. Il faut un jeton valide.
  if (!req.headers.authorization) {
    return res.json({ status: "ok", service: "Arckaton Express Backend" });
  }
  await requireAuth(req, res, async () => {
    // Diagnostic base de donnees (aucun secret expose) : configuration,
    // joignabilite reelle, et volume de contenu.
    //
    // `baseConfig` distingue « pas configure » de « configure et
    // injoignable ». Les deux donnaient `adminClient: false` avant, donc
    // une panne reseau et une variable d'environnement manquante
    // etaient indiscernables dans la sonde — on ne pouvait pas dire
    // laquelle des deux corriger. `baseJoignable` est mesure, pas
    // deduit.
    const base: {
      configuree: boolean;
      joignable: boolean;
      authOperationnelle: boolean;
      contentItems: number | null;
      error: string | null;
    } = {
      configuree: false,
      joignable: false,
      authOperationnelle: false,
      contentItems: null,
      error: null,
    };
    try {
      const sb = getSupabase();
      base.configuree = Boolean(sb);
      if (sb) {
        const { count, error } = await sb.from('content_items').select('*', { count: 'exact', head: true });
        if (error) base.error = error.message;
        else {
          base.joignable = true;
          base.contentItems = count ?? 0;
        }
        // Verifie que l'auth peut emettre ET lire. Un `JWT_SECRET` absent
        // ne se voit pas sur `configuree` : la base repond, mais aucun
        // login ne peut aboutir. La sonde doit le dire.
        const integrite = await verifierIntegriteAuth();
        base.authOperationnelle = integrite.ok;
        if (!integrite.ok && !base.error) base.error = integrite.message;
      }
    } catch (err: unknown) {
      base.error = err instanceof Error ? err.message : 'exception inattendue';
    }
    res.json({
      status: "ok",
      service: "Arckaton Express Backend",
      base,
      // Etat reels, derives de la configuration du serveur. La cle n'est
      // jamais renvoyee, seulement sa presence.
      ai: {
        provider: "gemini",
        model: GEMINI_MODEL,
        fallbacks: GEMINI_MODELS.slice(1),
        configured: Boolean(getGeminiClient()),
      },
    });
  });
});

// P0 — Relais WhatsApp arbitraire corrige.
//
// AVANT : `to_numbers` venait du corps de la requete. POST /api/leads etait
// publique, donc n'importe qui pouvait envoyer un message arbitraire a
// n'importe quel numero, depuis le numero Business de l'agence. Impact :
// spam et hameconnage au nom d'Arckaton, blocage du numero par Meta,
// facturation des envois.
//
// APRES : le client ne peut plus designer le destinataire ni le contenu.
//   - le destinataire est le Boss (BOSS_WHATSAPP), donne par le serveur ;
//   - le message est construit par le serveur a partir de champs dument
//     valides, jamais d'un texte libre fourni par l'appelant ;
//   - les longueurs sont bornees avant envoi.
//
// La liste blanche de destinations est centralisee dans `buildOutboxTargets`
// pour que les deux routes (lead + rapport) partagent exactement la meme
// logique. Ajouter un destinataire devient une decision serveur explicite.
function buildOutboxTargets(): string[] {
  const bossNumber = BOSS_WHATSAPP.replace(/\D/g, '');
  return [bossNumber];
}

function truncate(s: string, n: number): string {
  return String(s == null ? '' : s).slice(0, n);
}

// Champs texte acceptes depuis une requete publique, longueur bornee.
// Sans cette normalisation, un nom de 10 Mo serait stocke puis renvoye
// dans la file WhatsApp.
function cleanStr(v: unknown, max: number): string {
  if (typeof v !== 'string') return '';
  // On retire les caracteres de controle et on borne. Le contenu reste du
  // texte libre : c'est la nature du formulaire de contact.
  return v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
}

// Agent Chat endpoint
// Ouverte au public (visiteurs du site) mais plafonnée : chaque appel
// consomme du quota Gemini.
//
// P0 — injection de prompt corrigee. Le prompt etait construit par
// concatenation : `message`, `history` et `pole` venaient du client et
// pouvaient contenir n'importe quelles instructions, placées avant la
// consigne systeme. Un visiteur pouvait donc faire ignorer les garde-fous
// (« n'invente pas de prix », « reponds en francais »).
//
// Apres correction :
//   - `message` et chaque element de `history` sont bornes et nettoyes ;
//   - l'historique est limite a 10 messages, pour qu'un historique enorme
//     ne consomme pas le quota de Gemini ;
//   - `pole` est valide contre la liste fermee des poles ;
//   - les consignes systeme passent par `systemInstruction`, que Gemini
//     traite comme prioritaire, et non plus dans `contents`.
app.post("/api/ai/agent-chat", rateLimit({ windowMs: 60_000, max: 10, scope: 'ai:agent-chat', message: 'Trop de messages envoyés. Réessayez dans une minute.' }), async (req, res) => {
  try {
    const body = req.body || {};
    const message = sanitizeForPrompt(body.message, 1000);
    if (!message) {
      return res.status(400).json({ error: "Message requis" });
    }

    const requestedPole = typeof body.pole === 'string' ? body.pole : '';
    const pole = KNOWN_POLES.includes(requestedPole) ? requestedPole : 'Direction';

    const history = Array.isArray(body.history)
      ? body.history
          .slice(-10)
          .map((m: any) => {
            if (typeof m === 'string') return sanitizeForPrompt(m, 500);
            const who = sanitizeForPrompt(m?.role || m?.from, 40);
            const what = sanitizeForPrompt(m?.text || m?.content || m?.message, 500);
            return what ? `${who || 'visiteur'}: ${what}` : '';
          })
          .filter(Boolean)
          .join('\n')
      : '';

    const ai = getGeminiClient();
    if (ai) {
      try {
        const fullPrompt = [
          history ? `Historique recent :\n${history}` : '',
          `Pole sollicite : ${pole}`,
          `Client : ${message}`,
        ].filter(Boolean).join('\n\n');

        // Les consignes systeme vont dans `systemInstruction`, que Gemini
        // traite comme prioritaires et non comme du texte a discuter.
        // Concatenes dans `contents`, elles perdaient face a une instruction
        // du visiteur : c'est exactement le défaut que ce correctif supprime.
        const { texte, model } = await generateWithFallback(ai, {
          systemInstruction: SYSTEM_PROMPT_AGENT,
          contents: fullPrompt,
        });

        return res.json({ reply: texte, source: "gemini", model });
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
// Génération de rapport : utilisée par le copilote OS (authentifié) ET par
// l'agent public du site. Elle reste donc ouverte, mais :
//   - plafonnée (rate limit ci-dessous) ;
//   - `to_numbers` est IGNORE, destinataire impose par le serveur ;
//   - les champs sont nettoyes et bornes avant stockage comme avant envoi.
// L'exfiltration de donnees client vers Gemini est traitee separement
// (voir /api/ai/copilot).
app.post("/api/ai/generate-report", rateLimit({ windowMs: 60_000, max: 6, scope: 'ai:generate-report', message: 'Trop de demandes de rapport. Réessayez dans une minute.' }), async (req, res) => {
  try {
    const { clientName, leadName, messages, pole, contactInfo, summary: summaryOverride, recommendations, intention: intentionOverride } = req.body || {};
    // `to_numbers` et `client_ref` sont volontairement ignores (relais WhatsApp).
    
    // Determine intent
    const boundedMessages = Array.isArray(messages) ? messages.slice(0, 50) : [];
    const textAll = boundedMessages.map((m: any) => m?.text || m?.content || '').join(' ').toLowerCase();
    let intention: 'devis' | 'essai' | 'information' = 'information';
    if (intentionOverride === 'devis' || intentionOverride === 'essai' || intentionOverride === 'information') {
      intention = intentionOverride;
    } else if (textAll.includes('essai') || textAll.includes('arka') || textAll.includes('tester') || textAll.includes('30 jours')) {
      intention = 'essai';
    } else if (textAll.includes('devis') || textAll.includes('budget') || textAll.includes('forfait') || textAll.includes('site') || textAll.includes('e-commerce') || textAll.includes('projet')) {
      intention = 'devis';
    }

    const reportId = `rep-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const cleanClientName = cleanStr(clientName || leadName, 160) || 'Prospect Site Web';
    const cleanPole = cleanStr(pole, 40) || 'Tech';
    const cleanContact = cleanStr(contactInfo, 200) || 'À recueillir via WhatsApp';
    const cleanSummary = cleanStr(summaryOverride, 1000) ||
      `Échange avec ${cleanClientName}. Le client s'est renseigné sur les solutions du pôle ${cleanPole}. Intention détectée : ${intention}. Recommandation : prise de contact par WhatsApp sous 24h.`;

    const report: StoredReport = {
      id: reportId,
      client_name: cleanClientName,
      sujet: `Qualification ${intention.toUpperCase()} — Pôle ${cleanPole}`,
      pole: cleanPole,
      resume: cleanSummary,
      intention,
      contact_info: cleanContact,
      created_at: 'À l\'instant',
      status: 'non_traite',
      messages_count: boundedMessages.length || 1
    };

    const persisted = await persistReport({ ...report, client_ref: reportId, recommendations: (Array.isArray(recommendations) ? recommendations : []).slice(0, 10).map((r: any) => cleanStr(r, 300)) });

    // Destinataire impose par le serveur, message construit par le serveur.
    await persistOutbox({
      client_ref: reportId,
      kind: 'report',
      to_numbers: buildOutboxTargets(),
      message: truncate(
        `Rapport IA (${intention.toUpperCase()}) - Pôle ${report.pole} - ${report.client_name} : ${report.resume}`,
        600
      ),
    });

    reportsStore.unshift(report);

    res.json({ success: true, report, persisted });
  } catch (err: any) {
    console.error("Erreur génération rapport:", err);
    res.status(500).json({ error: "Erreur génération rapport" });
  }
});

// Leads API
//
// P0 — route publique non plafonnee. Elle ecrit en base et insere dans
// l'outbox WhatsApp : sans limite, un script pouvait noyer la table `leads`
// et faire partir des milliers de messages vers le numero du Boss. 5 par
// minute et par IP laisse largement la place a un formulaire reel.
app.post(
  "/api/leads",
  rateLimit({ windowMs: 60_000, max: 5, scope: 'leads:create', message: 'Trop de demandes envoyees. Reessayez dans une minute.' }),
  async (req, res) => {
  try {
    // `to_numbers` et `client_ref` sont volontairement IGNORES. Ils permettaient
    // de designer le destinataire et de neutraliser l'idempotence de la file.
    const { name, email, phone, project_type, budget, message, source, country } = req.body || {};

    const cleanName = cleanStr(name, 120);
    const cleanPhone = cleanStr(phone, 32);
    if (!cleanName || !cleanPhone) {
      return res.status(400).json({ error: "Nom et téléphone obligatoires" });
    }

    const cleanProjectType = cleanStr(project_type, 200) || 'Systeme digital sur mesure';
    const cleanMessage = cleanStr(message, 1000) || 'Demande transmise depuis le site public.';
    const cleanSource = cleanStr(source, 60) || 'site_v2_devis';
    const cleanEmail = cleanStr(email, 160);
    const cleanBudget = cleanStr(budget, 120) || 'Sur devis';
    const cleanCountry = cleanStr(country, 80) || 'Cameroun / International';

    // Le pole est deduit du type de projet, jamais accepte tel quel : un
    // visiteur public ne doit pas pouvoir router son lead vers un pole interne.
    let poleAssigned = 'Direction';
    const pType = cleanProjectType.toLowerCase();
    if (pType.includes('e-commerce') || pType.includes('arka') || pType.includes('mobile money') || pType.includes('tech')) {
      poleAssigned = 'Tech';
    } else if (pType.includes('logo') || pType.includes('identité') || pType.includes('créat') || pType.includes('visuel')) {
      poleAssigned = 'Creatif';
    } else if (pType.includes('seo') || pType.includes('vitrine') || pType.includes('marketing') || pType.includes('ads')) {
      poleAssigned = 'Digital';
    } else if (pType.includes('terrain') || pType.includes('compte') || pType.includes('formation')) {
      poleAssigned = 'Client';
    }

    // Identifiant applicatif genere par le serveur : le client ne fournit plus
    // client_ref, avec lequel il pouvait ecraser ou inhiber une ligne de la file.
    const leadId = `lead-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const newLead: StoredLead = {
      id: leadId,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      project_type: cleanProjectType,
      budget: cleanBudget,
      message: cleanMessage,
      source: cleanSource,
      statut: 'nouveau',
      notes: '',
      pole_assigned: poleAssigned,
      country: cleanCountry,
      created_at: 'À l\'instant'
    };

    // Persistance durable (Supabase si configuré, sinon mémoire)
    const persisted = await persistLead({ ...newLead, client_ref: leadId });

    // Destinataire impose par le serveur, message construit par le serveur.
    await persistOutbox({
      client_ref: leadId,
      kind: 'lead',
      to_numbers: buildOutboxTargets(),
      message: truncate(
        `Nouveau lead (${cleanSource}) - ${cleanName} - ${cleanProjectType} - Tel: ${cleanPhone} - ${cleanMessage}`,
        600
      ),
    });

    leadsStore.unshift(newLead);

    const waText = encodeURIComponent(
      `Bonjour Arckaton ! Je suis ${cleanName}. J'ai configure un projet de ${cleanProjectType}. Mon contact est le ${cleanPhone}. Merci de me recontacter.`
    );
    const waLink = `https://wa.me/${BOSS_WHATSAPP.replace(/\D/g, '')}?text=${waText}`;
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
  }
);

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

// La qualification d'un lead (statut, notes internes) doit survivre au
// rechargement de la page. Sans cette route, changer un lead en « converti »
// n'était visible que dans l'onglet courant : la base le relisait ensuite
// comme « nouveau », et un lead deja converti pouvait l'etre a nouveau.
const LEAD_STATUTS = ['nouveau', 'contacte', 'qualifie', 'devis_envoye', 'converti', 'archive', 'perdu'];

app.patch("/api/leads/:ref", requireAuth, async (req: AuthReq, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: "Base de donnees non configuree" });
  try {
    const ref = req.params.ref;
    if (!ref) return res.status(400).json({ error: "Reference lead manquante" });
    // L'interface connait soit l'`id` de la ligne (uuid, lead hydraté depuis
    // la base), soit le `client_ref` (lead créé localement, `lead-...`).
    // Cibler la bonne colonne évite de comparer un uuid inexistant.
    const estUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref);
    const colonne = estUuid ? "id" : "client_ref";
    const patch: { statut?: string; notes?: string } = {};
    if (typeof req.body?.statut === 'string') {
      if (!LEAD_STATUTS.includes(req.body.statut)) {
        return res.status(400).json({ error: "Statut de lead invalide" });
      }
      patch.statut = req.body.statut;
    }
    if (typeof req.body?.notes === "string") {
      patch.notes = req.body.notes.slice(0, 4000);
    }
    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: "Aucun champ a modifier" });
    }
    const { data, error } = await sb
      .from("leads")
      .update(patch)
      .eq(colonne, ref)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Lead introuvable" });
    await logActivity(req.member!, 'update', 'lead', ref, patch);
    res.json({ success: true, lead: data });
  } catch (err: any) {
    console.error("Erreur mise a jour lead:", err);
    res.status(500).json({ error: "Erreur mise a jour lead" });
  }
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

// Mise a jour collaborative d'un projet par tout membre connecte.
//
// La creation et l'edition complete (budget, statut, client...) restent
// reservees a la direction (POST/PUT ci-dessus). Mais les jalons, les retours
// client, l'avancement et les sorties terrain sont alimentes par toute
// l'equipe pendant la production : les laisser en local faisait perdre chaque
// validation BAT au rechargement de la page, et le portail client (qui lit le
// serveur) ne voyait jamais rien. Cette route n'accepte QUE ces champs.
app.patch("/api/projects/:ref", requireAuth, async (req: AuthReq, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'Base de donnees non configuree' });
  try {
    const ref = req.params.ref;
    if (!ref) return res.status(400).json({ error: "Référence projet manquante" });
    const body = req.body || {};

    const patch: Record<string, unknown> = {};
    if (body.jalons !== undefined) {
      if (!Array.isArray(body.jalons)) return res.status(400).json({ error: 'jalons doit être un tableau' });
      patch.jalons = body.jalons.slice(0, 100);
    }
    if (body.feedbacks !== undefined) {
      if (!Array.isArray(body.feedbacks)) return res.status(400).json({ error: 'feedbacks doit être un tableau' });
      patch.feedbacks = body.feedbacks.slice(0, 200);
    }
    if (body.sorties_terrain !== undefined) {
      if (!Array.isArray(body.sorties_terrain)) return res.status(400).json({ error: 'sorties_terrain doit être un tableau' });
      patch.sorties_terrain = body.sorties_terrain.slice(0, 100);
    }
    if (body.progression !== undefined) {
      const n = Number(body.progression);
      if (!Number.isFinite(n)) return res.status(400).json({ error: 'progression invalide' });
      patch.progression = Math.min(100, Math.max(0, Math.round(n)));
    }
    if (body.sorties_terrain_effectuees !== undefined) {
      const n = Number(body.sorties_terrain_effectuees);
      if (!Number.isFinite(n)) return res.status(400).json({ error: 'sorties_terrain_effectuees invalide' });
      patch.sorties_terrain_effectuees = Math.max(0, Math.round(n));
    }
    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: 'Aucun champ modifiable fourni' });
    }
    patch.updated_at = new Date().toISOString();

    const { data, error } = await sb
      .from('projects')
      .update(patch)
      .eq('project_ref', ref)
      .select('project_ref')
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Projet introuvable' });
    res.json({ success: true, project_ref: ref });
  } catch (err: any) {
    console.error("Erreur mise a jour collaborative projet:", err);
    res.status(500).json({ error: "Erreur mise a jour projet" });
  }
});

app.delete("/api/projects/:ref", requirePerm('admin'), async (req: AuthReq, res) => {
  try {
    const sb = getSupabase();
    if (!sb) return res.status(501).json({ error: 'Base de donnees non configuree' });
    const { error } = await sb.from('projects').delete().eq('project_ref', req.params.ref);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    console.error("Erreur suppression projet:", err);
    res.status(500).json({ error: "Erreur suppression projet" });
  }
});

// ------------------------------------------------------------
// Preuves de terrain : photos attachees a une sortie de captation.
//
// Stockage dans PostgreSQL (`project_media.data`, bytea), pas sur le
// disque du conteneur : le plan Render gratuit ne conserve pas les
// fichiers entre deux deploiements, alors que la base survit et se
// sauvegarde avec le reste des donnees.
//
// Le corps de la requete est l'image brute, pas du JSON : on evite
// ainsi l'encodage base64 (+33 %) et la limite de 256 Ko du parseur
// JSON global. Les metadonnees voyagent dans la chaine de requete.
// ------------------------------------------------------------
const MEDIA_MIME_AUTORISES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MEDIA_TAILLE_MAX = 8 * 1024 * 1024; // 8 Mo

function mediaId(): string {
  return `med-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function nomFichierSur(valeur: unknown): string {
  // Le nom vient du client : on retire tout chemin pour qu'il ne
  // puisse pas suggerer un emplacement (le fichier n'est jamais ecrit
  // sur disque, mais le nom est rejoue dans Content-Disposition).
  const brut = cleanStr(valeur, 200);
  const sansChemin = brut.split(/[\\/]/).pop() || '';
  return sansChemin.replace(/[\r\n"]/g, '').slice(0, 160) || 'captation';
}

app.get('/api/media', requireAuth, async (req: AuthReq, res) => {
  try {
    const project_ref = cleanStr(req.query.project_ref, 120);
    if (!project_ref) return res.status(400).json({ error: 'project_ref obligatoire' });
    const visit_id = cleanStr(req.query.visit_id, 120);
    const params: unknown[] = [project_ref];
    let sql =
      'SELECT id, project_ref, visit_id, filename, mime, size_bytes, kind, uploaded_by, created_at ' +
      'FROM project_media WHERE project_ref = $1';
    if (visit_id) {
      params.push(visit_id);
      sql += ' AND visit_id = $2';
    }
    sql += ' ORDER BY created_at DESC LIMIT 500';
    const { data, error } = await dbQuery(sql, params);
    if (error) throw error;
    res.json({ media: data });
  } catch (err: any) {
    console.error('GET /api/media error:', err);
    res.status(500).json({ error: 'Erreur lecture medias' });
  }
});

app.post(
  '/api/media',
  requireAuth,
  express.raw({ type: '*/*', limit: '8mb' }),
  async (req: AuthReq, res) => {
    try {
      const project_ref = cleanStr(req.query.project_ref, 120);
      if (!project_ref) return res.status(400).json({ error: 'project_ref obligatoire' });

      const mime = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
      if (!MEDIA_MIME_AUTORISES.includes(mime)) {
        return res.status(415).json({ error: 'Format non supporte (JPEG, PNG, WebP ou GIF)' });
      }

      const contenu = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
      if (contenu.length === 0) return res.status(400).json({ error: 'Fichier vide' });
      if (contenu.length > MEDIA_TAILLE_MAX) {
        return res.status(413).json({ error: 'Fichier trop volumineux (8 Mo maximum)' });
      }

      const existant = await dbQuery('SELECT 1 FROM projects WHERE project_ref = $1', [project_ref]);
      if (existant.error) throw existant.error;
      if (!existant.data.length) return res.status(404).json({ error: 'Projet introuvable' });

      const id = mediaId();
      const visit_id = cleanStr(req.query.visit_id, 120) || null;
      const inserted = await dbQuery(
        `INSERT INTO project_media
           (id, project_ref, visit_id, filename, mime, size_bytes, kind, data, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, 'image', $7, $8)
         RETURNING id, project_ref, visit_id, filename, mime, size_bytes, kind, uploaded_by, created_at`,
        [
          id,
          project_ref,
          visit_id,
          nomFichierSur(req.query.filename),
          mime,
          contenu.length,
          contenu,
          req.member?.id || null,
        ],
      );
      if (inserted.error) throw inserted.error;

      if (req.member) {
        await logActivity(req.member, 'upload_media', 'project', project_ref, {
          media_id: id,
          size: contenu.length,
        });
      }
      res.status(201).json({ media: inserted.data[0] });
    } catch (err: any) {
      console.error('POST /api/media error:', err);
      res.status(500).json({ error: 'Erreur enregistrement media' });
    }
  },
);

// Le binaire est servi a tout membre connecte : la galerie charge
// chaque vignette via `fetch` avec le jeton, jamais par un `<img src>`
// direct (qui n'enverrait pas l'en-tete Authorization).
app.get('/api/media/:id', requireAuth, async (req: AuthReq, res) => {
  try {
    const { data, error } = await dbQuery(
      'SELECT filename, mime, size_bytes, data FROM project_media WHERE id = $1',
      [req.params.id],
    );
    if (error) throw error;
    if (!data.length) return res.status(404).json({ error: 'Media introuvable' });
    const m = data[0] as { filename: string; mime: string; size_bytes: number; data: Buffer };
    res.setHeader('Content-Type', m.mime);
    res.setHeader('Content-Length', String(m.size_bytes));
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(m.filename)}"`);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.end(m.data);
  } catch (err: any) {
    console.error('GET /api/media/:id error:', err);
    res.status(500).json({ error: 'Erreur lecture media' });
  }
});

app.delete('/api/media/:id', requireAuth, async (req: AuthReq, res) => {
  try {
    const { data, error } = await dbQuery(
      'SELECT project_ref, uploaded_by FROM project_media WHERE id = $1',
      [req.params.id],
    );
    if (error) throw error;
    if (!data.length) return res.status(404).json({ error: 'Media introuvable' });
    const ligne = data[0] as { project_ref: string; uploaded_by: string | null };
    const estAdmin = req.member?.role === 'admin';
    if (!estAdmin && ligne.uploaded_by && ligne.uploaded_by !== req.member?.id) {
      return res.status(403).json({ error: 'Suppression reservee au depot initial ou a la direction' });
    }
    const supprime = await dbQuery('DELETE FROM project_media WHERE id = $1', [req.params.id]);
    if (supprime.error) throw supprime.error;
    if (req.member) {
      await logActivity(req.member, 'delete_media', 'project', ligne.project_ref, {
        media_id: req.params.id,
      });
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error('DELETE /api/media/:id error:', err);
    res.status(500).json({ error: 'Erreur suppression media' });
  }
});

// ------------------------------------------------------------
// Devis et factures
// La reference est attribuee par le serveur (sequentielle et stable) :
// elle ne peut pas etre regeneree a chaque affichage comme le faisait
// l'ancien devis, ou Math.random() changeait la reference au rerender.
// ------------------------------------------------------------
const QUOTE_TYPES = ['devis', 'facture'];
const QUOTE_STATUS = ['brouillon', 'envoye', 'accepte', 'refuse', 'paye'];

function normalizeQuoteStatus(value: unknown): string {
  const raw = String(value || '').toLowerCase();
  return QUOTE_STATUS.includes(raw) ? raw : 'brouillon';
}

function nextQuoteRef(sb: any, type: string): Promise<string> {
  const prefix = type === 'facture' ? 'FAC' : 'DEV';
  const year = new Date().getFullYear();
  return sb
    .from('quotes')
    .select('quote_ref')
    .like('quote_ref', `${prefix}-${year}-%`)
    .order('quote_ref', { ascending: false })
    .limit(1)
    .then(({ data, error }: any) => {
      if (error) throw new Error(`reference devis illisible: ${error.message}`);
      const last = data && data[0] ? String(data[0].quote_ref) : '';
      const seq = last ? Number(last.split('-')[2] || 0) + 1 : 1;
      return `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
    });
}

app.get("/api/quotes", requireDevis, async (_req, res) => {
  try {
    const sb = getSupabase();
    if (!sb) return res.json({ quotes: [] });
    const { data, error } = await sb
      .from('quotes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    res.json({ quotes: data || [] });
  } catch (err: any) {
    console.error("Erreur lecture devis:", err);
    res.status(500).json({ error: "Erreur lecture devis" });
  }
});

// Attribution de la prochaine reference, pour previsualiser un devis
// sans encore l'enregistrer.
app.get("/api/quotes/next-ref", requirePerm('admin'), async (req: AuthReq, res) => {
  try {
    const sb = getSupabase();
    if (!sb) return res.status(501).json({ error: 'Base de donnees non configuree' });
    const type = String(req.query.type || 'devis');
    res.json({ quote_ref: await nextQuoteRef(sb, QUOTE_TYPES.includes(type) ? type : 'devis') });
  } catch (err: any) {
    console.error("Erreur generation reference:", err);
    res.status(500).json({ error: "Erreur generation reference" });
  }
});

app.post("/api/quotes", requirePerm('admin'), async (req: AuthReq, res) => {
  try {
    const sb = getSupabase();
    if (!sb) return res.status(501).json({ error: 'Base de donnees non configuree' });

    const body = req.body || {};
    if (!body.client_name) {
      return res.status(400).json({ error: "Nom du client obligatoire" });
    }
    const type = QUOTE_TYPES.includes(body.type) ? body.type : 'devis';
    const items = Array.isArray(body.items) ? body.items : [];
    const total = items.reduce((sum: number, it: any) => sum + (Number(it?.montant) || 0), 0);
    const deposit = Number.isFinite(Number(body.deposit)) ? Number(body.deposit) : Math.round(total * 0.5);

    const quote = {
      quote_ref: '',
      type,
      client_name: String(body.client_name),
      client_phone: body.client_phone || '',
      client_email: body.client_email || '',
      project_ref: body.project_ref || null,
      project_name: body.project_name || null,
      pole: body.pole || 'Direction',
      items,
      total,
      deposit,
      balance: total - deposit,
      currency: body.currency || 'FCFA',
      status: normalizeQuoteStatus(body.status),
      valid_days: Number(body.valid_days) || 30,
      notes: body.notes || '',
      created_by: req.member?.name || 'Direction',
      updated_at: new Date().toISOString(),
    };

    // Deux creations simultanees peuvent lire la meme derniere reference :
    // la contrainte unique rejette alors la seconde. On rejoue l'attribution.
    let saved: any = null;
    let lastError: any = null;
    for (let attempt = 0; attempt < 5 && !saved; attempt++) {
      const ref = await nextQuoteRef(sb, type);
      const { data, error } = await sb.from('quotes').insert({ ...quote, quote_ref: ref }).select('*').maybeSingle();
      if (error) {
        lastError = error;
        if (error.code === '23505') continue; // reference deja prise, on recommence
        throw error;
      }
      saved = data;
    }

    if (!saved) {
      console.error("Reference devis indisponible:", lastError?.message);
      return res.status(503).json({ error: "Reference indisponible, reessayez dans un instant" });
    }

    res.json({ success: true, quote: saved });
  } catch (err: any) {
    console.error("Erreur creation devis:", err);
    res.status(500).json({ error: "Erreur creation devis" });
  }
});

app.patch("/api/quotes/:ref", requirePerm('admin'), async (req: AuthReq, res) => {
  try {
    const sb = getSupabase();
    if (!sb) return res.status(501).json({ error: 'Base de donnees non configuree' });
    const ref = req.params.ref;
    if (!ref) return res.status(400).json({ error: "Reference manquante" });

    const body = req.body || {};
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.status) patch.status = normalizeQuoteStatus(body.status);
    if (body.notes !== undefined) patch.notes = body.notes;
    if (Array.isArray(body.items)) {
      patch.items = body.items;
      const total = body.items.reduce((sum: number, it: any) => sum + (Number(it?.montant) || 0), 0);
      patch.total = total;
      const deposit = Number.isFinite(Number(body.deposit)) ? Number(body.deposit) : Math.round(total * 0.5);
      patch.deposit = deposit;
      patch.balance = total - deposit;
    }

    const { data, error } = await sb
      .from('quotes')
      .update(patch)
      .eq('quote_ref', ref)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Devis introuvable" });
    res.json({ success: true, quote: data });
  } catch (err: any) {
    console.error("Erreur mise a jour devis:", err);
    res.status(500).json({ error: "Erreur mise a jour devis" });
  }
});

app.delete("/api/quotes/:ref", requirePerm('admin'), async (req: AuthReq, res) => {
  try {
    const sb = getSupabase();
    if (!sb) return res.status(501).json({ error: 'Base de donnees non configuree' });
    const { error } = await sb.from('quotes').delete().eq('quote_ref', req.params.ref);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    console.error("Erreur suppression devis:", err);
    res.status(500).json({ error: "Erreur suppression devis" });
  }
});

// ------------------------------------------------------------
// Parametres de l'agence
// L'onglet Parametres affichait un bouton "Enregistrer" qui ne
// sauvegardait rien : les coordonnees ne subsistaient pas au
// rechargement. Elles sont desormais persistees.
// ------------------------------------------------------------
const SETTINGS_KEYS = ['agency_phone', 'agency_email', 'agency_location'];

app.get("/api/settings", requireAuth, async (_req, res) => {
  try {
    const sb = getSupabase();
    if (!sb) return res.json({ settings: {} });
    const { data, error } = await sb.from('app_settings').select('*');
    if (error) throw error;
    const settings: Record<string, string> = {};
    (data || []).forEach((row: any) => {
      settings[row.key] = row.value;
    });
    res.json({ settings });
  } catch (err: any) {
    console.error("Erreur lecture parametres:", err);
    res.status(500).json({ error: "Erreur lecture parametres" });
  }
});

app.put("/api/settings", requirePerm('admin'), async (req: AuthReq, res) => {
  try {
    const sb = getSupabase();
    if (!sb) return res.status(501).json({ error: 'Base de donnees non configuree' });

    const body = req.body || {};
    const rows = Object.entries(body)
      .filter(([k, v]) => SETTINGS_KEYS.includes(k) && typeof v === 'string')
      .map(([key, value]) => ({ key, value: String(value).slice(0, 300), updated_at: new Date().toISOString() }));

    if (rows.length === 0) {
      return res.status(400).json({ error: "Aucun parametre reconnu" });
    }

    const { data, error } = await sb
      .from('app_settings')
      .upsert(rows, { onConflict: 'key' })
      .select('*');
    if (error) throw error;

    const settings: Record<string, string> = {};
    (data || []).forEach((row: any) => {
      settings[row.key] = row.value;
    });
    res.json({ success: true, settings });
  } catch (err: any) {
    console.error("Erreur enregistrement parametres:", err);
    res.status(500).json({ error: "Erreur enregistrement parametres" });
  }
});

// P0 — Exfiltration de donnees client vers Gemini corrigee.
//
// AVANT : le client envoyait `leadsSummary` et `tasksSummary`, et le serveur
// les concaténait tels quels dans le prompt. Concretement, le portefeuille de
// prospects (noms, telephones, montants) et le backlog de taches partaient
// chez un tiers. De plus `pathname` et `role` venaient du client : un appel
// direct pouvait injecter n'importe quelles instructions en amont du system
// prompt.
//
// APRES :
//   1. le serveur ne transmet plus de donnees client a Gemini. Il resume
//      lui-meme en chiffres agreges et non identifiants, et la reponse est
//      explicitement traitee comme non fiable (voir `sanitizeForPrompt`) ;
//   2. plus aucun champ du client n'entre dans le prompt : `pole` est
//      valide contre la liste des poles connus, `query` est borne ;
//   3. le system prompt est place en `systemInstruction`, que Gemini traite
//      comme prioritaire, au lieu d'etre concatene dans `contents`.
//
// Ce correctif ne rend pas l'IA "locale" : Groq ou Gemini restent cloud. Il
// arrete d'envoyer des donnees clients identifiantes a un tiers sans
// consentement, ce qui est la violation de donnees la plus grave du module.

// Liste fermee des poles. Un `pole` hors liste devient 'Direction' au lieu
// d'etre injecte tel quel dans le prompt.
const KNOWN_POLES = ['Direction', 'Creatif', 'Tech', 'Digital', 'Client', 'Externe'];

// Normalise une entree destinee a un prompt.
//
// Retire les caracteres de controle (NUL, retour chariot, tabulation,
// DEL...), qui ne servent qu'a tronquer ou a desobfusquer l'analyse, puis
// borne la longueur.
//
// Les echappements sont ecrits en `\uXXXX` et non en caracteres litteraux :
// un NUL brut dans le source casse le grep, certains editeurs et les
// diffs, et invite a une regression a la reecriture.
//
// A PRECISER : ce filtre n'est PAS une parade contre l'injection
// d'instructions. « Ignorez les regles precedentes » s'ecrit en ASCII et
// passe. La parade reelle est le placement des consignes dans
// `systemInstruction`, que le modele traite comme prioritaire (voir
// POST /api/ai/agent-chat).
function sanitizeForPrompt(s: unknown, max: number): string {
  if (typeof s !== 'string') return '';
  return s
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .slice(0, max)
    .trim();
}

// Construit le contexte cockpit transmis a l'IA.
//
// Regle de confidentialite : ce contexte ne contient QUE des compteurs
// agreges. Aucun nom de client, aucun telephone, aucun email, aucun montant
// individuel. Le but est de donner a l'IA de quoi repondre utilement sur la
// charge et la conversion, sans lui transmettre le portefeuille de prospects.
//
// Si la base est injoignable, on renvoie un contexte neutre plutot que de
// laisser passer une erreur : le copilote doit rester utilisable.
interface CockpitCounts {
  leads: number;
  openTasks: number;
  lateTasks: number;
  activeQuotes: number;
}

async function buildCockpitContext(): Promise<{ text: string; counts: CockpitCounts | null }> {
  try {
    const sb = getSupabase();
    if (!sb) {
      return { text: '\n\nContexte cockpit : donnees indisponibles.', counts: null };
    }

    const now = new Date();

    // Compteurs uniquement. `count: 'exact', head: true` ne transporte
    // aucune ligne, donc aucune donnee client ne transite.
    const [leadsRes, tasksRes, lateRes, quotesRes] = await Promise.all([
      sb.from('leads').select('*', { count: 'exact', head: true }),
      sb.from('tasks').select('*', { count: 'exact', head: true }).neq('statut', 'termine'),
      sb.from('tasks').select('*', { count: 'exact', head: true }).neq('statut', 'termine').lt('echeance', now.toISOString().slice(0, 10)),
      sb.from('quotes').select('*', { count: 'exact', head: true }).in('status', ['envoye', 'accepte', 'paye']),
    ]);

    const counts: CockpitCounts = {
      leads: leadsRes.count ?? 0,
      openTasks: tasksRes.count ?? 0,
      lateTasks: lateRes.count ?? 0,
      activeQuotes: quotesRes.count ?? 0,
    };

    return {
      text:
        '\n\nContexte cockpit (compteurs agreges, aucun nominatif) :' +
        `\n- Leads au total : ${counts.leads}` +
        `\n- Taches ouvertes : ${counts.openTasks}` +
        `\n- Taches en retard : ${counts.lateTasks}` +
        `\n- Devis actifs (envoye/accepte/paye) : ${counts.activeQuotes}`,
      counts,
    };
  } catch (err) {
    console.warn('buildCockpitContext:', err);
    return { text: '\n\nContexte cockpit : donnees indisponibles.', counts: null };
  }
}

// Repli « base de connaissances » quand Gemini est indisponible.
//
// Avant, il renvoyait UNE phrase figee par pole, identique quelle que soit la
// question : c'est ce qui donnait l'impression que le copilote « repete la
// meme reponse ». On tient desormais compte de l'intention detectee dans la
// question ET des compteurs reels du cockpit, de sorte que deux questions
// differentes (ou deux etats differents de l'OS) produisent deux reponses
// differentes. Aucune donnee nominative n'est utilisee.
function reponseBaseConnaissances(
  cleanQuery: string,
  pole: string,
  counts: CockpitCounts | null
): string {
  const q = cleanQuery.toLowerCase();
  const etat = counts
    ? `${counts.leads} prospect(s) au pipeline, ${counts.openTasks} tâche(s) ouverte(s) dont ${counts.lateTasks} en retard, et ${counts.activeQuotes} devis actif(s)`
    : 'les compteurs temps réel sont momentanément indisponibles';

  if (/relanc|prospect|lead|closing|converti|pipeline|whatsapp/.test(q)) {
    return counts
      ? `Relance : sur ${counts.leads} prospect(s) au pipeline, traitez d'abord les plus anciens sans réponse puis les devis envoyés non signés (${counts.activeQuotes} devis actifs). Objectif : un premier contact WhatsApp sous 2 h, car un temps de réponse court multiplie par 3 la conversion. Terminez chaque échange par une date de décision explicite plutôt qu'un « je vous recontacte ».`
      : `Relance : priorisez les prospects sans réponse depuis le plus longtemps et les devis envoyés non signés. Contactez chaque prospect sous 2 h sur WhatsApp et fixez une date de décision explicite. (Compteurs temps réel indisponibles à l'instant.)`;
  }

  if (/t[aâ]che|retard|priorit|charge|planning|organisation|rendement/.test(q)) {
    return counts
      ? `Priorisation : ${counts.openTasks} tâche(s) sont ouvertes, dont ${counts.lateTasks} en retard. Commencez par les retards (impact direct sur la satisfaction), puis les tâches du pôle ${pole} à échéance la plus proche. Regroupez les tâches similaires pour limiter les changements de contexte, et déléguez tout ce qui n'exige pas votre validation personnelle.`
      : `Priorisation : commencez par les tâches en retard, puis celles à échéance la plus proche, et déléguez ce qui n'exige pas votre validation. (Compteurs temps réel indisponibles à l'instant.)`;
  }

  if (/devis|factur|rentab|marge|paiement|encaiss|chiffre|budget/.test(q)) {
    return counts
      ? `Rentabilité : ${counts.activeQuotes} devis sont actifs (envoyé/accepté/payé). Visez une marge brute > 65 % et transformez en priorité les devis acceptés en factures encaissées. Sur un devis immobile, proposez une variante d'accompagnement (maintenance, formation) plutôt qu'une remise : elle protège la marge et augmente le panier moyen.`
      : `Rentabilité : visez une marge brute > 65 %, transformez les devis acceptés en factures encaissées et proposez une variante d'accompagnement plutôt qu'une remise. (Compteurs temps réel indisponibles à l'instant.)`;
  }

  const defaults: Record<string, string> = {
    Direction: `Direction : l'état actuel est ${etat}. Concentrez la semaine sur la clôture des devis Synergie, la tenue du taux de marge brute (> 65 %) et le suivi des responsables des 6 pôles.`,
    Tech: `Tech : l'état actuel est ${etat}. Maintenez le protocole de synchronisation hors-ligne d'ARKA-PME (inventaire fiable en 12 min) et validez les clés d'API Mobile Money MTN/Orange.`,
    Creatif: `Créatif : l'état actuel est ${etat}. Préparez les 2 à 3 infographies hebdomadaires des clients Synergie et organisez le matériel photo avant la prochaine sortie terrain.`,
    Digital: `Digital : l'état actuel est ${etat}. Surveillez les requêtes SEO locales à Yaoundé et Douala et maintenez le coût par lead qualifié sous 3 500 FCFA.`,
    Client: `Client : l'état actuel est ${etat}. Contactez chaque prospect sous 2 h sur WhatsApp et vérifiez que chaque lead assigné a bien un responsable et une prochaine action datée.`,
  };

  return defaults[pole] || `Recommandation Arckaton OS : l'état actuel est ${etat}. Continuez l'excellence opérationnelle et le respect des 24 h de réponse client.`;
}

// Copilot for Dashboard
// Copilote stratégique : réservé aux membres connectés (OS).
// P0 — plafond ajoute. C'etait le seul appel Gemini sans limite : un membre
// authentifie (ou un jeton vole) pouvait boucler sur la route et epuiser le
// quota Gemini, qui est partage avec le site public.
app.post(
  "/api/ai/copilot",
  requireAuth,
  rateLimit({ windowMs: 60_000, max: 10, scope: 'ai:copilot', message: 'Trop de questions. Reessayez dans une minute.' }),
  async (req: AuthReq, res) => {
  try {
    const body = req.body || {};
    const query: string = typeof body.query === 'string' ? body.query
      : typeof body.message === 'string' ? body.message : "";
    const cleanQuery = sanitizeForPrompt(query, 1000);
    if (!cleanQuery) {
      return res.status(400).json({ error: "Question requise" });
    }

    // `pole` valide contre la liste fermee. `role` vient de la session
    // (requireAuth) uniquement, jamais du corps de requete.
    const requestedPole = typeof body.pole === 'string' ? body.pole : '';
    const pole = KNOWN_POLES.includes(requestedPole) ? requestedPole : 'Direction';
    const role = req.member?.role || 'membre';

    // Contexte cockpit : calcule par le serveur, agrege et non identifiant.
    // On ne transmet a Gemini que des compteurs, jamais un nom, un telephone
    // ni un montant de lead.
    const { text: cockpit, counts: cockpitCounts } = await buildCockpitContext();

    // Historique de conversation (facultatif) : sans lui, le modele ne voyait
    // que la question courante et pouvait resservir mot pour mot la meme
    // reponse. Chaque entree est nettoyee et bornee ; seuls les roles
    // user/assistant sont acceptes, "model" ne peut donc pas etre force.
    const historyBrute: unknown[] = Array.isArray(body.history) ? body.history : [];
    const history = historyBrute
      .slice(-8)
      .map((h) => {
        const o = (h && typeof h === 'object') ? (h as Record<string, unknown>) : {};
        return {
          role: o.role === 'assistant' ? 'model' : 'user',
          text: sanitizeForPrompt(o.text, 800),
        };
      })
      .filter((h) => h.text);

    const contents = [
      ...history.map((h: { role: string; text: string }) => ({ role: h.role, parts: [{ text: h.text }] })),
      { role: 'user', parts: [{ text: `Question de l'utilisateur : ${cleanQuery}\n\nConseiller Arckaton:` }] },
    ];

    const ai = getGeminiClient();
    
    if (ai) {
      try {
        // Les consignes et le contexte cockpit forment l'instruction
        // systeme : le modele ne peut pas les confondre avec la question.
        // Le client ne fournit QUE `cleanQuery`, qui entre dans `contents`.
        const systemInstruction = `Tu es le Copilote Operationnel Arckaton OS pour le pole ${pole}.
L'utilisateur est ${role} (donnee de session, non modifiable par le client).${cockpit}

Consignes strictes :
- Reponds en francais, en 100 a 150 mots maximum.
- Oriente la reponse vers la rentabilite et la qualite operationnelle.
- N'invente aucun chiffre client : seuls les compteurs agreges du cockpit sont fiables.
- Si la question exige une donnee que tu n'as pas, dis-le explicitement.`;

        const { texte: text, model } = await generateWithFallback(ai, {
          systemInstruction,
          contents,
        });

        return res.json({ reply: text, advice: text, source: 'gemini', aiEnabled: true, model });
      } catch (err) {
        console.warn("Copilot Gemini indisponible:", err);
      }
    }

    // Repli base de connaissances : reponse construite a partir de la question
    // et des compteurs reels (jamais un texte fige), afin de ne pas repeter
    // une meme phrase a chaque question.
    const advice = reponseBaseConnaissances(cleanQuery, pole, cockpitCounts);
    // `aiEnabled` permet a l'UI d'afficher « IA non configuree » au lieu d'un silence
    res.json({ reply: advice, advice, source: 'knowledge_base', aiEnabled: Boolean(ai) });
  } catch (err) {
    res.status(500).json({ error: "Erreur copilote" });
  }
  }
);

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
    // P0 — LFI corrigee.
    //
    // La version precedente faisait :
    //     res.sendFile(path.join(distPath, 'icons', req.params.file))
    // Express decode le parametre, donc une requete comme
    //     GET /icons/..%2f..%2f.env
    // sortait du dossier dist/icons et envoyait le .env de la racine du
    // projet, contenant SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY et
    // WHATSAPP_TOKEN. Aucun auth requis : compromission totale.
    //
    // Deux verrous independants :
    //   1. path.basename neutralise toute forme de traversee
    //      (`../`, `..%2f`, `....//`, backslashes Windows) ;
    //   2. une allowlist explicite refuse tout fichier non_ATTENDU.
    // Le premier suffit a securiser, le second evite qu'un nouveau
    // fichier deposé dans dist/icons ne soit servi par accident.
    const ICONS_ALLOWLIST = new Set(['icon.svg']);
    app.get('/icons/:file', (req, res) => {
      const requested = String(req.params.file || '');
      // path.basename suffit : sur toute entree, il ne renvoie que le
      // dernier segment. `..` seul devient '.', qui ne passe pas l'allowlist.
      const safeName = path.basename(requested);
      if (safeName !== requested || !ICONS_ALLOWLIST.has(safeName)) {
        return res.status(404).json({ error: 'Icone inconnue' });
      }
      const iconPath = path.join(distPath, 'icons', safeName);
      // Deuxieme verrou : le chemin resolu doit rester dans dist/icons.
      // Casse en dur meme si l'allowlist etait contournee un jour.
      if (!iconPath.startsWith(path.join(distPath, 'icons') + path.sep)) {
        return res.status(404).json({ error: 'Icone inconnue' });
      }
      res.sendFile(iconPath);
    });

    // Repli SPA : uniquement pour les vrais chemins de pages.
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    startWhatsAppWorker();
  });
}

// L'application est exportee pour les tests d'integration (Supertest), qui
// ont besoin de l'objet Express sans ouvrir de port.
export { app };

// Le verrouillage par compte est exporte pour etre teste directement.
//
// Pourquoi ne suffit pas un test d'integration sur POST /api/auth/login ?
// Parce que le compteur n'est alimente que sur un echec REEL d'authentification.
// Sans Supabase configure (le cas de la CI et des tests locaux), la route
// repond 500 avant d'atteindre le compteur, et le test passerait sans
// jamais exercer la logique qu'il pretend valider. Tester la fonction
// directement evite ce faux vert.
export const __authThrottle = {
  accountLocked,
  recordFailedAttempt,
  clearFailedAttempts,
  // Reinitialise les compteurs entre deux tests.
  reset: () => {
    accountAttempts.clear();
    rateBuckets.clear();
  },
  ACCOUNT_MAX_FAILURES,
  ACCOUNT_WINDOW_MS,
};

// Exporte pour tester la normalisation des entrees destinees a un prompt.
export const __sanitizeForPrompt = sanitizeForPrompt;

// Exporte pour tester que le repli « base de connaissances » varie selon la
// question et l'etat du cockpit (correctif du copilote qui repetait).
export const __reponseBaseConnaissances = reponseBaseConnaissances;

/**
 * Regle de desactivation des plafonds, extraite pour etre testee.
 *
 * Elle est exposee comme fonction, et non comme constante, parce que la
 * constante est evaluee au chargement du module — donc figee avant que
 * le test puisse poser des variables. La fonction est pure : elle lit
 * l'environnement qu'on lui passe. C'est ce qui permet d'eprouver les
 * quatre cas qui comptent (local, production, hote distant, hote
 * inconnu) sans redemarrer un serveur.
 *
 * Le cas `NODE_ENV=production` est le plus important : c'est la seule
 * condition qui ne depend pas d'un parametre de connexion et qui
 * survit a une erreur de configuration.
 */
export function rateLimitsDesactives(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.RATE_LIMIT_OFF !== '1') return false;
  if (env.NODE_ENV === 'production') return false;

  const url = env.DATABASE_URL;
  if (url) {
    try {
      // Une URL malformee ne doit pas faire echouer le chargement du
      // module : on la traite comme « hote inconnu », donc la parade
      // reste active.
      return HOSTS_LOCAUX.has(new URL(url).hostname.toLowerCase());
    } catch {
      return false;
    }
  }
  return HOSTS_LOCAUX.has((env.PGHOST || '').toLowerCase());
}

// Regle de visibilite du CMS : faut-il ne charger que les lignes publiees ?
//
// Extraite de la route pour etre testable sans base. C'etait le piege du
// P0.6 : la regle vivait dans le corps de la route, donc impossible a
// verifier autrement qu'en observant le contenu d'une reponse reelle — et
// sans donnees, n'importe quel filtre passe le test.
//
// Un membre sans la permission `content` reste limite au publie, meme
// authentifie : `content` est une permission d'EDITION, pas de lecture.
function contentVisibility(member: ContentVisibilityMember | null | undefined): boolean {
  if (!member) return true; // public : publie uniquement
  if (member.active === false) return true; // compte desactive : publie
  return !hasPerm(member, 'content');
}

// Forme de la reponse de GET /api/content.
//
// Chaque element est le champ `data` JSONB de la ligne, PAS la ligne
// complete. C'etait masque par `ContentRow.data: any` : la fonction
// declarait `ContentRow[]` alors qu'elle renvoyait le `data`, et TypeScript
// ne pouvait pas le signaler. Un consommateur de la reponse aurait donc cru
// disposer de `id`, `slug`, `published`... qui n'y sont pas. On le declare
// explicitement, conformement a l'interdit de `any` d'AGENTS.md.
interface ContentPayload {
  config: unknown | null;
  forfaits: unknown[];
  blog: unknown[];
  realisations: unknown[];
  temoignages: unknown[];
}

// Construit la reponse de GET /api/content.
//
// Egalement extraite : le filtrage `published` se fait dans la requete
// (`fetchContentItems`), la mise en forme ici. Deux etapes distinctes, donc
// deux fonctions distinctes — sinon le formatage pouvait « rattraper » une
// regression du filtrage en renvoyant des brouillons dans un autre champ.
function buildContentPayload(items: ContentRow[]): ContentPayload {
  const grouped = groupContent(items);
  return {
    config: grouped.config?.[0] ?? null,
    forfaits: grouped.forfaits || [],
    blog: grouped.blog || [],
    realisations: grouped.realisations || [],
    temoignages: grouped.temoignages || [],
  };
}

// Point d'entree unique de GET /api/content : decide du filtre, charge, met
// en forme.
//
// Le second parametre est injectable pour une raison precise : sans lui, le
// test ne peut passer qu'un `member` et observer la reponse, or sans base de
// donnees la reponse est vide — et un test qui observe un tableau vide passe
// que le filtre fonctionne ou non. Injecter la fonction de chargement permet
// de fournir un jeu de donnees contenant un brouillon et de verifier
// reellement qu'un visiteur anonyme ne le recoit pas.
async function serveContentFor(
  member: ContentVisibilityMember | null | undefined,
  load: (options: { onlyPublished?: boolean }) => Promise<ContentRow[]>
): Promise<ReturnType<typeof buildContentPayload>> {
  const onlyPublished = contentVisibility(member);
  const items = await load({ onlyPublished });
  return buildContentPayload(items);
}

export { contentVisibility as __contentVisibilityForTest, buildContentPayload as __buildContentPayloadForTest, serveContentFor as __serveContentForTest, looksLikeJwt as __looksLikeJwtForTest, queryContentItems as __queryContentItemsForTest, groupContent as __groupContentForTest };

// P0 — contrat 404 de l'API honore dans TOUS les modes.
//
// Ce gestionnaire etait enregistre a l'interieur du bloc `else` (mode
// production uniquement). En developpement — et donc dans les tests — une
// route `/api/*` inexistante tombait sur le 404 HTML par defaut d'Express,
// ou, pire, sur le repli SPA de Vite qui renvoie index.html avec un 200.
//
// Consequence reelle : une faute de frappe dans une URL d'API renvoyait un
// succes, et le frontend essayait de lire du JSON dans du HTML. L'erreur
// n'apparait qu'en developpement, donc le developpeur la corrigeait sans
// jamais voir que la production etait fausse.
//
// On l'enregistre au niveau du module, apres toutes les routes : il ne
// s'active donc que si aucune route n'a repondu.
app.all('/api/*', (_req, res) => {
  res.status(404).json({ error: "Route d'API inconnue." });
});

// P0 — demarrage automatique neutralise POUR LES TESTS UNIQUEMENT.
//
// Avant, `startServer()` etait appele au chargement du module, donc importer
// `server.ts` depuis un test demarrait un vrai serveur sur le port 3000 et
// lancait le worker WhatsApp : deux imports entraient en collision, et aucun
// test d'endpoint n'etait possible.
//
// Le premier correctif testait si `process.argv[1]` se terminait par
// `server.ts` ou `server.js`. C'etait un piege : le build de production
// produit `dist/server.cjs`, et `npm start` execute precisement ce fichier.
// La condition était donc fausse en production, le serveur ne demarrait pas,
// et le processus se terminait sans erreur visible — un deploiement muet.
//
// On inverse donc la logique : on demarre SAUF en contexte de test. Le
// defaut est de fonctionner, et l'exception est explicite. Vitest positionne
// `VITEST=true` et `VITEST_WORKER_ID` avant tout import, ce qui rend la
// detection fiable, independamment du chemin d'entree.
const isTestContext =
  process.env.NODE_ENV === 'test' ||
  process.env.VITEST === 'true' ||
  process.env.VITEST_WORKER_ID !== undefined;

if (!isTestContext) {
  startServer();
} else {
  console.log('[server] Contexte de test : aucun ecoute sur le port.');
}
