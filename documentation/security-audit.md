# Security Audit Summary

Date: 2026-04-30

## Scope

- `src/app/api/v2/**`
- `supabase/functions/**`
- auth and token-handling paths

## High-risk findings

1. Webhook authenticity hardening required.
2. Sensitive verification values currently logged in webhook flow.
3. OAuth state handling should be upgraded.
4. Ensure all role checks derive from trusted profile data.

## Remediation status update (2026-05-07)

- Webhook hardening: implemented (`/api/v2/strava/webhook`)
  - stricter payload/content-type validation
  - body-size guardrail
  - subscription id verification and fail-closed behavior
  - route-level throttling
- OAuth state hardening: implemented
  - signed, expiring, user-bound OAuth state validation for Strava auth flow
- API hardening: implemented
  - standardized v2 error payload contract via `apiError`
  - v2 middleware-level rate limiting
- Auditability: implemented first cut
  - append-only admin critical-write logs in `admin_action_logs`
  - DB trigger blocks update/delete mutations

## Recommended priorities

## P0

- tighten webhook auth validation and fail-closed behavior
- remove secret/token expected-value logging

## P1

- enforce profile-sourced role/team authorization uniformly
- harden OAuth state (random + expiring + validated)

## P2

- expand input schema validation for API routes

For deeper context and evidence pointers, see `documentation/platform-analysis-report.md`.
