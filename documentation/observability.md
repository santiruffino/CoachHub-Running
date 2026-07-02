# Observability, Cron & Runtime Hardening

This doc covers the cross-cutting operational machinery: scheduled jobs, error
tracking, structured logging, and rate limiting.

## Scheduled jobs (Vercel Cron)

Cron schedules are declared in `vercel.json`. The project runs on the Vercel
**Hobby** plan, which only allows **daily** cron granularity — this constrains
several jobs (notably `strava-backfill`, which drains its whole queue in one
daily run instead of small frequent batches).

| Path | Schedule (UTC) | Route | Purpose |
|------|----------------|-------|---------|
| `/api/health` | `0 0 * * *` (daily 00:00) | `src/app/api/health/route.ts` | Liveness ping |
| `/api/cron/notifications-digest?window=daily` | `0 8 * * *` (daily 08:00) | `.../notifications-digest/route.ts` | Batched daily push digest |
| `/api/cron/notifications-digest?window=weekly` | `0 8 * * 1` (Mon 08:00) | same | Batched weekly push digest |
| `/api/cron/races-approaching` | `0 9 * * *` (daily 09:00) | `.../races-approaching/route.ts` | Notify athletes 7 days before a planned race |
| `/api/cron/strava-backfill` | `0 10 * * *` (daily 10:00) | `.../strava-backfill/route.ts` | Drain queued Strava activity backfill jobs |

### Cron authentication

Every `/api/cron/*` handler requires an `Authorization: Bearer <CRON_SECRET>`
header and returns `401` otherwise. Vercel Cron sends this automatically when
`CRON_SECRET` is set in the project's environment.

### Job design notes

- **notifications-digest** — only touches deferred push (`push_sent_at IS NULL`);
  the in-app inbox is always real-time. See [notifications.md](./notifications.md).
- **races-approaching** — dedupes with `athlete_races.reminder_sent_at` so a retry
  or same-day re-run never double-notifies.
- **strava-backfill** — claims jobs atomically via the `claim_activity_backfill_jobs`
  RPC (`SELECT ... FOR UPDATE SKIP LOCKED`), so overlapping invocations never
  process the same job twice. Runs jobs **sequentially** because they share one
  Strava API rate budget. `maxDuration = 60s`; a job cut off mid-flight is
  recovered on the next run via the stuck-job timeout (10 min). Batch size is
  25 jobs/invocation, sized for the daily cadence.

## Error tracking (Sentry)

`@sentry/nextjs` is wired for server, edge, and client runtimes:

- `sentry.server.config.ts`, `sentry.edge.config.ts`, `sentry.client.config.ts`
- `withSentryConfig` in `next.config.ts` handles build-time source-map upload.
- `release` is pinned to `VERCEL_GIT_COMMIT_SHA`.
- `sendDefaultPii: false` — user context is attached explicitly via
  `Sentry.setUser()` where needed rather than captured automatically.
- `enableLogs: true` forwards logs to Sentry.
- There's an example page/route (`/sentry-example-page`, `/api/sentry-example-api`)
  for verifying the integration end-to-end.

### Environment variables

```env
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.1
NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE=0.1
NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE=1.0
# Build-time only (source-map upload):
SENTRY_AUTH_TOKEN=
SENTRY_ORG=
SENTRY_PROJECT=
```

## Structured logging

`src/lib/logger.ts` provides a small structured JSON logger.

- `createRequestLogger(route, request, context?)` returns `{ requestId, logger }`.
  The request id is taken from an inbound `x-request-id` header or generated, and
  echoed on the response via `withRequestId()`.
- Log methods take an **event name + metadata**: `logger.info('mcp.request', { userId })`.
  Events use dotted names (`races_approaching.unauthorized`, `strava_backfill_cron.job_failed`).
- Levels: `debug < info < warn < error`. Minimum level is `LOG_LEVEL`
  (defaults to `info` in production, `debug` otherwise).
- **Automatic secret redaction**: any metadata key matching
  `authorization|token|secret|password|cookie|apikey|access_token|refresh_token|code|challenge|state|subscription_id`
  is replaced with `[REDACTED]` (recursively).
- `Error` metadata is expanded to `errorName/errorMessage/errorStack`.
- `src/lib/app-logger.ts` is a context-free logger for non-request code paths
  (e.g. `createNotification`, the rate limiter).

## Rate limiting

Two layers, both **cross-instance** (backed by Postgres, not in-memory), so limits
hold across serverless instances.

- Store: `rate_limit_buckets` table + `consume_rate_limit(p_key, p_limit, p_window_ms)`
  RPC — migration `20260627010000_rate_limit_buckets.sql`. A scheduled purge
  (`20260627011000`) trims old buckets.
- Helper: `src/lib/api/rate-limit.ts`
  - `consumeRateLimit({ key, limit, windowMs })` → `{ allowed, limit, remaining, resetAt, retryAfterSeconds }`.
    **Fails open** on store errors (logs, then allows) so a rate-limit outage
    never blocks legitimate traffic.
  - `buildRateLimitKey(pathname, ip, userId)` — prefers `user:` scope, falls back
    to `ip:`, then `anon:`.
  - `getClientIpFromHeaders(headers)` — reads `x-forwarded-for` / `x-real-ip`.
- Applied at the v2 middleware layer and directly in high-cost routes (e.g.
  `/api/mcp` at 30 req/min, Strava webhook throttling).
- `429` responses carry `x-ratelimit-limit/-remaining/-reset` and `retry-after` headers.

### Environment variables

```env
LOG_LEVEL=                     # debug|info|warn|error (optional)
API_RATE_LIMIT_WINDOW_MS=60000
API_RATE_LIMIT_MAX_REQUESTS=120
```

## Health check

`GET /api/health` — lightweight liveness endpoint, also used as the daily cron
heartbeat.

## Related

- Notification digest cron: [notifications.md](./notifications.md)
- MCP route rate limiting: [mcp-server.md](./mcp-server.md)
- Security-hardening migrations (RLS/`SECURITY DEFINER`): [database.md](./database.md), [roles_and_permissions.md](./roles_and_permissions.md)
