# Atrina BaaS --- Architecture & Implementation Specification

> **Document type:** Product, system architecture, and implementation
> specification\
> **Status:** Initial baseline\
> **Primary audience:** Cursor, AI coding agents, and Atrina
> engineering\
> **Implementation principle:** Build in verified, incremental phases.
> Do not treat this document as permission to skip design review,
> security controls, tests, or deployment checks.

------------------------------------------------------------------------

## 1. Product Overview

Atrina BaaS is a multi-project Backend as a Service platform intended to
provide reusable backend capabilities for Atrina's Android, iOS, web,
and SaaS products. It may later be offered as a commercial service to
external developers and organizations.

The platform should let an authorized organization create projects,
configure environments, enable backend modules, issue credentials,
inspect usage, and manage project data through a central dashboard and
APIs.

### 1.1 Product goals

1.  Reuse common backend capabilities across multiple products.
2.  Reduce the time required to launch a new application.
3.  Provide consistent authentication, data, billing, storage, and
    messaging APIs.
4.  Give project owners a central administrative interface.
5.  Enforce strict project and environment isolation.
6.  Support a self-hosted initial deployment and a path to horizontal
    scaling.
7.  Keep the first release small enough to operate and maintain.

### 1.2 Non-goals for the initial release

The first release is not intended to: - Be a general-purpose database
hosting service with arbitrary SQL exposed to clients. - Execute
arbitrary user-provided server code. - Replace a full cloud provider or
Kubernetes. - Promise globally distributed infrastructure or
multi-region high availability. - Implement every authentication
provider, payment gateway, or notification provider. - Provide a fully
automated visual schema designer before the underlying APIs and security
model are stable. - Store payment card data. - Treat client-supplied
payment results as authoritative.

### 1.3 Guiding principles

-   **Security first:** tenant isolation and authorization are
    foundational, not add-ons.
-   **Modular monolith first:** modules have explicit boundaries, but
    are deployed together initially.
-   **API-first:** the dashboard and SDKs use the same documented public
    APIs.
-   **Provider adapters:** external vendors are accessed through
    interfaces and adapters.
-   **Explicit lifecycle:** projects, environments, credentials,
    subscriptions, and resources have defined states.
-   **Observable by default:** important actions produce structured logs
    and audit events.
-   **No silent data loss:** destructive operations require
    authorization, safeguards, and auditability.
-   **Incremental delivery:** every phase must have tests and acceptance
    criteria.

------------------------------------------------------------------------

## 2. Proposed Technology Stack

Use the following defaults unless repository inspection or a documented
technical decision justifies a change.

  -----------------------------------------------------------------------
  Area                    Technology              Notes
  ----------------------- ----------------------- -----------------------
  Backend                 Laravel (current stable Modular monolith, REST
                          version compatible with APIs
                          deployment)             

  Language                PHP version required by Enforce strict typing
                          selected Laravel        where practical
                          release                 

  Primary database        PostgreSQL              Platform metadata and
                                                  initial project data

  Cache / queues          Redis                   Cache, rate limiting,
                                                  queue backend, locks

  Dashboard               Next.js + TypeScript    Admin and organization
                                                  console

  UI                      Existing Atrina design  Avoid introducing a
                          system, if present      second design system
                                                  without reason

  API format              JSON over HTTPS, REST,  OpenAPI specification
                          versioned               

  Authentication          Laravel-supported       Separate dashboard and
                          secure token/session    project-client concerns
                          design                  

  File storage            S3-compatible object    Local storage only for
                          storage adapter         development

  Background jobs         Laravel Queue           Idempotent jobs and
                                                  retry policy

  Testing                 Pest or PHPUnit (follow Unit, feature,
                          existing repository)    integration, security
                                                  tests

  Frontend tests          Existing project test   Test critical flows
                          stack; otherwise        
                          Vitest + Playwright     
                          where suitable          

  Containers              Docker / Docker Compose Production deployment
                          for local development   documented separately

  API documentation       OpenAPI                 Generated or maintained
                                                  alongside routes

  Observability           Structured logs;        Avoid vendor lock-in
                          metrics and tracing     
                          interfaces              
  -----------------------------------------------------------------------

Do not blindly upgrade dependencies. Inspect the repository, runtime,
and deployment constraints first. Pin dependency versions and document
compatibility.

### 2.1 Suggested repository layout

A monorepo is recommended for the initial product:

``` text
atrina-baas/
├── README.md
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── security/
│   ├── operations/
│   └── decisions/
├── apps/
│   ├── api/                 # Laravel application
│   └── dashboard/           # Next.js application
├── packages/
│   ├── sdk-js/              # Later phase
│   ├── sdk-android/         # Later phase
│   └── sdk-ios/             # Later phase
├── infra/
│   ├── docker/
│   └── deployment/
└── .github/
    └── workflows/
```

If the repository already has a different structure, preserve it unless
there is a concrete reason to migrate. Do not create empty SDK packages
in the MVP unless they are needed.

------------------------------------------------------------------------

## 3. System Context and High-Level Architecture

The platform has two logical planes. They may run in the same deployment
initially, but their responsibilities and authorization boundaries must
remain distinct.

### 3.1 Control plane

The control plane manages the platform itself: - Organizations and
memberships - Project creation and configuration - Environment creation
and settings - Module enablement - API credential lifecycle - Usage and
quota configuration - Administrative audit events - Platform-level
billing, if introduced later

Only authorized dashboard users and trusted administrative services may
access control-plane operations.

### 3.2 Data plane

The data plane serves project applications: - Authentication and
identity APIs - User profile and session operations - Project data
APIs - Subscription and entitlement APIs - Storage operations -
Notifications and webhooks - Runtime usage accounting

Data-plane requests must be scoped to a project and environment, and
must be authorized for the requested operation.

### 3.3 Logical architecture

