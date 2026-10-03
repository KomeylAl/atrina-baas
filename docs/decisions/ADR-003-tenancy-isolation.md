# ADR-003: Multi-tenancy and data isolation

- **Status:** Accepted
- **Date:** 2026-10-03
- **Phase:** 0

## Context

Atrina BaaS is multi-project. Cross-tenant access is a release blocker. Options include separate databases per project, schema-per-tenant, or shared PostgreSQL with strict scoping.

## Decision

**MVP isolation model:** shared PostgreSQL with mandatory tenant columns and server-side authorization.

Hierarchy:

```text
Organization → Project → Environment → credentials / data / usage
```

Rules:

1. Every project-owned row must carry `project_id` and/or `environment_id` (or an equivalent explicit scope).
2. Tenant identity comes only from validated credentials or trusted server context — never from unverified client-supplied IDs.
3. Authorization uses Laravel policies/gates on every control-plane mutation.
4. Scoped query helpers / global scopes reduce accidental leakage; DB constraints enforce uniqueness within tenant.
5. PostgreSQL RLS is optional defense-in-depth later; not required for Phase 1 if scoping + tests are solid.
6. Platform users (`platform_users` / dashboard identity) are a separate identity domain from project end users.

## Consequences

- Simpler ops for self-hosted MVP.
- Requires rigorous cross-tenant automated tests from Phase 1 onward.
- Migration to stronger physical isolation remains possible later without changing the public resource hierarchy.
