-- =============================================
-- Migration: Team invite links (shareable sign-up URL per team)
--
-- Adds a `public.team_invite_links` table to support "single shareable
-- link" onboarding: a coach or admin generates one URL per team; any
-- athlete who opens it can create an account and is added to the team.
--
-- Design notes:
--   * One row = one link. A team can have multiple links (rotated, labelled).
--   * `token` is a 32-byte hex (64 chars) - effectively unguessable.
--   * `is_active` is the soft-revocation flag.
--   * `expires_at` and `max_uses` are nullable (null = unlimited).
--   * Public resolution goes through a service-role API route; no anon RLS.
--   * Atomic consumption happens via public.consume_team_invite_link(...)
--     so that increment + audit log + new user insertion cannot race.
-- =============================================

CREATE TABLE IF NOT EXISTS public.team_invite_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    role TEXT NOT NULL DEFAULT 'ATHLETE' CHECK (role IN ('ATHLETE')),
    token TEXT UNIQUE NOT NULL,
    label TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMPTZ,
    max_uses INTEGER,
    uses INTEGER NOT NULL DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (max_uses IS NULL OR max_uses > 0),
    CHECK (uses >= 0)
);

CREATE INDEX IF NOT EXISTS idx_team_invite_links_team_id ON public.team_invite_links(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invite_links_token    ON public.team_invite_links(token);
CREATE INDEX IF NOT EXISTS idx_team_invite_links_active   ON public.team_invite_links(team_id, is_active);

ALTER TABLE public.team_invite_links ENABLE ROW LEVEL SECURITY;

-- Team staff (ADMIN or COACH) of the team can manage links. Public resolve
-- uses the service-role client and bypasses RLS.
DROP POLICY IF EXISTS "Team staff manage team invite links" ON public.team_invite_links;

CREATE POLICY "Team staff manage team invite links"
ON public.team_invite_links FOR ALL
USING (
    team_id = public.get_my_team_id()
    AND public.is_team_staff()
)
WITH CHECK (
    team_id = public.get_my_team_id()
    AND public.is_team_staff()
);

-- Trigger: touch updated_at
CREATE OR REPLACE FUNCTION public.touch_team_invite_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_team_invite_links_updated_at ON public.team_invite_links;
CREATE TRIGGER trg_touch_team_invite_links_updated_at
BEFORE UPDATE ON public.team_invite_links
FOR EACH ROW EXECUTE FUNCTION public.touch_team_invite_links_updated_at();


-- =============================================
-- Function: consume_team_invite_link
-- Atomically validates, increments uses, and returns the link record.
-- Used by the public POST /api/join/[token]/accept endpoint to prevent
-- races between the validate-and-increment steps.
-- =============================================
CREATE OR REPLACE FUNCTION public.consume_team_invite_link(p_token TEXT)
RETURNS public.team_invite_links
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    link_row public.team_invite_links;
BEGIN
    SELECT * INTO link_row
    FROM public.team_invite_links
    WHERE token = p_token
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'link_not_found' USING ERRCODE = 'P0002';
    END IF;

    IF link_row.is_active = false THEN
        RAISE EXCEPTION 'link_revoked' USING ERRCODE = 'P0001';
    END IF;

    IF link_row.expires_at IS NOT NULL AND link_row.expires_at < NOW() THEN
        RAISE EXCEPTION 'link_expired' USING ERRCODE = 'P0001';
    END IF;

    IF link_row.max_uses IS NOT NULL AND link_row.uses >= link_row.max_uses THEN
        RAISE EXCEPTION 'link_max_uses' USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.team_invite_links
    SET uses = uses + 1,
        last_used_at = NOW()
    WHERE id = link_row.id
    RETURNING * INTO link_row;

    RETURN link_row;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_team_invite_link(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_team_invite_link(TEXT) TO service_role;
