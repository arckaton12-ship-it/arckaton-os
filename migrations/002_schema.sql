-- ============================================================
--  002 — Schema applicatif (portage de la pile Supabase)
--
--  Source : supabase/reference/schema-supabase-17.sql, extrait de la
--  base Supabase locale avant arret de la pile. Le portage est
--  volontairement mecanique, pour que la comparaison soit verifiable.
--
--  Trois ecarts par rapport a Supabase, tous forces :
--
--  1. `members.id` ne reference plus `auth.users(id)`. Le
--     schema `auth` n'existe plus ; la FK etait le seul endroit ou
--     l'application dependait de l'identite hebergee par le SaaS.
--     `members.id` devient un UUID genere, et le lien vers
--     l'identite passe par `member_credentials` (003).
--     Consequence fonctionnelle : la suppression d'un membre ne
--     depend plus d'un `ON DELETE CASCADE` distant.
--
--  2. Aucun RLS. Voir 001 pour le raisonnement.
--
--  3. `member_credentials` est separe de `members`. Sur Supabase,
--     le hash vivait dans `auth.users`, que le code ne selectait
--     jamais — le membre etait lu par `members` seul. Melanger les
--     deux ferait fuiter le hash dans la reponse JSON de
--     /api/auth/login et /api/auth/me, qui serialisent la ligne
--     entiere. La separation preserve la forme de reponse existante
--     sans avoir a filtrer des champs.
-- ============================================================

