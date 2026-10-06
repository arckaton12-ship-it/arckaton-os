// Lance la suite de tests qui exige une vraie base.
//
// `npm test` neutralise volontairement les variables d'environnement
// (vitest.config.ts), donc `tests/db.adapter.test.ts` s'ignore : sans
// identifiants, il ne peut ni creer sa table de test, ni nettoyer
// apres lui. C'est le bon comportement pour une CI sans base, mais
// cela rend « 30 tests ignores » facile a lire comme « 30 tests
// verts » — ce qui est exactement le faux vert qu'on cherche a
// eviter.
//
// Ce script fournit les identifiants locaux, puis lance la suite. Il
// n'est execute qu'a la demande : `npm test` reste utilisable sans
// Docker, et le cas degrade reste couvert.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const env = {
  ...process.env,
  PGHOST: process.env.PGHOST || '127.0.0.1',
  PGPORT: process.env.PGPORT || '5434',
  PGDATABASE: process.env.PGDATABASE || 'arckaton',
  PGUSER: process.env.PGUSER || 'arckaton',
  PGPASSWORD: process.env.PGPASSWORD || 'arckaton_local',
};

// On appelle le binaire vitest directement plutot que `npx`.
//
// Deux raisons, toutes deux vues a l'usage :
//   - `npx.cmd` est un script .cmd : le lancer sans shell echoue
//     (EINVAL) sous Node 24 sur Windows. Avec `shell: true`, les noms
//     de fichiers de test passeraient par le shell — on prefere
//     executer le binaire, sans intermediate.
//   - le chemin est resolu depuis node_modules, donc le script ne
//     depend pas du PATH ni d'un install global.
const cheminVitest = fileURLToPath(
  new URL('../node_modules/vitest/vitest.mjs', import.meta.url)
);

const fils = spawn(
  process.execPath,
  [
    cheminVitest,
    'run',
    // `--config` est indispensable : la config par defaut neutralise
    // `PGHOST`/`PGPASSWORD`, et `test.env` de Vitest est prioritaire sur
    // l'environnement herite. Sans cette option, les 63 tests de cette
    // suite seraient ignores — silencieusement, avec un bilan « 63
    // skipped » qui se lit comme un succes.
    '--config',
    'vitest.db.config.ts',
    'tests/db.adapter.test.ts',
    'tests/auth.jwt.test.ts',
    'tests/schema.constraints.test.ts',
    'tests/migrate.demarrage.test.ts',
  ],
  { stdio: 'inherit', env, shell: false, cwd: fileURLToPath(new URL('..', import.meta.url)) }
);

fils.on('exit', (code) => process.exit(code ?? 1));
