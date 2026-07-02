# MVP Status (Running)

Last updated: 2026-07-02

This file reflects current implementation status in code (not original target spec language).

## Completed

- Role-based product (`ADMIN`, `COACH`, `ATHLETE`)
- Team-centric authorization baseline (`team_id`)
- Invitations (athlete + admin-only coach invite)
- Athlete / group / training management
- Assignment and calendar workflows
- Strava OAuth and manual sync
- Strava webhook ingestion (hardened) and edge-function processing
- Activity detail pages with feedback / compliance / streams
- UUID-first v2 activity route model
- API hardening: standardized error contract, v2 rate-limit middleware
- Webhook hardening: subscription id verification, content-type checks, body-size guardrails
- OAuth state hardening: signed + expiring + user-bound state cookie
- Coach settings (`coach_settings`) and team settings (`team_settings`) with persisted config
- Append-only admin audit log (`admin_action_logs`) for critical writes
- Onboarding flow with completion tracker and starter templates
- GA4 product analytics (signup / onboarding / retention funnels)
- **Athlete training-load visibility on `/dashboard`**:
  - 4 fitness status cards (CTL, ATL, TSB, ACWR) with chip-based color coding
  - "Estado de Forma" trend chart with 7 / 30 / 90-day range selector
  - Personalized pace zones (VAM) on the athlete dashboard
  - Same endpoint / chart as the coach view (`athletesService.getLoadMetrics`)
- Personalized pace zones (VAM) component
- Activity `load_score` and `suffer_score` columns with backfill job
- Smart alert scoring (`lib/alerts/scoring.ts`) for `training_load` alert type
- **Team invite links (shareable sign-up URL)**: reusable per-team link, coach/admin creates once, shares via WhatsApp/QR; athlete signs up and joins team; atomic RPC + audit log
- **Team athlete limit (pricing-tier cap)**: `max_athletes` in `team_settings`; enforced on both per-email and team-link sign-ups; admin-only UI in `/settings/team`
- **Notifications**: unified in-app inbox + Web Push, per-category preferences, daily/weekly digest cron (`documentation/notifications.md`)
- **Coach↔athlete chat**: two-way messaging thread (`coach_athlete_messages`), separate from private coach notes
- **Scheduled jobs**: Vercel Cron for digests, race reminders, and Strava backfill (`documentation/observability.md`)
- **MCP server**: authenticated `/api/mcp` exposing coach tools to AI clients (`documentation/mcp-server.md`)
- **DB-backed rate limiting** and a June 2026 RLS/security hardening batch (incl. a profile-update authorization fix)

## Partial / in progress quality

- i18n coverage is partial (many hardcoded API / UI strings remain, single locale `es` only)
- some legacy compatibility routes still active (thin pass-throughs only, no duplicated logic)
- cycling domain logic is sport-aware in some places but not yet domain-complete

## Not completed (from old MVP expectations)

- Integrated billing / subscription lifecycle
- Full cycling-ready domain logic (currently running-first with sport-aware scaffolding)
- Email notification channel (`notification_preferences.email_enabled` exists, but only in-app + Web Push are wired up)

## Reference

For evidence and prioritized backlog, see:

- `documentation/platform-analysis-report.md`
- `docs/MVP_FEATURES.md`
- `docs/features.md`
