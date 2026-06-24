# Users domain

## Description
Athlete and coach directories, profile pages/forms, load metrics, and athlete detail views.

## Entry points
- `src/app/(dashboard)/athletes/page.tsx`
- `src/app/(dashboard)/athletes/[id]/page.tsx`
- `src/app/(dashboard)/coaches/page.tsx`
- `src/app/(dashboard)/profile/page.tsx`
- `src/app/api/v2/users/*`

## Key files
- `src/features/users/components/AthletesList.tsx`
- `src/features/users/components/CoachesList.tsx`
- `src/features/users/components/AthleteDetailsView.tsx`
- `src/features/profiles/components/ProfileForm.tsx`
- `src/features/profiles/components/ProfileView.tsx`
- `src/features/profiles/components/HeartRateZones.tsx`
- `src/features/profiles/components/PaceZones.tsx`

## Dependencies
- `src/interfaces/auth.ts`, `src/interfaces/athlete.ts`
- Athlete profile/load metrics routes
- Groups, invitations, trainings, and dashboard shortcuts

## Notes
- `AthletesList` is the central roster UI and drives edit/invite/delete actions.
- Coach/admin scope is derived from profile role and team.
