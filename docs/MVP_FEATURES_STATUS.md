# MVP Status (Running)

Last updated: 2026-04-30

This file reflects current implementation status in code (not original target spec language).

## Completed

- Role-based product (`ADMIN`, `COACH`, `ATHLETE`)
- Team-centric authorization baseline (`team_id`)
- Invitations (athlete + admin-only coach invite)
- Athlete/group/training management
- Assignment and calendar workflows
- Strava OAuth and manual sync
- Strava webhook ingestion path and edge-function processing
- Activity detail pages with feedback/compliance features
- UUID-first v2 activity route model

## Partial / in progress quality

- i18n coverage is partial (many hardcoded API/UI strings remain)
- security hardening needed in webhook/state handling
- dead/orphaned components and stale compatibility routes exist

## Not completed (from old MVP expectations)

- integrated billing/subscription lifecycle
- full notification pipeline (email/push) at product level
- full cycling-ready domain logic (currently running-first)

## Reference

For evidence and prioritized backlog, see:

- `documentation/platform-analysis-report.md`