``` text
                  ┌──────────────────────────┐
                  │   Atrina BaaS Dashboard  │
                  │        Next.js           │
                  └────────────┬─────────────┘
                               │ HTTPS
                  ┌────────────▼─────────────┐
                  │       Control API        │
                  │ Organizations / Projects │
                  │ Environments / Keys      │
                  └────────────┬─────────────┘
                               │
┌─────────────────┐  HTTPS    ▼
│ Mobile / Web App├────────► API Gateway / Middleware
└─────────────────┘           │
                              ▼
                 ┌──────────────────────────┐
                 │       Laravel Core       │
                 │                          │
                 │ Auth     Database API    │
                 │ Billing  Entitlements    │
                 │ Storage  Notifications   │
                 │ Webhooks Audit / Usage   │
                 └──────┬─────────┬─────────┘
                        │         │
                 ┌──────▼───┐ ┌───▼────────────┐
                 │PostgreSQL│ │ Redis / Queue  │
                 └──────────┘ └────────────────┘
                        │
                 ┌──────▼──────────────┐
                 │ S3-compatible Store │
                 └─────────────────────┘
```

### 3.4 Initial deployment

Start with one Laravel application and one Next.js dashboard. PostgreSQL
and Redis may be shared infrastructure, but project data must be
logically isolated. Use queues for slow or retryable work.

Do not introduce microservices, service mesh, Kubernetes, or distributed
transactions in the MVP. Keep module interfaces clean so that later
extraction remains possible.

------------------------------------------------------------------------

## 4. Multi-Tenancy and Resource Hierarchy

### 4.1 Resource hierarchy

``` text
Platform
└── Organization
    ├── Members
    └── Projects
        ├── Environments
        │   ├── Credentials
        │   ├── Module settings
        │   ├── Data resources
        │   ├── Usage records
        │   └── Runtime configuration
        └── Project-level metadata
```

An organization is the ownership and collaboration boundary. A project
represents an application or service. An environment represents an
isolated deployment stage, typically `development`, `staging`, or
`production`.

### 4.2 Tenant isolation requirements

-   Every project-owned record must be associated with a project,
    environment, or another explicitly defined tenant scope.
-   Every request must resolve its project and environment from a
    validated credential or trusted server-side context.
-   Never trust a client-provided `project_id`, `environment_id`,
    `user_id`, or organization identifier without checking
    authorization.
-   Enforce authorization in backend services and policies, not only in
    the dashboard.
-   Use database constraints and scoped query abstractions to reduce
    accidental cross-tenant access.
-   Consider PostgreSQL Row-Level Security (RLS) as defense in depth
    where operationally feasible. If used, set tenant context safely per
    transaction and ensure connection pooling cannot leak context.
-   Add automated tests that attempt cross-project and cross-environment
    access for every sensitive resource type.
-   Platform administrators must use explicit privileged paths and
    produce audit records.

### 4.3 Environments

Each project should support environments with: - Unique environment ID
and slug - Type: development, staging, production, or custom - Status:
active, suspended, archived - Separate credentials - Separate provider
configuration and secrets - Separate quotas and usage accounting -
Environment-specific module settings

Do not copy production secrets into development. Production deletion or
reset must require stronger confirmation and must never be available
through a public client API.

------------------------------------------------------------------------

## 5. Core Domain Model

Use UUIDs (prefer UUIDv7 where supported consistently) for externally
visible identifiers. Internal integer keys may be used if justified, but
never expose sequential IDs as authorization tokens. Use UTC timestamps
in storage and ISO 8601 in APIs.

The following is a logical model, not a mandate to create every table in
the first commit. Add migrations incrementally.

### 5.1 Platform and tenancy tables

#### `organizations`

-   `id`
-   `name`
-   `slug` (unique within platform)
-   `status` (`active`, `suspended`, `deleted`)
-   `created_at`, `updated_at`, `deleted_at`

#### `organization_members`

-   `id`
-   `organization_id`
-   `user_id`
-   `role` (`owner`, `admin`, `developer`, `billing`, `viewer`)
-   `status` (`invited`, `active`, `suspended`)
-   `created_at`, `updated_at`

Unique constraint: `(organization_id, user_id)`.

#### `projects`

-   `id`
-   `organization_id`
-   `name`
-   `slug`
-   `description` nullable
-   `status` (`active`, `suspended`, `archived`)
-   `created_by`
-   `created_at`, `updated_at`, `deleted_at`

Unique constraint: `(organization_id, slug)`.

#### `environments`

-   `id`
-   `project_id`
-   `name`
-   `slug`
-   `type`
-   `status`
-   `created_at`, `updated_at`

Unique constraint: `(project_id, slug)`.

### 5.2 Dashboard identity

Dashboard identities are platform users, not automatically project end
users.

#### `platform_users`

-   `id`
-   `email` nullable
-   `phone` nullable
-   `password_hash` nullable, if password login is enabled
-   `status`
-   `email_verified_at` nullable
-   `phone_verified_at` nullable
-   `created_at`, `updated_at`

Enforce uniqueness for normalized email and phone where present. Support
a verified identity model if multiple login methods are added.

Do not reuse project end-user accounts as dashboard accounts unless an
explicit identity-linking design is implemented.

### 5.3 Credentials

#### `api_credentials`

-   `id`
-   `environment_id`
-   `name`
-   `key_prefix`
-   `secret_hash` or secure verifier
-   `kind` (`publishable`, `server_secret`, `admin`)
-   `scopes` JSONB or normalized permissions
-   `status` (`active`, `revoked`, `expired`)
-   `expires_at` nullable
-   `last_used_at` nullable
-   `created_by`
-   `created_at`, `revoked_at`

Credential secrets must be generated with a cryptographically secure
random generator and shown only once at creation. Store a one-way
verifier where possible. Never log a full secret. Support revocation,
rotation, expiration, and usage tracking.

