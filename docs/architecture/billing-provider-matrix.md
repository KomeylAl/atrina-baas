# Billing provider capability matrix

- **Checked:** 2026-10-03
- **Phase:** 4

Sources consulted (do not invent endpoints beyond these):

| Provider | Source | Notes |
|----------|--------|-------|
| Cafe Bazaar | [developers.cafebazaar.ir](https://developers.cafebazaar.ir), community/API docs for `pardakht.cafebazaar.ir/devapi/v2` validate | Server validate with OAuth access token |
| Myket | [myket.ir/kb server validation](https://myket.ir/kb/pages/server-to-server-payment-validation-api/), [EN verify](https://myket.ir/kb/en/pages/verification-of-in-app-purchases-on-the-server/) | `X-Access-Token` header; product verify APIs |

## Capability matrix (MVP interpretation)

| Capability | Cafe Bazaar | Myket | Atrina MVP behavior |
|------------|-------------|-------|---------------------|
| Server-side purchase verify | Yes (`/devapi/v2/api/validate/.../purchases/{token}/`) | Yes (`.../purchases/products/{sku}/verify` or tokens GET) | Required before granting access |
| `purchaseState` success | `0` | `0` | Only `0` grants entitlement |
| Refund / cancel signal | `purchaseState=1` (refund) on re-check | Re-verify may show unsuccessful | Reconciliation marks revoked/expired |
| Auto-renewing subscriptions | Exists in Bazaar ecosystem; behavior must be re-verified per product type | Subscription inventory on device; server verify is product-token oriented | **MVP models prepaid/non-renewing periods only** (1m/3m/12m). Do not advertise auto-renew |
| Webhooks | Not assumed | Direct-purchase callback is browser POST, not trusted alone | No webhook trust without verify |
| Sandbox | Use store developer tools | Use store developer tools | Fake adapter in automated tests |

## Renewal rule (Atrina)

Prepaid plan duration is added from `max(now, current_period_end)` so duplicate verifies never double-extend, and a new distinct purchase token extends from the later boundary.

## Credentials

Store provider secrets encrypted in `billing_providers.configuration_encrypted`. Never return secrets to clients.
