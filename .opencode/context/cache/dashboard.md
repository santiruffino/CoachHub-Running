# Dashboard domain

## Description
Role-based landing area for athletes, coaches, and admins. Aggregates alerts, metrics, calendars, and shortcuts into dashboards.

## Entry points
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/layout.tsx`
- `src/app/(dashboard)/dashboard/components/*`

## Key files
- `src/app/(dashboard)/dashboard/components/AthleteDashboard.tsx`
- `src/app/(dashboard)/dashboard/components/CoachDashboardNew.tsx`
- `src/app/(dashboard)/dashboard/components/AdminDashboard.tsx`
- `src/app/(dashboard)/dashboard/components/DashboardClient.tsx`
- `src/components/dashboard/*`
- `src/components/layout/Navbar.tsx`
- `src/components/layout/BottomNav.tsx`

## Dependencies
- Auth/roles and `profiles.team_id`
- Activities, trainings, races, Strava, groups, settings
- Shared dashboard cards/charts and alert components

## Notes
- Most dashboard content is server-fetched and then rendered by client dashboard shells.
- Coach dashboard includes roster, alerts, and training shortcuts.
