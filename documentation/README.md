# Endurix Documentation Index

This repository has **two docs folders** for historical reasons:

- **`documentation/`** — architecture & engineering reference (this folder).
- **`docs/`** — product/feature descriptions, operational guides, and
  marketing/strategy material.

Plus root-level entry points: **[`../README.md`](../README.md)** (setup + overview),
**[`../CLAUDE.md`](../CLAUDE.md)** (agent onboarding), **[`../QUICKSTART.md`](../QUICKSTART.md)**.

Use this page to find the **canonical** doc for each topic. When two files cover
the same topic, the canonical one is marked and the other carries a pointer banner.

## Architecture & engineering (`documentation/`)

| Topic | Canonical doc |
|-------|---------------|
| Backend / API architecture | [backend.md](./backend.md) |
| Frontend architecture | [frontend.md](./frontend.md) |
| Database architecture (full) | [database.md](./database.md) |
| Domain model & relations (ER) | [models_and_relations.md](./models_and_relations.md) |
| Roles & permissions | [roles_and_permissions.md](./roles_and_permissions.md) |
| Notifications & Web Push | [notifications.md](./notifications.md) |
| Cron, Sentry, logging, rate limiting | [observability.md](./observability.md) |
| MCP server (`/api/mcp`) | [mcp-server.md](./mcp-server.md) |
| Product analytics (GA4) | [analytics.md](./analytics.md) |
| Team invite links (deep dive) | [team-invite-links.md](./team-invite-links.md) |
| Product behavior & workflows | [product.md](./product.md) |
| Platform gap/readiness analysis | [platform-analysis-report.md](./platform-analysis-report.md) |
| Cycling readiness | [sport-readiness.md](./sport-readiness.md) |
| Security audit | [security-audit.md](./security-audit.md) |
| i18n audit | [i18n-audit.md](./i18n-audit.md) |
| Dead-code audit | [dead-code-audit.md](./dead-code-audit.md) |
| First steps (contributor) | [first-steps.md](./first-steps.md) |

## Product, features & operations (`docs/`)

| Topic | Doc |
|-------|-----|
| Feature overview (plain language) | [../docs/ENDURIX_FEATURES_OVERVIEW.md](../docs/ENDURIX_FEATURES_OVERVIEW.md) |
| Feature backlog / tracking | [../docs/features.md](../docs/features.md) |
| MVP baseline spec | [../docs/MVP_FEATURES.md](../docs/MVP_FEATURES.md) |
| MVP status (implemented) | [../docs/MVP_FEATURES_STATUS.md](../docs/MVP_FEATURES_STATUS.md) |
| MVP analysis | [../docs/mvp_analysis.md](../docs/mvp_analysis.md) |
| Platform scope | [../docs/scope.md](../docs/scope.md) |
| Screens list | [../docs/screens_list.md](../docs/screens_list.md) |
| Account setup & onboarding | [../docs/setup_guide.md](../docs/setup_guide.md) |
| Invitation flow | [../docs/invitation_flow.md](../docs/invitation_flow.md) |
| Coach↔athlete communication (notes vs chat) | [../docs/COACH_ATHLETE_COMMUNICATION.md](../docs/COACH_ATHLETE_COMMUNICATION.md) |
| Strava integration guide | [../docs/STRAVA_INTEGRATION_GUIDE.md](../docs/STRAVA_INTEGRATION_GUIDE.md) |
| Strava backend architecture | [../docs/STRAVA_BACKEND_ARCH.md](../docs/STRAVA_BACKEND_ARCH.md) |
| Service-role key usage | [../docs/SERVICE_ROLE_KEY.md](../docs/SERVICE_ROLE_KEY.md) |
| Mock data policy | [../docs/MOCK_DATA.md](../docs/MOCK_DATA.md) |
| Design system — strategy | [../docs/DESIGN.md](../docs/DESIGN.md) |
| Design system — dashboard implementation | [../docs/DASHBOARD-DESIGN-SYSTEM.md](../docs/DASHBOARD-DESIGN-SYSTEM.md) |
| Marketing features / copy bank | [../docs/MARKETING_FEATURES.md](../docs/MARKETING_FEATURES.md) |
| Instagram strategy | [../docs/INSTAGRAM_STRATEGY.md](../docs/INSTAGRAM_STRATEGY.md) |
| Historical prompts / archived plans | [../docs/legacy/](../docs/legacy/) |

## Known overlaps & canonical picks

| Topic | Canonical | Redundant copy (has pointer) |
|-------|-----------|------------------------------|
| Database schema | [database.md](./database.md) (full detail) | [../docs/database_schema.md](../docs/database_schema.md) (condensed map) |
| Design system | [../docs/DESIGN.md](../docs/DESIGN.md) + [../docs/DASHBOARD-DESIGN-SYSTEM.md](../docs/DASHBOARD-DESIGN-SYSTEM.md) | [DESIGN.md](./DESIGN.md) (kept for old links) |

## Known documentation gaps / TODO

- **i18n** — single locale (`es`); many hardcoded strings remain
  ([i18n-audit.md](./i18n-audit.md)).

Recently closed: the notification tables (`notifications`, `push_subscriptions`,
`notification_preferences`), which previously existed only in the live DB, are now
in migration `20260702110000_notification_tables.sql`.

## Conventions

- Put **new** architecture docs in `documentation/` and add a row here.
- Prefer updating a canonical doc over creating a parallel one; if you must keep a
  second copy, add a pointer banner to the non-canonical file.
- Dates in docs are absolute (`YYYY-MM-DD`).
