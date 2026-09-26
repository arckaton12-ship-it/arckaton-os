# =============================================================
# Arckaton OS - Application de la table public.projects
#
# La table existe deja sur le projet Supabase de production. Ce script
# reste utile pour recreer un environnement neuf : il utilise l'API
# Management Supabase (POST /v1/projects/<ref>/database/query) car le
# RPC exec_sql n'existe pas sur ce projet.
#
# Variables lues dans .env :
#   SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF
# =============================================================
param(
  [string]$EnvFile = ".env"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $EnvFile)) {
  throw "Fichier introuvable : $EnvFile"
}

$envMap = @{}
foreach ($line in Get-Content -LiteralPath $EnvFile) {
  if ($line -match '^\s*([A-Za-z0-9_]+)\s*=\s*"?([^"#]+)"?\s*$') {
    $envMap[$matches[1]] = $matches[2].Trim()
  }
}

$accessToken = $envMap['SUPABASE_ACCESS_TOKEN']
$projectRef = $envMap['SUPABASE_PROJECT_REF']

if (-not $accessToken) { throw "SUPABASE_ACCESS_TOKEN manquant dans $EnvFile" }
if (-not $projectRef) { throw "SUPABASE_PROJECT_REF manquant dans $EnvFile" }

$sqlFile = "supabase/migrations/003_projects.sql"
if (-not (Test-Path -LiteralPath $sqlFile)) {
  throw "Migration introuvable : $sqlFile"
}
$sql = (Get-Content -LiteralPath $sqlFile -Raw)

function ConvertTo-JsonString {
  param([Parameter(Mandatory = $true)][AllowEmptyString()][string]$Value)
  $sb = New-Object System.Text.StringBuilder
  [void]$sb.Append('"')
  foreach ($ch in $Value.ToCharArray()) {
    switch ($ch) {
      '"'  { [void]$sb.Append('\"');  continue }
      '\'  { [void]$sb.Append('\\');  continue }
      "`n" { [void]$sb.Append('\n');  continue }
      "`r" { [void]$sb.Append('\r');  continue }
      "`t" { [void]$sb.Append('\t');  continue }
      default {
        $code = [int]$ch
        if ($code -lt 0x20) { [void]$sb.Append(('\u{0:x4}' -f $code)) }
        else { [void]$sb.Append($ch) }
      }
    }
  }
  [void]$sb.Append('"')
  $sb.ToString()
}

# ConvertTo-Json de Windows PowerShell 5.1 enveloppait la chaine longue dans
# {"value": ...}, ce que l'API Management rejetait (400). On serialise donc a la main.
$body = '{"query":' + (ConvertTo-JsonString -Value $sql) + '}'

# On force l'UTF-8 : par defaut PS 5.1 envoie de l'ASCII et corrompt les accents.
$bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)

Write-Output "Application de $sqlFile sur le projet $projectRef ..."
try {
  $response = Invoke-WebRequest `
    -Uri "https://api.supabase.com/v1/projects/$projectRef/database/query" `
    -Method Post `
    -Headers @{ Authorization = "Bearer $accessToken" } `
    -ContentType "application/json; charset=utf-8" `
    -Body $bodyBytes `
    -UseBasicParsing
  Write-Output "OK (HTTP $($response.StatusCode)) - table public.projects prete (RLS activee, acces limite au service_role)."
}
catch {
  $detail = ''
  try { $detail = $_.ErrorDetails.Message } catch { }
  Write-Output "ERREUR : $($_.Exception.Message) $detail"
  exit 1
}
