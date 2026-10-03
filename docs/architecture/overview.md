# Architecture overview (MVP)

## Planes

| Plane | Consumers | Responsibilities |
|-------|-----------|------------------|
| Control | Dashboard (Next.js), platform admins | Orgs, projects, environments, keys, membership, audit, usage views |
| Data | Mobile/web apps via API keys + user tokens | Auth, profiles, data API, billing runtime, storage, notifications |

Both planes run in `atrina-baas-backend` initially. Authorization boundaries must remain distinct (see ADR-004).

## Runtime diagram

```text
Dashboard (Next.js) ──HTTPS──► Control API (/api/v1/...)
Mobile / Web App    ──HTTPS──► Data API   (/api/v1/...)
                                      │
                                      ▼
                               Laravel modular monolith
                                      │
                         ┌────────────┼────────────┐
                         ▼            ▼            ▼
                    PostgreSQL      Redis     S3-compatible
```

## Module boundaries (Laravel target)

Introduce gradually in Phase 1+:

- `Platform` — users, orgs, memberships
- `Projects` — projects, environments
- `Credentials` — API key lifecycle
- `Audit` — append-oriented audit events
- Later: `Auth` (project users), `Data`, `Billing`, `Storage`, `Notifications`

Keep controllers thin; domain rules in services; Form Requests + policies at boundaries.

## Local infrastructure

`docker-compose.yml` provides PostgreSQL 16 and Redis 7. Application processes (Laravel, Next.js, queue workers) run on the host in Phase 0 for simpler debugging.
