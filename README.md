# Endurix

Endurix is a multi-tenant coaching platform focused on running, with a staged path to cycling support.

- Frontend + API: Next.js App Router (Next.js 16)
- Auth + DB: Supabase (`@supabase/ssr`, PostgreSQL, RLS)
- Async backend jobs: Supabase Edge Functions
- UI: Tailwind + shadcn/ui

## Current architecture

- Route handlers live in `src/app/api/**`.
- Main API surface is versioned under `src/app/api/v2/**`.
- Legacy compatibility routes still exist in `src/app/api/auth/**`, `src/app/api/invitations/**`, and a few non-v2 paths.
- Data authorization is team-centric (`team_id`) with role checks (`ADMIN`, `COACH`, `ATHLETE`).

## What the app does today (high level)

- **Multi-tenant coaching platform** for running teams, with a staged path to cycling.
- **Three first-class roles**: `ADMIN` (super-coach within a team), `COACH` (manages athletes, groups, trainings, assignments), `ATHLETE` (own schedule, activities, feedback).
- **Strava ingest pipeline**: OAuth + webhook + edge-function processing → UUID-first v2 activity routes.
- **Activity analysis**: HR-zone / pace-zone / power-zone charts, laps & splits, RPE-based feedback, compliance scoring.
- **Workout builder**: drag-and-drop series editor with VAM-based and FTP-based target pacing.
- **Calendar & assignments**: weekly view, group-level assignment, race calendar with countdowns.
- **Training load**: Banister-style CTL / ATL / TSB / ACWR computed from `suffer_score` and `load_score`, surfaced on the coach's athlete detail and on the athlete's own dashboard.
- **Team settings & admin audit log**: persisted `coach_settings`, `team_settings`, and an append-only `admin_action_logs` table.
- **Observability**: Sentry (server + client), structured logging, GA4 product analytics.

## Roles

- `ADMIN`: super-coach behavior inside a running team.
- `COACH`: manages athletes, groups, trainings, assignments within team scope.
- `ATHLETE`: personal schedule, activity data, feedback.

Role enforcement combines:

1. API helper checks in `src/lib/supabase/api-helpers.ts`
2. Team checks inside route handlers
3. RLS policies in `supabase/migrations/*`

## Activity identity model

- Internal app/API identity: `activities.id` (UUID)
- External provider identity: `activities.external_id` (Strava)

V2 activity detail/feedback/compliance/streams are UUID-first.

## Prerequisites

- Node.js 18+
- npm
- Supabase project
- Optional: Strava API app credentials

## Environment variables

Create `.env.local` in repository root (`frontend/.env.local`):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SECRET_KEY=

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_GA_MEASUREMENT_ID=

# Strava OAuth
STRAVA_CLIENT_ID=
STRAVA_CLIENT_SECRET=
STRAVA_OAUTH_STATE_SECRET=
STRAVA_REDIRECT_URI=http://localhost:3000/strava/callback

# Strava webhook
STRAVA_WEBHOOK_VERIFY_TOKEN=
STRAVA_SUBSCRIPTION_ID=
STRAVA_WEBHOOK_SHARED_SECRET=
STRAVA_WEBHOOK_RATE_LIMIT_WINDOW_MS=60000
STRAVA_WEBHOOK_RATE_LIMIT_MAX_REQUESTS=60

# Logging
LOG_LEVEL=debug

# API hardening
API_RATE_LIMIT_WINDOW_MS=60000
API_RATE_LIMIT_MAX_REQUESTS=120

# Sentry (server)
SENTRY_DSN=
SENTRY_ENVIRONMENT=development
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=

# Sentry (client)
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_SENTRY_ENVIRONMENT=development
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.1
NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE=1.0
NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE=0.05
```

Notes:

- `SUPABASE_SECRET_KEY` is server-only (never expose in client code).
- Keep `NEXT_PUBLIC_*` only for non-sensitive values.

Sentry notes:

- `SENTRY_DSN` captures server and edge errors.
- `NEXT_PUBLIC_SENTRY_DSN` captures client runtime errors.
- `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` are required only for build-time source map upload.
- Source maps are configured via `withSentryConfig` in `next.config.ts`.

## Local development

```bash
npm install
npm run dev
```

Default local URL: `http://localhost:3000`.

