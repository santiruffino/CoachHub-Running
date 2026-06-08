# Team invite links (shareable sign-up URL)

A single, reusable URL per team. An admin or coach generates it once, shares it
with athletes (WhatsApp, QR, etc.), and any athlete who opens the link can
create an account and is added to the team as an athlete.

This is a **second** flow alongside the existing per-email invitation system —
both are supported and unchanged for their respective use cases.

## Data model

`public.team_invite_links` (see `supabase/migrations/20260605120000_team_invite_links.sql`):

| Column        | Type            | Notes                                                              |
| ------------- | --------------- | ------------------------------------------------------------------ |
| id            | UUID PK         | gen_random_uuid()                                                  |
| team_id       | UUID FK→teams   | ON DELETE CASCADE                                                  |
| created_by    | UUID FK→profiles| The coach/admin who issued the link. ON DELETE RESTRICT            |
| role          | TEXT            | Always `'ATHLETE'` for v1 (CHECK constraint)                       |
| token         | TEXT UNIQUE     | 32-byte hex (64 chars), unguessable                                |
| label         | TEXT            | Optional free-text label                                           |
| is_active     | BOOLEAN         | Soft-revocation flag                                               |
| expires_at    | TIMESTAMPTZ     | Nullable; null = no expiry                                         |
| max_uses      | INTEGER         | Nullable; null = unlimited                                         |
| uses          | INTEGER         | Incremented atomically on each successful sign-up                  |
| last_used_at  | TIMESTAMPTZ     | Updated on each use                                                |
| created_at    | TIMESTAMPTZ     |                                                                    |
| updated_at    | TIMESTAMPTZ     | Touched by trigger                                                 |

### RLS

- Team staff (ADMIN or COACH of the team) can SELECT/INSERT/UPDATE.
- No policy for `anon` or `authenticated` to read by `token` — public resolution
  is performed by the service-role client in `GET /api/join/[token]`.

### Atomic consumption

The PL/pgSQL function `public.consume_team_invite_link(p_token TEXT)` runs
under `SECURITY DEFINER` and:

1. Locks the row (`SELECT ... FOR UPDATE`).
2. Validates `is_active = true`, `expires_at` is null or in the future, and
   `uses < max_uses` (when set).
3. Increments `uses` and `last_used_at`.
4. Returns the updated row.

The function is `GRANT EXECUTE`d to `service_role` only. The application calls
it from the public `POST /api/join/[token]/accept` endpoint to make
validation + increment + sign-up atomic (no race conditions between concurrent
athletes).

## API

### Authenticated (COACH/ADMIN of the team)

| Method | Path                                            | Purpose                            |
| ------ | ----------------------------------------------- | ---------------------------------- |
| GET    | `/api/v2/team-invite-links`                     | List team's links                  |
| POST   | `/api/v2/team-invite-links`                     | Create a new link                  |
| PATCH  | `/api/v2/team-invite-links/[id]`                | Toggle `is_active`, edit limits    |
| POST   | `/api/v2/team-invite-links/[id]/rotate`         | Deactivate + create replacement    |

Body for `POST /api/v2/team-invite-links`:

```json
{
    "label": "Link para atletas nuevos",   // optional, max 120 chars
    "expiresInDays": 30,                   // optional, positive integer or null
    "maxUses": 50                          // optional, positive integer or null
}
```

### Public (no auth)

| Method | Path                          | Purpose                                                  |
| ------ | ----------------------------- | -------------------------------------------------------- |
| GET    | `/api/join/[token]`           | Resolve token → `{ valid, reason?, teamName, role, ... }` |
| POST   | `/api/join/[token]/accept`    | New user signs up using the link                         |

`GET /api/join/[token]` returns one of:

- `200 { valid: true, teamId, teamName, role, expiresAt, maxUses }`
- `200 { valid: false, reason: 'not_found' | 'revoked' | 'expired' | 'max_uses_reached' }`

`POST /api/join/[token]/accept` body:

