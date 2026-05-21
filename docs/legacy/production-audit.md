# Production Audit (Current Snapshot)

This file summarizes current production-readiness risks from a static review.

## High-priority findings

1. Webhook trust/authenticity hardening required in `/api/v2/strava/webhook`
2. Sensitive values currently logged in webhook handshake path
3. OAuth state handling should be hardened (random state + strict validation)
4. API user-facing error strings are largely hardcoded and mixed-language

Detailed evidence and remediation are documented in:

- `documentation/platform-analysis-report.md`

## Configuration checks

- `src/lib/axios.ts` uses relative baseURL (`/api`) - good for Vercel
- server-only Supabase privileged client uses `SUPABASE_SECRET_KEY`
- Ensure production has all Strava and webhook env vars configured

## Recommended release gate

Before next production push, verify:

- webhook hardening tasks accepted/implemented
- high-severity i18n gaps for top user flows triaged
- dead/orphaned code cleanup plan approved
