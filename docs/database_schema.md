# Database Schema (Current Overview)

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

- `invitations`
- webhook/sync support tables used by integration flows

## Policy model

The active model is team-centric.

Relevant migrations:

- `supabase/migrations/20260429000000_team_based_rls.sql`
- `supabase/migrations/20260429000001_created_by_and_team_policies.sql`

## Important identity convention

- Internal app routes should use UUID IDs where available.
- External Strava IDs are provider references and should not be treated as primary app route identity.
