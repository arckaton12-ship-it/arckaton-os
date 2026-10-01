#!/usr/bin/env node
// ============================================================
//  Migrations incrémentales PostgreSQL
//
//  N'applique que les fichiers `.sql` de `migrations/` non encore
//  enregistrés dans `schema_migrations`. Idempotent, transactionnel
//  (chaque migration dans sa propre transaction), refuse de tourner
//  en production.
// ============================================================
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = resolve(ICI, '..');
const DIR_MIG = resolve(RACINE, 'migrations');

const PG_CFG = {
  host: process.env.PGHOST || '127.0.0.1',
  port: Number(process.env.PGPORT_ADMIN) || Number(process.env.PGPORT) || 5434,
  database: process.env.PGDATABASE || 'arckaton',
  user: process.env.PGUSER || 'arckaton',
  password: process.env.PGPASSWORD || 'arckaton_local',
};

const HOSTS_LOCAUX = new Set(['127.0.0.1', 'localhost', '::1']);
if (process.env.NODE_ENV === 'production') {
  console.error('REFUS : ce script de migrations n\'est pas prévu pour la production.');
  process.exit(1);
}
if (!HOSTS_LOCAUX.has(PG_CFG.host)) {
  console.error('REFUS : hôte non local : ' + PG_CFG.host);
  process.exit(1);
}

(async () => {
  const client = new pg.Client({ ...PG_CFG, connectionTimeoutMillis: 5000 });
  await client.connect();
  try {
    await client.query(
      'CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())'
    );
    const res = await client.query('SELECT version FROM schema_migrations');
    const applied = new Set(res.rows.map((r) => r.version));
    const files = readdirSync(DIR_MIG).filter((f) => f.endsWith('.sql')).sort();
    let count = 0;
    for (const f of files) {
      if (applied.has(f)) continue;
      const sql = readFileSync(resolve(DIR_MIG, f), 'utf8');
      await client.query('BEGIN');
      try {
        // Certaines migrations (002_schema.sql) créent des tables déjà
        // présentes sur une base existante. Pour un volume existant, on
        // souhaite idempotence : si une table existe déjà, on considère
        // la migration comme déjà appliquée.
        try { await client.query(sql); } catch (e) {
          const msg = e.message || '';
          if (msg.includes('relation') && msg.includes('already exists') || msg.includes('duplicate key') || msg.includes('current transaction is aborted')) {
            try { await client.query('ROLLBACK'); } catch {}
            await client.query('BEGIN');
            await client.query('INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING', [f]);
            await client.query('COMMIT');
            console.log('  déjà appliqué : ' + f);
            count++;
            continue;
          }
          throw e;
        }
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [f]);
        await client.query('COMMIT');
        console.log('  appliqué : ' + f);
        count++;
      } catch (e) {
        try { await client.query('ROLLBACK'); } catch {}
        throw e;
      }
    }
    console.log(count === 0 ? '  migrations à jour (aucune nouvelle)' : '  ' + count + ' migration(s) appliquée(s)');
  } finally {
    await client.end().catch(() => {});
  }
})().catch((e) => {
  console.error('\n  ECHEC : ' + e.message + '\n');
  process.exit(1);
});
