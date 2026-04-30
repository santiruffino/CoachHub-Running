# Product and Behavior

## Product focus

Coach Hub Running is currently optimized for running coaching workflows.

- Primary users: `ADMIN`, `COACH`, `ATHLETE`
- Primary domain: running planning, assignment, activity sync, and coaching feedback
- Cycling support: partial foundation, not fully production-ready at domain level

## Core running workflows

## Coach/admin workflows

1. Invite athletes (admins can also invite coaches)
2. Create/manage groups and trainings
3. Assign trainings to athletes and groups
4. Review dashboards, compliance signals, and activity analysis
5. Manage athlete feedback and assignment linkage

## Athlete workflows

1. Accept invitation and complete account setup
2. Connect Strava
3. Review schedule and assignments
4. Sync activities
5. Provide RPE/comments feedback

## Current platform characteristics

- Team-centric authorization (`team_id`)
- UUID-first activity routes in v2
- Strava ingestion and stream fetching through Edge Functions
- Spanish locale enabled (`es`)

## Cycling roadmap status

What already exists:

- `CYCLING` enum/type support in training types
- sport-aware pace/speed rendering in selected activity views

What remains before full cycling readiness:

- remove running-only defaults in estimators/matching helpers
- extend target/compliance model beyond HR and running pace assumptions
- strengthen sport-specific matching constraints

See `documentation/platform-analysis-report.md` for detailed evidence and priorities.
