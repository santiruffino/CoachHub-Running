# Endurix — Screens List

This list reflects currently implemented screens from the App Router.

## Public

- `src/app/page.tsx` — Landing (with wishlist capture)
- `src/app/privacy/**` — Privacy / legal pages

## Auth and account

- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/forgot-password/page.tsx`
- `src/app/(auth)/reset-password/page.tsx`
- `src/app/(auth)/change-password/page.tsx`
- `src/app/(auth)/accept-invitation/[token]/page.tsx`
- `src/app/accept-invitation/page.tsx`
- `src/app/(auth)/auth/auth-code-error/page.tsx`
- `src/app/(auth)/join/[token]/page.tsx` — Public team-invite-link sign-up

## Onboarding

- `src/app/onboarding/page.tsx` — Athlete onboarding (thresholds, VAM, UAN, FC, etc.)
- `src/app/onboarding/coach/page.tsx` — Coach onboarding with completion tracker

## Main product (dashboard)

- `src/app/(dashboard)/dashboard/page.tsx` — **Role-aware dashboard** (admin / coach / athlete)
- `src/app/(dashboard)/athletes/page.tsx` — Coach's athlete list
- `src/app/(dashboard)/athletes/[id]/page.tsx` — Athlete detail (5 tabs: Resumen, Entrenamiento, Salud y Carga, Carreras y Notas, Tendencia)
- `src/app/(dashboard)/groups/page.tsx` — Group list
- `src/app/(dashboard)/groups/[id]/page.tsx` — Group detail
- `src/app/(dashboard)/groups/new/page.tsx` — Create group
- `src/app/(dashboard)/trainings/page.tsx` — Training library
- `src/app/(dashboard)/workouts/builder/page.tsx` — Workout builder (drag-and-drop)
- `src/app/(dashboard)/workouts/assign/page.tsx` — Assign a workout
- `src/app/(dashboard)/workouts/[assignmentId]/page.tsx` — Assignment detail
- `src/app/(dashboard)/activities/[id]/page.tsx` — Activity detail (HR / pace / power zones, splits, laps, compliance)
- `src/app/(dashboard)/races/page.tsx` — Race list
- `src/app/(dashboard)/coaches/page.tsx` — Coach list (admin)
- `src/app/(dashboard)/profile/page.tsx` — Personal profile / thresholds / zones

## Settings

- `src/app/(dashboard)/settings/page.tsx` — Settings index (role-aware shortcuts)
- `src/app/(dashboard)/settings/coach/page.tsx` — Coach settings (thresholds, default models)
- `src/app/(dashboard)/settings/team/page.tsx` — Team settings (admin only, branding, defaults, athlete limit, invite links)
- `src/app/(dashboard)/settings/notifications/page.tsx` — Notification preferences (per-category channel + frequency)
- `src/app/(dashboard)/settings/audit-logs/page.tsx` — Admin audit log viewer

## Integration callbacks

- `src/app/strava/callback/page.tsx` — Strava OAuth callback
- `src/app/auth/callback/**` — Supabase auth callback

## Highlights of the athlete home dashboard

- 4 weekly stat cards (volume / time / elevation / compliance)
- **4 fitness status cards** (CTL / ATL / TSB / ACWR) with chip color coding
- Week navigator + "Add race" CTA
- Weekly calendar with assignments + Strava activities
- Coach Notes (read-only) + Next Races
- **Estado de Forma** card with 7 / 30 / 90-day range selector and CTL/ATL/TSB trend chart
- **Rendimiento y Zonas** card with the compliance trend and personalized HR + VAM pace zones
