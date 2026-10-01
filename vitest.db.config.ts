import { defineConfig } from 'vitest/config';

// Harnais de la suite qui exige une VRAIE base (`npm run test:db`).
//
// Pourquoi un fichier de config distinct plutot qu'une option ?
//
// `vitest.config.ts` neutralise `PGHOST`, `PGPASSWORD` et consorts pour
// que `npm test` n'ouvre jamais de vraie connexion — c'est desirable, et
// `test.env` de Vitest est prioritaire sur l'environnement herite, donc
// ces variables restent vides meme quand `scripts/run-db-tests.mjs` les
// transmet au processus fils.
//
// Consequence : c'est pourquoi la neutralisation reste dans
// `vitest.config.ts` et ne se joue pas ici. Un second fichier evite
// d'avoir a maintenir une condition « suis-je en train de lancer la
// suite base ? », qui serait fausse des que quelqu'un ajoute une
// troisieme maniere de lancer vitest.
//
// Ce qui reste neutralise ici : les SaaS et l'API WhatsApp. Ils ne sont
// pas necessaires aux tests de base, et les laisser actifs consommerait
// du quota et rendrait le resultat dependent du reseau.
//
// `JWT_SECRET` n'est volontairement PAS neutralise : les tests d'auth le
// definissent eux-memes (cf. `beforeAll`), et un secret herite de la
// machine n'aurait aucun effet — donc aucun risque non plus.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      GEMINI_API_KEY: '',
      GROQ_API_KEY: '',
      SUPABASE_URL: '',
      SUPABASE_SERVICE_ROLE_KEY: '',
      SUPABASE_ANON_KEY: '',
      WHATSAPP_TOKEN: '',
      WHATSAPP_PHONE_ID: '',
    },
    fileParallelism: false,
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
    testTimeout: 20000,
  },
});
