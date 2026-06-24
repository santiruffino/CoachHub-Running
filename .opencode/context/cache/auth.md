# Auth domain

## Description
Authentication, password reset, invitation acceptance, session seeding, and role-aware client auth state.

## Entry points
- `src/app/(auth)/*/page.tsx`
- `src/app/accept-invitation/page.tsx`
- `src/app/auth/callback/route.ts`
- `src/app/api/auth/*`

## Key files
- `src/features/auth/context/AuthContext.tsx`
- `src/features/auth/hooks/useAuth.ts`
- `src/features/auth/components/LoginForm.tsx`
- `src/features/auth/components/ResetPasswordForm.tsx`
- `src/features/auth/components/PasswordChangeForm.tsx`
- `src/features/auth/services/auth.service.ts`
- `src/features/auth/services/auth.server.ts`
- `src/features/auth/components/AuthSeeder.tsx`

## Dependencies
- Supabase auth/server/client helpers
- `src/interfaces/auth.ts`
- `src/lib/analytics/events`
- `next/navigation`, `next-intl`

## Notes
- `AuthProvider` is seeded from the server via `getServerUser()` to avoid hydration mismatch.
- Role/state changes drive redirects for password change and onboarding.
