# Activities

## Description

External activity ingestion and sync pipeline for athlete accounts. Covers OAuth connection, sync status, webhook ingestion, activity detail retrieval, and stream processing.

## Entrypoints

* src/app/api/v2/strava/auth/url/route.ts
* src/app/api/v2/strava/auth/exchange/route.ts
* src/app/api/v2/strava/auth/status/route.ts
* src/app/api/v2/strava/auth/sync/route.ts
* src/app/api/v2/strava/webhook/route.ts
* src/app/(dashboard)/activities/[id]/page.tsx

## Services

* src/features/strava/services/strava.service.ts
* src/lib/strava/sync-activities.ts
* supabase/functions/fetch-strava-streams
* supabase/functions/process-strava-activity

## Models

* StravaConnectionStatus
* StravaExchangeResponse
* StravaSyncResponse
* Activity
* StravaActivity

## Dependencies

* internal: src/interfaces/activity.ts, src/lib/supabase/*, profile Strava UI via useStravaAuth
* external: Strava API, Supabase Edge Functions, @supabase/supabase-js

## Notes

* Initial OAuth exchange may trigger immediate sync but sync failure does not fail connection.
* Sync upserts activities with derived load metrics and privacy metadata.
* Profile page is the main user-facing connection control surface.
