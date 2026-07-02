# Notifications & Web Push

Endurix has a unified notification system that fans a single producer call out to
two channels — an **in-app inbox** and **Web Push** — while respecting per-user,
per-category preferences. Daily/weekly digests are batched by a cron job.

## Channels

| Channel | Storage | Delivery |
|---------|---------|----------|
| In-app inbox | `notifications` table | Read on demand via the notification bell; real-time (created immediately) |
| Web Push | `push_subscriptions` table + browser Push API | `web-push` library with VAPID keys; can be immediate or batched into a digest |

## Single producer entry point

Every feature that wants to notify a user calls `createNotification()` — never
writes to the notification tables directly.

- File: `src/lib/notifications/create-notification.ts`
- Signature:
  ```ts
  createNotification({ userId, category, title, body?, link? }): Promise<void>
  ```
- **Never throws.** Failures are logged (`appLogger`) so a notification side effect
  can't break the primary action (e.g. sending a chat message still succeeds even
  if push delivery fails).

### Categories

`NotificationCategory` (also used as the `notifications.type` value):

- `chat_message` — new coach↔athlete message
- `workout_assigned` — a training assignment was created for the athlete
- `race_reminder` — a planned race is approaching (see `races-approaching` cron)
- `rpe_mismatch` — reported RPE diverges from expected effort
- `low_compliance` — compliance dropped below threshold
- `training_load` — training-load / injury-risk signal
- `system` — platform messages

### Delivery logic

For each call, `createNotification` reads the user's `notification_preferences`
row for that category (defaulting to `{ in_app_enabled: true, push_enabled: true,
frequency: 'immediate' }` when unset), then:

1. If `in_app_enabled`, inserts a `notifications` row. `push_sent_at` is stamped
   now when push is sent immediately, or left `NULL` so the digest cron can pick
   it up later.
2. If `push_enabled` **and** frequency is `immediate` (or the in-app row is
   disabled, so there's nothing to batch), sends Web Push immediately via
   `sendPushToUser()`.
3. If `push_enabled` and frequency is `daily`/`weekly`, push is **deferred** —
   the in-app row is created with `push_sent_at = NULL` and the digest cron
   delivers it later.

### Web Push delivery

`sendPushToUser(userId, { title, body?, link? })`:

- Loads all `push_subscriptions` rows for the user.
- Requires VAPID config; no-ops silently if VAPID env vars are unset.
- Sends the JSON payload to each subscription endpoint.
- **Self-heals**: a `404`/`410` response (expired/unsubscribed endpoint) deletes
  that `push_subscriptions` row.

## Digest cron

`GET /api/cron/notifications-digest?window=daily|weekly`
(`src/app/api/cron/notifications-digest/route.ts`)

- Authenticated with the `CRON_SECRET` bearer token (see [observability.md](./observability.md)).
- Scheduled in `vercel.json`: `daily` at 08:00 UTC, `weekly` Mondays at 08:00 UTC.
- Finds users whose preference `frequency` matches the window and `push_enabled`,
  collects their unsent notifications (`push_sent_at IS NULL`, within the lookback
  window), sends **one** summarized push per user, and stamps `push_sent_at`.
- The in-app inbox always stays real-time; this cron only catches up on the
  deferred push side.

## API surface

All under `src/app/api/v2/notifications/**` (auth required):

| Method & path | Purpose |
|---------------|---------|
| `GET /api/v2/notifications` | List the current user's in-app notifications |
| `POST /api/v2/notifications/[id]/read` | Mark one notification read |
| `POST /api/v2/notifications/read-all` | Mark all read |
| `GET /api/v2/notifications/preferences` | Read per-category preferences |
| `PUT /api/v2/notifications/preferences` | Update per-category preferences |
| `POST /api/v2/notifications/push-subscriptions` | Register a browser push subscription |
| `DELETE /api/v2/notifications/push-subscriptions` | Remove a push subscription |

## Frontend

- `src/features/notifications/components/NotificationBell.tsx` — inbox dropdown + unread badge.
- `src/features/notifications/components/NotificationToastListener.tsx` — surfaces new notifications as toasts.
- `src/features/notifications/components/NotificationPreferencesForm.tsx` — per-category channel/frequency controls (page: `src/app/(dashboard)/settings/notifications/page.tsx`).
- `src/features/notifications/hooks/usePushSubscription.ts` — service-worker subscription lifecycle (browser permission → subscribe → register with API).
- `src/features/notifications/services/notifications.service.ts` — client access to the API surface above.

## Environment variables

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=   # public VAPID key (exposed to the browser)
VAPID_PRIVATE_KEY=              # server-only
VAPID_SUBJECT=mailto:support@endurix.app
CRON_SECRET=                    # bearer token the digest cron requires
```

Generate VAPID keys with `npx web-push generate-vapid-keys`.

## Schema

The three tables originally existed only in the live Supabase database. They are
now backfilled in migration
[`supabase/migrations/20260702110000_notification_tables.sql`](../supabase/migrations/20260702110000_notification_tables.sql),
which reproduces the production schema exactly and is idempotent (safe to re-run).

Columns (as in production):

- `notifications`: `id`, `user_id` (FK `profiles` ON DELETE CASCADE), `type`,
  `title`, `body`, `link`, `is_read` (bool, default false), `created_at`,
  `push_sent_at`. Index on `(user_id, is_read, created_at DESC)`.
  > Read state is tracked with the boolean **`is_read`** (not a `read_at`
  > timestamp). RLS: users can `SELECT`/`UPDATE` their own rows; **inserts happen
  > via the service role** in `createNotification()` (no INSERT policy).
- `push_subscriptions`: `id`, `user_id`, `endpoint` (UNIQUE), `p256dh`, `auth`,
  `created_at`. RLS: users `SELECT`/`INSERT`/`DELETE` their own.
- `notification_preferences`: `id`, `user_id`, `category`, `in_app_enabled`,
  `push_enabled`, `email_enabled`, `frequency` (`immediate|daily|weekly`, CHECK),
  `created_at`, `updated_at`, UNIQUE `(user_id, category)`. RLS: users
  `SELECT`/`INSERT`/`UPDATE` their own.

> `email_enabled` exists in the schema but there is no email delivery channel
> wired up yet — only in-app and Web Push are implemented.

## Related

- Coach↔athlete chat, which produces `chat_message` notifications: [docs/COACH_ATHLETE_COMMUNICATION.md](../docs/COACH_ATHLETE_COMMUNICATION.md)
- Cron scheduling, secrets, logging: [observability.md](./observability.md)
