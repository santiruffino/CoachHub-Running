# MVP Features (Current Baseline)

This document is the current MVP baseline for the running platform, with status as of the latest release.

## Core platform

- Role-based access (`ADMIN`, `COACH`, `ATHLETE`)
- Team-centric access model (`team_id`)
- **Team invite links (shareable sign-up URL)**: reusable per-team link, coach/admin creates once, shares via WhatsApp/QR; athlete signs up and joins team; atomic RPC + audit log
- **Team athlete limit (pricing-tier cap)**: `max_athletes` in `team_settings`; enforced on both per-email and team-link sign-ups; admin-only UI in `/settings/team`
- Invitations and account acceptance flow (admin invites coaches; coaches + admins invite athletes)
- Athlete / group / training management
- Assignment and calendar workflows
- Coach settings and team settings (`coach_settings`, `team_settings`)
- Append-only admin audit log (`admin_action_logs`) for critical writes (includes team invite link events)

## Strava integration

- OAuth connect / disconnect / status
- Manual sync
- Webhook ingestion (hardened — verified subscription id, content-type checks, body-size guardrails, route-level throttling)
- Edge-function processing (`process-strava-activity`, `fetch-strava-streams`, `evaluate-compliance`)
- Activity detail and streams visualization
- Activity streams cached in `activity_streams` with 7-day retention and scheduled purge

## Coaching analytics

- Coach, athlete, and admin dashboards
- Activity feedback (RPE + sensations + comments)
- Compliance scoring per activity
- Smart alert scoring that factors load + ACWR + TSB
- **Training load (CTL / ATL / TSB / ACWR)** computed from `load_score` and `suffer_score`, surfaced on:
  - coach's `AthleteDetailsView` "Salud y Carga" tab (full monitoring)
  - **athlete's own home dashboard** (4-card row + 7/30/90-day trend chart)
- Priority roster for coaches with per-athlete CTL / TSB
- `suffer_score` (Strava) and `load_score` (derived) columns on `activities`
- Asynchronous backfill job with 90-day retention

## Personalized training zones

- **HR zones** derived from `restHR` and `maxHR`, displayed on profile and athlete dashboard
- **Pace zones (VAM)** computed live from the athlete's VAM via `VAM_ZONES` + `calculateTargetPace`, displayed on athlete dashboard
- **Power zones (FTP)** wired into the workout builder (`StepEditor`)

## Workout builder

- Drag-and-drop series editor
- VAM-based and FTP-based target pacing
- Estimated TSS per planned workout
- Template library for reusable sessions

## Calendar & races

- Weekly calendar with assignments + Strava activities
- Group-level assignment
- Race calendar with countdowns
- Per-athlete race assignment and strategy notes

## Athlete feedback loop

- New-activity feedback modal (RPE, sensations, comment)
- Inactivity detection prompts
- Compliance signals on the activity detail view

## Not in MVP baseline

- Billing / subscription product lifecycle
- Fully productized notification system (email / push) — **delivered post-baseline**
  (in-app inbox + Web Push + digests; see `documentation/notifications.md`)
- Fully complete cycling domain model (power-only compliance, sport-aware matching)

## Cycling extension note

Cycling support should be developed on top of this running baseline without regressing current running behaviors.

- `CYCLING` enum / type support in training types: **done**
- Sport-aware pace / speed rendering in selected activity views: **done**
- Power zones in the workout builder: **done**
- Sport-specific compliance / matching logic: **partial**
- Cycling-only athlete profile (FTP, W', power duration curve): **partial**

Detailed blockers and evidence:

- `documentation/platform-analysis-report.md`
- `documentation/sport-readiness.md`