## Bootstrap first admin

Use the admin bootstrap script:

```bash
npx tsx scripts/create-admin.ts
```

This creates an `ADMIN` user and assigns/creates a running team.

## Key flows

### Invitations

There are two complementary flows:

- **Per-email invitation (default)**: a coach enters an athlete's email and the system sends a one-time link. Acceptance is handled by `POST /api/auth/accept-invitation`.
- **Team invite link (shareable)**: a coach or admin creates a single reusable link tied to their team. Any athlete who opens the link can sign up and is added to the team. Managed under `POST /api/v2/team-invite-links`, with the public resolution and acceptance endpoints at `GET /api/join/[token]` and `POST /api/join/[token]/accept`. The athlete-facing page lives at `/join/[token]`.

Admins can view and rotate/revoke every team link from the **Team Settings → Enlaces del Equipo** card. Every use of a link writes an append-only `admin_action_logs` row (`action = 'team_invite_link.used'`).

Only admins can invite coaches.

### Strava integration

- OAuth endpoints: `/api/v2/strava/auth/*`
- Webhook endpoint: `/api/v2/strava/webhook`
- Edge functions used by backend pipeline:
  - `process-strava-activity`
  - `fetch-strava-streams`
  - `evaluate-compliance`

### Settings and audit logs

- Coach settings: `/settings/coach` <-> `GET/PATCH /api/v2/settings/coach`
- Team settings (admin): `/settings/team` <-> `GET/PATCH /api/v2/settings/team`
- Admin audit logs: `/settings/audit-logs` <-> `GET /api/v2/admin/audit-logs`

Audit logs are append-only at DB level and capture first-cut critical admin writes.

## Migrations

Apply latest Supabase migrations before running new settings/audit features:

- includes `20260507113000_settings_and_admin_audit.sql`
- creates `team_settings`, `coach_settings`, `admin_action_logs`
- applies RLS policies and append-only triggers for admin logs
- includes `20260605110000_teams_table.sql` — creates the canonical `public.teams` table (idempotent backfill from existing `profiles.team_id`)
- includes `20260605120000_team_invite_links.sql` — creates `public.team_invite_links` and the atomic `consume_team_invite_link(token)` RPC

## Documentation map

- Product/architecture docs: `documentation/`
- Operational/project docs: `docs/`
- SQL scripts: `supabase/migrations/` (canonical) and `supabase/queries/legacy/` (historical)
- Security/i18n/unused code audit report: `documentation/platform-analysis-report.md`

## Current status (high level)

- Running workflow: implemented and in active use.
- Cycling workflow: partial foundation exists, but several domain assumptions still run-focused.

### Athlete-side fitness visibility

The athlete's home dashboard (`/dashboard`) is the athlete's daily entry point and currently surfaces:

- Weekly volume, time, elevation, and compliance (`weeklyStats`).
- A new **fitness status row** (4 cards) showing **CTL** (fitness), **ATL** (fatigue), **TSB** (form), and **ACWR** (injury-risk) computed via `athletesService.getLoadMetrics(id, range)`. TSB and ACWR are color-coded.
- A new **"Estado de Forma"** card with a 7 / 30 / 90 day range selector, a risk badge, and a `LoadMetricsTrendChart` showing CTL / ATL / TSB over time.
- A "Rendimiento y Zonas" card with the performance compliance trend and **personalized training zones**:
  - **Heart rate zones** from the athlete's `hrZones`.
  - **Pace zones (VAM)** computed from the athlete's VAM via `calculateTargetPace` and `VAM_ZONES`. Falls back to a `/profile` link when VAM is not set.
- Coach notes, next races, weekly calendar, and a new-activity feedback modal (unchanged).

The same load-metrics endpoint and chart are reused from the coach view (`AthleteDetailsView`) so coach and athlete see a consistent picture of training load.

See `documentation/platform-analysis-report.md` for the detailed gap analysis and readiness report.
