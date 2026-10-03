# Deploy scripts

| Script | Host | Purpose |
|--------|------|---------|
| `deploy.sh` | Linux VPS / Git Bash | Build, up, migrate, health |
| `deploy.ps1` | Windows PowerShell | Same flow for local dry-run |
| `smoke-test.sh` | Linux / Git Bash | Post-deploy API smoke checks |

Application compose file: [`../../docker-compose.prod.yml`](../../docker-compose.prod.yml)  
Full runbook: [`../../docs/operations/vps-deployment.md`](../../docs/operations/vps-deployment.md)

## Before first VPS deploy

1. Ensure infra Postgres + Redis are reachable from the VPS Docker network
2. Copy `.env.prod.example` → `.env.prod` and set real `APP_KEY`, `DB_*`, `REDIS_*`, URLs
3. Free enough disk for image builds (`docker system df`; prune unused images if needed)
4. Run `./infra/deploy/deploy.sh`
5. `php artisan mvp:seed-products --product-a="…" --product-b="…"`
6. `./infra/deploy/smoke-test.sh`
