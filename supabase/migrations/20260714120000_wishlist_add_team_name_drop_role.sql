-- =============================================
-- Migration: Wishlist — add team_name, drop role
--
-- The landing wishlist form now captures the coach's
-- team name instead of their role. `role` is dropped
-- (with its CHECK constraint) and replaced by a free-text
-- `team_name` column. Nullable so existing rows remain valid.
-- =============================================

ALTER TABLE public.wishlist_signups
    ADD COLUMN IF NOT EXISTS team_name TEXT;

ALTER TABLE public.wishlist_signups
    DROP COLUMN IF EXISTS role;
