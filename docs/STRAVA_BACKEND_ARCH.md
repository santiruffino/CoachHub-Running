# Strava Backend Architecture

This document describes the current Strava backend implementation in this repository.

## Overview

Strava integration is implemented with:

- Next.js route handlers for OAuth and webhook entrypoints
- Supabase DB for tokens/activity storage
- Supabase Edge Functions for asynchronous processing

## Main routes

- `GET /api/v2/strava/auth/url`
- `POST /api/v2/strava/auth/exchange`
- `POST /api/v2/strava/auth/sync`
- `GET /api/v2/strava/auth/status`
- `POST /api/v2/strava/auth/disconnect`
- `GET/POST /api/v2/strava/webhook`

## Async processing components

- `process-strava-activity`
  - processes webhook events and updates activities
- `fetch-strava-streams`
  - resolves streams for activity UUID and caches in `activity_streams`
- `evaluate-compliance`
  - computes compliance summary for activity/assignment context

## Data flow

### OAuth

1. Frontend requests auth URL
2. Athlete authorizes in Strava
3. Frontend exchanges code in `/api/v2/strava/auth/exchange`
4. Tokens stored in `strava_connections`

### Webhook

1. Strava sends webhook event to `/api/v2/strava/webhook`
2. Event is logged
3. Route triggers `process-strava-activity` edge function
4. Activity and assignment linkage are updated

### Streams

1. UI requests `/api/v2/activities/[id]/streams` (UUID)
2. Route checks `activity_streams` cache
3. On miss, route calls `fetch-strava-streams`
4. Response cached and returned

## Security notes

- Use server-side credentials only for privileged operations.
- Keep webhook verification and secret handling strict.
- Avoid logging sensitive tokens or expected secret values.

Detailed risk list is in `documentation/platform-analysis-report.md`.