A publishable key identifies a project/environment; it does **not**
grant access to private data by itself. Server-secret and admin
credentials must never be embedded in mobile or browser applications.
Prefer narrowly scoped server credentials over a universal admin key.

### 5.4 Project end users and authentication

#### `project_users`

-   `id`
-   `project_id`
-   `environment_id`
-   `email` nullable
-   `phone` nullable
-   `password_hash` nullable
-   `display_name` nullable
-   `status` (`active`, `blocked`, `deleted`, `pending`)
-   `email_verified_at` nullable
-   `phone_verified_at` nullable
-   `metadata` JSONB with size and schema limits
-   `created_at`, `updated_at`, `last_sign_in_at`

Identity uniqueness rules must be explicitly defined per project and
environment. Normalize phone numbers to E.164 when applicable. Avoid
collecting fields that the project does not need.

#### `user_identities` (recommended when multiple providers are supported)

-   `id`
-   `project_user_id`
-   `provider`
-   `provider_subject`
-   `created_at`

Unique constraint:
`(provider, provider_subject, project_id, environment_id)` or equivalent
scoped constraint.

#### `user_sessions` / token records

Store only token hashes or use a secure token strategy supported by the
selected framework. Include expiry, revocation, device metadata with
privacy limits, and last-used timestamps. Define refresh-token rotation
and replay detection if refresh tokens are implemented.

### 5.5 Data API metadata

If the platform exposes a managed data API, define explicit resource
metadata rather than exposing arbitrary SQL.

#### `data_tables`

-   `id`
-   `environment_id`
-   `name`
-   `display_name` nullable
-   `schema_definition` JSONB or normalized schema representation
-   `status`
-   `created_at`, `updated_at`

#### `data_policies`

-   `id`
-   `data_table_id`
-   `operation` (`select`, `insert`, `update`, `delete`)
-   `subject` (`anonymous`, `authenticated`, `role`, `service`)
-   `policy_definition`
-   `enabled`
-   `created_at`, `updated_at`

The exact schema strategy must be chosen before implementing a generic
database API. Do not accept raw SQL from public clients. Validate
columns, types, filters, ordering, pagination, payload sizes, and
allowed operations. Parameterize all queries.

### 5.6 Billing and subscriptions

#### `billing_providers`

-   `id`
-   `environment_id`
-   `provider` (`cafebazaar`, `myket`, other supported gateway)
-   `display_name`
-   `status`
-   `configuration_encrypted` (never return secrets to clients)
-   `created_at`, `updated_at`

#### `products`

-   `id`
-   `project_id`
-   `code` (stable machine identifier)
-   `name`
-   `description` nullable
-   `status`
-   `created_at`, `updated_at`

#### `plans`

-   `id`
-   `product_id`
-   `code`
-   `name`
-   `billing_period_unit` (`day`, `week`, `month`, `year`, or supported
    fixed duration)
-   `billing_period_count`
-   `price` integer in smallest currency unit
-   `currency`
-   `status`
-   `features` JSONB or normalized entitlements
-   `created_at`, `updated_at`

For the initial use case, support monthly, three-month, and annual
plans. Do not assume that every store supports the same
recurring-subscription behavior. Distinguish prepaid, non-renewing
subscriptions from automatically renewing subscriptions.

#### `provider_products`

-   `id`
-   `plan_id`
-   `provider`
-   `store_product_id`
-   `environment_id`
-   `status`

A plan may map to different product identifiers for different stores and
environments.

#### `purchases`

-   `id`
-   `project_id`
-   `environment_id`
-   `project_user_id`
-   `provider`
-   `provider_transaction_id` nullable
-   `provider_purchase_token` encrypted or otherwise protected
-   `provider_product_id`
-   `plan_id`
-   `status` (`pending`, `verified`, `rejected`, `refunded`, `revoked`,
    `expired`)
-   `amount` nullable
-   `currency` nullable
-   `purchased_at` nullable
-   `verified_at` nullable
-   `raw_provider_payload` minimized and encrypted/redacted where
    retention is justified
-   `created_at`, `updated_at`

Use provider transaction/token uniqueness constraints where provider
semantics permit. Never store payment card details.

#### `subscriptions`

-   `id`
-   `project_id`
-   `environment_id`
-   `project_user_id`
-   `plan_id`
-   `provider`
-   `status` (`pending`, `trialing`, `active`, `grace_period`,
    `past_due`, `canceled`, `expired`, `revoked`)
-   `current_period_start`
-   `current_period_end`
-   `cancel_at_period_end` boolean
-   `provider_subscription_id` nullable
-   `created_at`, `updated_at`

Define whether multiple concurrent subscriptions are allowed. For a
simple entitlement model, resolve conflicts deterministically and
document precedence.

#### `entitlements`

-   `id`
-   `project_id`
-   `code`
-   `name`
-   `description` nullable
-   `value_type` (`boolean`, `integer`, `string`, `json`)
-   `created_at`, `updated_at`

#### `plan_entitlements`

-   `plan_id`
-   `entitlement_id`
-   `value` JSONB

#### `subscription_events`

-   `id`
-   `subscription_id`
-   `event_type`
-   `source`
-   `idempotency_key` nullable
-   `payload_redacted` JSONB
-   `occurred_at`
-   `processed_at` nullable
-   `created_at`

Events should be append-only where possible. Corrections should be
represented as new events rather than silently rewriting history.

### 5.7 Audit and usage

#### `audit_logs`

-   `id`
-   `organization_id` nullable
-   `project_id` nullable
-   `environment_id` nullable
-   `actor_type`
-   `actor_id` nullable
-   `action`
-   `resource_type`
-   `resource_id` nullable
-   `ip_address` nullable, subject to retention policy
-   `user_agent` nullable, length-limited
-   `metadata_redacted` JSONB
-   `created_at`

