# Coach Hub Running - Screens List

This list reflects currently implemented screens from the App Router.

## Public

- `src/app/page.tsx` - Landing

## Auth and account

- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/forgot-password/page.tsx`
- `src/app/(auth)/reset-password/page.tsx`
- `src/app/(auth)/change-password/page.tsx`
- `src/app/(auth)/accept-invitation/[token]/page.tsx`
- `src/app/accept-invitation/page.tsx`
- `src/app/(auth)/auth/auth-code-error/page.tsx`

## Main product (dashboard)

- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/dashboard/calendar/page.tsx`
- `src/app/(dashboard)/athletes/page.tsx`
- `src/app/(dashboard)/athletes/[id]/page.tsx`
- `src/app/(dashboard)/groups/page.tsx`
- `src/app/(dashboard)/groups/[id]/page.tsx`
- `src/app/(dashboard)/groups/new/page.tsx`
- `src/app/(dashboard)/trainings/page.tsx`
- `src/app/(dashboard)/trainings/new/page.tsx`
- `src/app/(dashboard)/workouts/library/page.tsx`
- `src/app/(dashboard)/workouts/builder/page.tsx`
- `src/app/(dashboard)/workouts/assign/page.tsx`
- `src/app/(dashboard)/workouts/[assignmentId]/page.tsx`
- `src/app/(dashboard)/activities/[id]/page.tsx`
- `src/app/(dashboard)/races/page.tsx`
- `src/app/(dashboard)/coaches/page.tsx`
- `src/app/(dashboard)/profile/page.tsx`

## Integration callbacks

- `src/app/strava/callback/page.tsx`

## Internal/testing

- `src/app/(dashboard)/dashboard/builder-test/page.tsx`
