-- ============================================================
--  006 — Décomptes réels des délais et accès client
--
--  `echeance` (tâches) et `deadline` (projets) restent des libellés
--  d'affichage libres (« Sous 5 jours », « Sous 4 semaines »). Un
--  compte à rebours jours+heures exige une valeur machine : `date_limite`
--  porte une date ISO 8601 (datée, ou datée+heure), distincte et
--  optionnelle. Sans elle, l'interface retombe sur le libellé historiqué.
--
--  `projects.client_secret` est le code d'accès à 6 chiffres de l'Espace
--  Client : généré par le serveur à la validation d'un devis, transmis
--  de vive voix au client (`projects.client_phone`), et vérifié par
--  POST /api/client-portal/access. Stocké haché ? Non : six chiffres ne
--  se hashent pas utilement (espace de 10^6), le coût d'une attaque par
--  force brute est réglé par la latence du endpoint. Ce code est une clé
--  secondaire de lecture, jamais affiché sur le site public.
-- ============================================================

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS date_limite text DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_tasks_date_limite ON tasks (date_limite);

ALTER TABLE projects ADD COLUMN IF NOT EXISTS date_limite text DEFAULT '';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_secret text DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_projects_date_limite ON projects (date_limite);

ALTER TABLE quotes ADD COLUMN IF NOT EXISTS client_secret text DEFAULT '';