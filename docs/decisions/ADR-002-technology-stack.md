# ADR-002: Technology stack for MVP

- **Status:** Accepted
- **Date:** 2026-10-03
- **Phase:** 0

## Context

`docs/README.md` defines default technologies. The repository already matches the primary choices.

## Decision

| Area | Choice | Notes |
|------|--------|-------|
| API | Laravel 13 / PHP 8.3+ | Modular monolith |
| Dashboard | Next.js 16 + TypeScript + React 19 | App Router |
| Primary DB | PostgreSQL 16 | Platform + project metadata |
| Cache / queue (target) | Redis 7 | Local Compose provides Redis; Laravel may start on database drivers until Redis is wired in Phase 1 |
| API style | Versioned REST JSON `/api/v1` | OpenAPI alongside routes |
| Auth (dashboard) | Session cookie + CSRF for browser; Sanctum (or equivalent Laravel-supported token) if SPA needs it | Exact package chosen in Phase 1 |
| Object storage | S3-compatible adapter | Local disk/MinIO later (Phase 5) |
| Tests | PHPUnit (backend), Vitest/Playwright when frontend tests start | Follow existing backend runner |

Do not add microservices, Kubernetes, or a second design system in MVP.

## Consequences

- Local development depends on Docker for Postgres (+ Redis).
- Dependency upgrades must be intentional and pinned via lockfiles.
- Provider integrations (Bazaar/Myket, SMS) stay behind interfaces.
