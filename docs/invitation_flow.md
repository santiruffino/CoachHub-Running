# Invitation Flow

Version: 3.0 (updated 2026-06-07)

This document describes the two complementary invitation flows in Endurix.

---

## Flow A — Per-email invitation (original)

### Endpoints
- Create invitation: `POST /api/v2/invitations`
- Bulk create: `POST /api/v2/invitations/bulk`
- Validate token: `GET /api/v2/invitations/validate/[token]`  *(note: not yet implemented; page calls it but route missing)*
- Accept invitation: `POST /api/auth/accept-invitation`

### Roles and rules
- `COACH` can invite `ATHLETE`
- `ADMIN` can invite `ATHLETE` and `COACH`
- Invitation rows include `team_id` and optional `coach_id`
- Single-use tokens (32-byte hex), 7-day expiry
- Email sent via Resend with link `/accept-invitation?token=<token>`

### Acceptance behavior
1. Token is validated against `public.invitations` table
2. User account created through Supabase `admin.createUser`
3. Profile updated with `role`, `team_id`, `coach_id`
4. Invitation marked `accepted = true`
5. Role-specific profile row created (`coach_profiles` or `athlete_profiles`)
6. User signed in and redirected to onboarding (`/onboarding` or `/onboarding/coach`)

### Operational notes
- Duplicate pending invitations re-sent rather than creating new
- All writes run server-side with `requireRole('COACH')` / `requireRole('ADMIN')` checks
- `handle_new_user` trigger auto-links sign-ups to pending invitations by email

---

## Flow B — Team invite link (new, 2026-06)

A reusable shareable URL per team. Coach/admin creates once; any athlete who opens it can sign up and is added to the team.

### Data model
`public.team_invite_links` (migration `20260605120000_team_invite_links.sql`):

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| team_id | UUID FK→teams | ON DELETE CASCADE |
| created_by | UUID FK→profiles | Coach/admin who issued |
| role | TEXT | Always `'ATHLETE'` (v1) |
| token | TEXT UNIQUE | 32-byte hex |
| label | TEXT | Optional label |
| is_active | BOOLEAN | Soft revocation |
| expires_at | TIMESTAMPTZ | Nullable |
| max_uses | INTEGER | Nullable |
| uses | INTEGER | Atomic increment |
| last_used_at | TIMESTAMPTZ | |

### Endpoints (authenticated — COACH/ADMIN of team)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v2/team-invite-links` | List team's links |
| POST | `/api/v2/team-invite-links` | Create link |
| PATCH | `/api/v2/team-invite-links/[id]` | Toggle active, edit limits |
| POST | `/api/v2/team-invite-links/[id]/rotate` | Deactivate old + create new |

### Endpoints (public — no auth)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/join/[token]` | Resolve token → `{valid, reason?, teamName, role, ...}` |
| POST | `/api/join/[token]/accept` | New user signs up via link |

### Acceptance behavior (team link)
1. `consume_team_invite_link(token)` RPC validates (active, not expired, uses < max) and atomically increments `uses`
2. Supabase `admin.createUser` creates auth user (email confirmed)
3. Profile updated with `role='ATHLETE'`, `team_id=link.team_id`, `coach_id=null`
4. `athlete_profiles` placeholder inserted
5. `admin_action_logs` row written: `action='team_invite_link.used'`
6. User signed in → redirected to `/dashboard` → athlete onboarding

### Lifecycle
- **Revoke**: PATCH `is_active=false` — future resolves return `revoked`
- **Rotate**: POST `/rotate` — deactivates old, inserts new with fresh token (same label/limits)
- **Expiry / max uses**: enforced by SQL function + resolve endpoint

### Athlete cap (pricing tier)
- Admin sets `max_athletes` in `team_settings` (NULL = unlimited)
- Both flows (email + team link) check current athlete count before allowing new sign-ups
- Returns `403` with message: *"El equipo ha alcanzado el límite de {N} atletas. Actualiza el plan para añadir más."*

### UI entry points
- **Coach modal**: "Añadir Atletas" → tab "Enlace del Equipo" — create/list/copy/rotate/revoke
- **Admin page**: `/settings/team` → "Enlaces del Equipo" card — view all team links, rotate/revoke
- **Public page**: `/join/[token]` — sign-up form with team preview

### Analytics events
- `team_invite_link_created` (team_id, has_expiry, has_max_uses)
- `team_invite_link_revoked` (link_id)
- `team_invite_link_rotated` (link_id)
- `team_invite_link_used` (link_id, method: 'team_link')
- `sign_up_completed` now includes `method: 'invitation' | 'team_link'`

---

## Comparison

| Aspect | Per-email (Flow A) | Team link (Flow B) |
|--------|-------------------|-------------------|
| Reusability | Single-use | Reusable |
| Target | Specific email | Anyone with URL |
| Coach assignment | Explicit per invite | None (v1) — athlete lands unassigned |
| Expiry | 7 days fixed | Configurable / none |
| Max uses | 1 | Configurable / none |
| Revocation | N/A (auto-expires) | Manual (soft + rotate) |
| Audit log | No | Yes (`team_invite_link.used`) |
| Pricing cap | Checked at create | Checked at accept |

---

## Related docs
- `documentation/team-invite-links.md` — full technical spec
- `documentation/backend.md` — API reference
- `documentation/database.md` — schema changes