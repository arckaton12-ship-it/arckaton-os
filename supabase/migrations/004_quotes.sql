-- =============================================================
-- Arckaton OS - Devis et factures
-- Un devis n'existe que lorsqu'il est enregistre : reference
-- sequentielle stable, lignes, montants, statut de suivi.
-- =============================================================
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  quote_ref text unique not null,          -- DEV-2026-0001 / FAC-2026-0001
  type text not null default 'devis',      -- devis | facture
  client_name text not null,
  client_phone text default '',
  client_email text default '',
  project_ref text,                        -- projet lie (optionnel)
  project_name text,
  pole text default 'Direction',
  items jsonb default '[]'::jsonb,         -- [{designation, pole, montant, detail}]
  total int default 0,                     -- FCFA
  deposit int default 0,
  balance int default 0,
  currency text default 'FCFA',
  status text default 'brouillon',         -- brouillon | envoye | accepte | refuse | paye
  valid_days int default 30,
  notes text default '',
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_quotes_ref on public.quotes (quote_ref);
create index if not exists idx_quotes_status on public.quotes (status);
create index if not exists idx_quotes_created_at on public.quotes (created_at desc);

alter table public.quotes enable row level security;
