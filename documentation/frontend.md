# Frontend Architecture

## Technology stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS + shadcn/ui
- `next-intl` for localization
- Recharts + ECharts for analytics views

## App structure

- `src/app/(auth)/**`: authentication pages
- `src/app/(dashboard)/**`: authenticated coach/admin/athlete product
- `src/app/api/**`: route handlers
- `src/features/**`: domain modules
- `src/components/**`: reusable components

## Data flow

Current UI data access is primarily:

1. client components/services -> `src/lib/axios.ts`
2. axios -> Next.js API routes under `/api` (mostly `/api/v2`)
3. route handlers -> Supabase

The app does not rely exclusively on direct Server Component Supabase queries.

## Analytics

GA4 product analytics is integrated client-side:

- Provider bootstrap: `src/components/analytics/GoogleAnalytics.tsx`
- Event mapping/helpers: `src/lib/analytics/events.ts`
- Measurement env var: `NEXT_PUBLIC_GA_MEASUREMENT_ID`

Tracked funnels include signup, onboarding, and retention proxies.
See `documentation/analytics.md` for the canonical event catalog.

## Role-based UI behavior

- Main dashboard delegates by role in `src/app/(dashboard)/dashboard/page.tsx`
  - `ADMIN` -> AdminDashboard
  - `ATHLETE` -> AthleteDashboard
  - default -> CoachDashboard

Navigation now includes admin audit log access:

- `ADMIN` sees `/settings/audit-logs` entry in primary and mobile nav
- settings shortcut resolves by role:
  - `ADMIN` -> `/settings/team`
  - `COACH` -> `/settings/coach`
  - `ATHLETE` -> `/profile`

## i18n model

- Supported locales currently: `es` only
  - `src/i18n/config.ts`
- Message bundle loaded from `messages/es.json`
  - `src/i18n/request.ts`

## Current i18n reality

Although `next-intl` is integrated, there are still hardcoded UI strings in several pages/components and many API hardcoded error strings that are surfaced directly in UI.

See `documentation/platform-analysis-report.md` for the prioritized i18n gap list.

## Activity analysis UI

Key screens/components:

- `src/app/(dashboard)/activities/[id]/page.tsx`
- `src/app/(dashboard)/activities/components/ActivityChart.tsx`
- `src/app/(dashboard)/activities/components/IntervalsAnalysisChart.tsx`
- `src/app/(dashboard)/activities/components/ZoneComplianceCard.tsx`

These are running-first but already include initial sport-aware formatting (pace vs speed in parts of the UI).

## Settings and audit UI

- Coach settings page: `src/app/(dashboard)/settings/coach/page.tsx`
- Team settings page: `src/app/(dashboard)/settings/team/page.tsx`
- Admin audit log page: `src/app/(dashboard)/settings/audit-logs/page.tsx`

Settings pages are client-driven and persist through v2 APIs under `/api/v2/settings/*`.
