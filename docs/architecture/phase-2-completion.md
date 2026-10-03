# Phase 2 completion report

- **Date:** 2026-10-03
- **Status:** Implemented

## What was implemented

- Separate `project_users` identity domain (per project + environment)
- `user_identities` for password / phone OTP / Google providers
- Hashed OTP challenges with TTL, attempt limits, and rate limits
- SMS.ir adapter behind `SmsSender` (log/fake when disabled)
- Google ID token verification behind `GoogleIdentityVerifier`
- Data-plane auth endpoints under `/api/v1/project-auth/*` requiring `X-Atrina-Key`
- Control-plane project user management (list/filter, block/unblock, revoke sessions)
- Dashboard page: `/projects/[projectId]/users`
- ADR-005

## Auth endpoints (data plane)

All require validated project credential header `X-Atrina-Key`:

- `POST /project-auth/signup`
- `POST /project-auth/login`
- `POST /project-auth/otp/request`
- `POST /project-auth/otp/verify`
- `POST /project-auth/google`
- `GET /project-auth/me` (Bearer project-user token)
- `POST /project-auth/logout`
- `POST /project-auth/refresh`

## Security notes

- Platform tokens cannot be used as project-user context and vice versa
- Tenant context comes only from credential verification
- OTP codes are hashed; responses avoid account enumeration where practical
- SMS/Google secrets stay in environment variables only

## Configuration

```env
SMSIR_ENABLED=true
SMSIR_API_KEY=...
SMSIR_LINE_NUMBER=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

## Tests

`php artisan test` — 24 passed (Phase 1 + Phase 2 suites)

## Known limitations

- Google Sign-In needs a real OAuth client ID before production use
- OTP SMS uses bulk text API (not verify template) as provided
- No password-reset email flow yet for project users
- Dashboard does not embed Google button UI (API-ready)

## Next recommended task

Phase 3 only if the first app needs a managed Data API; otherwise Phase 4 billing for the first store flow.
