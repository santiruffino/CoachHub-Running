# Backend Architecture

## Overview

Coach Hub Running uses a serverless full-stack architecture:

- Next.js route handlers for API logic (`src/app/api/**`)
- Supabase for auth/database/RLS
- Supabase Edge Functions for asynchronous Strava and compliance processing

There is no active NestJS runtime in this repository.

## API layers

### Primary API (v2)

Most feature routes are under `src/app/api/v2/**`:

- Users, athletes, coaches, assignments, profile
- Trainings, assignments, matching, calendar
- Activities (detail, streams, feedback, compliance)
- Strava auth + webhook
- Dashboard/admin/coach data

### Compatibility/legacy routes

Some non-v2 routes remain active (mainly invitation/auth compatibility):

- `src/app/api/auth/**`
- `src/app/api/invitations/**`
- a few old `src/app/api/users/**` and `src/app/api/groups/**`

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

### Team boundary

Authorization is team-centric (`team_id`).

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
- Sync status/manual sync/disconnect: `/api/v2/strava/auth/*`

### Webhook + async processing

- Webhook endpoint: `POST /api/v2/strava/webhook`
- Processing is delegated to Edge Function `process-strava-activity`
- Streams retrieval/caching delegated to Edge Function `fetch-strava-streams`
- Compliance calculations delegated to `evaluate-compliance`

### Edge Functions in repo

- `supabase/functions/process-strava-activity/index.ts`
- `supabase/functions/fetch-strava-streams/index.ts`
- `supabase/functions/evaluate-compliance/index.ts`

## Activity identity contract

V2 activity routes are UUID-first.

- Path param `[id]` in `/api/v2/activities/[id]` represents internal UUID (`activities.id`)
- `external_id` is kept for Strava API calls and storage mapping

## Running-first status

Backend and domain logic are currently optimized for running:

- pace/min-km assumptions appear in matching/estimation paths
- compliance is currently HR-zone-centric

Cycling support is partially scaffolded but not yet domain-complete.

See `documentation/platform-analysis-report.md` for full readiness analysis.
