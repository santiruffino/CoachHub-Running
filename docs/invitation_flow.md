# Invitation Flow

Version: 2.0

This document describes how coach/admin invitations currently work in production code.

## Endpoints

- Create invitation: `POST /api/invitations`
- Validate token: `GET /api/invitations/validate/[token]`
- Accept invitation: `POST /api/auth/accept-invitation`

## Roles and rules

- `COACH` can invite `ATHLETE`
- `ADMIN` can invite `ATHLETE` and `COACH`
- Invitation rows include `team_id` and optional `coach_id`

## Link formats currently in app

Current UI invitation modals generate links using query-token format:

- `/accept-invitation?token=<token>`

Token-path page also exists for compatibility:

- `/accept-invitation/[token]`

## Acceptance behavior

On accept:

1. token is validated
2. user account is created through Supabase admin API
3. profile is updated with role/team/coach linkage
4. invitation is marked accepted
5. role-specific profile row is created (`coach_profiles` or `athlete_profiles`)

## Operational notes

- Invitations expire (7-day window in create endpoint).
- Duplicate pending invitation handling is built into create endpoint.
- All invitation writes run server-side with explicit authorization checks.
