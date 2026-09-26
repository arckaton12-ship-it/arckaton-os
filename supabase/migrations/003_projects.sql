-- =============================================================
-- Arckaton OS - Projets clients (source de vérité du portail BAT)
-- Table applicative : les détails (jalons, sorties terrain,
-- feedbacks) sont stockés en jsonb pour coller au type Project
-- côté client sans normalisation fragile.
-- =============================================================
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  project_ref text unique,                -- id métier (ex: prj-1712...)
  client_code text,                       -- référence client / BAT (ex: PRJ-KOTTO)
  client_name text not null,
  client_email text default '',
  client_phone text default '',
  service text default '',
  pole text default 'Direction',
  chef_de_projet text default '',
  statut text default 'en_cours',          -- brouillon | qualifie | en_cours | livre | annule (type Projet)
  forfait text default '',
  budget_estime text default '',
  deadline text default '',
  progression int default 0,              -- 0..100
  sorties_terrain_effectuees int default 0,
  sorties_terrain_total int default 0,
  deliverables jsonb default '[]'::jsonb, -- livrables attendus (string[])
  score int default 0,                    -- score de satisfaction / fit projet
  jalons jsonb default '[]'::jsonb,       -- ProjectMilestone[]
  sorties_terrain jsonb default '[]'::jsonb, -- FieldVisit[]
  feedbacks jsonb default '[]'::jsonb,    -- ClientFeedback[]
  notes_internes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_projects_updated_at on public.projects (updated_at desc);
create index if not exists idx_projects_statut on public.projects (statut);

-- Alignement d'une table déjà créée par une version antérieure de la migration
alter table public.projects add column if not exists deliverables jsonb default '[]'::jsonb;
alter table public.projects add column if not exists score int default 0;
alter table public.projects add column if not exists notes_internes text default '';
alter table public.projects add column if not exists client_email text default '';
alter table public.projects add column if not exists client_phone text default '';
alter table public.projects add column if not exists forfait text default '';
alter table public.projects add column if not exists budget_estime text default '';
alter table public.projects add column if not exists deadline text default '';

alter table public.projects enable row level security;
