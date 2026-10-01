#!/usr/bin/env node
// ============================================================
//  Export Supabase -> fichiers JSON
//
//  Lit la base Supabase via l'API Management (même accès SQL que
//  pg_dump) et écrit un fichier JSON par table dans le dossier
//  ciblé. Sert de sauvegarde avant la bascule vers PostgreSQL, et
//  de source pour `scripts/importer-postgres.mjs`.
//
//  Variables d'environnement requises :
//    SUPABASE_ACCESS_TOKEN  (jeton personnel Supabase)
//    SUPABASE_PROJECT_REF   (référence du projet, ex. cvcrugs...)
//
//  Usage : node scripts/exporter-supabase.mjs [dossier]
// ============================================================
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF;
const DOSSIER = resolve(process.argv[2] || 'migration-dump');

if (!TOKEN || !REF) {
  console.error('REFUS : SUPABASE_ACCESS_TOKEN et SUPABASE_PROJECT_REF requis.');
  process.exit(1);
}

// Tables du schéma public à sauvegarder (ordre = ordre d'insertion).
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

async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} : ${await res.text()}`);
  }
  return res.json();
}

(async () => {
  mkdirSync(DOSSIER, { recursive: true });
  const resume = {};

  for (const table of TABLES) {
    // json_agg renvoie un tableau unique (une seule ligne) : pas de
    // pagination, pas de limite de lignes.
    const rows = await sql(`select coalesce(json_agg(t), '[]'::json) as data from public.${table} t`);
    const data = rows[0]?.data ?? [];
    writeFileSync(resolve(DOSSIER, `${table}.json`), JSON.stringify(data, null, 2));
    resume[table] = data.length;
    console.log(`  ${table} : ${data.length}`);
  }

  // Identités et hashes bcrypt, hors schéma public.
  const users = await sql('select id, email, encrypted_password from auth.users');
  writeFileSync(resolve(DOSSIER, 'auth_users.json'), JSON.stringify(users, null, 2));
  resume.auth_users = users.length;
  console.log(`  auth_users : ${users.length}`);

  writeFileSync(resolve(DOSSIER, 'manifest.json'), JSON.stringify({ source: REF, exportedAt: new Date().toISOString(), counts: resume }, null, 2));
  console.log(`\n  Export écrit dans ${DOSSIER}`);
})().catch((e) => {
  console.error('\n  ECHEC export : ' + e.message + '\n');
  process.exit(1);
});
