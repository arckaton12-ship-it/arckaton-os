#!/usr/bin/env node
// ============================================================
//  Nettoyage complet des donnees operationnelles de l'OS.
//
//  S'exécute uniquement DANS Render, via un startCommand temporaire
//  (node scripts/cleanup-prod.mjs) pose au moment du basculement, puis
//  retire. Il supprime toutes les donnees de simulation de l'OS :
//  comptes membres, identifiants, notifications, activite, taches,
//  messages, leads, projets, medias projet, devis, rendez-vous, file
//  WhatsApp.
//
//  GARDE : content_items (realisations, services, forfaits, temoignages,
//  blog), schema_migrations, app_settings.
//
//  Garde-fous :
//    - refuse de tourner sans RENDER_CLEANUP=1 ;
//    - refuse si une table "sauvegardee" est referencee par une FK
//      issue d'une table a vider (le CASCADE irait plus loin que voulu) ;
//    - imprime les compteurs AVANT pour laisser une trace dans les logs.
//
//  Variables d'environnement (posées par Render) :
//    DATABASE_URL   (interne Render)
// ============================================================
import pg from 'pg';

if (process.env.RENDER_CLEANUP !== '1') {
  console.error('[cleanup] REFUS : poser RENDER_CLEANUP=1 pour exécuter ce nettoyage.');
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('[cleanup] REFUS : DATABASE_URL manquant.');
  process.exit(1);
}

const TABLES = [
  'members',
  'member_credentials',
  'notifications',
  'activity_log',
  'agent_reports',
  'tasks',
  'messages',
  'leads',
  'projects',
  'project_media',
  'quotes',
  'appointments',
  'whatsapp_outbox',
];

const GARDEES = ['content_items', 'schema_migrations', 'app_settings'];

const client = new pg.Client({ connectionString: url });
await client.connect();

try {
  // 1) Verifie qu'aucune table videe n'a de FK vers une table gardee.
  const { rows: fkDangereuses } = await client.query(
    `
    SELECT conrelid::regclass AS source, confrelid::regclass AS cible, conname
    FROM pg_constraint
    WHERE contype = 'f'
      AND confrelid::regclass = ANY($1::regclass[])
      AND conrelid::regclass = ANY($2::regclass[])
    `,
    [GARDEES, TABLES]
  );
  if (fkDangereuses.length > 0) {
    console.error('[cleanup] REFUS : FK vers une table gardee :', fkDangereuses);
    process.exit(1);
  }

  // 2) Trace des compteurs AVANT.
  console.log('[cleanup] Compteurs AVANT :');
  for (const t of [...TABLES, ...GARDEES]) {
    const { rows } = await client.query(`SELECT COUNT(*) AS n FROM "${t}"`);
    console.log(`  ${t.padEnd(20)} ${Number(rows[0].n)}`);
  }

  // 3) Dernière liste des comptes membres supprimés (trace).
  const { rows: membres } = await client.query(
    'SELECT name, email, role, pole FROM members ORDER BY created_at'
  );
  if (membres.length > 0) {
    console.log('[cleanup] Comptes membres supprimés :');
    for (const m of membres) {
      console.log(`  - ${m.name} <${m.email}> [${m.role}/${m.pole}]`);
    }
  }

  // 4) Purge, dans une transaction.
  await client.query('BEGIN');
  await client.query(
    `TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`
  );
  await client.query('COMMIT');

  // 5) Compteurs APRES.
  console.log('[cleanup] Compteurs APRES :');
  for (const t of [...TABLES, ...GARDEES]) {
    const { rows } = await client.query(`SELECT COUNT(*) AS n FROM "${t}"`);
    console.log(`  ${t.padEnd(20)} ${Number(rows[0].n)}`);
  }

  console.log('[cleanup] TERMINE.');
} finally {
  await client.end();
}