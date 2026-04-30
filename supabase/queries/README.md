# Supabase SQL Queries

All SQL scripts are centralized under `supabase/`.

## Canonical execution path

- Use `supabase/migrations/*.sql` for ordered, versioned schema/policy changes.

## Legacy/manual scripts

- Historical one-off SQL scripts were moved from `docs/*.sql` to `supabase/queries/legacy/*.sql`.
- These files are preserved for reference and manual troubleshooting only.
- Prefer creating new timestamped files in `supabase/migrations/` instead of adding new scripts under `legacy`.

## Migration hygiene

1. Add a new timestamped migration file.
2. Keep changes idempotent where practical.
3. Include RLS/policy updates in the same migration when behavior changes.
4. Update architecture docs if domain/access models change.
