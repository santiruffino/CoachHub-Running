# Feature Tracking

Use this file as a lightweight product/engineering backlog.

## Status legend

- `todo`
- `in_progress`
- `done`
- `blocked`

## Current priorities

| Item | Status | Priority | Notes |
|---|---|---|---|
| SAN-96 Security hardening (webhook/authz/OAuth state) | done | P0 | Webhook validation + OAuth state signing/expiry + standardized failures |
| SAN-99 API hardening (rate limiting + v2 error contract) | done | P0 | Middleware v2 throttling + standardized API error payload shape |
| SAN-91 Settings (Coach + Team settings with persisted config) | done | P0 | Added settings pages + APIs + DB tables (`coach_settings`, `team_settings`) |
| SAN-102 Audit logs (append-only admin action log, first cut) | done | P0 | Added `admin_action_logs`, append-only trigger, admin read API/UI, critical write instrumentation |
| SAN-94 Onboarding (Coach flow + completion tracker + starter templates) | done | P0 | Added `/onboarding/coach`, tracker UI, completion endpoint, and starter template bootstrap |
| SAN-93 Analytics (GA4 signup/onboarding/retention funnels) | done | P0 | Added GA4 integration + event taxonomy for signup, onboarding, auth, dashboard retention |
| SAN-97 Accessibility/UI refinement (critical primitives + tests) | done | P1 | Added WCAG-focused dialog behavior and component tests (`button`, `input`, `alert-dialog`) |
| i18n normalization for API/user-visible errors | todo | P0 | Large hardcoded string surface |
| Remove stale legacy docs/prompts | in_progress | P1 | Ongoing cleanup |
| Running-first assumptions for cycling readiness | todo | P1 | Estimators/compliance/matching |
| Dead/orphaned component cleanup pass | todo | P2 | Needs confirmation per feature owner |

## Notes

- Full evidence and references: `documentation/platform-analysis-report.md`
