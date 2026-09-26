-- ============================================================
-- Arckaton OS — Schéma de production (Supabase)
-- À exécuter une seule fois dans le SQL Editor de Supabase
-- (ou via supabase db push). Puis tu me donnes :
--   Project URL + anon key + service_role key (à mettre dans .env)
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Leads : demandes envoyées depuis le site public
-- (formulaire devis interactif, essai ARKA 30j, contact)
-- ------------------------------------------------------------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  client_ref text unique,
  name text not null,
  email text default '',
  phone text not null,
  project_type text default '',
  budget text default '',
  message text default '',
  source text default 'site_v2_devis',
  statut text default 'nouveau',
  notes text default '',
  pole_assigned text default 'Direction',
  country text default '',
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- agent_reports : synthèses générées par l'agent IA du site
-- ------------------------------------------------------------
create table if not exists public.agent_reports (
  id uuid primary key default gen_random_uuid(),
  client_ref text unique,
  client_name text default '',
  lead_name text default '',
  sujet text default '',
  pole text default 'Direction',
  resume text default '',
  recommendations jsonb default '[]'::jsonb,
  forfait_recommande text default '',
  intention text default 'information',
  contact_info text default '',
  status text default 'non_traite',
  messages_count int default 1,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- whatsapp_outbox : file d'attente de notifications WhatsApp
-- (générée automatiquement à chaque lead / rapport IA).
-- Un consommateur externe (provider WhatsApp Business API)
-- lira les lignes status='pending' et les enverra.
-- unique(client_ref, to_number) => idempotent (pas de doublon).
-- ------------------------------------------------------------
create table if not exists public.whatsapp_outbox (
  id uuid primary key default gen_random_uuid(),
  client_ref text not null,
  kind text default 'lead',
  to_number text default '',
  message text default '',
  status text default 'pending',
  attempts int default 0,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (client_ref, to_number)
);

create index if not exists idx_leads_created_at on public.leads (created_at desc);
create index if not exists idx_agent_reports_created_at on public.agent_reports (created_at desc);
create index if not exists idx_outbox_pending on public.whatsapp_outbox (status) where status = 'pending';

-- ------------------------------------------------------------
-- Projets clients : source de vérité du portail BAT et du
-- suivi d'évolution. Détails (jalons, sorties terrain, feedbacks)
-- en jsonb pour coller au type Project côté client.
-- ------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  project_ref text unique,
  client_code text,
  client_name text not null,
  client_email text default '',
  client_phone text default '',
  service text default '',
  pole text default 'Direction',
  chef_de_projet text default '',
  statut text default 'en_cours',
  forfait text default '',
  budget_estime text default '',
  deadline text default '',
  progression int default 0,
  sorties_terrain_effectuees int default 0,
  sorties_terrain_total int default 0,
  deliverables jsonb default '[]'::jsonb,
  score int default 0,
  jalons jsonb default '[]'::jsonb,
  sorties_terrain jsonb default '[]'::jsonb,
  feedbacks jsonb default '[]'::jsonb,
  notes_internes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_projects_updated_at on public.projects (updated_at desc);
create index if not exists idx_projects_statut on public.projects (statut);

-- ------------------------------------------------------------
-- Devis et factures (references sequentielles, suivi de statut)
-- ------------------------------------------------------------
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  quote_ref text unique not null,
  type text not null default 'devis',
  client_name text not null,
  client_phone text default '',
  client_email text default '',
  project_ref text,
  project_name text,
  pole text default 'Direction',
  items jsonb default '[]'::jsonb,
  total int default 0,
  deposit int default 0,
  balance int default 0,
  currency text default 'FCFA',
  status text default 'brouillon',
  valid_days int default 30,
  notes text default '',
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_quotes_ref on public.quotes (quote_ref);
create index if not exists idx_quotes_status on public.quotes (status);
create index if not exists idx_quotes_created_at on public.quotes (created_at desc);

-- ------------------------------------------------------------
-- Sécurité : RLS activée partout. Seul le service_role
-- (clé gardée côté serveur Express dans .env, jamais dans le
-- bundle client) lit/écrit. L'accès anonyme est fermé par défaut.
-- ------------------------------------------------------------
alter table public.leads enable row level security;
alter table public.agent_reports enable row level security;
alter table public.whatsapp_outbox enable row level security;
alter table public.projects enable row level security;
alter table public.quotes enable row level security;

-- ------------------------------------------------------------
-- NOTE FUTURE (non bloquant pour la v1) :
-- Pour accéder aux données dans le dashboard avec un vrai login,
-- créer une table public.profiles liée à auth.users puis des
-- policies 'select/update for authenticated' sur leads et
-- agent_reports (membres uniquement, voir leur pôle).
-- ------------------------------------------------------------