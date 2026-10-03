# Atrina BaaS

Multi-project Backend as a Service for Atrina products — secure control plane, data plane APIs, and an admin dashboard.

## Repository

| Path | Role |
|------|------|
| `atrina-baas-backend/` | Laravel API (control + data plane) |
| `atrina-baas-frontend/` | Next.js organization/project dashboard |
| `docs/` | Architecture, ADRs, security, operations |
| `docker-compose.yml` | Local PostgreSQL + Redis |

Product specification: [`docs/README.md`](docs/README.md)

## Quick start

1. Start infrastructure: `docker compose up -d`
2. Backend: see [`docs/operations/local-development.md`](docs/operations/local-development.md)
3. Frontend: same doc

## Development principles

- Build in verified phases (Phase 0 foundation → Phase 1 tenancy → …).
- Security and tenant isolation are release blockers.
- Prefer small, testable changes over broad unreviewable diffs.

## Phase status

| Phase | Focus | Status |
|-------|--------|--------|
| 0 | Repo foundation, ADRs, local setup, CI | Done |
| 1 | Platform auth, orgs/projects/environments/keys | Done |
| 2 | Project end-user auth (password / Google / OTP) | Done |
| 3 | Managed Data API + policies + explorer | Done |
| 4 | Billing / subscriptions | Done |
| 5 | Storage & notifications | Deferred |
| 6 | SDKs, usage, production hardening | Done |

Production VPS deploy (external Postgres/Redis): [`docs/operations/vps-deployment.md`](docs/operations/vps-deployment.md)

## License

Proprietary — Atrina. Internal use unless otherwise stated.
