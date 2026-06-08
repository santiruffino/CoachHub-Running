# Product Analytics (GA4)

## Overview

Endurix uses Google Analytics 4 (GA4) for product funnel instrumentation.

- Provider: GA4 via `gtag.js`
- Runtime injection: `src/components/analytics/GoogleAnalytics.tsx`
- Event helpers: `src/lib/analytics/events.ts`

## Environment

Set the GA measurement id in client env:

- `NEXT_PUBLIC_GA_MEASUREMENT_ID`

If not present, analytics functions no-op safely.

## Funnel events implemented

### Signup funnel

- `sign_up_started`
  - params: `role`, `method`
- `sign_up_completed`
  - params: `role`, `method`
- `sign_up_failed`
  - params: `role`, `method`, `reason`

Current signup flow source: invitation acceptance (`/accept-invitation`).

### Onboarding funnel

- `onboarding_started`
  - params: `role`, `flow`
- `onboarding_completed`
  - params: `role`, `flow`
- `onboarding_failed`
  - params: `role`, `flow`, `reason`

Flows:

- Athlete onboarding: `flow=athlete_dedicated`
- Coach onboarding: `flow=coach_dedicated`

### Retention proxies

- `session_authenticated`
  - params: `role`, `onboarding_completed`
- `dashboard_viewed`
  - params: `role`, `visit_type` (`new`|`returning`)
- `login_success`

## Additional lifecycle events

- `invitation_created`
  - params: `role` (`ATHLETE`|`COACH`)

## Team invite links (shareable sign-up URL)

- `team_invite_link_created`
  - params: `team_id`, `has_expiry` (bool), `has_max_uses` (bool)
- `team_invite_link_revoked`
  - params: `link_id`
- `team_invite_link_rotated`
  - params: `link_id`
- `team_invite_link_used`
  - params: `link_id`, `method` (`team_link`)

The `sign_up_completed` event now also includes `method: 'team_link'` for sign-ups via team invite links.

## Notes

- Pageviews are tracked on route/query changes using `pageview()` in `GoogleAnalytics`.
- Event names are snake_case to keep GA exploration consistent.
- Keep event params stable to preserve funnel report continuity.
