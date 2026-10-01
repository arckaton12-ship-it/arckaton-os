-- ============================================================
--  001 — Roles applicatifs
--
--  Pourquoi ces roles existent : sur Supabase, le serveur Express
--  utilisait la cle `service_role`, qui contourne les politiques RLS.
--  C'etait le SEUL acces aux donnees (verifie : le navigateur ne
--  parle jamais a la base, tout passe par /api).
--
--  On reproduit le meme modele, mais sans le trou de securite
--  qu'implique « contourner les politiques » : les tables restent
--  propriete du role proprietaire, et l'application se connecte avec
--  un role dedie dont les droits sont ecricts, un par un.
--
--  Il n'y a volontairement AUCUNE politique RLS. L'autorisation vit
--  dans le code (requirePerm, peutLireDevis, contentVisibility).
--  En creer ici produirait une seconde source de verite qui
--  divergerait de la premiere des qu'une regle change — exactement
--  le defaut que les correctifs P0 ont deja rencontre sur les
--  brouillons du CMS.
--
--  Ce fichier tourne dans /docker-entrypoint-initdb.d, donc sans
--  variable psql : pas de syntaxe :"variable".
-- ============================================================

-- Role applicatif : lecture/ecriture, sans droits d'installation
-- d'extension ni de modification du schema.
--
-- Sur une base geree (Render), le proprietaire n'a pas forcement le
-- droit de creer un role : on le tente et on continue sans lui. Les
-- GRANT de 002 deviennent alors inutiles, puisque l'application se
-- connecte avec le proprietaire.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'arckaton_app') THEN
    BEGIN
      CREATE ROLE arckaton_app LOGIN PASSWORD 'arckaton_app_local';
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'arckaton_app non cree : privileges insuffisants';
    END;
  END IF;
END
$$;

-- pgvector : requis par AGENTS.md pour le RAG. Sa disponibilite depend
-- de l'hebergement ; on l'active si possible sans bloquer le reste.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'extension vector indisponible : %', SQLERRM;
END
$$;

-- gen_random_uuid() en PostgreSQL 13+ est natif (pgcrypto n'est plus
-- necessaire), mais on l'active explicitement pour ne pas dependre
-- de la version de l'image.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pgcrypto;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'extension pgcrypto indisponible : %', SQLERRM;
END
$$;