Never include passwords, access tokens, API secrets, OTPs, or sensitive
health data in audit metadata.

#### `usage_events`

-   `id`
-   `project_id`
-   `environment_id`
-   `metric`
-   `quantity`
-   `unit`
-   `source`
-   `idempotency_key` nullable
-   `occurred_at`
-   `created_at`

Usage aggregation can be asynchronous. Define quota semantics (hard
limit, soft warning, or overage) before enforcing them.

------------------------------------------------------------------------

## 6. Authentication and Authorization

### 6.1 Separate identity domains

The platform has at least two identity domains: 1. **Platform users:**
people who manage organizations and projects in the dashboard. 2.
**Project users:** end users of applications built on the BaaS.

These domains must have separate authorization policies and, preferably,
separate token audiences. A project end-user token must never authorize
control-plane operations.

### 6.2 Organization roles

Initial role model: - `owner`: full organization control, including
ownership-sensitive operations. - `admin`: manage projects and members,
except ownership transfer or platform-level operations. - `developer`:
manage permitted project configuration and inspect development
resources. - `billing`: access billing and invoices, not application
user data by default. - `viewer`: read-only access to explicitly
permitted resources.

Use policies/permissions for sensitive operations rather than relying
only on role names. Support project-level membership overrides later if
required.

### 6.3 Project authorization

-   Publishable credentials may initialize SDKs and identify the
    project.
-   User access tokens represent an authenticated project user.
-   Server credentials represent trusted backend services and must be
    scope-limited.
-   Admin credentials are high risk and must be restricted to trusted
    server-side use.
-   Every data operation must evaluate both the credential and the
    relevant row/resource policy.
-   Default to deny when no policy matches.
-   Never allow a client to set another user's owner ID or change
    protected system fields.

### 6.4 Authentication features

MVP: - Email/password or phone OTP, based on the first consuming
application's needs. - Secure login and logout. - Access-token expiry. -
Session revocation. - Email/phone verification if that method is
enabled. - Rate limits for login, OTP, password reset, and verification
endpoints.

Later: - OAuth/OIDC providers. - Passkeys. - MFA. - Enterprise SSO.

OTP requirements: - Store OTPs as hashes where feasible. - Short
expiration. - Attempt limits and resend cooldowns. - Rate-limit by
account, IP, and destination. - Never log OTP values. - Avoid account
enumeration in public responses.

------------------------------------------------------------------------

## 7. Public API Design

All APIs must be versioned and documented. Initial base path:

``` text
/api/v1
```

Use consistent JSON response envelopes only if they improve clarity; do
not wrap successful responses inconsistently across modules.

### 7.1 Conventions

-   HTTPS only outside local development.
-   JSON request/response bodies.
-   ISO 8601 UTC timestamps.
-   Stable machine-readable error codes.
-   Pagination for list endpoints.
-   Request size limits.
-   Rate limits by credential, user, IP, and route as appropriate.
-   Idempotency keys for purchase verification, payment initiation, and
    other retry-sensitive operations.
-   Explicit API compatibility and deprecation policy.
-   Do not expose internal exception messages or stack traces.

Example error:

``` json
{
  "error": {
    "code": "SUBSCRIPTION_NOT_ACTIVE",
    "message": "The subscription is not active.",
    "request_id": "req_..."
  }
}
```

### 7.2 Control-plane endpoints (initial proposal)

``` text
POST   /api/v1/organizations
GET    /api/v1/organizations
GET    /api/v1/organizations/{organizationId}
PATCH  /api/v1/organizations/{organizationId}

POST   /api/v1/organizations/{organizationId}/projects
GET    /api/v1/organizations/{organizationId}/projects
GET    /api/v1/projects/{projectId}
PATCH  /api/v1/projects/{projectId}
POST   /api/v1/projects/{projectId}/archive

POST   /api/v1/projects/{projectId}/environments
GET    /api/v1/projects/{projectId}/environments
PATCH  /api/v1/environments/{environmentId}

POST   /api/v1/environments/{environmentId}/credentials
GET    /api/v1/environments/{environmentId}/credentials
POST   /api/v1/credentials/{credentialId}/revoke
POST   /api/v1/credentials/{credentialId}/rotate

GET    /api/v1/projects/{projectId}/usage
GET    /api/v1/projects/{projectId}/audit-logs
```

All control-plane routes require a platform session/token and
organization/project authorization. Never authorize based solely on
possession of an ID.

### 7.3 Project authentication endpoints (initial proposal)

``` text
POST   /api/v1/auth/signup
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh
GET    /api/v1/auth/me
POST   /api/v1/auth/verify
POST   /api/v1/auth/password/forgot
POST   /api/v1/auth/password/reset
```

Exact routes may vary by enabled login method. Every endpoint must
resolve the project/environment context from validated request
credentials and must not accept an arbitrary tenant override.

### 7.4 Data API (initial proposal)

``` text
GET    /api/v1/data/{table}
POST   /api/v1/data/{table}
GET    /api/v1/data/{table}/{recordId}
PATCH  /api/v1/data/{table}/{recordId}
DELETE /api/v1/data/{table}/{recordId}
```

This API is only safe after schema validation and row-level
authorization are implemented. It must not be exposed as an unrestricted
ORM or SQL proxy.

### 7.5 Billing endpoints (initial proposal)

``` text
GET    /api/v1/billing/products
GET    /api/v1/billing/plans
POST   /api/v1/billing/purchases/verify
GET    /api/v1/billing/purchases
GET    /api/v1/billing/subscriptions
GET    /api/v1/billing/subscriptions/{subscriptionId}
GET    /api/v1/billing/entitlements
POST   /api/v1/billing/webhooks/{provider}
```

Provider webhooks must use provider-supported signature/authentication
validation where available. If a store does not offer webhooks or
recurring-subscription callbacks, implement scheduled reconciliation and
document its limitations.

