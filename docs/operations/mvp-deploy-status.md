# MVP deploy status

- **Date:** 2026-10-03
- **Target:** Linux VPS with external Postgres/Redis
- **Packaging:** Ready

## Delivered in repo

- [`docker-compose.prod.yml`](../../docker-compose.prod.yml) — api / scheduler / worker / dashboard (+ optional Caddy); **no** Postgres/Redis services
- [`infra/docker/Dockerfile.api`](../../infra/docker/Dockerfile.api) — FrankenPHP PHP 8.4
- [`infra/docker/Dockerfile.dashboard`](../../infra/docker/Dockerfile.dashboard) — Next.js standalone
- Env templates: `.env.prod.example`, backend/frontend `.env.production.example`
- Deploy scripts: `infra/deploy/deploy.sh`, `deploy.ps1`, `smoke-test.sh`
- `php artisan mvp:seed-products` (+ feature test)
- Runbook: [vps-deployment.md](vps-deployment.md)

## Local validation note

A production-like dry-run was started against host Postgres/Redis (`atrina_baas_prod`, `host.docker.internal`). Image build was interrupted by **disk-full / Docker daemon errors** on the workstation. After freeing disk (`docker system prune`), re-run:

```powershell
.\infra\deploy\deploy.ps1
docker compose -f docker-compose.prod.yml --env-file .env.prod exec api php artisan mvp:seed-products --product-a="Product A" --product-b="Product B"
bash infra/deploy/smoke-test.sh
```

## Remaining for live VPS

Provide SSH host, domains, and infra `DB_*` / `REDIS_*`. Then copy the repo + `.env.prod` and run `deploy.sh` on the server.
