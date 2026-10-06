-- ============================================================
--  004 — Rendez-vous pris sur le site public + notifications
--
--  Deux tables :
--
--   1. `appointments` — la demande de rendez-vous émise depuis le
--      conseiller public. Le créneau est proposé par l'agence :
--      la Direction confirme, le visiteur ne peut pas s'auto-attribuer
--      un créneau libre.
--
--      L'unicité du créneau est un index UNIQUE **partiel** sur
--      `(debut_utc, pole)` limité aux statuts actifs. Une annulation
--      libère donc le créneau, et deux pôles peuvent se réunir à la
--      même heure. Un index partiel plutôt qu'une contrainte de table
--      parce que les rendez-vous annulés et réalisés doivent pouvoir
--      coexister dans l'historique.
--
--   2. `notifications` — une copie **par destinataire** (fan-out à
--      l'insertion). Chaque ligne porte son propre `lu_le`, ce qui
--      évite une table « marques de lecture » supplémentaire et
--      rend une simple requête suffisante pour le badge de l'OS.
--      Le destinataire est un `members` : pas de notification orpheline.
--
--  Aucune colonne JSONB ici : `src/db/adapter.ts` maintient une liste
--  figée des colonnes JSONB et doit rester en phase (voir le test
--  « la liste des colonnes jsonb du code correspond a la base »).
-- ============================================================

-- ------------------------------------------------------------
--  Rendez-vous
-- ------------------------------------------------------------
CREATE TABLE appointments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Reference metier propre au rendez-vous : c'est la cle que
  -- l'interface manipule et que l'invite .ics contient.
  rdv_ref         text NOT NULL,
  -- Lien vers le prospect (sans CASCADE : supprimer un lead
  -- n'a pas doit emporter l'historique des rendez-vous).
  lead_ref        text REFERENCES leads (client_ref) ON DELETE SET NULL,
  -- Clev d'idempotence cote client : un rejeu de POST (reseau,
  -- double clic) retourne la ligne existante au lieu d'echouer sur
  -- l'unicite du creneau.
  idempotence_key text,
  pole            text NOT NULL DEFAULT 'Direction',
  motif           text NOT NULL DEFAULT '',
  debut_utc       timestamptz NOT NULL,
  duree_min       integer NOT NULL DEFAULT 30,
  nom             text NOT NULL,
  telephone       text NOT NULL,
  email           text DEFAULT '',
  source          text DEFAULT 'site_public',
  statut          text NOT NULL DEFAULT 'demande',
  -- Loi 2024/017 du 23/12/2024 : date d'acceptation explicite d'etre
  -- recontacte, conservee pour prouver le consentement.
  consentement_at timestamptz,
  cree_le         timestamptz NOT NULL DEFAULT now(),
  maj_le         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT appointments_statut_valide
    CHECK (statut IN ('demande', 'confirme', 'annule', 'realise')),
  CONSTRAINT appointments_duree_valide
    CHECK (duree_min >= 5 AND duree_min <= 480)
);

CREATE UNIQUE INDEX appointments_rdv_ref_key ON appointments (rdv_ref);

-- Deux inserts concurrents avec la meme cle cote client ne doivent
-- pas creer deux rendez-vous : la seconde ligne est refusee par la
-- base, pas par un test-then-insert non atomique.
CREATE UNIQUE INDEX appointments_idempotence_key
  ON appointments (idempotence_key) WHERE idempotence_key IS NOT NULL;

-- Le coeur du sujet : un creneau actif, un seul preneur.
CREATE UNIQUE INDEX appointments_creneau_pris
  ON appointments (debut_utc, pole)
  WHERE statut IN ('demande', 'confirme');

CREATE INDEX idx_appointments_debut  ON appointments (debut_utc);
CREATE INDEX idx_appointments_statut ON appointments (statut, debut_utc);
CREATE INDEX idx_appointments_lead   ON appointments (lead_ref);

-- ------------------------------------------------------------
--  Notifications de l'OS
-- ------------------------------------------------------------
CREATE TABLE notifications (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Une ligne par destinataire : le badge, le compteur « non lues »
  -- et le marquage « lu » n'ont besoin d'aucune jointure.
  dest_id  uuid NOT NULL REFERENCES members (id) ON DELETE CASCADE,
  type     text NOT NULL DEFAULT 'rdv',
  titre    text NOT NULL,
  corps    text NOT NULL DEFAULT '',
  -- Reference metier de l'objet signale (rdv_ref, lead_ref...) et
  -- chemin interne a ouvrir dans l'OS.
  ref      text DEFAULT '',
  lien     text DEFAULT '',
  lu_le    timestamptz,
  cree_le  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notifications_type_valide
    CHECK (type IN ('rdv', 'lead', 'systeme'))
);

CREATE INDEX idx_notifications_dest ON notifications (dest_id, cree_le DESC);

-- L'unique requete executee a chaque ouverture de l'OS porte sur les
-- lignes non lues : l'index partiel la sert directement.
CREATE INDEX idx_notifications_non_lues
  ON notifications (dest_id, cree_le DESC) WHERE lu_le IS NULL;

-- ------------------------------------------------------------
--  Droits du role applicatif (meme raisonnement que 002 et 003).
-- ------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'arckaton_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON
      appointments, notifications
    TO arckaton_app;
  END IF;
END
$$;
