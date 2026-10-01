// ============================================================
//  Pool PostgreSQL — Arckaton OS
//
//  Remplace le client `service_role` de Supabase. Meme contrat pour
//  l'appelant : un singleton paresseux, ou `null` si la base n'est
//  pas configuree (les tests et le mode degrade s'appuient encore
//  sur ce `null`).
// ============================================================
import { Pool } from 'pg';
import type { PoolClient, QueryResult, QueryResultRow } from 'pg';

let pool: Pool | null = null;

// Placeholders de `.env.example`, rejetes comme sur Supabase.
const PLACEHOLDERS = ['MY_DATABASE_URL', 'MY_PG_PASSWORD'];

function lireConfig() {
  const url = process.env.DATABASE_URL;
  const user = process.env.PGUSER;
  const password = process.env.PGPASSWORD;
  const database = process.env.PGDATABASE;

  // Toutes les variables d'environnement, ou passage a null.
  if (user && password && database) {
    return {
      connectionString: undefined as string | undefined,
      user,
      password,
      database,
      // `arckaton_db` est le nom de service sur le reseau Docker
      // (cf. docker-compose.pg.yml). L'application tourne en dehors
      // de Docker en developpement, d'ou le repli sur l'hote.
      host: process.env.PGHOST || '127.0.0.1',
      port: Number(process.env.PGPORT_ADMIN) || Number(process.env.PGPORT) || 5434,
    };
  }
  if (url && !PLACEHOLDERS.includes(url)) {
    return { connectionString: url } as {
      connectionString: string;
      user?: string;
      password?: string;
      database?: string;
      host?: string;
      port?: number;
    };
  }
  return null;
}

export function getPool(): Pool | null {
  if (pool) return pool;
  const cfg = lireConfig();
  if (!cfg) return null;

  pool = new Pool({
    ...cfg,
    // 8 Go de RAM au total, PostgreSQL plafonne a 512 Mo (cf.
    // docker-compose.pg.yml) : 5 connexions suffisent largement.
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    // Une requête qui traîne ne doit pas retenir une connexion du
    // pool indefiniment.
    statement_timeout: 15_000,
  });

  // Un client qui part sans etre rendu (deconnexion brutale, redeploiement)
  // garde le pool dans un etat incoherent. Le 'error' sur un client
  // injoignable est attendu : on le journalise, on ne l'etouffe pas.
  pool.on('error', (err) => {
    console.error('[db] erreur client PostgreSQL:', err.message);
  });

  return pool;
}

// Ferme le pool. Appele a l'arret, et par les tests.
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Une seule requete, sous transaction implicite.
 * Renvoie toujours `{ data, error }` : c'est le contrat que
 * `server.ts` attend de `supabase.from(...)`, et le conserver evite
 * de reprendre les 41 endpoints un par un.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<{ data: T[]; error: Error | null; count: number | null }> {
  const p = getPool();
  if (!p) {
    return { data: [], error: new Error('Base non configuree'), count: null };
  }
  try {
    const res: QueryResult<T> = await p.query<T>(text, params as never[]);
    return { data: res.rows, error: null, count: res.rowCount ?? null };
  } catch (err) {
    return { data: [], error: err as Error, count: null };
  }
}

/** Comme `query`, mais dans une transaction. */
export async function transaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<{ data: T | null; error: Error | null }> {
  const p = getPool();
  if (!p) {
    return { data: null, error: new Error('Base non configuree') };
  }
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return { data: out, error: null };
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // La connexion est probablement morte ; `pool` la remplacera.
    }
    return { data: null, error: err as Error };
  } finally {
    client.release();
  }
}

export type { QueryResultRow, PoolClient };
