# Roles and Permissions

Endurix uses a role model with team-scoped authorization.

## Roles

## `ADMIN`

- Super-role inside a running team.
- Can access coach-restricted endpoints through `requireRole` super-role behavior.
- Can invite coaches and athletes within team constraints.
- Can manage team settings (`/api/v2/settings/team`) including **athlete limit** (`max_athletes`) for pricing-tier caps.
- Can manage **team invite links** (create, list, rotate, revoke all links in the team via `/settings/team`).
- Can read admin audit logs (`/api/v2/admin/audit-logs`).

## `COACH`

- Manages athletes/groups/trainings/assignments in the same team.
- Can invite athletes (per-email or bulk CSV).
- Can create and manage **team invite links** (own links) via "Añadir Atletas → Enlace del Equipo" tab.
- Cannot invite coaches (admin-only action).
- Cannot set team-level athlete limit (admin-only).
- Can manage own coach settings (`/api/v2/settings/coach`).

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
- Critical admin writes are persisted to append-only `admin_action_logs` for auditing.
