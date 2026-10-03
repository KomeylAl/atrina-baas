# Backup and restore runbook

- **RPO target (initial):** ≤ 24 hours (nightly logical backups)
- **RTO target (initial):** ≤ 4 hours for a single-region Postgres restore

These targets are operational goals for the first production deploy. Tighten them only after measured restore drills.

## What to back up

1. **PostgreSQL** — primary source of truth (orgs, projects, users, data records, billing, usage, audit)
2. **Application secrets** — `.env` / secret manager values (`APP_KEY`, DB, Redis, SMS, Google, store tokens). Store separately from the DB dump.
3. **Optional Redis** — ephemeral; do not rely on Redis for durable recovery.

Object storage is **out of scope** until Phase 5 resumes.

## Nightly Postgres backup (Docker Compose)

```bash
docker compose exec -T postgres \
  pg_dump -U atrina -d atrina_baas_backend -Fc \
  > "backups/atrina-$(date +%Y%m%d).dump"
```

Retain at least 7 daily dumps off-host.

## Restore to an isolated instance

```bash
# Start a clean Postgres (example: alternate DB name)
docker compose exec -T postgres \
  psql -U atrina -c "CREATE DATABASE atrina_baas_restore;"

docker compose exec -T postgres \
  pg_restore -U atrina -d atrina_baas_restore --clean --if-exists \
  < backups/atrina-YYYYMMDD.dump
```

Point a staging API at `atrina_baas_restore`, run `php artisan migrate --force` only if the dump is older than current migrations, then smoke-test login + one data read + one billing entitlements call.

## Logical snapshot smoke test (CI)

`DatabaseSnapshotService` exports/imports a minimal control-plane + usage snapshot. Covered by `tests/Feature/Ops/BackupRestoreSmokeTest.php`. This validates application-level restore plumbing; it does **not** replace `pg_dump` drills.

## After restore

1. Rotate compromised credentials if the incident involved secret exposure
2. Confirm scheduler/queue workers are running
3. Confirm `/up` and `/api/v1/health/ready`
4. Spot-check audit logs and a recent usage aggregate