### 7.6 API documentation

Maintain OpenAPI definitions for public endpoints. Every endpoint must
specify: - Authentication requirements - Required scopes/roles -
Project/environment context - Request schema and validation - Response
schema - Error codes - Rate-limit behavior - Idempotency behavior, where
relevant

------------------------------------------------------------------------

## 8. Billing, Store Payments, and Subscription Lifecycle

### 8.1 Provider adapter architecture

Define a common provider interface, for example:

``` php
interface BillingProvider
{
    public function verifyPurchase(VerifyPurchaseData $data): VerificationResult;

    public function getPurchaseStatus(PurchaseReference $reference): PurchaseStatus;

    public function supportsRecurringSubscriptions(): bool;
}
```

The interface is illustrative. Align method signatures with Laravel
conventions and the actual provider capabilities.

Implement provider-specific adapters: - Cafe Bazaar adapter - Myket
adapter - Additional payment gateway adapters later

Do not assume identical behavior across providers. Maintain a capability
matrix in documentation, based on current official provider
documentation and verified integration tests.

### 8.2 Purchase verification

A purchase must not become active merely because the mobile client says
it succeeded.

Recommended flow: 1. Client initiates purchase using the official store
SDK. 2. Client sends the purchase token/receipt and selected product
context to the BaaS. 3. Backend authenticates the user and validates
project/environment/product mapping. 4. Provider adapter verifies the
purchase with the store using server-side credentials, where supported.
5. Backend validates product ID, transaction identity, state, and
applicable timestamps. 6. Backend applies an idempotent state transition
and records an audit/event entry. 7. Backend grants or updates
entitlements. 8. Client receives the verified result.

If server-side verification is unavailable for a provider, document the
weaker assurance and do not silently treat client data as equivalent.

### 8.3 Subscription states

Use explicit state transitions. A suggested lifecycle:

``` text
pending ──verified──► active
active ──period ended──► expired
active ──cancel requested──► canceled or active-until-period-end
active ──refund/revoke──► revoked
active ──provider failure──► past_due (only if applicable)
past_due ──payment recovered──► active
```

Do not force a recurring lifecycle onto non-renewing products. A prepaid
plan can simply grant an entitlement until a fixed expiry.

### 8.4 Renewal semantics

-   Store a canonical `current_period_end` in UTC.
-   Calculate duration according to a documented calendar rule. A month
    is not always 30 days; define behavior for month-end dates and leap
    years.
-   For a new purchase while an active subscription exists, define
    whether the duration is added to the current expiry or starts
    immediately. Make the rule configurable per product only if there is
    a real requirement.
-   Repeated verification requests must not extend the subscription more
    than once.
-   Refunds, chargebacks, revocations, cancellations, grace periods, and
    delayed store notifications need explicit policies.
-   Scheduled reconciliation should detect expired or stale provider
    states.
-   Use database transactions and unique idempotency constraints for
    state changes.
-   Keep an append-only event trail for important billing changes.

### 8.5 Store capability verification

Before implementing automatic renewal, verify each store's current
official documentation for: - Whether the product type supports
recurring billing. - Supported billing periods. - Purchase verification
endpoint and authentication. - Purchase token/receipt semantics. -
Cancellation, refund, and revocation behavior. - Server
notifications/webhooks, if any. - Test environment and sandbox
behavior. - Store policy requirements for digital goods.

Do not invent provider endpoints, signatures, product types, or SDK
behavior. Record source URLs and the date checked in
`docs/architecture/billing-provider-matrix.md`.

------------------------------------------------------------------------

## 9. Dashboard Requirements

The dashboard is the primary control-plane interface.

### 9.1 Main navigation

Suggested navigation: - Overview - Organizations - Projects - Usage -
Billing (platform billing, if applicable) - Team and access - Audit
logs - Settings

Inside a project: - Overview - Users - Authentication - Database -
Billing & subscriptions - Storage - Notifications - API keys - Logs -
Usage - Settings

Show a module only when it is enabled or provide a clear activation
state. Do not display non-functional controls.

### 9.2 Project overview

Display: - Project name, ID, status - Current environment selector -
Enabled modules - API request volume - Active users, if available -
Storage usage - Recent errors - Recent audit activity

Use honest empty states. Do not fabricate usage metrics or imply a
feature is live before it is implemented.

### 9.3 User management

Authorized users should be able to: - Search and filter project users. -
View non-sensitive profile fields. - Inspect account status and
verification state. - Block/unblock a user, subject to permission. -
Revoke sessions. - View relevant subscription status.

Do not expose passwords, raw tokens, OTPs, provider secrets, or
sensitive data by default. Any access to sensitive user records should
be permission-gated and audited.

### 9.4 Subscription management

Authorized billing users should be able to: - View plans and provider
product mappings. - View purchases and subscription history. - Filter by
status, date, user, and provider. - Inspect verification and
reconciliation events. - Apply only explicitly supported administrative
corrections. - See why an entitlement is active or inactive.

Manual grants or corrections must include an actor, reason, expiration
(where relevant), and audit record. Avoid silent edits to payment
history.

### 9.5 API key management

-   Create a named key with selected type/scopes.
-   Show the secret only once.
-   Copy key action must be explicit.
-   Revoke and rotate keys.
-   Display prefix, creation time, last use, expiry, and status.
-   Never show stored secrets again.
-   Warn when a secret key is being created and clearly label it as
    server-only.

### 9.6 UX requirements

-   Responsive layout for desktop and tablet.
-   Accessible controls and clear form validation.
-   Confirm destructive actions.
-   Distinguish loading, empty, success, and error states.
-   Avoid leaking data through browser logs or client-side error
    messages.
-   Protect dashboard routes server-side; hiding navigation items is not
    authorization.

------------------------------------------------------------------------

## 10. Security Requirements

