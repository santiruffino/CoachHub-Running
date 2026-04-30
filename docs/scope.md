# Coach Hub Platform Scope

## Purpose

Coach Hub Running is a multi-tenant coaching platform for running teams.

- Primary goal: plan, assign, and analyze running training at team scale
- Secondary goal: prepare domain architecture for cycling expansion

## In-scope (current)

- Role-based product for `ADMIN`, `COACH`, `ATHLETE`
- Team-scoped access model (`team_id`)
- Athlete/group/training management
- Calendar assignment workflows
- Strava OAuth + sync + webhook ingestion
- Activity detail views and feedback loop

## Out-of-scope (for now)

- Billing/subscription platform features (Stripe lifecycle)
- Full multi-locale i18n rollout beyond current `es`
- Fully implemented cycling domain logic (currently partial)

## Technical scope (current architecture)

- Frontend and API: Next.js 16 App Router
- Auth/DB: Supabase + RLS
- Async processing: Supabase Edge Functions
- Main API surface: `/api/v2/*` with some compatibility routes outside v2

## Running-now, cycling-next constraints

Running is first-class in current business rules.

Cycling has partial support in types/UI, but blocked by:

- running-centric pace assumptions in estimation/matching helpers
- HR-first compliance semantics
- incomplete sport-specific matching constraints

Detailed evidence and priorities are in `documentation/platform-analysis-report.md`.
