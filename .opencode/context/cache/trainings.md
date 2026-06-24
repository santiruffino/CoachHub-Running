# Trainings domain

## Description
Workout templates, builder UI, assignment flows, workout matching, and training summaries.

## Entry points
- `src/app/(dashboard)/trainings/page.tsx`
- `src/app/(dashboard)/workouts/builder/page.tsx`
- `src/app/(dashboard)/workouts/assign/page.tsx`
- `src/app/(dashboard)/workouts/[assignmentId]/page.tsx`
- `src/app/api/v2/trainings/*`

## Key files
- `src/features/trainings/components/WorkoutBuilder.tsx`
- `src/features/trainings/components/AssignTrainingModal.tsx`
- `src/features/trainings/components/AssignWorkoutView.tsx`
- `src/features/trainings/components/TrainingsList.tsx`
- `src/features/trainings/components/builder/*`
- `src/features/trainings/utils/workoutDuration.ts`
- `src/features/trainings/utils/workoutMatcher.ts`

## Dependencies
- Training/assignment APIs and Supabase
- Athlete profiles for pace/load estimation
- Shared activity matching logic and charts

## Notes
- Builder state centers on `WorkoutBlock` and repeat groups.
- Repeat blocks, summaries, and assignment flows are tightly coupled.
