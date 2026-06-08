# Endurix Platform Scope

## Purpose

Endurix is a multi-tenant coaching platform for running teams, with a staged path to cycling.

- Primary goal: plan, assign, and analyze running training at team scale
- Secondary goal: prepare domain architecture for cycling expansion

## In-scope (current)

- Role-based product for `ADMIN`, `COACH`, `ATHLETE`
- Team-scoped access model (`team_id`)
- Athlete / group / training management
- Calendar assignment workflows
- Strava OAuth + sync + webhook ingestion (hardened)
- Activity detail views, streams, and feedback loop
- Workout builder with VAM-based and FTP-based target pacing
- Personalized training zones (HR + VAM pace)
- **Training load (CTL / ATL / TSB / ACWR)** visible to both coach and athlete
- Coach and team settings with admin override
- Append-only admin audit log
- GA4 product analytics

## Out-of-scope (for now)

- Billing / subscription platform features (Stripe lifecycle)
- Full multi-locale i18n rollout beyond current `es` (English copy prepared in `docs/MARKETING_FEATURES.md` for future locale work)
- Fully implemented cycling domain logic (currently partial — power zones in builder, sport-aware rendering, but no full sport-specific compliance / matching)

## Technical scope (current architecture)

- Frontend and API: Next.js 16 App Router
- Auth / DB: Supabase + RLS
- Async processing: Supabase Edge Functions
- Main API surface: `/api/v2/*` with some compatibility routes outside v2

## Running-now, cycling-next constraints

Running is first-class in current business rules.

Cycling has partial support in types / UI, but blocked by:

- running-centric pace assumptions in estimation / matching helpers
- HR-first compliance semantics
- incomplete sport-specific matching constraints

Detailed evidence and priorities are in `documentation/platform-analysis-report.md` and `documentation/sport-readiness.md`.
