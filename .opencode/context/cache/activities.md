# Activities domain

## Description
Activity detail views, charts, lap analysis, feedback, compliance, and bulk lap overrides.

## Entry points
- `src/app/(dashboard)/activities/page.tsx`
- `src/app/(dashboard)/activities/[id]/page.tsx`
- `src/app/api/v2/activities/*`
- `src/app/api/v2/users/[id]/activities/route.ts`

## Key files
- `src/app/(dashboard)/activities/components/ActivityDetailView.tsx`
- `src/app/(dashboard)/activities/components/ActivityChart.tsx`
- `src/app/(dashboard)/activities/components/ActivityChartsTabs.tsx`
- `src/app/(dashboard)/activities/components/IntervalsAnalysisChart.tsx`
- `src/app/(dashboard)/activities/components/LapsTable.tsx`
- `src/app/(dashboard)/activities/components/PaceHrScatterChart.tsx`
- `src/app/(dashboard)/activities/components/ZoneComplianceCard.tsx`

## Dependencies
- Activity API routes + Supabase data
- `src/features/trainings/utils/workoutMatcher.ts`
- `src/interfaces/activity.ts`
- `next-intl`, Recharts, UI table/menu primitives

## Notes
- `LapsTable` supports bulk override mode.
- `IntervalsAnalysisChart` visualizes matched laps and supports row selection UX in bulk mode.
