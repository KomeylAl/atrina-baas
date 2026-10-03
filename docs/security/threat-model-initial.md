# Initial threat model (Phase 0)

- **Status:** Baseline
- **Date:** 2026-10-03
- **Scope:** MVP control plane + planned data plane

## Assets

- Organization/project configuration and membership
- API credentials (especially server/admin secrets)
- Project end-user accounts and sessions
- Billing purchase tokens / provider payloads
- Stored application data and private objects (later phases)
- Encryption keys and provider credentials

## Trust boundaries

1. Browser dashboard ↔ Control API
2. Mobile/web client apps ↔ Data API
3. Laravel app ↔ PostgreSQL / Redis / object storage
4. Laravel app ↔ external billing/SMS/email providers
5. Platform operator ↔ infrastructure secrets

## Priority threats

| ID | Threat | Impact | Initial mitigations |
|----|--------|--------|---------------------|
| T1 | Cross-tenant read/write via forged or swapped IDs | Critical | Tenant from credential context; policies; scoped queries; isolation tests |
| T2 | Publishable key treated as privileged | High | Key kinds + least privilege; default deny on private data |
| T3 | Project user token used on control plane | High | Separate identity domains and middleware |
| T4 | Credential leakage (logs, git, client apps) | Critical | Hash/show-once secrets; never log full secrets; `.env` gitignored |
| T5 | Forged store purchase grants entitlement | Critical | Server-side verify; idempotency; no trust of client success alone |
| T6 | Auth brute-force / OTP abuse | High | Rate limits, cooldowns, hashed OTPs |
| T7 | SSRF via webhooks/URL fetch | High | Destination validation; no open fetches |
| T8 | Privilege escalation via role/UI-only checks | High | Server-side policies; audit role changes |
| T9 | Mass assignment of owner/system fields | High | Explicit fillable/validated DTOs |
| T10 | Secret in repository or CI logs | Critical | `.gitignore`, example-only env files, redacted logs |

## Out of scope for this baseline

- Full STRIDE per endpoint (expand per phase)
- Formal pen-test report
- Multi-region threat considerations

## Review cadence

Update this document when a new plane, provider, or credential type is introduced. Phase 1 must add automated tests for T1–T4.
