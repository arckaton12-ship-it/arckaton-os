$ErrorActionPreference = 'Stop'
$env:SUPABASE_ACCESS_TOKEN = (Get-Content .env | Where-Object { $_ -like 'SUPABASE_ACCESS_TOKEN=*' }) -replace '^SUPABASE_ACCESS_TOKEN=',''
$env:SUPABASE_PROJECT_REF = (Get-Content .env | Where-Object { $_ -like 'SUPABASE_PROJECT_REF=*' }) -replace '^SUPABASE_PROJECT_REF=',''

$rows = @(
  [ordered]@{
    kind = 'realisation'; slug = 'modele-boutique-en-ligne'; title = '[Modèle] Boutique en ligne'
    position = 1
    data = [ordered]@{
      id = 'modele-boutique-en-ligne'
      name = '[Modèle] Boutique en ligne - remplacez par un vrai projet'
      category = 'ecommerce'
      categoryLabel = 'E-commerce & Boutiques'
      forfait = '[Forfait ARKA-E commerce]'
      description = "Gabarit a personnaliser : decrivez ici le contexte du client, la problematique metier et la solution deployee par Arckaton. Deux a trois phrases suffisent."
      mainMetric = '00%'
      mainMetricLabel = '[Indicateur principal, ex. chiffre d''affaires en ligne]'
      subMetric = '[Indicateur secondaire, ex. 0 commande perdue / mois]'
      points = @(
        '[Bequille 1 : livrable cle, ex. catalogue produits synchronise avec le stock]',
        '[Bequille 2 : performance, ex. pages produit en moins de 2 secondes]',
        '[Bequille 3 : suivi, ex. tableau de bord des commandes en temps reel]'
      )
      delay = '[Delai de realisation, ex. 6 semaines]'
      badgeAccent = 'emerald'
    }
  },
  [ordered]@{
    kind = 'realisation'; slug = 'modele-arka-pme'; title = '[Modèle] Cockpit ARKA-PME'
    position = 2
    data = [ordered]@{
      id = 'modele-arka-pme'
      name = '[Modèle] Cockpit interne ARKA-PME - remplacez par un vrai projet'
      category = 'saas'
      categoryLabel = 'ARKA-PME (SaaS)'
      forfait = '[Offre ARKA-PME]'
      description = "Gabarit a personnaliser : decrivez le processus interne refactore, les pôles concernes et le gain de temps obtenu grace au cockpit."
      mainMetric = '00 h'
      mainMetricLabel = '[Indicateur principal, ex. heures economisees par mois]'
      subMetric = '[Indicateur secondaire, ex. 0 papier / 0 aller-retour]'
      points = @(
        '[Bequille 1 : modules activés, ex. leads, projets, taches, facturation]',
        '[Bequille 2 : acces, ex. 6 roles avec permissions distinctes]',
        '[Bequille 3 : gains, ex. reporting genere automatiquement]'
      )
      delay = '[Delai de deploiement, ex. 3 semaines]'
      badgeAccent = 'blue'
    }
  },
  [ordered]@{
    kind = 'realisation'; slug = 'modele-sante-clinique'; title = '[Modèle] Clinique / Cabinet'
    position = 3
    data = [ordered]@{
      id = 'modele-sante-clinique'
      name = '[Modèle] Clinique ou cabinet - remplacez par un vrai projet'
      category = 'sante'
      categoryLabel = 'Sante & Cliniques'
      forfait = '[Offre sante]'
      description = "Gabarit a personnaliser : decrivez l'etablissement, le parcours patient souhaite et les contraintes reglementaires respectees."
      mainMetric = '00%'
      mainMetricLabel = '[Indicateur principal, ex. de rendez-vous confirmes en ligne]'
      subMetric = '[Indicateur secondaire, ex. 0 appel en attente]'
      points = @(
        '[Bequille 1 : parcours patient, ex. reservation de creneaux en ligne]',
        '[Bequille 2 : confidentialite, ex. donnees de sante hebergees et journalisees]',
        '[Bequille 3 : suivi, ex. relances automatiques avant consultation]'
      )
      delay = '[Delai de realisation, ex. 5 semaines]'
      badgeAccent = 'violet'
    }
  }
)

$payload = ($rows | ConvertTo-Json -Depth 8 -Compress)
# Upsert par (kind, slug) : insere ou met a jour
$q = @"
insert into public.content_items (kind, slug, title, published, position, data)
select e->>'kind', e->>'slug', e->>'title', true, (e->>'position')::int, e->'data'
from jsonb_array_elements('$payload'::jsonb) as e
on conflict (kind, slug) do update
  set title = excluded.title,
      published = excluded.published,
      position = excluded.position,
      data = excluded.data,
      updated_at = now();
"@

$r = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$env:SUPABASE_PROJECT_REF/database/query" -Method Post -Headers @{ Authorization = "Bearer $env:SUPABASE_ACCESS_TOKEN"; "Content-Type" = "application/json" } -Body (@{ query = $q } | ConvertTo-Json) -TimeoutSec 90
"lignes inserees/mises a jour : $r"

$check = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$env:SUPABASE_PROJECT_REF/database/query" -Method Post -Headers @{ Authorization = "Bearer $env:SUPABASE_ACCESS_TOKEN"; "Content-Type" = "application/json" } -Body (@{ query = "select kind, slug, title, position, published from public.content_items order by position;" } | ConvertTo-Json) -TimeoutSec 90
$check | ForEach-Object { "$($_.kind) | $($_.position) | $($_.title)" }
