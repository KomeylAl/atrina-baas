# Atrina BaaS — Production Deployment Guide

This document describes how to deploy Atrina BaaS to production. Read it
carefully before your first production launch.

## Pre-Launch Checklist

Before going to production, verify:

- [ ] **Database**: PostgreSQL (not SQLite) — see `docs/postgresql-migration.md`
- [ ] **Secrets**: `SESSION_SECRET` and `APP_ENCRYPTION_KEY` are set to long random strings (≥32 chars)
- [ ] **Cookie security**: `secure: true` for session cookies (auto-set when `NODE_ENV=production`)
- [ ] **HTTPS**: Reverse proxy terminates TLS; HSTS enabled
- [ ] **CORS**: `CORS_ALLOWED_ORIGINS` set to your real domains (not `*`)
- [ ] **Billing providers**: Mock adapters replaced with real CafeBazaar/Myket API calls
- [ ] **Storage**: Local filesystem replaced with S3-compatible backend
- [ ] **Notification providers**: Mock SMS/Email/Push replaced with real providers
- [ ] **Backups**: Daily PostgreSQL backups configured and tested (pg_dump + restore)
- [ ] **Health checks**: `/api/health?check=ready` returns 200
- [ ] **Logs**: Structured JSON logs piped to your log aggregator
- [ ] **Rate limits**: Tested against expected load
- [ ] **Quotas**: Default limits reviewed per environment
- [ ] **Audit logs**: Retention period defined (per README §10.4)

## Architecture

```
┌────────────────────────────────┐
│   Browser (Dashboard)          │
└────────────┬───────────────────┘
             │ HTTPS
             ▼
┌────────────────────────────────┐
│   Reverse Proxy (Caddy/Nginx)  │
│   - TLS termination            │
│   - HSTS                       │
│   - Rate limiting (network)    │
└────────────┬───────────────────┘
             │
             ▼
┌────────────────────────────────┐
│   Next.js Server               │
│   - /api/auth/*  (control)     │
│   - /api/projects/* (control)   │
│   - /api/v1/*   (data plane)   │
│   - /api/health                │
└────────────┬───────────────────┘
             │
             ▼
┌────────────────────────────────┐
│   PostgreSQL                   │
│   - Row-Level Security enabled │
│   - Daily backups              │
└────────────────────────────────┘
```

## Deployment Options

### Option 1: Docker on the existing infrastructure network

PostgreSQL and Redis already run on the server. This repo does not start them.
The app container joins that external network and listens on port 5050.

```bash
cp deploy/env.example deploy/env
# Edit DATABASE_URL and REDIS_URL to the hostnames on the infrastructure network.

docker compose up -d --build
```

`docker-compose.yml` attaches the `web` service to the external network
`infrastructure` (override the name with `INFRA_NETWORK`). On startup the
container runs `prisma migrate deploy`, then serves Next.js on port 5050.

### Option 2: Vercel + Managed PostgreSQL

