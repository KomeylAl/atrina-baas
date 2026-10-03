#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${ENV_FILE:-.env.prod}"
COMPOSE=(docker compose -f docker-compose.prod.yml --env-file "$ENV_FILE")

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy .env.prod.example and fill infra DB/Redis + APP_KEY." >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

if [[ -z "${APP_KEY:-}" ]]; then
  echo "APP_KEY is empty in $ENV_FILE. Generate one with: php artisan key:generate --show" >&2
  exit 1
fi

echo "==> Building images"
"${COMPOSE[@]}" build

echo "==> Starting services"
"${COMPOSE[@]}" up -d api dashboard scheduler worker

echo "==> Waiting for API health"
ATTEMPTS=60
for ((i=1; i<=ATTEMPTS; i++)); do
  if curl -fsS "http://127.0.0.1:${API_HOST_PORT:-8080}/up" >/dev/null 2>&1; then
    echo "API /up OK"
    break
  fi
  if [[ "$i" -eq "$ATTEMPTS" ]]; then
    echo "API did not become healthy in time." >&2
    "${COMPOSE[@]}" logs --tail=80 api >&2 || true
    exit 1
  fi
  sleep 2
done

echo "==> Running migrations"
"${COMPOSE[@]}" exec -T api php artisan migrate --force --no-interaction

echo "==> Caching config/routes"
"${COMPOSE[@]}" exec -T api php artisan config:cache
"${COMPOSE[@]}" exec -T api php artisan route:cache

echo "==> Readiness check"
curl -fsS "http://127.0.0.1:${API_HOST_PORT:-8080}/api/v1/health/ready" | tee /tmp/atrina-ready.json
echo

echo "Deploy complete."
echo "  API:       http://127.0.0.1:${API_HOST_PORT:-8080}"
echo "  Dashboard: http://127.0.0.1:${DASHBOARD_HOST_PORT:-3000}"
echo "Next: docker compose -f docker-compose.prod.yml --env-file $ENV_FILE exec api php artisan mvp:seed-products"
echo "Then: ./infra/deploy/smoke-test.sh"
