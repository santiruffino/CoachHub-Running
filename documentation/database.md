# Database Architecture

## Overview

Coach Hub Running uses Supabase PostgreSQL as the source of truth.

- auth identities are managed by Supabase Auth
- app profiles and domain data live in public tables
- data access is enforced with RLS + app-layer role/team checks

## Multi-tenant model

The active tenant boundary is `team_id`.

- team-centric RLS migration:
  - `supabase/migrations/20260429000000_team_based_rls.sql`
- ownership metadata migration (`created_by`):
  - `supabase/migrations/20260429000001_created_by_and_team_policies.sql`

`coach_id` still exists in some flows for direct responsibility relationships, but shared resource access is team-centric.

## Core tables (current)

- `profiles` (role, team linkage)
- `coach_profiles`
- `athlete_profiles`
- `groups`
- `athlete_groups`
- `trainings`
- `training_assignments`
- `activities` (internal UUID + external Strava id)
- `activity_streams` (cached streams)
- `strava_connections` (OAuth tokens)
- `activity_feedback`
- `races`, `athlete_races`
- `invitations`

## Access model

Enforcement occurs in three layers:

1. UI behavior by role
2. API role/team checks (`requireRole`, explicit profile queries)
3. RLS policies in Postgres

## Activity identity

- internal route identity: `activities.id` (UUID)
- provider mapping: `activities.external_id`

This UUID-first approach is now standard in v2 activity endpoints.

## Streams and async processing

- Streams are cached in `activity_streams`.
- Stream fetching and activity processing use Supabase Edge Functions.

## Notes for future cycling support

Schema can support cycling activities, but domain semantics (targets/compliance/matching) still carry running-first assumptions in current business logic.
