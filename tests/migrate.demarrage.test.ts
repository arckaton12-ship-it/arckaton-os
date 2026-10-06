// Tests du demarrage des migrations (src/db/migrate.ts).
//
// Deux niveaux :
//   - les tests « mode degrade » tournent dans `npm test` : sans base,
//     le demarrage doit sauter sans erreur (ce n'est pas un faux vert,
//     c'est le comportement voulu — l'application repond meme en base
//     absente) ;
//   - les tests « base reelle » tournent via `npm run test:db` : le
//     demarrage doit appliquer les migrations une fois, puis repasser
//     a vide, et laisser les tables attendues derriere lui.
import { describe, it, expect, afterAll } from 'vitest';
import { readdirSync } from 'node:fs';
import { query, closePool, enLignes } from '../src/db/adapter';
import {
  appliquerMigrationsAuDemarrage,
  dossierMigrations,
  fichiersMigrations,
} from '../src/db/migrate';

const baseConfiguree =
  Boolean(process.env.PGUSER && process.env.PGPASSWORD) ||
  Boolean(process.env.DATABASE_URL);

afterAll(async () => {
  await closePool();
});

describe('migrations au demarrage (mode degrade)', () => {
  // Ce cas ne tient que sans base : sous `npm run test:db`, la base est
  // configuree et le demarrage applique reellement les migrations (l'autre
  // suite, « base reelle », le verifie).
  it.skipIf(baseConfiguree)('saute sans erreur faute de base configuree', async () => {
    const r = await appliquerMigrationsAuDemarrage();
    expect(r.saute).toBeTruthy();
    expect(r.enErreur).toBeNull();
    expect(r.appliquees).toEqual([]);
  });

  it('saute quand le dossier des migrations est vide', async () => {
    process.env.MIGRATIONS_DIR = 'dossier-introuvable-x7';
    try {
      const r = await appliquerMigrationsAuDemarrage();
      expect(r.saute).toContain('aucune migration');
    } finally {
      delete process.env.MIGRATIONS_DIR;
    }
  });

  it('dossierMigrations respecte la surcharge MIGRATIONS_DIR', () => {
    process.env.MIGRATIONS_DIR = 'chemin/fabrique';
    try {
      expect(dossierMigrations()).toBe('chemin/fabrique');
    } finally {
      delete process.env.MIGRATIONS_DIR;
    }
    expect(dossierMigrations()).toContain('migrations');
  });

  it('les fichiers .sql sont lus tries par nom', () => {
    const dir = dossierMigrations();
    const fichiers = fichiersMigrations(dir);
    expect(fichiers.length).toBeGreaterThanOrEqual(3);
    expect(fichiers[0]).toBe('001_roles.sql');
    const trie = [...fichiers].sort();
    expect(fichiers).toEqual(trie);
  });
});

describe.skipIf(!baseConfiguree)('migrations au demarrage (base reelle)', () => {
  it('applique chaque .sql de migrations/ alors enregistre dans schema_migrations', async () => {
    const r = await appliquerMigrationsAuDemarrage();
    expect(r.enErreur).toBeNull();
    const attendus = readdirSync(dossierMigrations())
      .filter((f) => f.endsWith('.sql'))
      .sort();
    const { data } = await query('SELECT version FROM schema_migrations');
    const versions = new Set(enLignes<{ version: string }>(data).map((x) => x.version));
    for (const f of attendus) {
      expect(versions.has(f)).toBe(true);
    }
  });

  it('repasser est idempotent : rien de nouveau a appliquer', async () => {
    await appliquerMigrationsAuDemarrage();
    const r = await appliquerMigrationsAuDemarrage();
    expect(r.enErreur).toBeNull();
    expect(r.appliquees).toEqual([]);
    expect(r.dejaPresentes.length).toBeGreaterThan(0);
  });

  it('laisse les tables de rendez-vous et notifications derriere lui', async () => {
    await appliquerMigrationsAuDemarrage();
    const { data } = await query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name IN ('appointments', 'notifications')
       ORDER BY 1`
    );
    const tables = enLignes<{ table_name: string }>(data).map((t) => t.table_name);
    expect(tables).toEqual(['appointments', 'notifications']);
  });
});