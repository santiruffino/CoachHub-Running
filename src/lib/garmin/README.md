# Garmin integration (UNOFFICIAL — pilot)

Pushes Endurix structured workouts to an athlete's Garmin Connect calendar and
pulls their recent activities back. Garmin's official Training/Activity API is
closed, so this uses the unofficial `garmin-connect` npm client (browser-SSO
login + internal endpoints).

**This is a ToS-gray, best-effort integration gated behind an opt-in pilot flag.
Treat it as such.**

## Layout

- `types.ts` — Garmin workout DTO + well-known enum ids.
- `zone-resolver.ts` — Endurix zone targets → concrete HR / pace / power bounds
  (reuses the VAM math in `src/features/profiles/constants/vam.ts`).
- `workout-translator.ts` — `WorkoutBlock[]` → Garmin workout DTO (pure, tested).
- `crypto.ts` — AES-256-GCM encryption for stored session tokens.
- `client.ts` — the ONLY module that touches `garmin-connect`. Swap this for the
  official API if/when it reopens.
- `push-workout.ts` — translate → upload → schedule → record in
  `garmin_workout_links`. Called from `POST /api/v2/trainings/assign` and the
  manual push route.
- `sync-activities.ts` — pull recent activities (provider `garmin`), deduped
  against Strava. Driven by the daily `/api/cron/garmin-backfill` cron.
- `pilot.ts` — `garmin_pilot_enabled` gate.

## Setup

Set a 32-byte key (base64 or hex) used to encrypt Garmin session tokens at rest:

```bash
# generate
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# then set GARMIN_TOKEN_ENC_KEY in the environment
```

Without `GARMIN_TOKEN_ENC_KEY` the integration is inert (`isGarminConfigured()`
returns false and all surfaces are hidden/skipped). The daily pull also needs
`CRON_SECRET` (shared with the other crons).

Enable per-athlete during the pilot: `UPDATE profiles SET garmin_pilot_enabled =
true WHERE id = '<uuid>';`

## Known limitations

- **No MFA/2FA.** `garmin-connect@1.6.2` cannot complete a 2FA login; pilot
  accounts must have 2FA disabled. A 2FA login surfaces as `GARMIN_MFA_UNSUPPORTED`.
- **Login may be blocked from datacenter IPs** (Cloudflare). Validate in the
  pilot; fall back to a Python `garth` sidecar / egress proxy if blocked.
- **Fragile.** Garmin can change the login flow at any time. Failures are logged
  (`garmin.*`) and sent to Sentry; connections flip to `needs_reauth` on auth
  failure.
