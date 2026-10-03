# Phase 4 completion report

- **Date:** 2026-10-03
- **Status:** Implemented

## What was implemented

- Prepaid, non-renewing products/plans with store SKU mappings
- Cafe Bazaar + Myket verify adapters + Fake provider for tests
- Data-plane verify / purchases / subscriptions / entitlements APIs
- Control-plane catalog, provider credentials, purchase & subscription lists
- Token-hash idempotency (duplicate verify does not double-extend)
- Hourly `billing:reconcile-subscriptions` (expiry + refund re-check)
- Dashboard `/projects/[id]/billing`
- ADR-007 and `billing-provider-matrix.md`

## Renewal model

Plans expose `renewal_mode: prepaid_non_renewing`. New distinct purchase tokens stack from `max(now, current_period_end)`. Automatic renewal is not advertised.

## Security

- Store access tokens encrypted; never returned after save
- Fake provider disabled outside `local` / `testing`
- Purchase tokens stored encrypted; only hashes used for uniqueness
- Billing roles enforced on control-plane routes

## Tests

`PurchaseVerificationTest` covers grant-once, forge reject, SKU mismatch, expiry, and refund revocation.

## Next

Phase 5 deferred (`phase-5-deferred.md`). Phase 6 — SDKs, usage, production hardening.
