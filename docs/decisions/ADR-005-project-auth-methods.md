# ADR-005: Project authentication methods

- **Status:** Accepted
- **Date:** 2026-10-03
- **Phase:** 2

## Context

Project applications need end-user authentication separate from the platform dashboard identity domain.

Requested methods:

1. Email + password
2. Google Sign-In (ID token)
3. Phone OTP via SMS.ir

## Decision

- Keep **platform users** and **project users** as separate identity domains and token audiences.
- Resolve project/environment only from a validated API credential (`X-Atrina-Key`), never from client-supplied tenant IDs.
- Store OTP codes as SHA-256 hashes with short TTL, attempt limits, and resend cooldowns.
- Send SMS through an `SmsSender` interface; production uses SMS.ir bulk API; local/test uses a log/fake sender unless explicitly enabled.
- Verify Google `id_token` server-side against configured `GOOGLE_CLIENT_ID`.
- Issue Sanctum personal access tokens on `ProjectUser`; control-plane routes reject non-platform users.

## Consequences

- Apps must send a publishable/server project key on auth endpoints.
- Google login requires OAuth client configuration before it works in production.
- SMS credentials must live only in environment variables and should be rotated if ever exposed.
