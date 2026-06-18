-- Fix incorrect foreign key constraint on races.team_id
ALTER TABLE public.races DROP CONSTRAINT IF EXISTS races_team_id_fkey;
-- If teams table exists, we could add a reference, but for now just dropping the incorrect one is enough.
