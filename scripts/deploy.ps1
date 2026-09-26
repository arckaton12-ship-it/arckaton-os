# Arckaton OS — Deploiement automatique
# Usage : npm run deploy   (ou : powershell -ExecutionPolicy Bypass -File scripts/deploy.ps1)
# 1) lint 2) build 3) commit 4) push  -> Render re-deploie automatiquement sur push
param(
  [switch]$SkipBuild
)
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

Write-Host "==> [1/4] Lint (tsc --noEmit)..." -ForegroundColor Cyan
npm run lint
if ($LASTEXITCODE -ne 0) { throw "LINT KO — deploiement annule" }

if (-not $SkipBuild) {
  Write-Host "==> [2/4] Build (vite + server.cjs)..." -ForegroundColor Cyan
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "BUILD KO — deploiement annule" }
}

Write-Host "==> [3/4] Commit..." -ForegroundColor Cyan
git add -A
$changes = git status --porcelain
if ($changes) {
  $msg = "deploy: automatique $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
  git -c user.name="Arckaton" -c user.email="dev@arckaton.com" commit -m $msg
  Write-Host "=> Committe : $msg"
} else {
  Write-Host "=> Rien a committer"
}

Write-Host "==> [4/4] Push (déclenche le auto-deploy Render)..." -ForegroundColor Cyan
git push
if ($LASTEXITCODE -ne 0) { throw "PUSH KO" }
Write-Host "=> PUSH OK. Render redéploie automatiquement (quelques minutes)." -ForegroundColor Green