```json
{ "email": "...", "name": "...", "password": "..." }
```

On success it:

1. Validates the link via `consume_team_invite_link(token)` (atomic increment).
2. Creates the Supabase auth user via `admin.createUser` (email auto-confirmed).
3. Updates the trigger-created profile with `role = 'ATHLETE'`,
   `team_id = link.team_id`, `is_onboarding_completed = false`.
4. Inserts an `athlete_profiles` placeholder.
5. Writes an append-only `admin_action_logs` row with
   `action = 'team_invite_link.used'`,
   `metadata = { link_id, athlete_email, athlete_id }`.

The page then signs the user in with `supabase.auth.signInWithPassword` and
redirects to `/dashboard` (which then forwards to the athlete onboarding
flow).

## Frontend

- **Public page**: `src/app/(auth)/join/[token]/page.tsx`.
- **Coach/admin UI**: the `TeamInviteLinkManager` component is rendered as a
  third tab in `InviteAthleteModal` (alongside "Individual" and "Carga Masiva").
  It supports create, list, copy, WhatsApp share, rotate, and revoke.
- **Admin overview**: `src/app/(dashboard)/settings/team/page.tsx` now includes
  a `TeamInviteLinksCard` showing all active links in the team with rotate and
  revoke actions.

The middleware (`src/lib/supabase/middleware.ts`) allow-lists `/join` and
`/api/join` for unauthenticated users so the public flow works without
forcing a sign-in first.

## Lifecycle: rotation and revocation

- **Revoke**: `PATCH /api/v2/team-invite-links/[id]` with `{ isActive: false }`.
  Future resolve calls return `{ valid: false, reason: 'revoked' }`. Already
  created users are unaffected.
- **Rotate**: `POST /api/v2/team-invite-links/[id]/rotate`. Atomically sets
  the old link `is_active = false` and inserts a new row with a new token
  (same label, role, and limits).
- **Expiry / max-uses**: enforced by the SQL function, not the application
  layer. The application also surfaces the link's status in the resolve
  endpoint so the page can show a friendly error.

## Audit log

Every successful `accept` writes to `public.admin_action_logs`:

```json
{
  "actor_id": "<new user id>",
  "actor_role": "ATHLETE",
  "team_id": "<team id>",
  "action": "team_invite_link.used",
  "target_type": "team_invite_link",
  "target_id": "<link id>",
  "metadata": { "link_id": "...", "athlete_email": "...", "athlete_id": "..." }
}
```

The `admin_action_logs` table is append-only (BEFORE UPDATE / BEFORE DELETE
triggers raise an exception), so usage cannot be erased.

## Analytics events

New events in `src/lib/analytics/events.ts`:

- `team_invite_link_created` (team_id, has_expiry, has_max_uses)
- `team_invite_link_revoked` (link_id)
- `team_invite_link_rotated` (link_id)
- `team_invite_link_used` (link_id, method: 'team_link')
- `sign_up_completed` now includes `method: 'invitation' | 'team_link'`

## Prerequisite: `public.teams` table

Prior to this feature, the codebase referenced a `teams` / `running_teams`
table from `/api/v2/invitations` and `scripts/create-admin.ts`, but the
table was never created in any migration. The companion migration
`20260605110000_teams_table.sql` introduces the canonical `public.teams`
table and backfills one row per distinct `team_id` referenced from
`public.profiles` (idempotent `ON CONFLICT DO NOTHING`). RLS is permissive
on SELECT and locked down on writes — team rows are created implicitly by
the admin bootstrap script and the service-role client.

## Out of scope (for v1)

- Re-using a link to switch an already-authenticated user from one team to
  another. If the chosen email already exists, the API returns
  `409 EMAIL_TAKEN`.
- Captcha / rate-limiting on the public resolve/accept endpoints. The
  global `API_RATE_LIMIT_*` env-vars apply.
- A "Welcome to team X" email to the new athlete after sign-up.
