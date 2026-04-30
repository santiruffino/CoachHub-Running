# Roles and Permissions

Coach Hub Running uses a role model with team-scoped authorization.

## Roles

## `ADMIN`

- Super-role inside a running team.
- Can access coach-restricted endpoints through `requireRole` super-role behavior.
- Can invite coaches and athletes within team constraints.

## `COACH`

- Manages athletes/groups/trainings/assignments in the same team.
- Can invite athletes.
- Cannot invite coaches (admin-only action).

## `ATHLETE`

- Accesses own profile, assignments, activities, and feedback features.
- Can connect/disconnect Strava and sync own activities.

## Enforcement layers

1. UI-level conditional rendering by role
2. API-level checks (`requireAuth`, `requireRole`, explicit team checks)
3. RLS policies at DB level

## Team-based access boundary

Most shared resources are scoped by `team_id`.

- migration references:
  - `supabase/migrations/20260429000000_team_based_rls.sql`
  - `supabase/migrations/20260429000001_created_by_and_team_policies.sql`

## Notes

- `coach_id` remains for direct responsibility paths (invitation/assignment behavior), not as the primary tenant boundary.
- Service-role reads/writes are used only in selected endpoints after explicit authorization checks.
