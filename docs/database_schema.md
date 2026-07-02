# Database Schema (Current Overview)

> **Canonical reference:** [`documentation/database.md`](../documentation/database.md).
> This file is a condensed table-family map; the architecture doc has the full
> column-level detail, the settings/audit model, and hardening notes.

## Runtime

- PostgreSQL via Supabase
- Auth identities from Supabase Auth
- Domain data in public schema with RLS
- Canonical SQL migrations in `supabase/migrations/*.sql`
- Historical/manual SQL scripts in `supabase/queries/legacy/*.sql`

## Key table families

### Identity and tenancy

- `profiles` (role, team_id, coach_id)
- `coach_profiles`
- `athlete_profiles`

### Planning and assignments

- `trainings` (blocks JSONB, team-scoped)
- `training_assignments` (snapshot + linkage)
- `groups`, `athlete_groups`

### Activities and Strava

- `activities` (UUID internal id, `external_id` mapping)
- `activity_streams`
- `strava_connections`
- `activity_feedback`

### Races

- `races`
- `athlete_races`

### Invitations and ops

- `invitations`, `team_invite_links` (shareable sign-up URLs)
- `teams` (canonical team registry)
- `coach_settings`, `team_settings`, `admin_action_logs` (append-only)
- `rate_limit_buckets` (DB-backed API rate limiting)
- `activity_backfill_jobs` (async Strava load recomputation)
- webhook/sync support tables used by integration flows

### Notifications and messaging

- `coach_athlete_messages` (two-way coach↔athlete chat)
- `notifications`, `push_subscriptions`, `notification_preferences` (migration
  `20260702110000_notification_tables.sql`; see
  [`documentation/notifications.md`](../documentation/notifications.md))

## Policy model

The active model is team-centric.

Relevant migrations:

- `supabase/migrations/20260429000000_team_based_rls.sql`
- `supabase/migrations/20260429000001_created_by_and_team_policies.sql`

## Important identity convention

- Internal app routes should use UUID IDs where available.
- External Strava IDs are provider references and should not be treated as primary app route identity.
