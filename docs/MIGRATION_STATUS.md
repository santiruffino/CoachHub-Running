# Migration Status: NestJS -> Next.js + Supabase

Last updated: 2026-04-30

## Status

Migration is functionally complete for core product flows.

## Completed

- Next.js API route handlers implemented and active
- Supabase auth/session model integrated (`@supabase/ssr`)
- Main v2 API surface in place (`/api/v2/*`)
- Team-based RLS migration applied in repository migrations
- Strava OAuth, sync, webhook, and edge-function processing present
- UUID-first activity detail route model in v2 activity endpoints

## Remaining technical debt

- Remove or formally deprecate legacy compatibility routes outside v2
- Normalize i18n handling for API/user-facing errors
- Address webhook and OAuth hardening items
- Clean dead/orphaned components and stale docs

See `documentation/platform-analysis-report.md` for evidence and priorities.
