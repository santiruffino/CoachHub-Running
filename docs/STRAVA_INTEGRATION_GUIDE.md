# Strava Integration Guide

This guide explains the current user-facing Strava behavior.

## Connect account

1. Go to profile Strava section.
2. Click connect.
3. Authorize in Strava.
4. Return to app and confirm status.

## Sync behavior

- Manual sync is available from the Strava status UI.
- Webhook flow is available for asynchronous updates.
- Activity streams are fetched/cached via edge function pipeline.

## Data shown in product

- imported activities list
- activity detail metrics/charts/splits/laps
- coach-visible athlete activity details (team-permitted)

## Operational requirements

- Set OAuth env vars:
  - `STRAVA_CLIENT_ID`
  - `STRAVA_CLIENT_SECRET`
  - `STRAVA_REDIRECT_URI`
- Set webhook env vars:
  - `STRAVA_WEBHOOK_VERIFY_TOKEN`
  - `STRAVA_SUBSCRIPTION_ID`

## Notes

- Running is first-class in current analytics logic.
- Cycling activity data can be ingested, but full sport-specific coaching logic is not fully complete yet.
