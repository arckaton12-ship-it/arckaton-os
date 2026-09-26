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
  statut text default 'active',            -- active | en_pause | livree | archivee
  forfait text default '',
  budget_estime text default '',
  deadline text default '',
  progression int default 0,              -- 0..100
  sorties_terrain_effectuees int default 0,
  sorties_terrain_total int default 0,
  jalons jsonb default '[]'::jsonb,       -- ProjectMilestone[]
  sorties_terrain jsonb default '[]'::jsonb, -- FieldVisit[]
  feedbacks jsonb default '[]'::jsonb,    -- ClientFeedback[]
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_projects_updated_at on public.projects (updated_at desc);
create index if not exists idx_projects_statut on public.projects (statut);

alter table public.projects enable row level security;
