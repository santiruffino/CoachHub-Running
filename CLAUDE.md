# CLAUDE.md

Guidance for AI agents (Claude Code and others) working in this repository.

## What this is

Endurix — a multi-tenant coaching platform focused on running (staged path to
cycling). Single Next.js app that serves both the UI and the API; Supabase for
auth, Postgres, and RLS; Supabase Edge Functions for async Strava/compliance
processing; deployed on Vercel.

## Stack

- **Next.js 16** (App Router), **React 19**, TypeScript
- **Supabase** (`@supabase/ssr`, Postgres, RLS) — auth + data
- **Tailwind CSS v4** + shadcn/ui, Radix primitives
- `next-intl` (locale: `es` only today), Recharts + ECharts for charts
- Sentry (server/edge/client), structured JSON logging, GA4 analytics
- Vitest for tests

## Commands

```bash
npm run dev     # dev server on http://localhost:3000
npm run build   # production build (runs withSentryConfig)
npm run start   # serve production build
npm run lint    # eslint
npm run test    # vitest run
```

Bootstrap the first admin/coach: `npx tsx scripts/create-admin.ts` (or
`scripts/create-coach.ts`).

## Architecture map

- `src/app/(auth)/**` — login, invitations, password flows
- `src/app/(dashboard)/**` — authenticated product (coach/admin/athlete)
- `src/app/(landing)/**` — public landing + wishlist
- `src/app/api/**` — route handlers. **Canonical API is versioned under
  `src/app/api/v2/**`.** Unversioned `/api/<path>` requests are proxied to
  `/api/v2/<path>` by `src/app/api/[...path]/route.ts` (alias header
  `x-api-alias: v2`, telemetry `legacy.api.alias.hit`).
- `src/features/**` — domain modules (auth, groups, invitations, notifications,
  onboarding, profiles, races, settings, strava, trainings, users). Each holds
  its own `components/`, `services/`, sometimes `hooks/`/`utils/`.
- `src/components/**` — shared UI (`ui/` = shadcn, `dashboard/`, `analytics/`, ...)
- `src/lib/**` — cross-cutting: `supabase/` (clients + `api-helpers.ts`), `api/`
  (error shape, rate limit), `notifications/`, `mcp/`, `strava/`, `training/`
  (load model), `logger.ts`, `analytics/`.
- `supabase/migrations/**` — **canonical** SQL. `supabase/functions/**` — Edge Functions.

## Conventions that matter

- **API versioning**: put new behavior in `/api/v2/**`; keep legacy paths as thin
  pass-throughs only.
- **Auth/roles**: use `requireAuth()` / `requireRole()` from
  `src/lib/supabase/api-helpers.ts`. Roles are `ADMIN` (super-role), `COACH`,
  `ATHLETE`. Authorization is **team-centric** (`team_id`) and enforced in three
  layers: UI, route handlers, and Postgres RLS.
- **Service role**: `createServiceRoleClient()` (env `SUPABASE_SECRET_KEY`) bypasses
  RLS — only use it *after* an explicit authorization check, never client-side.
- **Activity identity**: v2 activity routes are **UUID-first** (`activities.id`);
  `activities.external_id` maps to Strava.
- **Error shape**: v2 routes return `apiError()` → `{ success:false, code, error, message }`.
- **Logging**: `createRequestLogger(route, request)` → structured JSON with
  auto-redaction of secrets. Use dotted event names. Don't `console.log`.
- **Notifications**: never write notification tables directly — call
  `createNotification()` (`src/lib/notifications/create-notification.ts`).
- **i18n**: user-facing strings should go through `next-intl` (`messages/es.json`),
  though hardcoded strings still exist (see `documentation/i18n-audit.md`).

## Gotchas

- The `notifications`, `push_subscriptions`, and `notification_preferences` tables
  are defined by migrations `20260628213203`, `20260628225621`, and `20260630003820`
  (the last adds `push_sent_at`). Note notification read state is the boolean
  `is_read`, not a `read_at` timestamp.
- **Migration divergence**: the local `supabase/migrations/` folder and the remote
  Supabase migration history use different versioning and have diverged (remote only
  tracks from 2026-06-27). Don't assume a local file == a remote history entry.
  Reconcile with `supabase db pull` before relying on `supabase db push`.
- Vercel is on the **Hobby** plan → cron granularity is **daily only**
  (`vercel.json`). Cron routes require `Authorization: Bearer $CRON_SECRET`.
- Two documentation folders exist and overlap — see `documentation/README.md` for
  the map and which file is canonical for each topic.

## Documentation

Start at **[documentation/README.md](documentation/README.md)** (the index). Key
architecture docs: `backend.md`, `frontend.md`, `database.md`,
`models_and_relations.md`, `roles_and_permissions.md`, `notifications.md`,
`observability.md`, `mcp-server.md`, `analytics.md`. Product/feature docs and
operational guides live in `docs/`.
