# Auth

## Description

Supabase-backed authentication and session bootstrap for login, logout, password recovery, and role-aware redirects. Client auth state is seeded server-side, then maintained via Supabase auth events.

## Entrypoints

* src/app/(auth)/login/page.tsx
* src/app/(auth)/forgot-password/page.tsx
* src/app/(auth)/reset-password/page.tsx
* src/app/(auth)/change-password/page.tsx
* src/features/auth/context/AuthContext.tsx

## Services

* src/features/auth/services/auth.service.ts
* src/features/auth/services/auth.server.ts

## Models

* User
* Profile
* Role
* AuthResponse

## Dependencies

* internal: src/lib/supabase/client, src/lib/analytics/events, src/lib/app-logger, src/lib/axios
* external: @supabase/supabase-js, next/navigation

## Notes

* AuthContext avoids initial client fetch by receiving initialUser server-side.
* getCurrentUser prefers getSession first, then profile lookup with timeout.
* Redirect rules enforce must-change-password and onboarding completion by role.
