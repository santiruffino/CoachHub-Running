# Strava domain

## Description
OAuth connection, sync, activity details, and weekly volume visualization.

## Entry points
- `src/app/strava/callback/page.tsx`
- `src/app/api/v2/strava/auth/*`
- `src/app/api/v2/strava/webhook/route.ts`
- `src/app/api/v2/users/[id]/activities/route.ts`

## Key files
- `src/features/strava/components/StravaStatusCard.tsx`
- `src/features/strava/components/ConnectStravaButton.tsx`
- `src/features/strava/components/WeeklyVolumeChart.tsx`
- `src/features/strava/services/strava.service.ts`
- `src/lib/strava/oauth-state.ts`
- `src/lib/strava/sync-activities.ts`
- `src/lib/strava/sync-zones.ts`

## Dependencies
- Supabase auth/roles, athlete profile data
- Activity/zone models and dashboard cards
- OAuth state signing and webhook handling

## Notes
- `WeeklyVolumeChart` combines Strava actuals with planned training load.
- OAuth state is signed and verified server-side.
