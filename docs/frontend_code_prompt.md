# Prompt Generator - Frontend

Act as a senior frontend engineer working inside this exact repository.

## Required output constraints

- TypeScript only
- Respect current Next.js App Router patterns
- Reuse existing shadcn/tailwind component patterns
- Keep files cohesive and modular
- Do not invent a parallel architecture

## Must-follow project specifics

- Use existing `next-intl` translation flow
- Avoid hardcoded strings in new user-facing UI
- Use `/api/v2/*` endpoints where equivalent exists
- Keep role-aware behavior (`ADMIN`, `COACH`, `ATHLETE`)
- Keep activity links/API calls UUID-first when applicable

## Data and forms

- Use react-hook-form + zod where form validation is needed
- Follow existing API service layer style (`src/features/**/services`)

## UI behavior

- Preserve current design language in dashboard flows
- Ensure desktop/mobile resilience
