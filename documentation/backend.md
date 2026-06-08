# Backend Architecture

## Overview

Endurix uses a serverless full-stack architecture:

- Next.js route handlers for API logic (`src/app/api/**`)
- Supabase for auth / database / RLS
- Supabase Edge Functions for asynchronous Strava and compliance processing

There is no active NestJS runtime in this repository.

## API layers

### Primary API (v2)

Most feature routes are under `src/app/api/v2/**`:

- Users, athletes, coaches, assignments, profile
- Trainings, assignments, matching, calendar
- Activities (detail, streams, feedback, compliance)
- Strava auth + webhook
- Settings (coach / team) and admin audit logs
- Dashboard / admin / coach data

### Compatibility / legacy routes

Some non-v2 routes remain active (mainly invitation / auth compatibility):

- `src/app/api/auth/**`
- `src/app/api/invitations/**`
- a few old `src/app/api/users/**` and `src/app/api/groups/**`

## Legacy to v2 migration map

The canonical API surface is `src/app/api/v2/**`.

Compatibility routes currently in place:

- `GET /api/users/profile` → `GET /api/v2/users/profile`
- `PATCH /api/users/profile` → `PATCH /api/v2/users/profile`
- `GET /api/users/athletes` → `GET /api/v2/users/athletes`
- `GET /api/groups` → `GET /api/v2/groups`
- `POST /api/groups` → `POST /api/v2/groups`

Generic aliasing is also active for unversioned endpoints:

- `src/app/api/[...path]/route.ts`
- Any request to `/api/<path>` (except `/api/v2/**`) is proxied to `/api/v2/<path>`
- Alias responses include header `x-api-alias: v2`
- Alias hits emit telemetry event `legacy.api.alias.hit`

## Deprecation plan

1. Keep `v2` as the only endpoint where behavior changes are implemented.
2. Keep legacy compatibility routes as thin pass-throughs only (re-export or proxy), no duplicated business logic.
3. Monitor alias telemetry (`legacy.api.alias.hit`) to identify active unversioned consumers.
4. Update all remaining clients / integrations to call `/api/v2/**` directly.
5. Announce deprecation window for `/api/**` unversioned aliasing.
6. Remove `src/app/api/[...path]/route.ts` after legacy traffic reaches zero for the agreed period.

## Authentication and authorization

### Auth

- Supabase session cookies via `@supabase/ssr`
- Helpers:
  - `requireAuth()`
  - `requireRole()`
  - file: `src/lib/supabase/api-helpers.ts`

### Roles

- `ADMIN`
- `COACH`
- `ATHLETE`

`ADMIN` is treated as a super-role by `requireRole`.

## Settings and audit APIs

New platform hardening / configuration surface includes:

- `GET / PATCH /api/v2/settings/coach`
  - coach-scoped persisted thresholds / default models
  - table: `coach_settings`
- `GET / PATCH /api/v2/settings/team`
  - team-scoped persisted thresholds / branding / default models / limits
  - `PATCH` restricted to `ADMIN`
  - table: `team_settings` (includes `max_athletes` for pricing-tier caps)
- `GET /api/v2/admin/audit-logs`
  - admin-only paginated / filterable access to append-only critical-write history
  - table: `admin_action_logs`

Critical admin writes emit audit events through `appendAdminActionLog()`.

### Team invite links (shareable sign-up URL)

- `GET /api/v2/team-invite-links` — list team's links (COACH/ADMIN)
- `POST /api/v2/team-invite-links` — create link (COACH/ADMIN)
- `PATCH /api/v2/team-invite-links/[id]` — toggle active, edit limits (COACH/ADMIN)
- `POST /api/v2/team-invite-links/[id]/rotate` — deactivate + create replacement (COACH/ADMIN)
- `GET /api/join/[token]` — public resolve token (no auth)
- `POST /api/join/[token]/accept` — public sign-up via link (no auth)

Tables: `team_invite_links` + atomic RPC `consume_team_invite_link(token)`.
Audit event: `team_invite_link.used` written to `admin_action_logs` on every sign-up.

### Team boundary

Authorization is team-centric (`team_id`):

- app-layer checks inside route handlers
- RLS-level policies in migrations:
  - `supabase/migrations/20260429000000_team_based_rls.sql`
  - `supabase/migrations/20260429000001_created_by_and_team_policies.sql`

## Service role usage

`createServiceRoleClient()` is used only where RLS bypass is required after explicit authorization checks.

- file: `src/lib/supabase/server.ts`
- env var: `SUPABASE_SECRET_KEY`

## Strava backend pipeline

### OAuth and connection

- Auth URL: `GET /api/v2/strava/auth/url`
- Exchange code: `POST /api/v2/strava/auth/exchange`
- Sync status / manual sync / disconnect: `/api/v2/strava/auth/*`

OAuth state is now signed + expiring + user-bound (state cookie includes HMAC signature and expiry, validated on exchange).

### Webhook + async processing

- Webhook endpoint: `POST /api/v2/strava/webhook`
- Processing is delegated to Edge Function `process-strava-activity`
- Streams retrieval / caching delegated to Edge Function `fetch-strava-streams`
- Compliance calculations delegated to `evaluate-compliance`

Webhook flow is hardened with stricter payload / content-type checks, body-size guardrails, subscription id verification, and route-level throttling.

## API hardening contract

V2 routes now standardize error payloads via `apiError()`:

- shape: `{ success: false, code, error, message }`
- middleware-level v2 throttling returns `429` with rate-limit headers
- request tracing continues to use `x-request-id`

### Edge Functions in repo

- `supabase/functions/process-strava-activity/index.ts`
- `supabase/functions/fetch-strava-streams/index.ts`
- `supabase/functions/evaluate-compliance/index.ts`

## Activity identity contract

V2 activity routes are UUID-first:

- Path param `[id]` in `/api/v2/activities/[id]` represents internal UUID (`activities.id`)
- `external_id` is kept for Strava API calls and storage mapping

## Training load

`GET /api/v2/users/[id]/load-metrics?range=7|30|90` returns:

- `current.{ctl, atl, tsb, acwr, todayLoad, avg7d, risk}`
- `series[]` — daily `{date, load, ctl, atl, tsb, acwr}`
- `meta.{range, partial, warmupDays, historyDaysAvailable, backfillStatus, backfillJob}`

Risk classification:

- `insufficientData` — not enough history
- `high` — ACWR > 1.3 (injury-risk signal)
- `moderate` — ACWR in caution band
- `balanced` — within healthy training band
- `lowStimulus` — training load too low to drive adaptation

The endpoint is consumed by both:

- `AthleteDetailsView` "Salud y Carga" tab (coach view)
- `AthleteDashboard` (athlete view, with 7 / 30 / 90-day range selector)

Computed locally in `src/lib/training/load.ts` using the Banister model (τ-CTL=42, τ-ATL=7) and a weighted `load_score` derived from `suffer_score` + duration.

## Activity identity / streams

- Streams cached in `activity_streams` with 7-day retention and scheduled purge.

## Running-first status

Backend and domain logic are currently optimized for running:

- pace / min-km assumptions appear in matching / estimation paths
- compliance is currently HR-zone-centric

Cycling support is partially scaffolded but not yet domain-complete.

See `documentation/platform-analysis-report.md` for full readiness analysis.
