#!/usr/bin/env node
// ============================================================
//  Demarre l'application ARCKATON OS contre PostgreSQL LOCAL
//  (conteneur Docker), jamais contre la production.
//
//  Pourquoi un lanceur plutot que `npm run dev` ?
//
//  Le fichier `.env` de ce depot contient les identifiants de
//  PRODUCTION. Un `npm run dev` lance a l'arrache connecte donc
//  l'application a la base reelle : toute manipulation faite ensuite,
//  meme depuis les tests, ecrit en production. C'est exactement la
//  situation qui a fait passer la recette en production pendant des
//  mois.
//
//  Ce lanceur impose donc les variables PG* locales dans
//  l'environnement du processus. `dotenv.config()`, execute au
//  demarrage de server.ts, ne remplace PAS une variable deja
//  presente dans `process.env` : les valeurs locales restent donc
//  prioritaires sur celles du `.env`.
//
//  Il refuse de demarrer si la base visee n'est pas locale. C'est un
//  garde-fou, pas une commodite : la recette ecrase des tables.
//
//  Usage :
//    node scripts/dev-local.mjs            (port 3100)
//    node scripts/dev-local.mjs --port 3200
// ============================================================

import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = resolve(ICI, '..');
const args = process.argv.slice(2);
const opt = (nom, defaut) => {
  const i = args.indexOf(nom);
  return i >= 0 && args[i + 1] ? args[i + 1] : defaut;
};
const PORT = opt('--port', '3100');

// --- Base locale -----------------------------------------------
//
// Les valeurs viennent de docker-compose.pg.yml. Elles sont
// centralisees ici plutot que lues dans un fichier `.env` : un `.env`
// local serait une deuxieme source de verite, et c'est
// precisement la duplication qui avait permis a la recette de
// viser la production.
const PG = {
  PGHOST: '127.0.0.1',
  PGPORT: '5434',
  PGDATABASE: 'arckaton',
  PGUSER: 'arckaton_app',
  PGPASSWORD: 'arckaton_app_local',
};

// `PGPORT` pour la bibliothe, `PGPORT_ADMIN` pour le conteneur : les
// deux doivent concorder, sinon `docker exec` et l'application ne
// visent pas la meme base.
PG.PGPORT_ADMIN = process.env.PGPORT_ADMIN || PG.PGPORT;

// --- Garde-fou : la base visee doit etre locale ----------------
const HOSTS_LOCAUX = new Set(['127.0.0.1', 'localhost', '::1']);
if (!HOSTS_LOCAUX.has(PG.PGHOST)) {
  console.error('\n  REFUS : PGHOST n\'est pas un hote local : ' + PG.PGHOST + '\n');
  process.exit(1);
}

// `dotenv` ne surcharge pas : les variables deja presentes dans
// `process.env` gagnent sur celles du `.env`.
//
// Un `DATABASE_URL` de production heritee du `.env` n'a pas besoin
// d'etre retire : `lireConfig()` (src/db/pool.ts) donne la priorite a
// `PGUSER`/`PGPASSWORD`/`PGDATABASE` des qu'ils sont tous les trois
// presents, et le spread ci-dessus les fournit. La preference est donc
// deja tranchee dans le seul endroit qui decide.
const env = { ...process.env, ...PG, PORT: PORT };

// Vrai uniquement en developpement : la double condition est
// verifiee par `rateLimitsDesactives()` dans server.ts. Ce lanceur
// ne pose donc pas une variable que le serveur pourrait prendre pour
// une autorisation.
if (process.env.NODE_ENV === 'production') {
  console.error(
    '\n  REFUS : ce lanceur est un outil de developpement, et NODE_ENV=production.\n' +
      '  Utiliser `npm start` avec les variables de la plateforme.\n'
  );
  process.exit(1);
}

// La recette enchaine 8 connexions depuis 127.0.0.1, sous le plafond de
// 10 par quart d'heure sur /api/auth/login : sans cela elle se bloque
// elle-meme. Le serveur ignore cette variable si la base n'est pas
// locale ou si NODE_ENV=production.
env.RATE_LIMIT_OFF = '1';

// Neutralisees : la recette ne doit ni envoyer d'email, ni appeler
// l'API WhatsApp reelle.
env.WHATSAPP_TOKEN = '';
env.WHATSAPP_PHONE_ID = '';

// `JWT_SECRET` : la session ne peut etre emise sans secret. On en
// pose un local deterministe pour que le compte de recette garde une
// session stable entre deux redemarrages, plutot que d'echouer
// systematiquement. Ce secret est sans valeur : il ne protege que la
// base locale, et la recette ne contient aucune donnee reelle.
env.JWT_SECRET = process.env.JWT_SECRET || 'local-dev-uniquement-32-caracteres-minimum';

// Gemini est neutralise SAUF si --gemini est passe.
//
// La recette dechaine plusieurs appels IA avec un delai genereux. Laisser
// la cle de PRODUCTION active en local ferait consommer du quota paye sur
// des donnees de test, et le resultat de la recette dependrait alors d'un
// service externe. Neutralisee, l'API bascule sur sa base de connaissances,
// ce qui suffit a valider les controles d'acces.
//
// Applique APRES le spread, sinon la valeur du `.env` gagnerait.
if (!args.includes('--gemini')) {
  env.GEMINI_API_KEY = '';
  console.log("Gemini neutralise (utiliser --gemini pour l'activer)");
}

console.log('PostgreSQL local : ' + PG.PGHOST + ':' + PG.PGPORT + '/' + PG.PGDATABASE + ' (' + PG.PGUSER + ')');
console.log('Application      : http://127.0.0.1:' + PORT);
console.log('');

// `shell: true` est evite volontairement : Node 24 emet un avertissement
// DEP0190, car les arguments ne sont alors plus escapes et un nom de
// fichier contenant un metacaractere de shell pourrait injecter une
// commande. Les arguments ici sont fixes, mais autant ne pas dependre de
// ce detail pour la securite d'un lanceur.
//
// On lance directement le binaire Node sur le point d'entree de tsx. Cela
// evite la resolution de `npx` (et donc le cas de npx.cmd sous Windows),
// et supprime tout passage par un interpreteur de commandes.
const TSX_CLI = resolve(RACINE, 'node_modules', 'tsx', 'dist', 'cli.mjs');
if (!existsSync(TSX_CLI)) {
  console.error('  tsx introuvable : lancez `npm install` d\'abord.\n');
  process.exit(1);
}

const enfant = spawn(process.execPath, [TSX_CLI, resolve(RACINE, 'server.ts')], {
  cwd: RACINE,
  env,
  stdio: 'inherit',
  shell: false,
});

const arreter = () => { try { enfant.kill(); } catch {} };
process.on('SIGINT', () => { arreter(); process.exit(0); });
process.on('SIGTERM', () => { arreter(); process.exit(0); });
enfant.on('exit', (code) => process.exit(code ?? 0));
