# Phase 1 plan — Platform core and tenancy

Prerequisite: Phase 0 acceptance complete.

## Goals

Authorized platform users can manage organizations, projects, environments, and API credentials with enforced isolation and audit trails.

## Recommended vertical slices (in order)

### 1.1 Platform identity foundation

- Introduce platform user model (migrate from default `users` or rename carefully)
- Dashboard login/logout (session-based SPA or cookie session — pick one Laravel-supported approach)
- Seed a local owner user for development

**Exit:** authenticated platform user can hit a protected `/api/v1/me` (or equivalent).

### 1.2 Organizations and memberships

- Migrations: `organizations`, `organization_members`
- CRUD + list with pagination
- Roles: owner, admin, developer, billing, viewer
- Policies: no access outside membership

**Exit:** cross-org access feature tests fail closed.

### 1.3 Projects and environments

- Migrations: `projects`, `environments`
- Create project with default `development` + `production` environments (or explicit create)
- Status lifecycle: active / suspended / archived
- Unique `(organization_id, slug)` and `(project_id, slug)`

**Exit:** member can manage projects in their org only.

### 1.4 API credentials

- Migration: `api_credentials`
- Create (return secret once), list (prefix only), revoke, rotate
- Kinds: publishable, server_secret, admin
- Hash storage; never log full secret

**Exit:** revoked credentials rejected; secret not retrievable later.

### 1.5 Audit logging

- Migration: `audit_logs`
- Record org/project/env/credential/role mutations
- Read endpoint for authorized members

**Exit:** sensitive actions produce redacted audit rows.

### 1.6 Dashboard shell (minimal)

- Login page
- Org/project list and environment selector
- API key create/revoke UI (secret display-once)

**Exit:** happy path usable without Postman for core flows.

## Quality gates for Phase 1

- Pint + PHPUnit green (including isolation tests)
- OpenAPI stubs for shipped control-plane routes
- No secrets in repo
- Manual checklist: create org → project → env → key → revoke

## Explicitly out of Phase 1

- Project end-user auth (Phase 2)
- Data API (Phase 3)
- Billing (Phase 4)
- SDKs (Phase 6)
