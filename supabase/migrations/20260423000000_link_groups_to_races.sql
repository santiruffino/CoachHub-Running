-- Migration to link groups to the dedicated races table

-- 1. Add race_id to groups table
ALTER TABLE public.groups 
ADD COLUMN IF NOT EXISTS race_id UUID REFERENCES public.races(id) ON DELETE SET NULL;

-- 2. Add index for performance
CREATE INDEX IF NOT EXISTS idx_groups_race_id ON public.groups(race_id);

-- 3. Update RLS (optional, usually groups are already managed by coach)
-- The existing policies should be enough as they are based on coach_id/team_id.
