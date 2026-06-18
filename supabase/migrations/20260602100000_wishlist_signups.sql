-- =============================================
-- Migration: Wishlist Signups
--
-- Stores public landing-page form submissions from
-- coaches who want early access to Endurix before
-- the public launch. Public insert via service role
-- only; no auth required.
-- =============================================

CREATE TABLE IF NOT EXISTS public.wishlist_signups (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    email       TEXT NOT NULL UNIQUE,
    role        TEXT NOT NULL CHECK (role IN ('head_coach', 'assistant_coach', 'other')),
    team_size   TEXT NOT NULL CHECK (team_size IN ('1_5', '6_15', '16_30', '30_plus')),
    locale      TEXT,
    user_agent  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wishlist_signups_created_at_idx
    ON public.wishlist_signups (created_at DESC);

-- Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION public.set_wishlist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wishlist_signups_updated_at ON public.wishlist_signups;
CREATE TRIGGER trg_wishlist_signups_updated_at
    BEFORE UPDATE ON public.wishlist_signups
    FOR EACH ROW
    EXECUTE FUNCTION public.set_wishlist_updated_at();

-- RLS: enable but allow only service role to read/insert.
-- Public access goes through the Next.js API route which
-- uses the service role key, bypassing RLS entirely.
ALTER TABLE public.wishlist_signups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_wishlist_signups" ON public.wishlist_signups;
CREATE POLICY "service_role_all_wishlist_signups"
    ON public.wishlist_signups
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
