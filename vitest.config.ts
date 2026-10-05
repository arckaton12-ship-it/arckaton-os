import { defineConfig } from 'vitest/config';

// Harnais de test de l'API Express.
//
// Les tests importent `server.ts`, qui exporte `app` sans demarrer d'ecoute
// (cf. garde `isDirectRun` en fin de fichier). Supertest monte l'application
// en memoire : aucun port n'est ouvert, aucun worker WhatsApp n'est lance.
//
// `singleThread` est important : les tests de limitation de debit manipulent
// un compteur en memoire partage par le module. En parallele, deux fichiers
// de test se polluraient l'un l'autre et les resultats seraient aleatoires.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    // Neutralise les secrets herites de la machine.
    //
    // `env` ne fait qu'AJOUTER des variables : sur une machine de
    // developpement, GEMINI_API_KEY est souvent definie au niveau du systeme
    // (et pas seulement dans le .env). Sans cet écrasement, les tests
    // appellent reellement Gemini, consomment du quota, dependent du reseau
    // et passent au vert chez le developpeur alors qu'ils echoueraient en CI.
    //
    // Chaine vide : `getGeminiClient()` et `getSupabase()` traitent la valeur
    // vide comme une configuration absente et basculent sur leur mode degrade,
    // ce qui est justement le comportement que l'on veut tester.
    env: {
      NODE_ENV: 'test',
      GEMINI_API_KEY: '',
      GROQ_API_KEY: '',
      SUPABASE_URL: '',
      SUPABASE_SERVICE_ROLE_KEY: '',
      SUPABASE_ANON_KEY: '',
      WHATSAPP_TOKEN: '',
      WHATSAPP_PHONE_ID: '',
      // Connexion PostgreSQL neutralisee.
      //
      // C'est le pendant du nouveau backend. Sans ces variables, la
      // machine de developpement — qui exporte souvent PG* pour le
      // PostgreSQL local — verrait les tests ouvrir de VRAIES connexions :
      // les tests d'API ecriraient alors dans la base de travail, et
      // passeraient en local alors qu'ils echoueraient en CI. Le mode
      // degrade (`getPool() === null`) est precisement le comportement a
      // eprouver ici, puisque la suite 63 tests s'execute contre une base
      // reelle via `npm run test:db`.
      DATABASE_URL: '',
      PGHOST: '',
      PGPORT: '',
      PGPORT_ADMIN: '',
      PGDATABASE: '',
      PGUSER: '',
      PGPASSWORD: '',
      // Un `JWT_SECRET` herite rendrait les tests d'authentification
      // dependants d'un secret de la machine : ils valideraient des
      // jetons signes avec une cle inconnue du depot, et passeraient
      // pour une raison qui n'a rien a voir avec le code teste.
      JWT_SECRET: '',
    },
    fileParallelism: false,
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
    testTimeout: 20000,
  },
});
