# Repository assessment (Phase 0)

- **Date:** 2026-10-03
- **Spec baseline:** `docs/README.md`

## What exists

| Component | State |
|-----------|--------|
| `atrina-baas-backend` | Fresh Laravel 13.34 skeleton + Boost; default `User` model; no API routes; PHPUnit example tests only |
| `atrina-baas-frontend` | Create Next App (Next 16 / React 19 / Tailwind 4); welcome page only |
| `docs/README.md` | Full product/architecture specification |
| Docker / root CI / root README | Added in Phase 0 |

## Conflicts with the architecture spec

| Spec expectation | Repository reality | Resolution |
|------------------|--------------------|------------|
| `apps/api` + `apps/dashboard` | `atrina-baas-backend` + `atrina-baas-frontend` | Keep current names (ADR-001) |
| Sanctum/token design described | No auth package yet | Choose in Phase 1 implementation |
| Redis for cache/queue | `.env.example` uses database drivers; Redis available via Compose | Wire Redis when queue/rate-limit needs appear in Phase 1 |
| `platform_users` table | Default Laravel `users` | Migrate/rename carefully in Phase 1 |
| OpenAPI alongside routes | None | Introduce with first public endpoints |
| CI baseline | Missing before Phase 0 | Root GitHub Actions workflow added |
| Design system | None / Tailwind only | Use Tailwind; adopt Atrina DS later if available |

## Open product decisions (block later phases)

| Decision | Blocks | Default until decided |
|----------|--------|------------------------|
| First consuming application | Phase 2 | TBD |
| Login method (email/password vs phone OTP) | Phase 2 | TBD |
| Whether MVP needs Data API | Phase 3 | Defer unless first app requires it |
| First store (Cafe Bazaar / Myket) | Phase 4 | TBD; verify official docs first |
| Commercial pricing | Public launch | Defer |

## Phase 0 acceptance checklist

- [x] Repository assessed
- [x] Layout decision recorded
- [x] Stack and isolation ADRs recorded
- [x] Local infra via Docker Compose
- [x] Local development doc
- [x] Initial threat model
- [x] Secrets excluded via `.gitignore`
- [x] CI workflow added (runs on push/PR)
