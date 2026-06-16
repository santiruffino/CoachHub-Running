# Onboarding

## Description

Dedicated post-signup onboarding for athletes and coaches. Collects profile and performance basics, then marks onboarding as complete.

## Entrypoints

* src/app/onboarding/page.tsx
* src/app/api/v2/onboarding/coach/route.ts
* src/features/onboarding/components/OnboardingForm.tsx

## Services

* src/features/profiles/services/profile.service.ts
* src/lib/onboarding/*

## Models

* OnboardingFormValues
* User
* ProfileDetails

## Dependencies

* internal: src/features/auth/hooks/useAuth, src/features/profiles/services/profile.service.ts, src/hooks/useApiError, src/lib/analytics/events
* external: react-hook-form, next/navigation, next-intl

## Notes

* Athlete flow writes profile fields and sets isOnboardingCompleted=true.
* Auth layer redirects incomplete athletes/coaches into onboarding.
* Analytics tracks start, completion, and failure of onboarding flow.
