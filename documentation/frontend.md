# Frontend Architecture

## Technology stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS + shadcn/ui
- `next-intl` for localization
- Recharts + ECharts for analytics views

## App structure

- `src/app/(auth)/**` — authentication pages
- `src/app/(dashboard)/**` — authenticated coach / admin / athlete product
- `src/app/api/**` — route handlers
- `src/features/**` — domain modules
- `src/components/**` — reusable components

## Role-based UI behavior

- Main dashboard delegates by role in `src/app/(dashboard)/dashboard/page.tsx`
  - `ADMIN` → `AdminDashboard`
  - `ATHLETE` → `AthleteDashboard`
  - default → `CoachDashboard`

Navigation includes admin audit log access:

- `ADMIN` sees `/settings/audit-logs` entry in primary and mobile nav
- settings shortcut resolves by role:
  - `ADMIN` → `/settings/team`
  - `COACH` → `/settings/coach`
  - `ATHLETE` → `/profile`

## Dashboard composition (high level)

### Coach dashboard

- Priority roster with per-athlete CTL / TSB
- Critical alerts
- Group compliance summary
- Recent activity
- Next races

### Athlete dashboard (`src/app/(dashboard)/dashboard/components/AthleteDashboard.tsx`)

- 4 weekly stat cards (volume, time, elevation, compliance)
- **4 fitness status cards** (CTL, ATL, TSB, ACWR) with chip color coding
- Week navigator + "Add race" CTA
- Weekly calendar with assignments + Strava activities
- Coach Notes (read-only) and Next Races
- **Estado de Forma** card with 7 / 30 / 90-day range selector and `LoadMetricsTrendChart`
- **Rendimiento y Zonas** card with `PerformanceTrendChart` and personalized `HeartRateZones` + `PaceZones` (VAM)

### Admin dashboard

- Total athletes, total groups, active coaches
- Global view of coaches + activity

## Key shared components

- `src/components/dashboard/StatCard.tsx` — stat tile (label / value / chip / footer)
- `src/components/dashboard/DashboardCard.tsx` — generic card with monospace header
- `src/components/dashboard/PerformanceTrendChart.tsx` — weekly compliance trend
- `src/components/dashboard/LoadMetricsTrendChart.tsx` — CTL / ATL / TSB line chart
- `src/components/dashboard/AthleteWeeklyCalendar.tsx` — calendar widget
- `src/features/profiles/components/HeartRateZones.tsx` — personalized HR zones
- `src/features/profiles/components/PaceZones.tsx` — personalized VAM-based pace zones

## Data flow

Current UI data access is primarily:

1. client components / services → `src/lib/axios.ts`
2. axios → Next.js API routes under `/api` (mostly `/api/v2`)
3. route handlers → Supabase

The app does not rely exclusively on direct Server Component Supabase queries.

## Analytics

GA4 product analytics is integrated client-side:

- Provider bootstrap: `src/components/analytics/GoogleAnalytics.tsx`
- Event mapping / helpers: `src/lib/analytics/events.ts`
- Measurement env var: `NEXT_PUBLIC_GA_MEASUREMENT_ID`

Tracked funnels include signup, onboarding, and retention proxies.
See `documentation/analytics.md` for the canonical event catalog.

## i18n model

- Supported locales currently: `es` only
  - `src/i18n/config.ts`
- Message bundle loaded from `messages/es.json`
  - `src/i18n/request.ts`

## Current i18n reality

Although `next-intl` is integrated, there are still hardcoded UI strings in several pages / components and many API hardcoded error strings that are surfaced directly in UI. The English marketing copy bank is ready in `docs/MARKETING_FEATURES.md` for future locale work.

See `documentation/platform-analysis-report.md` for the prioritized i18n gap list.

## Activity analysis UI

Key screens / components:

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

### New: Team invite links & athlete limit

- **Invite athlete modal** (`src/features/invitations/components/InviteAthleteModal.tsx`): new "Enlace del Equipo" tab with `TeamInviteLinkManager` — create/list/copy/rotate/revoke links.
- **Team settings page**: new "Límites del Equipo" card with "Máx. atletas" input (admin-only).
- **Admin overview card** (`src/features/settings/components/TeamInviteLinksCard.tsx`): lists all team links with rotate/revoke.
- **Public join page**: `src/app/(auth)/join/[token]/page.tsx` — athlete sign-up via team link.
- Middleware allow-list updated (`src/lib/supabase/middleware.ts`) for `/join` and `/api/join`.

### Analytics events added

New events in `src/lib/analytics/events.ts`:
- `team_invite_link_created` / `revoked` / `rotated` / `used`
- `sign_up_completed` now includes `method: 'team_link'`
