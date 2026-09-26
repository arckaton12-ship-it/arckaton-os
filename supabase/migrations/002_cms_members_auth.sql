-- ============================================================
-- Arckaton OS — Migration v2 : CMS contenu + Membres + Journal
-- À exécuter dans le SQL Editor de Supabase (une seule fois).
-- Nécessite la migration 001 (schema.sql) déjà appliquée.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- content_items : contenu éditable du site public en temps réel.
--   kind          → 'config' | 'forfait' | 'blog' | 'realisation' | 'temoignage'
--   slug          → identifiant unique (par kind)
--   data (jsonb)  → payload complet de l'élément (forme native client)
--   published     → visibilité publique (lecture via API serveur)
-- Lecture : public (le serveur Express expose GET /api/content).
-- Écriture : service_role uniquement (via API serveur authentifiée).
-- ------------------------------------------------------------
create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  slug text not null,
  title text,
  published boolean not null default true,
  position int not null default 0,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kind, slug)
);

create index if not exists idx_content_items_kind on public.content_items (kind, position);

alter table public.content_items enable row level security;
create policy "content_items public read"
  on public.content_items for select
  to anon, authenticated
  using (published = true);

-- ------------------------------------------------------------
-- members : comptes membres Arckaton OS (liés à Supabase Auth).
--   id          → auth.users.id (le boss crée le compte via l'admin API)
--   role        → 'admin' | 'site_editor' | 'membre'
--   permissions → jsonb ex. ["content","bat","finance"] (admin = tout)
--   active      → comptes désactivables par le boss (login refusé)
-- ------------------------------------------------------------
create table if not exists public.members (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null unique,
  phone text,
  role text not null default 'membre',
  pole text not null default 'Direction',
  poste_id text,
  poste_titre text,
  permissions jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_members_email on public.members (email);

alter table public.members enable row level security; -- aucune policy : service_role uniquement

-- ------------------------------------------------------------
-- activity_log : journal d'audit (logins, créations, éditions CMS…)
-- ------------------------------------------------------------
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id text,
  actor_name text,
  action text not null,
  kind text not null default 'member',
  ref text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_log_created_at on public.activity_log (created_at desc);

alter table public.activity_log enable row level security; -- aucune policy : service_role uniquement