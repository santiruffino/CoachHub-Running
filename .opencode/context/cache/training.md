# Training

## Description

Training template library, assignment workflows, and workout matching/compliance infrastructure. Central domain for planned work across athletes and groups.

## Entrypoints

* src/app/(dashboard)/trainings/page.tsx
* src/app/(dashboard)/workouts/builder/page.tsx
* src/app/(dashboard)/workouts/assign/page.tsx
* src/app/api/v2/trainings/route.ts
* src/app/api/v2/trainings/assign/route.ts
* src/app/api/v2/trainings/assignments/[id]/match/route.ts

## Services

* src/features/trainings/services/trainings.service.ts
* src/features/trainings/services/matching.service.ts

## Models

* Training
* TrainingAssignment
* TrainingType
* CreateTrainingDto
* AssignTrainingDto
* WorkoutMatch

## Dependencies

* internal: src/interfaces/training.ts, src/lib/api/error-response, src/lib/supabase/api-helpers, src/features/trainings/components/builder/types
* external: NextResponse/NextRequest, Axios

## Notes

* Templates are team-scoped; API requires COACH role and team_id.
* Matching compares planned blocks vs actual activities for compliance scoring.
* Snake_case and camelCase scheduled date fields coexist; consumers normalize both.
