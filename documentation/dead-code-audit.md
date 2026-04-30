# Dead Code Audit

Date: 2026-04-30

## Summary

The repository contains likely orphaned components/routes/helpers from previous iterations.

## High-confidence candidates

- `src/components/layout/Sidebar.tsx`
- `src/app/(dashboard)/activities/components/ActivityDynamicsChart.tsx`
- additional calendar/strava components with no clear inbound usage

## Low-risk cleanup approach

1. confirm zero references via search + route usage
2. remove candidates in small PR batches
3. run lint/build and smoke critical views

## Notes

- Some files may be externally referenced (webhooks/callbacks/routes) even without in-repo imports.
- Validate public routes and integrations before deletion.

See `documentation/platform-analysis-report.md` for context.
