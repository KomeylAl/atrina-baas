# Atrina BaaS — Billing Provider Capability Matrix

**Last verified:** 2026-10-12
**Status:** Mock adapters active — replace with real adapters before production.

This document tracks the actual capabilities of each billing provider we
integrate with. Per README §8.5, we MUST verify each store's current official
documentation before implementing automatic renewal, and document the source
URLs and date checked.

---

## CafeBazaar

| Capability | Status | Notes |
|---|---|---|
| Recurring subscriptions | ✅ Supported | Via subscription API; product type "subscription" |
| Billing periods | monthly, yearly | Per CafeBazaar IAB v3 docs |
| Server-side purchase verification | ✅ Supported | `/api/v1/verify/` endpoint with access token |
| Server-side subscription status | ✅ Supported | `/api/v1/subscribe/` endpoint |
| Outbound webhooks | ❌ Not supported | Implement scheduled reconciliation (see README §8.5) |
| Refund notifications | ❌ Not supported | Poll subscription status |
| Test environment | Sandbox app | Requires separate developer account |
| Store policy | Digital goods only | Subscription duration capped at 1 year |

**Source URLs:**
- Main docs: https://developers.cafebazaar.ir/docs/
- IAB v3 (subscription): https://developers.cafebazaar.ir/docs/subscription/
- Verification API: https://developers.cafebazaar.ir/docs/verify/

**Verification snippet (mock → real):**
```typescript
// Current mock implementation in src/lib/billing/providers.ts:
async verifyPurchase(input: VerifyPurchaseInput): Promise<VerifyPurchaseResult> {
  // REPLACE THIS WITH REAL HTTP CALL:
  const res = await fetch(`${process.env.CAFEBAZAAR_API_BASE}/verify/`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-cafebazaar-token": process.env.CAFEBAZAAR_ACCESS_TOKEN!,
    },
    body: JSON.stringify({
      package_name: process.env.CAFEBAZAAR_PACKAGE_NAME,
      product_id: input.storeProductId,
      purchase_token: input.purchaseToken,
    }),
  });
  // ... handle response
}
```

**Renewal strategy:** Since webhooks are not supported, run a scheduled job
(every 12 hours) that polls `getSubscriptionStatus` for all active
subscriptions and updates their state.

---

## Myket

| Capability | Status | Notes |
|---|---|---|
| Recurring subscriptions | ✅ Supported | |
| Billing periods | monthly, yearly | |
| Server-side purchase verification | ✅ Supported | Requires developer access token |
| Server-side subscription status | ✅ Supported | |
| Outbound webhooks | ✅ Supported | Signed with `X-Signature` header |
| Refund notifications | ✅ Supported | Via webhook |
| Test environment | Sandbox | |
| Store policy | Digital goods only | |

**Source URLs:**
- Main docs: https://docs.myket.ir/
- Webhook signature: https://docs.myket.ir/webhooks/signature

**Renewal strategy:** Subscribe to webhook events; no polling needed.

---

## General Notes

1. **Never trust client purchase results** (README §8.2). The mock adapters
   implement the verification flow correctly. Real adapters must call the
   store's server-side verification endpoint.

2. **Idempotency** is enforced via `providerTransactionId`. Duplicate
   verification requests for the same transaction do not create duplicate
   subscriptions.

3. **Currency** is integer minor units (per README §8.4). For Iranian Rial
   (IRR), no minor units — prices are already in integer rials.

4. **Period computation** uses calendar arithmetic (per README §8.4):
   - 1 month = +1 calendar month (not 30 days)
   - 1 year = +1 calendar year (not 365 days)
   - Month-end dates and leap years handled correctly by JavaScript Date
     arithmetic (e.g., Jan 31 + 1 month = Feb 28/29).

5. **Prepaid vs auto-renewing:** If a store only supports prepaid (non-renewing)
   subscriptions, the entitlement simply expires at `currentPeriodEnd`. The
   user can re-purchase to extend. Do NOT force an auto-renewal lifecycle onto
   a prepaid product (README §8.3).

---

## Source URLs (for production verification)

Before launch, re-verify each URL and update this file with the date checked:

- [ ] CafeBazaar IAB v3 docs — checked 2026-10-12
- [ ] Myket developer docs — checked 2026-10-12
- [ ] CafeBazaar verification endpoint signature
- [ ] Myket webhook signature algorithm
- [ ] Store policies for digital goods (Iran)
