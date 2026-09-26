# Arckaton OS — Provisionnement Render via l'API (une seule fois)
# Usage :
#   $env:RENDER_API_KEY = "<votre clé API Render>"
#   $env:GITHUB_REPO_URL  = "https://github.com/<owner>/arckaton-os"
#   powershell -ExecutionPolicy Bypass -File scripts/setup-render.ps1
#
# Lit les secrets dans .env (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
# GEMINI_API_KEY) et les injecte comme variables d'environnement Render.
# Les secrets ne transitent PAS par le repo.

param(
  [Parameter(Mandatory=$false)][string]$RenderApiKey = $env:RENDER_API_KEY,
  [Parameter(Mandatory=$false)][string]$RepoUrl = $env:GITHUB_REPO_URL
)
$ErrorActionPreference = "Stop"

if (-not $RenderApiKey) { throw "RENDER_API_KEY manquante (env RENDER_API_KEY)" }
if (-not $RepoUrl)      { throw "GITHUB_REPO_URL manquante (env GITHUB_REPO_URL)" }

Set-Location (Join-Path $PSScriptRoot "..")

# --- Lecture .env (ignorer valeurs placeholder) ---
$envVars = @()
if (Test-Path ".env") {
  Get-Content ".env" | ForEach-Object {
    if ($_ -match '^\s*([A-Z0-9_]+)="?(.+?)"?\s*$') {
      $k = $Matches[1]; $v = $Matches[2]
      if ($v -and -not $v.StartsWith("MY_")) {
        $envVars += @{ key = $k; value = $v }
      }
    }
  }
} else {
  Write-Warning "Pas de fichier .env — les variables seront à renseigner dans Render."
}

# Variables usuelles
$envVars += @{ key = "NODE_VERSION"; value = "22" }

# --- Création du service (Web Service Node) ---
$body = @{
  type = "web_service"
  name = "arckaton-os"
  repo = $RepoUrl
  branch = "master"
  plan = "free"
  region = "oregon"
  autoDeploy = $true
  healthCheckPath = "/api/health"
  buildCommand = "npm install && npm run build"
  startCommand = "npm start"
  envVars = $envVars
} | ConvertTo-Json -Depth 5

$headers = @{ Authorization = "Bearer $RenderApiKey"; "Content-Type" = "application/json" }

try {
  $res = Invoke-RestMethod -Uri "https://api.render.com/v1/services" -Headers $headers -Method Post -Body $body
  $serviceId = $res.id
  Write-Host "=> Service Render cree : id=$serviceId" -ForegroundColor Green
  Write-Host "=> URL publique arrivee : https://$($res.serviceDetails.url 2>$null) (ou dans le dashboard)"
  Write-Host "=> Auto-deploy active : chaque push sur master redéploie."
} catch {
  # Erreur : si le service existe déjà, on tente une mise à jour
  Write-Warning "Creation impossible : $($_.Exception.Message)"
  Write-Warning "Si le service existe deja, ajustez render.yaml et redéployez depuis le dashboard."
  throw
}