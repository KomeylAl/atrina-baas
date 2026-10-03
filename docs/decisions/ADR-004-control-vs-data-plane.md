# ADR-004: Control plane vs data plane in one deployment

- **Status:** Accepted
- **Date:** 2026-10-03
- **Phase:** 0

## Context

The product has two logical planes. Microservices are out of scope for MVP.

## Decision

Ship **one Laravel application** that hosts both planes, with **strict route, auth, and policy separation**:

- Control plane: dashboard users, organizations, projects, environments, credentials, audit.
- Data plane: project users, project data, billing runtime, storage, notifications.

Same process/deployment initially; separate middleware stacks and token audiences. A project end-user token must never authorize control-plane routes.

The Next.js app talks only to documented public APIs (API-first).

## Consequences

- Lower operational cost for MVP.
- Module boundaries inside `app/` (Domains/Modules) must stay clean for later extraction.
- Security tests must cover plane crossover attempts.
