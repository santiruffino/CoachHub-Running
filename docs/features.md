# Feature Tracking

Use this file as a lightweight product / engineering backlog.

## Status legend

- `todo`
- `in_progress`
- `done`
- `blocked`

## Current priorities

| Item | Status | Priority | Notes |
|---|---|---|---|
| SAN-96 Security hardening (webhook / authz / OAuth state) | done | P0 | Webhook validation + OAuth state signing / expiry + standardized failures |
| SAN-99 API hardening (rate limiting + v2 error contract) | done | P0 | Middleware v2 throttling + standardized API error payload shape |
| SAN-91 Settings (Coach + Team settings with persisted config) | done | P0 | Added settings pages + APIs + DB tables (`coach_settings`, `team_settings`) |
| SAN-102 Audit logs (append-only admin action log, first cut) | done | P0 | Added `admin_action_logs`, append-only trigger, admin read API / UI, critical write instrumentation |
| SAN-94 Onboarding (Coach flow + completion tracker + starter templates) | done | P0 | Added `/onboarding/coach`, tracker UI, completion endpoint, and starter template bootstrap |
| SAN-93 Analytics (GA4 signup / onboarding / retention funnels) | done | P0 | Added GA4 integration + event taxonomy for signup, onboarding, auth, dashboard retention |
| SAN-97 Accessibility / UI refinement (critical primitives + tests) | done | P1 | Added WCAG-focused dialog behavior and component tests (`button`, `input`, `alert-dialog`) |
| i18n normalization for API / user-visible errors | done | P0 | Standardized code registry implemented |
| Remove stale legacy docs / prompts | done | P1 | Archived to `docs/legacy` |
| Running-first assumptions for cycling readiness | done | P1 | Added Power / FTP support + Sport Guards |
| Dead / orphaned component cleanup pass | done | P2 | Legacy API aliases removed |
| Training load columns + backfill | done | P1 | `load_score`, `suffer_score` columns, 90-day backfill job, scheduled purge |
| Smart alert scoring for `training_load` | done | P1 | `lib/alerts/scoring.ts` factors ACWR + TSB + load risk |
| **Athlete fitness visibility on dashboard** | done | P1 | 4 fitness status cards (CTL / ATL / TSB / ACWR) + Estado de Forma chart with 7 / 30 / 90-day range selector + personalized pace zones (VAM) on athlete dashboard |
| Personalized pace zones (VAM) component | done | P1 | New `features/profiles/components/PaceZones.tsx` mirroring `HeartRateZones` pattern; falls back to `/profile` link when VAM absent |
| **Team invite links (shareable sign-up URL)** | done | P1 | Reusable per-team link; coach/admin creates once, shares via WhatsApp/QR; athlete signs up and joins team; atomic RPC + audit log |
| **Team athlete limit (pricing-tier cap)** | done | P1 | `max_athletes` in `team_settings`; enforced on both per-email and team-link sign-ups; admin-only UI in `/settings/team` |
| **Notifications system (in-app + Web Push + digests)** | done | P1 | Unified `createNotification()` producer, per-category preferences, VAPID push, daily/weekly digest cron; see `documentation/notifications.md` |
| **Coach↔athlete chat (SAN-115)** | done | P1 | `coach_athlete_messages`, `/api/v2/users/[id]/messages`, chat UI on coach + athlete views; see `docs/COACH_ATHLETE_COMMUNICATION.md` |
| **MCP server for AI coach tools** | done | P2 | Authenticated `/api/mcp` with 7 tools (profile, athletes, groups, compliance, races, notify); RLS-enforced, rate limited; see `documentation/mcp-server.md` |
| **Scheduled jobs (Vercel Cron)** | done | P1 | `notifications-digest`, `races-approaching`, `strava-backfill`, health ping; `CRON_SECRET` auth; see `documentation/observability.md` |
| **DB-backed rate limiting** | done | P1 | `rate_limit_buckets` + `consume_rate_limit` RPC; cross-instance, fails open |
| **Security/RLS hardening (June 2026)** | done | P0 | `SECURITY DEFINER` search_path, RLS initplan optimization, duplicate-policy cleanup, FK indexes, **profile-update authz fix** |
| **Strava backfill queue** | done | P1 | `activity_backfill_jobs` + atomic `claim_activity_backfill_jobs` RPC drained by daily cron |
| Notification table migrations mirrored locally | done | P1 | `notifications`/`push_subscriptions`/`notification_preferences` were already in the remote history; mirrored as local files `20260628213203`, `20260628225621`, `20260630003820` |
| Reconcile local ↔ remote migration divergence | todo | P1 | Local `supabase/migrations/` uses a different versioning scheme than the remote history (which only tracks from 2026-06-27); run `supabase db pull` to fully reconcile |
| Marketing features doc refresh | done | P2 | `docs/MARKETING_FEATURES.md` aligned to current product pillars and the new athlete cockpit |
| English copy bank for marketing / landing | done | P2 | Added to `docs/MARKETING_FEATURES.md` §6 |
| Instagram promotion strategy | done | P2 | `docs/INSTAGRAM_STRATEGY.md` with content pillars, posting cadence, hashtag set, KPI loop |

## Notes

- Full evidence and references: `documentation/platform-analysis-report.md`
- Marketing copy and social hooks: `docs/MARKETING_FEATURES.md`
- Promotion plan: `docs/INSTAGRAM_STRATEGY.md`
