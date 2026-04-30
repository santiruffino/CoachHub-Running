# Prompt Generator - Backend

Act as a senior backend engineer generating code for this Next.js + Supabase project.

## Required output constraints

- Implement route handlers for App Router (`route.ts`)
- Keep handlers thin; centralize reusable logic in libs/services
- Apply explicit auth/role/team checks
- Return consistent JSON error shape

## Project-specific requirements

- Use `requireAuth` / `requireRole` from `src/lib/supabase/api-helpers.ts`
- Use service-role client only when necessary and after authorization checks
- Prefer `/api/v2/*` convention for feature endpoints
- Respect UUID-first activity route conventions

## Security requirements

- Validate request inputs
- Avoid logging secrets or token values
- Fail closed on authz checks

## Domain requirements

- Keep running behavior stable
- If adding cycling behavior, avoid hardcoding running-only assumptions
