# Applies the public.projects table (same definition as supabase/schema.sql)
# via the Supabase REST admin API (service_role key).
# NOTE: keep this file ASCII-only (Windows PowerShell reads .ps1 as ANSI without BOM).
$ErrorActionPreference = 'Stop'

$envMap = @{}
Get-Content (Join-Path $PSScriptRoot '..\.env') -Encoding UTF8 | ForEach-Object {
  if ($_ -match '^\s*([A-Za-z_0-9]+)\s*=\s*(.*)$') {
    $envMap[$Matches[1]] = $Matches[2].Trim().Trim('"')
  }
}

$url = $envMap['SUPABASE_URL']
$key = $envMap['SUPABASE_SERVICE_ROLE_KEY']
if (-not $url -or -not $key) { throw 'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing from .env' }

$headers = @{
  'apikey'        = $key
  'Authorization' = "Bearer $key"
  'Content-Type'  = 'application/json'
}

Write-Host "Project: $url"

$tables = Invoke-RestMethod -Uri "$url/rest/v1/" -Headers $headers -Method Get |
  ForEach-Object { $_.name }

if ($tables -contains 'projects') {
  Write-Host 'Table public.projects already exists.'
} else {
  Write-Host 'Creating public.projects...'
  $ddl = Get-Content (Join-Path $PSScriptRoot '..\supabase\migrations\003_projects.sql') -Raw -Encoding UTF8
  Invoke-RestMethod -Uri "$url/rest/v1/rpc/exec_sql" -Headers $headers -Method Post `
    -Body (@{ sql = $ddl } | ConvertTo-Json) -ContentType 'application/json' | Out-Null
  Write-Host 'Table created.'
}

$expected = @(
  'project_ref', 'client_code', 'client_name', 'client_email', 'client_phone', 'service',
  'pole', 'chef_de_projet', 'statut', 'forfait', 'budget_estime', 'deadline', 'progression',
  'sorties_terrain_effectuees', 'sorties_terrain_total', 'jalons', 'sorties_terrain',
  'feedbacks', 'notes'
)

$row = Invoke-RestMethod -Uri "$url/rest/v1/projects?select=*&limit=1" -Headers $headers -Method Get
if ($row) {
  $have = $row[0].PSObject.Properties.Name
  $missing = $expected | Where-Object { $have -notcontains $_ }
  if ($missing) { Write-Host ('Missing columns: ' + ($missing -join ', ')) }
  else { Write-Host 'All expected columns present.' }
} else {
  Write-Host 'Query OK (table is empty, so column list cannot be read back).'
}
