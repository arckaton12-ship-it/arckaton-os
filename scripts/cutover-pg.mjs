#!/usr/bin/env node
// ============================================================
//  Cutover Supabase -> PostgreSQL, exécuté DANS Render
//
//  Ce script tourne au démarrage du service (startCommand
//  temporaire) : il peut joindre l'API Management Supabase en
//  HTTPS et la base PostgreSQL par le réseau interne Render.
//
//  1. Applique les migrations `migrations/*.sql` (suivi
//     `schema_migrations`, idempotent).
//  2. Si la base est vide, exporte les données Supabase et les
//     importe (mêmes colonnes que le portage mécanique).
//  3. Reconstruit `member_credentials` depuis `auth.users`
//     (hash bcrypt conservé tel quel).
//
//  Variables d'environnement :
//    DATABASE_URL            (interne Render, sans SSL)
//    SUPABASE_ACCESS_TOKEN   (jeton personnel Supabase)
//    SUPABASE_PROJECT_REF    (référence du projet)
//
//  Idempotent : relançable sans risque.
// ============================================================
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = resolve(ICI, '..');
const DIR_MIG = resolve(RACINE, 'migrations');

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF;
const URL = process.env.DATABASE_URL;

const TABLES = [
  'members',
  'activity_log',
  'content_items',
  'tasks',
  'messages',
  'leads',
  'agent_reports',
  'whatsapp_outbox',
  'projects',
  'quotes',
  'app_settings',
];

function log(msg) {
  console.log('[cutover] ' + msg);
}

async function supabaseSql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`Supabase SQL HTTP ${res.status} : ${await res.text()}`);
  return res.json();
}

function ident(name) {
  return '"' + String(name).replace(/"/g, '""') + '"';
}

async function appliquerMigrations(client) {
  await client.query(
    'CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
  );
  const deja = new Set((await client.query('SELECT version FROM schema_migrations')).rows.map((r) => r.version));
  const fichiers = readdirSync(DIR_MIG).filter((f) => f.endsWith('.sql')).sort();
  for (const f of fichiers) {
    if (deja.has(f)) continue;
    const sql = readFileSync(resolve(DIR_MIG, f), 'utf8');
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [f]);
      await client.query('COMMIT');
      log('migration appliquée : ' + f);
    } catch (e) {
      await client.query('ROLLBACK');
      throw new Error(`migration ${f} : ${e.message}`);
    }
  }
}

async function colonnesReelles(client, table) {
  const r = await client.query(
    "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1",
    [table],
  );
  return new Set(r.rows.map((x) => x.column_name));
}

async function importerTable(client, table, lignes) {
  if (!lignes.length) {
    log(`${table} : 0 ligne`);
    return;
  }
  const autorisees = await colonnesReelles(client, table);
  let insere = 0;
  for (const ligne of lignes) {
    const cols = Object.keys(ligne).filter((c) => autorisees.has(c));
    if (!cols.length) continue;
    const valeurs = cols.map((c) => {
      const v = ligne[c];
      // Les colonnes jsonb arrivent en objet/tableau : on les sérialise
      // explicitement, sinon node-postgres produirait un littéral tableau.
      if (v !== null && typeof v === 'object') return JSON.stringify(v);
      return v;
    });
    const marqueurs = cols.map((_, i) => '$' + (i + 1)).join(', ');
    const sql = `INSERT INTO ${ident(table)} (${cols.map(ident).join(', ')}) VALUES (${marqueurs}) ON CONFLICT DO NOTHING`;
    const res = await client.query(sql, valeurs);
    insere += res.rowCount || 0;
  }
  log(`${table} : ${insere}/${lignes.length} ligne(s) importée(s)`);
}

async function reconstruireCredentials(client) {
  const users = await supabaseSql('select id, email, encrypted_password from auth.users');
  let n = 0;
  for (const u of users) {
    if (!u.email || !u.encrypted_password) continue;
    // Ne lie un mot de passe qu'aux membres réellement présents : un
    // membre écarté (admin secondaire, contrainte d'unicité) n'a pas de
    // ligne, et la FK rejetterait l'insertion.
    const res = await client.query(
      `INSERT INTO member_credentials (member_id, email, password_hash)
       SELECT $1::uuid, $2, $3
       WHERE EXISTS (SELECT 1 FROM members WHERE id = $1::uuid)
       ON CONFLICT DO NOTHING`,
      [u.id, String(u.email).toLowerCase(), u.encrypted_password],
    );
    n += res.rowCount || 0;
  }
  log(`member_credentials : ${n}/${users.length} reconstruit(s)`);
}

// La base autonome n'autorise qu'un seul admin (index partiel
// `members_un_seul_admin`). Supabase en portait deux : on conserve
// l'admin historique, et on redescend les autres au rang de membre,
// sinon l'import en perdrait un silencieusement.
const ADMIN_PRINCIPAL = 'directeur@arckaton.com';

function normaliserMembres(lignes) {
  const admins = lignes.filter((l) => l.role === 'admin');
  const garde =
    admins.find((a) => String(a.email || '').toLowerCase() === ADMIN_PRINCIPAL) || admins[0];
  return lignes.map((l) => {
    if (l.role === 'admin' && (!garde || l.id !== garde.id)) {
      return { ...l, role: 'membre' };
    }
    return l;
  });
}

(async () => {
  if (!URL) throw new Error('DATABASE_URL manquant');
  const client = new pg.Client({
    connectionString: URL,
    connectionTimeoutMillis: 15000,
    // Réseau interne Render : pas de TLS. En externe, ajouter ssl.
  });
  await client.connect();
  try {
    await appliquerMigrations(client);

    const present = await client.query('SELECT count(*)::int AS n FROM members').catch(() => ({ rows: [{ n: 0 }] }));
    if (present.rows[0].n > 0) {
      log(`base déjà peuplée (${present.rows[0].n} membres) : import ignoré`);
      return;
    }

    if (!TOKEN || !REF) {
      log('SUPABASE_ACCESS_TOKEN/REF absents : schéma seul, import ignoré');
      return;
    }

    for (const table of TABLES) {
      const rows = await supabaseSql(`select coalesce(json_agg(t), '[]'::json) as data from public.${table} t`);
      let lignes = rows[0]?.data ?? [];
      if (table === 'members') lignes = normaliserMembres(lignes);
      await importerTable(client, table, lignes);
    }
    await reconstruireCredentials(client);
    log('cutover terminé');
  } finally {
    await client.end().catch(() => {});
  }
})().catch((e) => {
  console.error('\n[cutover] ECHEC : ' + e.message + '\n');
  process.exit(1);
});
