# Prompt Context - Backend (Current)

Use this context for generating backend code in this repo.

## Runtime architecture

- Next.js route handlers (`src/app/api/**`)
- Supabase PostgreSQL + RLS
- Supabase Edge Functions for async jobs

There is no active NestJS module/controller runtime here.

## Auth and access

- Session auth via Supabase cookies (`@supabase/ssr`)
- Role checks via `requireAuth` and `requireRole`
- Team boundary via `team_id`

## Key constraints

- Prefer `/api/v2/*` for new/updated endpoints
- Keep authorization explicit before any service-role operation
- Avoid leaking secrets/tokens in logs/responses
- Maintain UUID-first conventions for activity routes

## Domain context

- Running-first product logic
- Cycling support is partial and should be documented when extending logic
