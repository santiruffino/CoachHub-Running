# Prompt Context - Database and Migrations

Use this context when proposing DB changes for this repository.

## Engine and migration model

- PostgreSQL via Supabase
- SQL migrations in `supabase/migrations/*.sql`
- RLS is a first-class security layer

## Design principles

- UUID identifiers
- explicit ownership/tenant columns where relevant (`team_id`, `created_by`)
- idempotent migration patterns when practical
- indexes for common filter/join keys

## Policy principles

- default to team-centric access model
- keep athlete self-access intact where required
- avoid policy recursion patterns

## Domain notes

- activity identity uses internal UUID + external provider ID
- maintain compatibility for running-first behavior while enabling future cycling extensions
