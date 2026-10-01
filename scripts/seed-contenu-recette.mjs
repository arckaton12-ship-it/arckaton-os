#!/usr/bin/env node
// ============================================================
//  Charge le contenu de reference du site public dans PostgreSQL
//  LOCAL.
//
//  Pourquoi un script alors que le fichier SQL suffit ?
//
//  Parce que la recette doit etre REPRODUCTIBLE sur une base neuve.
//  La section D lit et reecrit un forfait du CMS : sans contenu, elle
//  echoue. Or `seed-comptes-recette.mjs` ne touche pas a
//  `content_items`, et les migrations ne contiennent que le schema.
//  Sans cette etape, un volume recree donnait une recette en echec,
//  avec un symptome (« pas de forfait ») tres eloigne de sa cause.
//
//  Le fichier charge est `supabase/reference/contenu-recette.sql`,
//  extrait verbatim du dump de la recette d'origine.
//
//  Idempotent : le contenu est purge puis reinsere, donc relancer le
//  script ne depend pas de l'etat precedent et ne duplique rien.
//  Volontairement destructif sur `content_items` : c'est la seule table
//  que ce script touche, et son contenu vient d'un fichier versionne.
//
//  Usage :
//    node scripts/seed-contenu-recette.mjs
// ============================================================

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = resolve(ICI, '..');
const FICHIER = resolve(RACINE, 'supabase', 'reference', 'contenu-recette.sql');

// Meme source que scripts/dev-local.mjs et scripts/seed-comptes-recette.mjs.
// `port` est volontairement exige egalement a 5434 : `127.0.0.1` seul ne
// suffit pas, la production etant aussi joignable en local par un tunnel.
const PG = {
  host: '127.0.0.1',
  port: 5434,
  database: 'arckaton',
  user: 'arckaton_app',
  password: 'arckaton_app_local',
};

const HOSTS_LOCAUX = new Set(['127.0.0.1', 'localhost', '::1']);
if (!HOSTS_LOCAUX.has(PG.host) || PG.port !== 5434) {
  console.error(
    '\n  REFUS : ' + PG.host + ':' + PG.port + ' n\'est pas la base locale de developpement.\n' +
    '  Ce script REMPLACE tout le contenu du site public.\n'
  );
  process.exit(1);
}

let sql;
try {
  sql = readFileSync(FICHIER, 'utf8');
} catch {
  console.error('\n  FICHIER introuvable : ' + FICHIER + '\n');
  process.exit(1);
}

// Chaque instruction est envoyee separement : c'est ce qui rend
// l'operation atomique, via la transaction ci-dessous. Une seule
// chaine multi-instructions ferait echouer PostgreSQL sur toute la
// transaction des la premiere erreur, sans permettre d'identifier
// quel INSERT est en cause.
const instructions = sql
  .split(/;\s*(?:\r?\n|$)/)
  // Les lignes de commentaire sont retirees de CHAQUE instruction, et
  // non filtrees afterwards : la premiere instruction du fichier est
  // precedee de l'en-tete de documentation, donc un simple `!/^--/` la
  // supprimait entierement — et avec elle le bloc `config`. Le contenu
  // passe alors de 14 a 13 blocs sans le moindre message.
  .map((s) => s.split(/\r?\n/).filter((l) => !/^\s*--/.test(l)).join('\n').trim())
  .filter((s) => s.length > 0);

(async () => {
  const client = new pg.Client({ ...PG, connectionTimeoutMillis: 5000 });
  await client.connect();
  try {
    await client.query('BEGIN');
    try {
      const purge = await client.query('DELETE FROM content_items');
      if (purge.rowCount > 0) {
        console.log('  purge   ' + purge.rowCount + ' bloc(s) de contenu existant(s)');
      }

      for (const [i, stmt] of instructions.entries()) {
        try {
          await client.query(stmt);
        } catch (e) {
          // L'instruction est identifiee par sa position : sans cela, un
          // echec de INSERT ne dit pas quel bloc est en cause.
          throw new Error('instruction ' + (i + 1) + '/' + instructions.length + ' : ' + e.message);
        }
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    }

    const r = await client.query('SELECT kind, count(*)::int AS n FROM content_items GROUP BY kind ORDER BY kind');
    const total = r.rows.reduce((s, x) => s + x.n, 0);
    console.log('  contenu ' + total + ' bloc(s) : ' + r.rows.map((x) => x.kind + '=' + x.n).join(', '));

    // La recette depend d'un forfait : sans lui, la section D echoue
    // avec un message trompeur. On le verifie ici, pour que l'erreur
    // soit « le seed n'a pas charge de forfait » plutot qu'un HTTP
    // 404 sur le site public.
    const forfaits = await client.query("SELECT count(*)::int AS n FROM content_items WHERE kind = 'forfait'");
    if (forfaits.rows[0].n === 0) {
      throw new Error('aucun forfait charge : la section D de la recette echouerait.');
    }
    console.log('  forfaits ' + forfaits.rows[0].n + ' : pre-requis de la section D satisfait\n');
  } finally {
    await client.end().catch(() => {});
  }
})().catch((e) => {
  console.error('\n  ECHEC : ' + e.message + '\n');
  process.exit(1);
});
