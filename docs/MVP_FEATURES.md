# MVP Features (Current Baseline)

This document is the current MVP baseline for the running platform.

## Core platform

- Role-based access (`ADMIN`, `COACH`, `ATHLETE`)
- Team-centric access model (`team_id`)
- Invitations and account acceptance flow
- Athlete/group/training management
- Assignment and calendar workflows

## Strava integration

- OAuth connect/disconnect/status
- Manual sync
- Webhook ingestion
- Edge-function processing
- Activity detail and streams visualization

## Coaching analytics

- Coach/athlete/admin dashboards
- Activity feedback (RPE + comments)
- Compliance signaling

## Not in MVP baseline

- Billing/subscription product lifecycle
- Fully productized notification system
- Fully complete cycling domain model

## Cycling extension note

Cycling support should be developed on top of this running baseline without regressing current running behaviors.

Detailed blockers and evidence:

- `documentation/platform-analysis-report.md`
