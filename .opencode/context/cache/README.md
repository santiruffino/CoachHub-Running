# Endurix context cache

Reusable domain summaries for quick codebase recall.

## Domains
- [auth.md](./auth.md)
- [dashboard.md](./dashboard.md)
- [activities.md](./activities.md)
- [trainings.md](./trainings.md)
- [users.md](./users.md)
- [groups-invitations.md](./groups-invitations.md)
- [settings.md](./settings.md)
- [strava.md](./strava.md)
- [shared-ui.md](./shared-ui.md)

## Conventions
- App Router pages are the entrypoints.
- `src/features/*` holds domain UI, state, and services.
- `src/lib/supabase/*` and `src/app/api/v2/*` are the main data layers.
- Auth/role checks are shared across most domains.
