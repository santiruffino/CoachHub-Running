# Coach Hub Running

Coach Hub Running is a multi-tenant coaching platform focused on running, with a staged path to cycling support.

- Frontend + API: Next.js App Router (Next.js 16)
- Auth + DB: Supabase (`@supabase/ssr`, PostgreSQL, RLS)
- Async backend jobs: Supabase Edge Functions
- UI: Tailwind + shadcn/ui

## Current architecture

- Route handlers live in `src/app/api/**`.
- Main API surface is versioned under `src/app/api/v2/**`.
- Legacy compatibility routes still exist in `src/app/api/auth/**`, `src/app/api/invitations/**`, and a few non-v2 paths.
- Data authorization is team-centric (`team_id`) with role checks (`ADMIN`, `COACH`, `ATHLETE`).

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

# Strava OAuth
STRAVA_CLIENT_ID=
STRAVA_CLIENT_SECRET=
STRAVA_REDIRECT_URI=http://localhost:3000/strava/callback

# Strava webhook
STRAVA_WEBHOOK_VERIFY_TOKEN=
STRAVA_SUBSCRIPTION_ID=
```

Notes:

- `SUPABASE_SECRET_KEY` is server-only (never expose in client code).
- Keep `NEXT_PUBLIC_*` only for non-sensitive values.

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

- Athletes and coaches are invited through `POST /api/invitations`.
- Only admins can invite coaches.
- Invitation acceptance is handled by `POST /api/auth/accept-invitation`.

### Strava integration

- OAuth endpoints: `/api/v2/strava/auth/*`
- Webhook endpoint: `/api/v2/strava/webhook`
- Edge functions used by backend pipeline:
  - `process-strava-activity`
  - `fetch-strava-streams`
  - `evaluate-compliance`

## Documentation map

- Product/architecture docs: `documentation/`
- Operational/project docs: `docs/`
- SQL scripts: `supabase/migrations/` (canonical) and `supabase/queries/legacy/` (historical)
- Security/i18n/unused code audit report: `documentation/platform-analysis-report.md`

## Current status (high level)

- Running workflow: implemented and in active use.
- Cycling workflow: partial foundation exists, but several domain assumptions still run-focused.

See `documentation/platform-analysis-report.md` for the detailed gap analysis and readiness report.
