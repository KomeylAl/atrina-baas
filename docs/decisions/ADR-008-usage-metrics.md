# ADR-008: Usage metrics and quota semantics

- **Status:** Accepted
- **Date:** 2026-10-03
- **Phase:** 6

## Context

Phase 6 requires usage aggregation and quotas. Metrics must be honest and countable without inventing analytics the platform cannot observe.

## Decision

### Metrics (v1)

| Metric | Unit | When recorded |
|--------|------|---------------|
| `api_requests` | count | Each data-plane request that resolved a project credential |
| `data_reads` | count | Successful `GET /data/{table}` list or show |
| `data_writes` | count | Successful `POST` / `PATCH` / `DELETE` on `/data/{table}` |
| `auth_signins` | count | Successful project-auth signup, login, OTP verify, or Google |
| `billing_verifications` | count | Successful purchase verify responses (`201` or idempotent `200`) |

Events are append-only in `usage_events` with optional `idempotency_key` uniqueness per environment.

### Aggregation

Control-plane `GET /projects/{id}/usage` aggregates quantities for a requested window (default last 30 days), grouped by `metric` and optionally `environment_id`.

### Quotas

Per-environment rows in `environment_quotas`:

- **soft_limit** — exceeded → response header `X-Atrina-Quota-Warning: {metric}` and audit-friendly flag; request still succeeds
- **hard_limit** — exceeded → `429` with a stable error code; request rejected
- Window: rolling duration in seconds (`window_seconds`, default 2_592_000 = 30 days)

Unset limits mean “no enforcement” for that metric.

## Consequences

- SDKs and the dashboard can show real totals without fabricating charts
- Hard limits are opt-in; defaults ship without blocking tenants
- Storage/notification metrics wait until Phase 5 resumes
