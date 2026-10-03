# Production deployment guide

## Topology (initial)

1. Managed / infra-provided PostgreSQL 16+ (not started by app compose)
2. Infra-provided Redis (cache/queue/session)
3. Laravel API via FrankenPHP + scheduler + worker containers
4. Next.js dashboard (standalone Node image)
5. Secrets in a secret manager / sealed env — never in git

Concrete VPS steps: [vps-deployment.md](vps-deployment.md). Phase 5 storage/notifications remain deferred.

## API deploy checklist

1. Set `APP_ENV=production`, `APP_DEBUG=false`, strong `APP_KEY`
2. Configure `DB_*`, `REDIS_*`, `SESSION_*`, `SANCTUM_*`, CORS origins for the dashboard
3. Configure `SMSIR_*` and `GOOGLE_*` only if those login methods are enabled
4. Configure Cafe Bazaar / Myket tokens per environment via the billing admin API (encrypted at rest)
5. `php artisan migrate --force`
6. `php artisan config:cache && php artisan route:cache`
7. Run scheduler (`* * * * * php artisan schedule:run`) — includes `billing:reconcile-subscriptions`
8. Run queue worker if not on `sync`
9. Verify `GET /up` and `GET /api/v1/health/ready`

## Dashboard deploy checklist

1. `NEXT_PUBLIC_API_BASE_URL` points at the public API `/api/v1`
2. Build with Node 20: `npm ci && npm run build`
3. Restrict dashboard access (VPN / SSO / IP allowlist) if not yet public

## Credentials policy

- Publishable keys → mobile/web clients and SDKs
- Server/admin keys → trusted backends only
- Rotate on incident; revoke leaked keys immediately in the dashboard

## Rollback

1. Redeploy previous API image/commit
2. Avoid irreversible destructive migrations; prefer expand/contract
3. Restore Postgres from the last known-good dump if schema/data corruption occurred (see backup-restore.md)
