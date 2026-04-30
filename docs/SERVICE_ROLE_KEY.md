# Server Privileged Key Usage

## Canonical variable in this repo

`SUPABASE_SECRET_KEY`

This key is used to create privileged server-side clients that can bypass RLS.

## Where it is used

- `src/lib/supabase/server.ts` (`createServiceRoleClient`)
- invitation acceptance/account creation flow
- selected route handlers that require authorized service-role reads/writes

## Rules

- Server-side only
- Never exposed to browser/client bundles
- Never committed to source control
- Rotate immediately if leaked

## Caution

Because this key bypasses RLS, all privileged operations must be preceded by strict application-layer authorization checks.
