# ADR-001: Repository layout

- **Status:** Accepted
- **Date:** 2026-10-03
- **Phase:** 0

## Context

The architecture spec recommends an `apps/` + `packages/` monorepo layout. The repository already contains working scaffolds at:

- `atrina-baas-backend/` (Laravel 13)
- `atrina-baas-frontend/` (Next.js 16)

## Decision

Keep the existing top-level app folders for MVP. Do not migrate to `apps/api` and `apps/dashboard` until there is a concrete operational reason (shared packages, multiple apps, or CI complexity).

Documented layout:

```text
atrina-baas/
├── README.md
├── docker-compose.yml
├── docs/
├── atrina-baas-backend/   # Laravel API (control + data plane)
├── atrina-baas-frontend/  # Next.js dashboard
├── packages/
│   ├── sdk-js/
│   ├── sdk-android/
│   └── sdk-ios/
└── .github/workflows/
```

SDK packages live under `packages/sdk-*` (Phase 6).

## Consequences

- Faster Phase 0/1 start with no mechanical move.
- Paths in docs and CI must use current folder names.
- A later rename remains possible; module boundaries inside Laravel matter more than folder names.
