# Prompt Context - Frontend (Current Stack)

Use this context when generating frontend code for this repository.

## Stack

- Next.js 16 App Router
- React 19 + TypeScript
- Tailwind + shadcn/ui
- `next-intl` (currently `es` locale)
- Axios client (`src/lib/axios.ts`) to Next API routes

## Architecture conventions

- Keep feature-first organization under `src/features/**`
- Use route handlers in `src/app/api/**` as backend surface
- Prefer existing design language from active dashboard pages
- Avoid introducing alternate architecture patterns not used in repo

## Product context

- Running-first platform
- Cycling support is staged and partial

## Quality requirements

- Avoid hardcoded user-facing strings; use translation keys
- Keep role-aware UX (`ADMIN`, `COACH`, `ATHLETE`)
- Use UUID-first activity route assumptions in UI links and API calls
