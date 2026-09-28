-- =============================================================
-- Arckaton OS - Taches et messagerie interne
-- Ces deux fonctionnalites etaient 100 % dans le localStorage :
-- une tache ou un message cree par un membre n'existait que dans
-- son navigateur. Le directeur, sur son telephone, voyait un OS vide.
-- Les tables ci-dessous en font la source de verite partagee.
-- =============================================================

-- ── Taches (tableau Kanban) ────────────────────────────────────
create table if not exists public.tasks (
  id text primary key,
  titre text not null,
  description text default '',
  statut text not null default 'a_faire',   -- a_faire | en_cours | en_attente | termine
  priorite text default 'normale',          -- basse | normale | urgente
  pole text default 'Direction',
  assigne_a text,                           -- id membre
  assigne_nom text,
  cree_par text,
  cree_par_nom text,
  echeance text default '',
  relances int not null default 0,
  dernier_relance_at timestamptz,
  termine_at timestamptz,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);

create index if not exists idx_tasks_statut on public.tasks (statut);
create index if not exists idx_tasks_pole on public.tasks (pole);
create index if not exists idx_tasks_cree_le on public.tasks (cree_le desc);

-- ── Messagerie interne (canaux par pole) ───────────────────────
create table if not exists public.messages (
  id text primary key,
  canal text not null default 'general',    -- general | Direction | Tech | ...
  contenu text not null,
  expediteur_id text,
  expediteur_nom text not null,
  expediteur_role text default 'Membre',
  pole text default 'Direction',
  simule boolean not null default false,     -- scenario de demonstration
  cree_le timestamptz not null default now()
);

create index if not exists idx_messages_canal on public.messages (canal, cree_le desc);
create index if not exists idx_messages_cree_le on public.messages (cree_le desc);

-- RLS active sans policy : l'acces passe uniquement par le serveur
-- Express, qui verifie la session et les droits. Le service_role la
-- contourne, la cle anon n'obtient rien.
alter table public.tasks enable row level security;
alter table public.messages enable row level security;