Security is a release blocker, not a future enhancement.

### 10.1 Secrets and cryptography

-   Use a cryptographically secure random generator for API keys,
    session tokens, and idempotency identifiers.
-   Store password hashes using a modern password hashing algorithm
    supported by the framework.
-   Store provider credentials encrypted at rest using a managed or
    carefully protected application key.
-   Keep encryption keys and application secrets outside source control.
-   Support secret rotation and document recovery procedures.
-   Never log credentials, tokens, OTPs, full purchase tokens, or
    sensitive payloads.
-   Use constant-time comparisons where applicable.

### 10.2 Authorization

-   Default deny.
-   Enforce tenant scoping on every query and service operation.
-   Check permissions on the server for every control-plane mutation.
-   Apply row-level policies to project data.
-   Separate dashboard tokens, project user tokens, and service
    credentials.
-   Use least-privilege scopes.
-   Revoke sessions and credentials promptly.

### 10.3 Application security

-   Validate all input at API boundaries.
-   Use parameterized database operations.
-   Prevent mass assignment of protected fields.
-   Apply CSRF protections to cookie-authenticated dashboard flows.
-   Configure secure, HttpOnly, SameSite cookies where cookies are used.
-   Apply CORS allowlists; never treat CORS as authorization.
-   Rate-limit authentication, billing, and resource-intensive
    endpoints.
-   Limit request sizes, upload sizes, pagination sizes, and metadata
    depth.
-   Protect against SSRF in any feature that fetches user-supplied URLs.
-   Use secure file upload validation and private buckets by default.
-   Avoid returning internal exception details.

### 10.4 Audit and privacy

-   Audit project creation, key creation/revocation, role changes, data
    exports, billing changes, and administrative user actions.
-   Define retention periods for audit and usage data.
-   Minimize personal data and provider payload retention.
-   Provide data export/deletion workflows where legally and
    operationally required.
-   Treat clinical, financial, and other sensitive application data as
    high risk. The BaaS must not assume all project data is safe for
    unrestricted dashboard viewing.

### 10.5 Security test cases

At minimum, test: - Project A credential cannot read or mutate Project B
resources. - Development credentials cannot access production
resources. - A project user cannot call control-plane endpoints. - A
publishable key alone cannot read private records. - Revoked credentials
stop working. - Expired tokens cannot be refreshed or reused outside
policy. - Replaying a purchase verification request does not duplicate
entitlement. - A forged client purchase result does not grant access. -
Unauthorized dashboard members cannot inspect or modify restricted
resources. - Upload and query limits are enforced.

------------------------------------------------------------------------

## 11. Reliability, Queues, and Idempotency

Use queues for operations that are slow, retryable, or not required to
complete within the client request: - Email/SMS/push delivery - Provider
reconciliation - Webhook delivery - Usage aggregation - Large exports -
Cleanup and retention jobs

Requirements: - Jobs must be idempotent or have explicit
deduplication. - Configure bounded retries and backoff. - Route
permanently failing jobs to a failed-job store and expose operational
visibility. - Use transactional outbox patterns for events that must not
be lost between a database commit and queue publication. - Avoid holding
database transactions open during external network calls. - Use timeouts
for all external providers. - Protect against duplicate webhook
delivery. - Provide a safe replay mechanism for eligible failed events.

Redis is a suitable initial queue/cache backend. Keep queue-specific
logic behind Laravel abstractions.

------------------------------------------------------------------------

## 12. Storage Design

Use an S3-compatible interface for object storage so the platform can
change vendors without rewriting application logic.

Requirements: - Each object belongs to a project and environment. -
Object keys must not be accepted as proof of authorization. - Private
storage is the default. - Generate short-lived signed URLs only after
authorization. - Enforce maximum file size and allowed content types. -
Do not trust file extensions or client MIME types alone. - Store
metadata and object references in PostgreSQL; keep file bytes in object
storage. - Define deletion behavior, orphan cleanup, and retention
policies. - Avoid exposing internal bucket names or credentials to
clients.

For local development, use a compatible local object-storage service if
available; otherwise use a clearly isolated local adapter.

------------------------------------------------------------------------

## 13. Notifications and Webhooks

### 13.1 Notifications

Use provider interfaces for: - SMS - Email - Push notifications

Project configuration should reference a provider and a secure
credential record. Support platform-managed credentials and, where
appropriate, customer-provided credentials. Never return provider
secrets to the dashboard after saving.

Notification records should include: - Project/environment - Channel and
provider - Template or message identifier - Recipient reference
(minimize raw personal data) - Status - Attempt count - Provider message
ID where available - Created/sent/failed timestamps - Redacted failure
reason

### 13.2 Webhooks

Outbound webhooks: - Per-project endpoint and event subscriptions -
Signing secret with rotation - Timestamp and signature headers - Retry
policy with backoff - Delivery history and manual replay - SSRF
protection and destination validation

Inbound provider webhooks: - Provider-specific authentication/signature
verification - Replay protection - Idempotent processing - Minimal raw
payload retention - Event processing status and observability

Do not assume every payment store offers server-side webhook events.

------------------------------------------------------------------------

## 14. Observability and Operations

### 14.1 Logging

Use structured JSON logs with: - Timestamp - Severity - Service/module -
Request ID - Project/environment IDs where safe - Error code -
Duration - Redacted context

Never log secrets, passwords, OTPs, access tokens, full payment tokens,
or sensitive application payloads.

### 14.2 Metrics

Initial metrics: - Request count, latency, and error rate - Queue depth
and job failures - Database connection and query health - Cache health -
Storage operations and bytes - Authentication failures and rate-limit
events - Billing verification outcomes - Provider latency and failures

Metrics must be filterable by project/environment only for authorized
operators. Prevent high-cardinality labels from overwhelming the metrics
system.

### 14.3 Health checks

