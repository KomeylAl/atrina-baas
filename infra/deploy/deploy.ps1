# PowerShell deploy helper (Windows workstation / first VPS bootstrap via Docker).
# Usage (from repo root):
#   .\infra\deploy\deploy.ps1

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $Root

$EnvFile = if ($env:ENV_FILE) { $env:ENV_FILE } else { ".env.prod" }
if (-not (Test-Path $EnvFile)) {
  throw "Missing $EnvFile — copy .env.prod.example and fill values."
}

Get-Content $EnvFile | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
  $parts = $_.Split('=', 2)
  if ($parts.Length -eq 2) {
    Set-Item -Path "Env:$($parts[0].Trim())" -Value $parts[1].Trim()
  }
}

if (-not $env:APP_KEY) {
  throw "APP_KEY is empty in $EnvFile"
}

$compose = @("compose", "-f", "docker-compose.prod.yml", "--env-file", $EnvFile)

Write-Host "==> Building images"
docker @compose build

Write-Host "==> Starting services"
docker @compose up -d api dashboard scheduler worker

$apiPort = if ($env:API_HOST_PORT) { $env:API_HOST_PORT } else { "8060" }
$ok = $false
for ($i = 1; $i -le 60; $i++) {
  try {
    Invoke-WebRequest -Uri "http://127.0.0.1:$apiPort/up" -UseBasicParsing -TimeoutSec 3 | Out-Null
    $ok = $true
    break
  } catch {
    Start-Sleep -Seconds 2
  }
}
if (-not $ok) {
  docker @compose logs --tail 80 api
  throw "API did not become healthy"
}

Write-Host "==> Migrations + cache"
docker @compose exec -T api php artisan migrate --force --no-interaction
docker @compose exec -T api php artisan config:cache
docker @compose exec -T api php artisan route:cache

Write-Host "==> Readiness"
Invoke-WebRequest -Uri "http://127.0.0.1:$apiPort/api/v1/health/ready" -UseBasicParsing | Select-Object -ExpandProperty Content

Write-Host "Deploy complete. Seed products with:"
Write-Host "  docker compose -f docker-compose.prod.yml --env-file $EnvFile exec api php artisan mvp:seed-products"
Write-Host "Then run: bash infra/deploy/smoke-test.sh   (or Git Bash)"
