-- =============================================
-- Migration: public.teams table
--
-- The codebase already references a "teams" / "running_teams" table from
-- multiple call sites (scripts/create-admin.ts, /api/v2/invitations) but the
-- table was never created in any migration. This migration introduces the
-- canonical `public.teams` table and backfills one row per distinct
-- `team_id` referenced from `public.profiles` so that other migrations
-- (notably team_invite_links) can FK against it.
--
-- The columns `profiles.team_id`, `team_settings.team_id`,
-- `coach_settings.team_id`, `admin_action_logs.team_id` remain plain UUIDs
-- (no FK) to avoid breaking historical data; they are now interpreted as
-- "soft references" to `public.teams.id`.
-- =============================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    sport TEXT NOT NULL DEFAULT 'RUNNING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teams_name ON public.teams(name);

-- One-time backfill: ensure every distinct `profiles.team_id` has a row
-- in `public.teams`. Idempotent (ON CONFLICT skips re-insert). We name the
-- placeholder "Team <8-char-id>" so it's clearly synthetic.
INSERT INTO public.teams (id, name, sport)
SELECT DISTINCT p.team_id, 'Team ' || LEFT(p.team_id::text, 8), 'RUNNING'
FROM public.profiles p
WHERE p.team_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Team staff can view teams" ON public.teams;
DROP POLICY IF EXISTS "Team staff can view own team" ON public.teams;
DROP POLICY IF EXISTS "Authenticated users can view teams" ON public.teams;

-- Any authenticated user can SELECT teams (needed for the public /api/join/[token]
-- resolve path, which uses the service-role client, but also for normal
-- in-app lookups of team_name from `profiles.team_id`).
CREATE POLICY "Team staff can view teams"
ON public.teams FOR SELECT
USING (true);

-- Only service-role inserts/updates/deletes (no admin UI for managing
-- teams in v1; teams are created implicitly by invitations and the
-- admin bootstrap script). Block all client writes.
CREATE POLICY "Block client writes to teams"
ON public.teams FOR ALL
USING (false)
WITH CHECK (false);

-- Trigger: keep updated_at fresh
CREATE OR REPLACE FUNCTION public.touch_teams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_teams_updated_at ON public.teams;
CREATE TRIGGER trg_touch_teams_updated_at
BEFORE UPDATE ON public.teams
FOR EACH ROW EXECUTE FUNCTION public.touch_teams_updated_at();