Provide separate endpoints or checks for: - Liveness: process is
running. - Readiness: required dependencies are available. - Dependency
health: database, Redis, and storage.

Do not expose detailed infrastructure information through public health
endpoints.

### 14.4 Backups and recovery

-   Schedule PostgreSQL backups and verify restoration periodically.
-   Define recovery point objective (RPO) and recovery time objective
    (RTO) before production launch.
-   Back up required configuration and document key recovery separately.
-   Do not assume object storage durability removes the need for
    lifecycle and recovery planning.
-   Test restore procedures in an isolated environment.
-   Document incident response and credential rotation.

------------------------------------------------------------------------

## 15. Performance and Scaling

Initial priorities: - Correctness and tenant isolation before
optimization. - Database indexes for tenant-scoped lookups and common
filters. - Pagination for all potentially large collections. - Cache
only data with clear invalidation semantics. - Use background jobs for
slow tasks. - Avoid N+1 queries. - Set timeouts and resource limits. -
Measure before introducing complexity.

Potential scaling path: 1. Single deployment with modular Laravel app.
2. Separate queue workers and scheduler from web processes. 3. Add
database connection and query optimization. 4. Move storage to dedicated
S3-compatible infrastructure. 5. Add read replicas or partitioning only
when metrics justify them. 6. Separate high-load modules into services
only when operational and scaling needs justify the cost.

Do not promise a fixed number of supported projects or users without
load tests and explicit workload assumptions.

------------------------------------------------------------------------

## 16. Configuration and Environment Management

Use environment variables for deployment-level secrets and settings.
Project-level configuration belongs in database records, with secret
values encrypted.

Required configuration categories: - Application URL and environment -
Database and Redis - Queue - Object storage - Token/session settings -
Encryption keys - Provider credentials - Rate limits - Logging and
observability - Feature flags

Provide `.env.example` with placeholders only. Never commit real
credentials. Validate required configuration at startup and fail clearly
when critical settings are missing.

------------------------------------------------------------------------

## 17. Testing Strategy

### 17.1 Backend

-   Unit tests for domain services and state transitions.
-   Feature tests for API endpoints and policies.
-   Integration tests for database transactions, queues, and provider
    adapters.
-   Contract tests for provider adapters using recorded, sanitized
    fixtures.
-   Security tests for cross-tenant isolation and credential boundaries.
-   Migration tests for fresh installs and supported upgrades.

### 17.2 Frontend

-   Component tests for critical forms and state.
-   End-to-end tests for login, organization/project creation,
    environment selection, credential lifecycle, and billing
    administration.
-   Accessibility checks for core workflows.
-   Verify that protected pages cannot be accessed without server-side
    authorization.

### 17.3 Billing tests

Include: - Valid purchase - Invalid product mapping - Invalid or expired
purchase token - Duplicate verification - Refund/revocation -
Expiration - Out-of-order provider events - Provider timeout and retry -
User account mismatch - Environment mismatch

Use provider sandbox/test environments where available. Never test real
payment flows with production credentials during automated CI.

### 17.4 Quality gates

Before a phase is considered complete: - Formatter and linter pass. -
Static analysis passes at the configured level. - Relevant automated
tests pass. - Migrations work from an empty database. - OpenAPI docs
match implemented endpoints. - Security acceptance criteria pass. - No
secrets are present in the repository. - Manual acceptance checklist is
completed for user-facing workflows.

------------------------------------------------------------------------

## 18. Development Workflow for Cursor and AI Agents

This section is mandatory guidance for coding agents.

### 18.1 First actions

Before writing implementation code: 1. Inspect the entire repository
structure and existing code. 2. Identify existing conventions,
dependencies, tests, and deployment assumptions. 3. Report conflicts
between the repository and this specification. 4. Create or update a
concise implementation plan. 5. Identify any missing product decisions
that block safe implementation. 6. Do not overwrite existing working
code without explaining why.

### 18.2 Implementation rules

-   Implement one coherent phase or vertical slice at a time.
-   Do not generate the entire platform in one large unreviewable
    change.
-   Prefer small, testable commits/changes.
-   Follow existing code style.
-   Keep controllers thin; put business rules in application/domain
    services.
-   Use Form Requests or equivalent validation at API boundaries.
-   Use policies/gates for authorization.
-   Use database transactions for multi-record state changes.
-   Use explicit DTOs/value objects where they improve clarity.
-   Avoid premature abstraction, but use provider interfaces for
    external integrations.
-   Do not add dependencies without a clear need.
-   Never invent undocumented third-party API endpoints.
-   If official provider behavior is uncertain, add a documented adapter
    boundary and mark the integration as blocked rather than faking
    success.
-   Do not use placeholder implementations that return success for
    security-sensitive or billing operations.
-   Keep generated documentation in sync with code.
-   Add tests with each feature, not at the end.

### 18.3 Required completion report

At the end of each implementation task, report: - What was implemented -
Files and modules changed - Database migrations added - API endpoints
added/changed - Tests run and results - Security implications - Known
limitations - Next recommended task

Do not claim a task is complete if tests were not run or acceptance
criteria remain unmet.

------------------------------------------------------------------------

## 19. Phased Roadmap and Acceptance Criteria

### Phase 0 --- Repository and architecture foundation

**Deliverables** - Repository assessment - Finalized application
layout - Architecture decision records for major choices - Local
development setup - CI baseline - Initial threat model

**Acceptance** - A developer can run the documented local setup. - CI
runs formatting, static analysis, and tests. - Secrets are excluded from
version control. - The initial architecture and data isolation approach
are documented.

### Phase 1 --- Platform core and tenancy

**Deliverables** - Platform authentication - Organizations and
memberships - Project CRUD - Environment CRUD - Role/policy
enforcement - Audit logging - API credential creation, display-once,
revocation, and rotation

