-- =============================================================
-- Arckaton OS - Parametres de l'agence
-- Coordonnees editees depuis l'onglet Parametres et reutilisees
-- par le CRM, les devis et le site vitrine.
-- =============================================================
create table if not exists public.app_settings (
  key text primary key,
  value text default '',
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;
