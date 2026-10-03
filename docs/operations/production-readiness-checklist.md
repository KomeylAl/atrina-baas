# Production readiness checklist

Use before the first real consumer goes live.

## Security

- [ ] `APP_DEBUG=false` in production
- [ ] Secrets only in env/secret manager; none committed
- [ ] HTTPS everywhere (API + dashboard)
- [ ] Publishable vs server/admin key separation verified
- [ ] Google OAuth client limited to intended package/bundle IDs
- [ ] Store billing tokens stored encrypted; Fake provider disabled outside local/testing
- [ ] Rate limits active on auth and purchase verify routes

## Data & tenancy

- [ ] Environment isolation verified (dev credential cannot read prod)
- [ ] Data policies reviewed for first consumer tables
- [ ] Audit logs visible for credential and billing admin actions

## Billing

- [ ] Cafe Bazaar and/or Myket verify tested against store sandbox/docs
- [ ] Prepaid non-renewing messaging shown in dashboard/SDK docs
- [ ] Reconciliation schedule running

## Usage & ops

- [ ] `/api/v1/health/ready` monitored
- [ ] Nightly Postgres backup configured (infra layer; app does not host Postgres)
- [ ] Redis provided by infra; queue worker + scheduler containers running
- [ ] Restore drill completed at least once (see backup-restore.md)
- [ ] Usage endpoint returns expected metrics for a smoke project
- [ ] On-call contact and credential-rotation steps documented
- [ ] VPS deploy runbook followed (see vps-deployment.md)
- [ ] `APP_DEBUG=false`, TrustProxies enabled behind reverse proxy
- [ ] CORS limited to production dashboard origin(s)

## Explicitly deferred (not blockers)

- [ ] Phase 5 object storage
- [ ] Phase 5 general-purpose notifications module
- [ ] Multi-region / read replicas
- [ ] Full native SDK feature parity beyond thin HTTP clients
