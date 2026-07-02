# MCP Server

Endurix exposes an integrated **Model Context Protocol (MCP)** server so a coach
can query their athlete data through an AI client (Claude, etc.). It runs inside
the Next.js app as a normal authenticated route — there is no separate process.

## Endpoint

`/api/mcp` — `src/app/api/mcp/route.ts`

- Handles `GET`, `POST`, and `DELETE` via the MCP Streamable HTTP transport
  (`WebStandardStreamableHTTPServerTransport` from `@modelcontextprotocol/sdk`).
- `export const dynamic = 'force-dynamic'`.
- A module-level transport instance keeps MCP session state alive within a
  server process (session ids are UUIDs).

## Authentication & rate limiting

Every request passes `checkAuthAndRateLimit()` before reaching the transport:

1. **Auth** — `requireAuth()` (Supabase session). Unauthenticated requests are rejected.
2. **Rate limit** — `consumeRateLimit()` keyed by user + IP at **30 requests/minute**.
   Over-limit requests get `429` with `x-ratelimit-*` and `retry-after` headers.
   See [observability.md](./observability.md#rate-limiting).

All tool queries run through the **user's own Supabase client** (`createClient()`),
so **RLS still applies** — the MCP server cannot read data the signed-in coach
couldn't read through the normal API.

## Tools

Defined in `src/lib/mcp/server.ts` (`McpServer` name `Endurix`, version `1.0.0`):

| Tool | Input | Returns |
|------|-------|---------|
| `get_coach_profile` | — | The signed-in coach's name, email, and team id |
| `list_coach_athletes` | — | Athletes in the coach's team (name, email, id) |
| `list_coach_groups` | — | Groups owned by the coach (`coach_id`) |
| `get_athlete_compliance` | `athleteId`, `days?=30` | Completed/total assignments and % for one athlete |
| `get_group_compliance` | `groupId`, `days?=30` | Aggregate compliance across a group's members |
| `get_upcoming_races` | `athleteId?` \| `groupId?`, `days?=90` | Planned races in the window, ordered by date |
| `notify_athlete` | `athleteId`, `message` | Inserts a `coach_feedback` alert (P2, OPEN) for the athlete |

Notes:

- Compliance is computed from `training_assignments` (`completed` flag) over the
  requested lookback window (`calculateCompliance` helper).
- `notify_athlete` currently writes to the `alerts` table (not the
  `notifications` inbox described in [notifications.md](./notifications.md)) — worth
  aligning if AI-initiated messages should reach the athlete's notification bell.

## Client configuration

Point an MCP client at `https://<app-host>/api/mcp` with the authenticated
session (the route relies on the Supabase auth cookie, so the client must carry
the coach's session). Local dev: `http://localhost:3000/api/mcp`.

## Tests

`src/app/api/mcp/route.test.ts` covers the route's auth/rate-limit gating.

## Extending

Add a tool with `mcpServer.tool(name, zodSchema, handler)` in
`src/lib/mcp/server.ts`. Always resolve the caller via `createClient()` +
`supabase.auth.getUser()` and let RLS enforce team scope — do **not** use the
service-role client inside tools.