**Acceptance** - Authorized users can create an organization, project,
and environment. - Users cannot access organizations they do not belong
to. - Credentials are shown only once and cannot be retrieved in
plaintext later. - Revoked credentials are rejected. - Cross-tenant
security tests pass.

### Phase 2 --- Project authentication

**Deliverables** - Project-user model - Initial login method selected
for first consumer - Signup/login/logout - Token/session expiry and
revocation - User management dashboard - Rate limiting

**Acceptance** - A consuming application can register and authenticate
users. - Project users cannot access platform control-plane APIs. -
Authentication endpoints enforce limits and do not expose secrets. -
Session revocation takes effect as documented.

### Phase 3 --- Data API

**Deliverables** - Explicit schema model - Table/collection management -
CRUD APIs - Validation and pagination - Authorization policies -
Dashboard data explorer (read-only initially, if safer)

**Acceptance** - Only declared schemas and permitted operations are
available. - Cross-project and row-level access tests pass. - Invalid
queries and oversized payloads are rejected. - No arbitrary SQL is
exposed to public clients.

### Phase 4 --- Billing and subscriptions

**Deliverables** - Products and plans - Provider product mapping -
Provider adapter contract - First verified store integration - Purchase
verification and idempotency - Subscription lifecycle - Entitlements API
and dashboard - Reconciliation jobs

**Acceptance** - A valid verified purchase grants the expected
entitlement exactly once. - A forged or mismatched purchase is
rejected. - Duplicate requests do not extend a subscription twice. -
Expiry and refund/revocation behavior is tested. - Store capabilities
and limitations are documented from official sources. - Unsupported
automatic renewal is not represented as supported.

### Phase 5 --- Storage and notifications

**Status:** Deferred to a later release (see
`docs/architecture/phase-5-deferred.md`). Resume when object storage is
provisioned and in-platform notifications are required beyond the
external notification service / auth OTP path.

**Deliverables** - S3-compatible storage adapter - Upload/download
APIs - Private object authorization - SMS/email provider interfaces -
Queue-based delivery and logs

**Acceptance** - Unauthorized users cannot access private objects. -
Upload limits and content checks are enforced. - Provider failures are
observable and retried safely. - Secrets are never returned to clients.

### Phase 6 --- SDKs, usage, and production hardening

**Deliverables** - JavaScript SDK - Android SDK - iOS SDK - Usage
aggregation and quotas - Backup/restore runbook - Monitoring and
alerting - Production deployment guide

**Acceptance** - SDKs use documented public APIs and do not contain
server secrets. - Usage metrics are consistent with defined counting
rules. - Backup restoration is tested. - Production readiness checklist
is complete.

------------------------------------------------------------------------

## 20. Initial MVP Scope

The first usable MVP should be deliberately narrow:

1.  Platform dashboard login.
2.  Organization and project management.
3.  Development and production environments.
4.  API key lifecycle.
5.  Project user authentication for the first real application.
6.  A minimal, secure data API only if the first consumer needs it.
7.  Billing/subscription support for the first confirmed store flow.
8.  Audit logs for sensitive operations.
9.  Automated tests and a reproducible deployment.

Do not block the first release on SDKs, advanced analytics, arbitrary
schema builders, multi-region infrastructure, or every notification
provider.

If the first consumer only needs subscription state and user identity,
implement those well before building a generalized database engine.

------------------------------------------------------------------------

## 21. Open Decisions

The following decisions must be resolved when relevant. Agents must not
silently invent answers.

  -----------------------------------------------------------------------
  Decision                Default direction       When to resolve
  ----------------------- ----------------------- -----------------------
  First consuming         Select the actual app   Before Phase 2
  application             and its requirements    

  Login method            Email/password or phone Before Phase 2
                          OTP based on first app  

  Data storage model      Shared PostgreSQL with  Before Phase 3
                          strict tenant isolation 
                          initially               

  Generic schema engine   Explicit schema and     Before Phase 3
                          validated API; no raw   
                          SQL                     

  Store subscription      Verify current official Before Phase 4
  capabilities            Bazaar/Myket docs       

  Renewal semantics       Separate non-renewing   Before Phase 4
                          and auto-renewing       
                          models                  

  Currency representation Integer minor units     Before Phase 4
                          plus ISO currency code  

  Storage provider        S3-compatible adapter   Before Phase 5

  SMS/email providers     Adapter-based, select   Before Phase 5
                          based on first app      

  Commercial pricing      Defer until costs and   Before public launch
                          usage metrics are known 

  Data residency and      Document according to   Before production
  retention               target markets and data 
                          sensitivity             
  -----------------------------------------------------------------------

Create an Architecture Decision Record (ADR) for choices that materially
affect data, security, APIs, or operations. Each ADR should include
context, options, decision, consequences, and date.

------------------------------------------------------------------------

## 22. Definition of Done

A feature is done only when: - Requirements and edge cases are
understood. - Authorization and tenant scoping are implemented. -
Validation and error handling are present. - Relevant tests pass. -
Migrations and rollback implications are reviewed. - API documentation
is updated. - Logs and audit events are appropriate. - Secrets and
sensitive data are protected. - User-facing states are implemented, not
merely mocked. - Deployment/configuration requirements are documented. -
Known limitations are clearly stated.

------------------------------------------------------------------------

## 23. Final Instruction to Cursor

Treat this README as the architectural baseline for Atrina BaaS. Start
by inspecting the repository and producing a phased implementation plan.
Then implement only the next approved phase or vertical slice.

Prioritize a secure, working foundation over breadth. Do not fabricate
integrations, skip authorization, expose arbitrary database access, or
mark untested features complete. When a requirement is ambiguous,
identify the ambiguity and propose options before implementing a
potentially unsafe or irreversible behavior.

The objective is a maintainable BaaS that Atrina can use internally
first and potentially offer to external developers later---not a large
collection of disconnected endpoints.
