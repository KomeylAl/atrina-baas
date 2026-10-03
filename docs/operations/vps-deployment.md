# VPS deployment (external PostgreSQL & Redis)

Atrina BaaS production compose runs **only** the application processes:

- `api` (FrankenPHP / Caddy + PHP 8.4)
- `scheduler`
- `worker` (Redis queue)
- `dashboard` (Next.js standalone)
- optional `caddy` (TLS reverse proxy)

PostgreSQL and Redis must already exist in the infrastructure layer. Connection details are injected via `.env.prod`.

## Prerequisites on the VPS

- Docker Engine 24+ and Docker Compose plugin
- Outbound network to pull base images (or pre-loaded images)
- Reachability from app containers to infra Postgres/Redis hosts
- DNS for API and dashboard (or IP + reverse proxy elsewhere)
- Secrets: `APP_KEY`, DB password, Redis password, provider tokens

## Files

| Path | Role |
|------|------|
| [`docker-compose.prod.yml`](../../docker-compose.prod.yml) | App services only |
| [`.env.prod.example`](../../.env.prod.example) | Compose + Laravel env template |
| [`infra/deploy/deploy.sh`](../../infra/deploy/deploy.sh) | Build/up/migrate/health |
| [`infra/deploy/smoke-test.sh`](../../infra/deploy/smoke-test.sh) | Post-deploy smoke checks |

## First deploy

```bash
# On your workstation or CI: sync the repo to the VPS, then:
cp .env.prod.example .env.prod
# Edit .env.prod — set APP_KEY, DB_*, REDIS_*, URLs

# Generate APP_KEY once (any machine with PHP/Laravel):
# php artisan key:generate --show

chmod +x infra/deploy/*.sh
./infra/deploy/deploy.sh
```

`deploy.sh` will:

1. Build API + dashboard images
2. Start compose services
3. Run `php artisan migrate --force`
4. Cache config/routes
5. Hit `/up` and `/api/v1/health/ready`

## Seed two product projects

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod exec api \
  php artisan mvp:seed-products \
  --product-a="Product A" \
  --product-b="Product B"
```

Secrets for publishable keys are printed **once** in the command output.

## Smoke test

```bash
./infra/deploy/smoke-test.sh
```

## TLS with Caddy (optional)

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod \
  --profile with-caddy up -d
```

Point `API_DOMAIN` / `DASHBOARD_DOMAIN` A/AAAA records at the VPS. If TLS terminates elsewhere, keep publishing host ports `API_HOST_PORT` / `DASHBOARD_HOST_PORT` and skip the Caddy profile.

## Backups

Postgres backups are owned by the infra layer (see [backup-restore.md](backup-restore.md)). App volumes only hold Laravel `storage` (logs, cache files).

## Local dry-run (infra on host)

With local Compose Postgres/Redis already running on the host:

```bash
cp .env.prod.example .env.prod
# DB_HOST=host.docker.internal REDIS_HOST=host.docker.internal
# Create a dedicated DB, e.g. atrina_baas_prod
# APP_URL=http://localhost:8080 FRONTEND_URL=http://localhost:3001
# NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1
# NEXT_PUBLIC_APP_URL=http://localhost:3001
./infra/deploy/deploy.sh          # Linux / Git Bash
# or: .\infra\deploy\deploy.ps1  # Windows PowerShell
```

If Docker build fails with `SQLITE_FULL` / disk full, prune unused images first:

```bash
docker system prune -af
docker builder prune -af
```

## Rollback

```bash
# Redeploy previous IMAGE_TAG or git revision, then:
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

Do not run destructive migrate rollbacks unless planned.
