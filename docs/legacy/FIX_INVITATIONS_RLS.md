# Invitation RLS Notes (Current)

This note replaces older coach-only invitation policy guidance.

## Current invitation behavior

- Invitation creation is handled server-side in `POST /api/invitations`.
- Authorization is explicit in route logic (`requireRole('COACH')` + role checks for coach invites).
- Admin client/service-role is used for invitation writes and duplicate checks.

## Role rules

- Coaches can invite athletes.
- Only admins can invite coaches.

## Team rules

- Invitations are stamped with inviter `team_id`.
- Coach assignment may be null depending on inviter role and target role.

## Recommendation

Treat invitation authorization primarily at API layer + team constraints, with RLS as defense-in-depth.

Do not rely on old standalone SQL snippets that ignore `team_id` and admin role behavior.