- Deploy dashboard to Vercel (it's Next.js, native fit)
- Use a managed PostgreSQL (Supabase, Neon, RDS, Cloud SQL)
- Set environment variables in Vercel project settings
- Use Vercel Cron for scheduled jobs (subscription reconciliation)

### Option 3: Self-hosted (Bare Metal / VPS)

- Use PM2 or systemd to run Next.js
- Install PostgreSQL locally or on a separate VM
- Configure Caddy/Nginx as reverse proxy with TLS
- Set up `logrotate` for app logs

## Environment Variables (Production)

See `.env.example` for the full list. Key production-only:

```bash
# Required:
NODE_ENV=production
DATABASE_URL=postgresql://...
SESSION_SECRET=<32+ random hex chars>
APP_ENCRYPTION_KEY=<32+ random hex chars>

# Storage:
STORAGE_BACKEND=s3
S3_ENDPOINT=https://s3.amazonaws.com
S3_BUCKET=atrina-baas-storage
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...

# Billing:
CAFEBAZAAR_API_BASE=https://developers.cafebazaar.ir/api
CAFEBAZAAR_ACCESS_TOKEN=...
CAFEBAZAAR_PACKAGE_NAME=ir.atrina.app

# Notifications (pick per channel):
KAVENEGAR_API_KEY=...
MAILGUN_API_KEY=...
FCM_SERVER_KEY=...

# Observability:
LOG_LEVEL=info
SENTRY_DSN=https://...
```

## Health Checks

```bash
# Liveness (process is running):
curl https://your-domain.com/api/health?check=live
# → { "ok": true, "data": { "ok": true, "check": "live" } }

# Readiness (dependencies up):
curl https://your-domain.com/api/health?check=ready
# → { "ok": true, "data": { "ok": true, "check": "ready", "durationMs": 3 } }
```

Wire these into your load balancer (Liveness → 503 restart, Readiness → 503 drain).

## Backup Strategy

```bash
# Daily backup (cron, 02:00):
0 2 * * * pg_dump atrina | gzip > /backups/atrina_$(date +\%Y\%m\%d).sql.gz

# Retention: 30 days
find /backups -name "atrina_*.sql.gz" -mtime +30 -delete

# Test restore monthly (in isolated env):
gunzip -c /backups/atrina_20260101.sql.gz | psql atrina_test
```

Define RPO (Recovery Point Objective) and RTO (Recovery Time Objective) per README §14.4:
- **RPO**: Maximum data loss acceptable (e.g. 24 hours = daily backups)
- **RTO**: Maximum downtime acceptable (e.g. 4 hours = DB restore + restart)

## Incident Response

When something goes wrong:

1. **Check `/api/health?check=ready`** — Is the DB up?
2. **Check structured logs** — Filter by `severity=error`:
   ```bash
   tail -f /var/log/atrina.log | jq 'select(.severity == "error")'
   ```
3. **Check audit logs** — Recent admin actions:
   ```sql
   SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50;
   ```
4. **Rotate compromised secrets** — If a credential leaks, rotate it:
   - API keys: rotate via dashboard (creates new, revokes old)
   - Session secret: change `SESSION_SECRET` (all sessions invalidated)
   - App encryption key: change `APP_ENCRYPTION_KEY` (need to re-encrypt provider configs)

## Monitoring

Recommended metrics (per README §14.2):

- Request count, latency, error rate (from logs or APM)
- Queue depth and job failures (if using background jobs)
- Database connection pool usage
- Cache hit rate
- Storage operations and bytes (sum of `storage_objects.size` per project)
- Auth failures and rate-limit events (count of `audit_logs.action = 'platform_user.failed_login'`)
- Billing verification outcomes (count of `purchases.status`)
- Provider latency and failures (structured logs `module: billing`)

## Upgrade Strategy

When upgrading Atrina BaaS:

1. **Read the CHANGELOG** for breaking changes
2. **Backup the database** (`pg_dump`)
3. **Test the upgrade in staging** first
4. **Apply schema migrations**: `bun run db:push` (non-destructive)
5. **Restart the app**: rolling restart to avoid downtime
6. **Run smoke tests**: login, create project, list users, verify health

## Common Issues

| Issue | Cause | Fix |
|---|---|---|
| 401 on dashboard | Session cookie expired or invalid | Re-login |
| 401 on /api/v1/* | API key invalid or revoked | Rotate via dashboard |
| 403 on /api/v1/* | Wrong credential kind (e.g. publishable for server op) | Use correct key kind |
| 429 on /api/v1/* | Rate limit exceeded | Wait 60s or upgrade plan |
| 429 with QUOTA_EXCEEDED | Monthly quota exceeded | Bump quota via dashboard |
| 503 on /api/health?check=ready | DB down | Check PostgreSQL status |
| Webhook delivery fails | Endpoint returns non-2xx or timeout | Check endpoint logs; replay via dashboard |
