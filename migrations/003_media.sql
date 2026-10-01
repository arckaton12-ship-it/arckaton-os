-- ============================================================
--  003 — Preuves de terrain (photos des sorties de captation)
--
--  Pourquoi une table dediee plutôt qu'un tableau JSONB dans
--  `projects.sorties_terrain` :
--
--   1. Les binaires n'ont rien a faire dans une colonne JSONB.
--      Base64 gonfle chaque image de ~33 %, et `updated_at` des
--      projets changerait a chaque retouche de photo, ce qui
--      declencherait la resynchronisation complete du projet.
--
--   2. Le stockage est local (PostgreSQL), pas de SaaS. Le plan
--      Render gratuit n'offre pas de disque persistant : un fichier
--      ecrit sur le conteneur disparait au redeploiement. Le bytea
--      survit, lui, et reste sauvegarde avec le reste de la base.
--
--  Le lien vers le projet est `project_ref` (la reference metier),
--  pas l'UUID : c'est la cle que l'interface manipule, et c'est celle
--  qui est deja UNIQUE sur `projects`.
--
--  Limites de taille appliquees cote serveur (voir server.ts) :
--  8 Mo par fichier, images uniquement.
-- ============================================================

CREATE TABLE project_media (
  id           text PRIMARY KEY,
  project_ref  text NOT NULL REFERENCES projects (project_ref) ON DELETE CASCADE,
  visit_id     text,
  filename     text NOT NULL,
  mime         text NOT NULL,
  size_bytes   integer NOT NULL,
  kind         text NOT NULL DEFAULT 'image',
  data         bytea NOT NULL,
  uploaded_by  text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- La galerie se lit toujours par projet (et souvent par sortie).
CREATE INDEX idx_project_media_project ON project_media (project_ref, created_at DESC);
CREATE INDEX idx_project_media_visit   ON project_media (visit_id);

-- ------------------------------------------------------------
--  Droits du role applicatif (meme raisonnement que 002).
-- ------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'arckaton_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON project_media TO arckaton_app;
  END IF;
END
$$;
