# ADR-007: Prepaid subscription model for MVP billing

- **Status:** Accepted
- **Date:** 2026-10-03
- **Phase:** 4

## Context

Cafe Bazaar and Myket both support server-side purchase verification. Auto-renew semantics differ by product type and are easy to misrepresent.

## Decision

1. Treat initial subscription plans as **prepaid, non-renewing entitlements** with explicit periods (`month`, `3 months`, `year`).
2. Activate access only after server-side provider verification succeeds.
3. Idempotency key = `(environment_id, provider, provider_transaction_or_token_hash)`.
4. Stacking rule: a **new** verified purchase extends from `max(now, current_period_end)`.
5. Do not claim automatic renewal in APIs/UI until a provider-specific recurring path is verified and documented.

## Consequences

- Safer MVP, honest capability matrix
- Reconciliation job expires local subscriptions and can re-check provider state when credentials exist
- Later recurring support can be added behind the same `BillingProvider` interface
