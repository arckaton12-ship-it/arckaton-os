// ============================================================
//  Migrations appliquees au demarrage du serveur
//
//  Pourquoi ce module : il n'existait aucun chemin d'application des
//  migrations vers la production.
//
//   - `scripts/migrate.mjs` refuse tout hote non local (ligne 32) et
//     refuse `NODE_ENV=production` (ligne 28) : c'est un outil local.
//   - `scripts/apply-projects-table.ps1` parle a l'API Supabase, alors
//     que la base de production est un PostgreSQL Render
//     (`DATABASE_URL` pointe sur `dpg-...`).
//   - `scripts/cutover-pg.mjs` est un script de migration one-shot
//     lance comme startCommand temporaire, pas au fil des deploiements.
//
//  Résultat : une nouvelle table ajoutee dans `migrations/` n'arrivait
//  jamais sur la prod. L'endpoint qui l'utilise repondait 500 (table
//  inexistante) sans qu'aucun build rouge n'en avertisse. C'est le piege
//  exact que la regle « chaque endpoint a un test » ne peut pas rattraper :
//  le test passe avec la table creee a la main en local.
//
//  Ce module applique donc les migrations manquantes au demarrage, de
//  facon idempotente, avec le meme fichier de suivi `schema_migrations`
//  que `migrate.mjs`. Une base a jour n'y trouve rien a faire.
//
//  Garde-fous :
//    - pas de base configuree -> on saute silencieusement (mode degrade,
//      c'est le comportement que les tests eprouvent) ;
//    - chaque migration dans sa propre transaction : un echec au milieu
//      d'un fichier ne laisse rien de pose ;
//    - une migration deja posee (« relation already exists ») est marquee
//      comme appliquee plutot que de faire echouer le demarrage, exactement
//      comme `migrate.mjs` le fait pour un volume existant ;
//    - un echec est logue en clair et n'empeche pas l'ouverture du port :
//      l'application doit repondre (et signaler l'erreur) plutot que de
//      boucler dans un redemarrage Render sans fin.
// ============================================================
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import type { PoolClient } from 'pg';
import { getPool } from './pool';

export interface ResultatMigration {
  /** Fichiers executes lors de cet appel. */
  appliquees: string[];
  /** Fichiers deja presents dans `schema_migrations`. */
  dejaPresentes: string[];
  /** Fichiers marques comme appliques malgre une erreur « deja la ». */
  jugesPresentes: string[];
  /** Motif du saut (pas de base, dossier absent), sinon null. */
  saute: string | null;
  /** Message d'erreur de la derniere migration en echec, sinon null. */
  enErreur: string | null;
}

const vide = (saute: string): ResultatMigration => ({
  appliquees: [],
  dejaPresentes: [],
  jugesPresentes: [],
  saute,
  enErreur: null,
});

/**
 * Dossier des migrations : `MIGRATIONS_DIR` permet de le surcharger
 * dans un test, sinon on part du repertoire de travail (racine du
 * projet en developpement comme en production sur Render : `npm start`
 * execute `node build/server.cjs` depuis la racine).
 */
export function dossierMigrations(explicite?: string): string {
  return explicite || process.env.MIGRATIONS_DIR || path.join(process.cwd(), 'migrations');
}

export function fichiersMigrations(dossier: string): string[] {
  if (!existsSync(dossier)) return [];
  return readdirSync(dossier)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

export async function appliquerMigrationsAuDemarrage(
  dossierArg?: string
): Promise<ResultatMigration> {
  const dossier = dossierMigrations(dossierArg);
  const fichiers = fichiersMigrations(dossier);
  if (fichiers.length === 0) return vide('aucune migration trouvee : ' + dossier);

  const pool = getPool();
  if (!pool) return vide('base non configuree');

  const resultat: ResultatMigration = {
    appliquees: [],
    dejaPresentes: [],
    jugesPresentes: [],
    saute: null,
    enErreur: null,
  };

  let client: PoolClient | null = null;
  const marquer = async (version: string) =>
    client?.query(
      'INSERT INTO schema_migrations (version, applied_at) VALUES ($1, now()) ON CONFLICT DO NOTHING',
      [version]
    );

  try {
    // Une base injoignable ne doit pas empecher l'ouverture du port :
    // `pool.connect()` n'a pas de timeout par defaut (il attendrait
    // indfiniment), et un deploiement bloque boucle dans Render.
    client = await Promise.race<PoolClient | null>([
      pool.connect(),
      new Promise<PoolClient | null>((resolve) => {
        setTimeout(() => resolve(null), 15_000);
      }),
    ]);
    if (!client) {
      return { ...vide('connexion a la base indisponible en 15 s'), enErreur: null };
    }
    // `IF NOT EXISTS` : sur un volume existant la table peut manquer
    // alors que les tables sont la.
    await client.query(
      'CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())'
    );
    const { rows } = await client.query<{ version: string }>(
      'SELECT version FROM schema_migrations'
    );
    const deja = new Set(rows.map((r) => r.version));

    for (const fichier of fichiers) {
      if (deja.has(fichier)) {
        resultat.dejaPresentes.push(fichier);
        continue;
      }

      const sql = readFileSync(path.join(dossier, fichier), 'utf8');
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (version, applied_at) VALUES ($1, now()) ON CONFLICT DO NOTHING',
          [fichier]
        );
        await client.query('COMMIT');
        resultat.appliquees.push(fichier);
        deja.add(fichier);
      } catch (err) {
        // Rollback avant toute lecture d'erreur : sinon la transaction
        // reste « aborted » et la requete suivante echoue elle aussi.
        await client.query('ROLLBACK').catch(() => undefined);
        const message = err instanceof Error ? err.message : String(err);
        const dejaPosee =
          message.includes('already exists') || message.includes('duplicate key');
        if (dejaPosee) {
          await marquer(fichier).catch(() => undefined);
          resultat.jugesPresentes.push(fichier);
          continue;
        }
        resultat.enErreur = `${fichier} : ${message}`;
        // On arrete la boucle : la suite des migrations repose sur
        // celles qui l'ont precallee.
        break;
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    resultat.enErreur = message;
  } finally {
    client?.release();
  }

  return resultat;
}
