# Profiles

## Description

Self-service account and athlete profile management. Exposes editable personal data and, for athletes, integrations and HR-zone related data.

## Entrypoints

* src/app/(dashboard)/profile/page.tsx
* src/app/api/v2/users/profile/route.ts
* src/features/profiles/components/ProfileView.tsx

## Services

* src/features/profiles/services/profile.service.ts

## Models

* ProfileDetails
* AthleteProfile
* User
* Profile

## Dependencies

* internal: src/features/strava/hooks/useStravaAuth.ts, src/interfaces/athlete.ts, src/interfaces/auth.ts
* external: next-intl, next/navigation

## Notes

* Profile page is also the UI surface for Strava connection status.
* Athlete-specific sections are conditional on role and athleteProfile presence.
* Overlaps with onboarding data model but serves steady-state editing.
