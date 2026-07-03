# Database Architecture

## Overview

Endurix uses Supabase PostgreSQL as the source of truth.

- auth identities are managed by Supabase Auth
- app profiles and domain data live in public tables
- data access is enforced with RLS + app-layer role / team checks
- canonical SQL changes live in `supabase/migrations/*.sql`
- historical / manual SQL scripts live in `supabase/queries/legacy/*.sql`

## Multi-tenant model

The active tenant boundary is `team_id`.

- team-centric RLS migration:
  - `supabase/migrations/20260429000000_team_based_rls.sql`
- ownership metadata migration (`created_by`):
  - `supabase/migrations/20260429000001_created_by_and_team_policies.sql`

`coach_id` still exists in some flows for direct responsibility relationships, but shared resource access is team-centric.

## Core tables (current)

- `profiles` (role, team linkage)
- `coach_profiles`
- `athlete_profiles` (height, weight, restHR, maxHR, lthr, vam, uan, **ftp**, dob, hr_zones, coach_notes)
- `groups`
- `athlete_groups`
- `trainings`
- `training_assignments`
- `activities` (internal UUID + external Strava id; **`load_score`, `suffer_score`**, `avg_hr`, `max_hr`, `average_speed`, `max_speed`, `metadata` JSONB)
- `activity_streams` (cached streams, 7-day retention)
- `activity_compliance` (compliance_score, is_violation, violation_details)
- `activity_backfill_jobs` (async load recomputation, 90-day retention)
- `strava_connections` (OAuth tokens)
- `activity_feedback` (RPE, sensations, comment)
- `races`, `athlete_races`
- `invitations`
- `coach_settings`
- `team_settings` (includes `max_athletes` for pricing-tier caps)
- `admin_action_logs` (append-only)
- `athlete_metrics` (historical VAM / UAN measurements — `metric_type` enum: `VAM` | `UAN`)
- `alerts` (smart alert scoring)
- `wishlist_signups` (public landing-page captures)
- `teams` (canonical team registry — id, name, sport, created_at; backfilled from `profiles.team_id`)
- `team_invite_links` (shareable sign-up URLs — token, team_id, created_by, label, is_active, expires_at, max_uses, uses, last_used_at; supports targeted invites and coach-role links)
- `coach_athlete_messages` (two-way coach↔athlete chat — `athlete_id`, `coach_id`, `sender_id`, `body`, `read_at`, `created_at`)
- `rate_limit_buckets` (cross-instance API rate limiting, consumed via `consume_rate_limit` RPC; scheduled purge)
- `notifications`, `push_subscriptions`, `notification_preferences` — see the notifications section below

## Notifications tables

The notification system (see [notifications.md](./notifications.md)) uses three
tables, defined by `20260628213203_create_notifications_table.sql`,
`20260628225621_create_notification_preferences_and_push_subscriptions.sql`, and
`20260630003820_add_alert_dedup_and_notification_digest_columns.sql` (the last adds
`notifications.push_sent_at`).

- `notifications` — `id`, `user_id`, `type`, `title`, `body`, `link`, `is_read`, `created_at`, `push_sent_at` (read state is the boolean `is_read`; rows inserted via service role)
- `push_subscriptions` — `id`, `user_id`, `endpoint` (unique), `p256dh`, `auth`, `created_at`
- `notification_preferences` — `id`, `user_id`, `category`, `in_app_enabled`, `push_enabled`, `email_enabled`, `frequency` (`immediate|daily|weekly`), `created_at`, `updated_at`, unique `(user_id, category)`

## Access model

Enforcement occurs in three layers:

1. UI behavior by role
2. API role / team checks (`requireRole`, explicit profile queries)
3. RLS policies in Postgres

## Activity identity

- internal route identity: `activities.id` (UUID)
- provider mapping: `activities.external_id`

This UUID-first approach is now standard in v2 activity endpoints.

## Streams and async processing

- Streams are cached in `activity_streams` (7-day retention, scheduled purge).
- Stream fetching and activity processing use Supabase Edge Functions.

## Training load model

- `activities.load_score` — weighted score derived from `suffer_score` and `duration`, written by the activity-processing pipeline.
- `activity_backfill_jobs` — async job to recompute load scores for a window of activities (e.g. 90 days).
- `GET /api/v2/users/[id]/load-metrics` — returns the Banister-style CTL / ATL / TSB / ACWR series for the requested range, plus the current snapshot and a risk classification.
- The athlete's home dashboard consumes the same endpoint as the coach's `AthleteDetailsView`, so both views stay consistent.

## Settings and admin audit model

- `team_settings`
  - keyed by `team_id`
  - stores `thresholds`, `branding`, `default_models`, `max_athletes`
  - `max_athletes` (integer, nullable) enforces athlete cap for pricing tiers
  - admin write access; team staff read access
- `coach_settings`
  - keyed by `coach_id`
  - stores coach-level `thresholds` and `default_models`
  - coach self-management (and admin override) within team boundary
- `admin_action_logs`
  - append-only critical write events (`action`, `target_type`, `target_id`, `metadata`)
  - actions include: `team_settings.updated`, `team_invite_link.created`, `team_invite_link.revoked`, `team_invite_link.rotated`, `team_invite_link.used`
  - update / delete blocked by DB triggers
  - admin team-scoped read access via RLS

## Security & performance hardening (June 2026)

A batch of migrations resolved Supabase advisor findings:

- `20260627021000_harden_security_definer_functions.sql` — pins an explicit
  `search_path` on every `SECURITY DEFINER` function (`function_search_path_mutable`).
- `20260627022000_optimize_rls_auth_function_calls.sql` — wraps `auth.uid()`/
  `auth.role()` in RLS policies as `(select …)` so they evaluate once per query
  (`auth_rls_initplan`).
- `20260627023000_drop_duplicate_rls_policies.sql` — removes duplicate permissive
  policies (`multiple_permissive_policies`).
- `20260627024000_fix_profile_update_authorization.sql` — **security fix**: the
  "update own profile" policy previously let any team member update any other
  member's profile (checked `team_id` only, not role/ownership).
- `20260627020000_add_missing_fk_indexes.sql` — covering indexes for FK columns
  used in joins/RLS lookups.

See [roles_and_permissions.md](./roles_and_permissions.md).

## Rate limiting

DB-backed, cross-instance rate limiting lives in `rate_limit_buckets` +
`consume_rate_limit(p_key, p_limit, p_window_ms)`
(`20260627010000_rate_limit_buckets.sql`, purge `20260627011000`). Details in
[observability.md](./observability.md#rate-limiting).

## Notes for future cycling support

Schema can support cycling activities, but domain semantics (targets / compliance / matching) still carry running-first assumptions in current business logic.
