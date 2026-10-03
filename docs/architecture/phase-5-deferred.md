# Phase 5 — Deferred

- **Date:** 2026-10-03
- **Status:** Deferred to a later release

## Reason

Phase 5 (storage + notifications) is intentionally skipped for the current MVP:

1. **Notifications** — the product owner already operates a separate notification service; duplicating SMS/email/push delivery inside Atrina BaaS now would add cost without immediate value.
2. **Object storage** — no S3-compatible bucket/provider is provisioned yet; implementing upload APIs without real storage would be incomplete or speculative.

## Deferred deliverables

- S3-compatible storage adapter
- Upload/download APIs and private object authorization
- SMS/email provider interfaces (beyond existing auth OTP SMS.ir path)
- Queue-based notification delivery and logs

## What stays in place

- Project-auth OTP continues to use the existing `SmsSender` / SMS.ir path from Phase 2 (auth-only, not a general notifications module).
- No storage tables or public storage endpoints are added until Phase 5 is resumed.

## Resume criteria

Resume Phase 5 when:

- An object-storage account (or self-hosted MinIO) is available for at least one environment, and
- There is a concrete product need for in-platform notification fan-out beyond the external service.