-- ------------------------------------------------------------
--  Identite
-- ------------------------------------------------------------
CREATE TABLE members (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  email        text NOT NULL,
  phone        text,
  role         text NOT NULL DEFAULT 'membre',
  pole         text NOT NULL DEFAULT 'Direction',
  poste_id     text,
  poste_titre  text,
  permissions  jsonb NOT NULL DEFAULT '[]'::jsonb,
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- L'email est la cle de connexion : son unicite est une contrainte
-- metier, pas une commodite. `citext` avoided ici pour ne pas
-- dependre d'une extension de collation ; l'application normalise
-- en minuscules (voir server.ts, `normalizedEmail`) avant d'ecrire.
CREATE UNIQUE INDEX members_email_key ON members (lower(email));
CREATE INDEX idx_members_pole ON members (pole);

-- Le bootstrap (/api/auth/bootstrap) refuse de creer un second
-- admin. Ce controle etait un verrou en memoire dans server.ts,
-- qui ne tient qu'en mono-instance. La contrainte UNIQUE partielle
-- le rend atomique, y compris avec plusieurs processus.
CREATE UNIQUE INDEX members_un_seul_admin ON members ((role))
  WHERE role = 'admin';

-- ------------------------------------------------------------
--  Credentials (separe de members, cf. entete)
-- ------------------------------------------------------------
CREATE TABLE member_credentials (
  member_id    uuid PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
  email        text NOT NULL,
  -- bcrypt. Le format ($2a$/$2b$ + cout + sel) suffit a identifier
  -- l'algorithme, donc le cout peut evoluer sans migration.
  password_hash text NOT NULL,
  -- Un seul mot de passe a la fois : changer de mot de passe invalide
  -- le precedent. C'est ce qui rend le changement de mot de passe
  -- sur POST/PATCH /api/members immediatement effectif.
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX member_credentials_email_key ON member_credentials (lower(email));

-- ------------------------------------------------------------
--  Journal
-- ------------------------------------------------------------
CREATE TABLE activity_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    text,
  actor_name  text,
  action      text NOT NULL,
  kind        text NOT NULL DEFAULT 'member',
  ref         text,
  details     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_log_created_at ON activity_log (created_at DESC);

-- ------------------------------------------------------------
--  CMS
-- ------------------------------------------------------------
CREATE TABLE content_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        text NOT NULL,
  slug        text NOT NULL,
  title       text,
  published   boolean NOT NULL DEFAULT true,
  position    integer NOT NULL DEFAULT 0,
  data        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_items_kind_slug_key UNIQUE (kind, slug)
);

CREATE INDEX idx_content_items_kind ON content_items (kind, "position");

-- ------------------------------------------------------------
--  Taches et messagerie
--
--  `id` reste `text` et non `uuid` : le client genere deja des
--  identifiants de cette forme (la recette lit `t-1790815...`).
--  Changer le type casserait les identifiants deja emis sans
--  aucun gain : ce sont des cles opaques.
-- ------------------------------------------------------------
CREATE TABLE tasks (
  id                  text PRIMARY KEY,
  titre               text NOT NULL,
  description         text DEFAULT '',
  statut              text NOT NULL DEFAULT 'a_faire',
  priorite            text DEFAULT 'normale',
  pole                text DEFAULT 'Direction',
  assigne_a           text,
  assigne_nom         text,
  cree_par            text,
  cree_par_nom        text,
  echeance            text DEFAULT '',
  relances            integer NOT NULL DEFAULT 0,
  dernier_relance_at  timestamptz,
  termine_at          timestamptz,
  cree_le             timestamptz NOT NULL DEFAULT now(),
  modifie_le          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_cree_le ON tasks (cree_le DESC);
CREATE INDEX idx_tasks_pole    ON tasks (pole);
CREATE INDEX idx_tasks_statut  ON tasks (statut);

CREATE TABLE messages (
  id              text PRIMARY KEY,
  canal           text NOT NULL DEFAULT 'general',
  contenu         text NOT NULL,
  expediteur_id   text,
  expediteur_nom  text NOT NULL,
  expediteur_role text DEFAULT 'Membre',
  pole            text DEFAULT 'Direction',
  simule          boolean NOT NULL DEFAULT false,
  cree_le         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_canal  ON messages (canal, cree_le DESC);
CREATE INDEX idx_messages_cree_le ON messages (cree_le DESC);

-- ------------------------------------------------------------
--  CRM
-- ------------------------------------------------------------
CREATE TABLE leads (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_ref     text UNIQUE,
  name           text NOT NULL,
  email          text DEFAULT '',
  phone          text NOT NULL,
  project_type   text DEFAULT '',
  budget         text DEFAULT '',
  message        text DEFAULT '',
  source         text DEFAULT 'site_v2_devis',
  statut         text DEFAULT 'nouveau',
  notes          text DEFAULT '',
  pole_assigned  text DEFAULT 'Direction',
  country        text DEFAULT '',
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_created_at ON leads (created_at DESC);

CREATE TABLE agent_reports (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_ref          text UNIQUE,
  client_name         text DEFAULT '',
  lead_name           text DEFAULT '',
  sujet               text DEFAULT '',
  pole                text DEFAULT 'Direction',
  resume              text DEFAULT '',
  recommendations     jsonb DEFAULT '[]'::jsonb,
  forfait_recommande  text DEFAULT '',
  intention           text DEFAULT 'information',
  contact_info        text DEFAULT '',
  status              text DEFAULT 'non_traite',
  messages_count      integer DEFAULT 1,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_reports_created_at ON agent_reports (created_at DESC);

-- File d'envoi. L'index partiel porte uniquement la file d'attente :
-- c'est le seul sous-ensemble interroge en boucle (drainWhatsAppOutbox).
CREATE TABLE whatsapp_outbox (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_ref  text NOT NULL,
  kind        text DEFAULT 'lead',
  to_number   text NOT NULL,
  message     text DEFAULT '',
  status      text DEFAULT 'pending',
  attempts    integer DEFAULT 0,
  sent_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_outbox_client_ref_to_number_key UNIQUE (client_ref, to_number)
);

CREATE INDEX idx_outbox_pending ON whatsapp_outbox (status) WHERE status = 'pending';

-- ------------------------------------------------------------
--  Projets
-- ------------------------------------------------------------
CREATE TABLE projects (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_ref               text UNIQUE,
  client_code               text,
  client_name               text NOT NULL,
  client_email              text DEFAULT '',
  client_phone              text DEFAULT '',
  service                   text DEFAULT '',
  pole                      text DEFAULT 'Direction',
  chef_de_projet            text DEFAULT '',
  statut                    text DEFAULT 'en_cours',
  forfait                   text DEFAULT '',
  budget_estime             text DEFAULT '',
  deadline                  text DEFAULT '',
  progression               integer DEFAULT 0,
  sorties_terrain_effectuees integer DEFAULT 0,
  sorties_terrain_total     integer DEFAULT 0,
  deliverables              jsonb DEFAULT '[]'::jsonb,
  score                     integer DEFAULT 0,
  jalons                    jsonb DEFAULT '[]'::jsonb,
  sorties_terrain           jsonb DEFAULT '[]'::jsonb,
  feedbacks                 jsonb DEFAULT '[]'::jsonb,
  notes_internes             text DEFAULT '',
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_projects_statut     ON projects (statut);
CREATE INDEX idx_projects_updated_at ON projects (updated_at DESC);

-- ------------------------------------------------------------
--  Devis
-- ------------------------------------------------------------
CREATE TABLE quotes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_ref    text NOT NULL UNIQUE,
  type         text NOT NULL DEFAULT 'devis',
  client_name  text NOT NULL,
  client_phone text DEFAULT '',
  client_email text DEFAULT '',
  project_ref  text,
  project_name text,
  pole         text DEFAULT 'Direction',
  items        jsonb DEFAULT '[]'::jsonb,
  total        integer DEFAULT 0,
  deposit      integer DEFAULT 0,
  balance      integer DEFAULT 0,
  currency     text DEFAULT 'FCFA',
  status       text DEFAULT 'brouillon',
  valid_days   integer DEFAULT 30,
  notes        text DEFAULT '',
  created_by   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_quotes_created_at ON quotes (created_at DESC);
CREATE INDEX idx_quotes_status     ON quotes (status);

-- ------------------------------------------------------------
--  Reglages
-- ------------------------------------------------------------
CREATE TABLE app_settings (
  key        text PRIMARY KEY,
  value      text DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
--  Droits du role applicatif
--
--  Un GRANT par table plutot qu'un `GRANT ALL ON SCHEMA` : la
--  liste se relit d'un coup d'oeil, et ajouter une table oblige a
--  decider explicitement si elle est accessible. Le role applicatif
--  n'a ni droit sur le schema `public` en creation, ni sur les
--  extensions, ni sur les roles.
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'arckaton_app') THEN
    GRANT USAGE ON SCHEMA public TO arckaton_app;

    GRANT SELECT, INSERT, UPDATE, DELETE ON
      members, member_credentials, activity_log, content_items,
      tasks, messages, leads, agent_reports, whatsapp_outbox,
      projects, quotes, app_settings
    TO arckaton_app;

    -- L'application cree ses propres UUID et lit les compteurs de
    -- sequence ; elle ne cree pas de sequence elle-meme, donc pas de
    -- droit global sur le schema.
    GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO arckaton_app;
  END IF;
END
$$;
