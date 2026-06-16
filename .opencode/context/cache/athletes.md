# Athletes

## Description

Coach-facing athlete roster and athlete detail workspace. Combines assignments, activities, races, notes, VAM, and load metrics into one operational view.

## Entrypoints

* src/app/(dashboard)/athletes/page.tsx
* src/app/(dashboard)/athletes/[id]/page.tsx
* src/app/api/v2/users/athletes/route.ts
* src/app/api/v2/users/[id]/details/route.ts
* src/app/api/v2/users/[id]/load-metrics/route.ts

## Services

* src/features/users/services/athletes.service.ts

## Models

* Athlete
* AthleteDetails
* AthleteProfile
* Activity
* TrainingAssignment

## Dependencies

* internal: src/features/trainings/services/trainings.service.ts, src/features/races/services/races.service.ts, src/interfaces/activity.ts, src/interfaces/athlete.ts, src/interfaces/training.ts
* external: date-fns, next-intl

## Notes

* Detail view polls load metrics while backfill is queued/running.
* Completion logic infers done status from linked activity/date/type, not only assignment.completed.
* This domain is coach-operational; self-editing lives in Profiles.
