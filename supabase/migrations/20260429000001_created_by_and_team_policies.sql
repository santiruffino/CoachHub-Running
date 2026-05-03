-- =============================================
-- Migration: created_by ownership + team-centric RLS
-- =============================================

-- 1) Add created_by ownership columns
ALTER TABLE public.trainings
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.groups
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.races
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2) Backfill created_by from legacy coach_id
UPDATE public.trainings
SET created_by = coach_id
WHERE created_by IS NULL
  AND coach_id IS NOT NULL;

UPDATE public.groups
SET created_by = coach_id
WHERE created_by IS NULL
  AND coach_id IS NOT NULL;

UPDATE public.races
SET created_by = coach_id
WHERE created_by IS NULL
  AND coach_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trainings_created_by ON public.trainings(created_by);
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON public.groups(created_by);
CREATE INDEX IF NOT EXISTS idx_races_created_by ON public.races(created_by);

-- 3) Helper to gate team staff permissions
CREATE OR REPLACE FUNCTION public.is_team_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('COACH', 'ADMIN')
  )
$$;

-- 4) Trainings RLS -> created_by + team staff
DROP POLICY IF EXISTS "Team staff can view team trainings" ON public.trainings;
DROP POLICY IF EXISTS "Team staff can insert trainings" ON public.trainings;
DROP POLICY IF EXISTS "Team staff can update team trainings" ON public.trainings;
DROP POLICY IF EXISTS "Team staff can delete team trainings" ON public.trainings;

CREATE POLICY "Team staff can view team trainings"
ON public.trainings FOR SELECT
USING (
  public.is_team_staff()
  AND team_id = public.get_my_team_id()
);

CREATE POLICY "Team staff can insert trainings"
ON public.trainings FOR INSERT
WITH CHECK (
  public.is_team_staff()
  AND team_id = public.get_my_team_id()
  AND created_by = auth.uid()
);

CREATE POLICY "Team staff can update team trainings"
ON public.trainings FOR UPDATE
USING (
  public.is_team_staff()
  AND team_id = public.get_my_team_id()
)
WITH CHECK (
  team_id = public.get_my_team_id()
);

CREATE POLICY "Team staff can delete team trainings"
ON public.trainings FOR DELETE
USING (
  public.is_team_staff()
  AND team_id = public.get_my_team_id()
);

-- 5) Races RLS -> team-centric + created_by ownership metadata
DROP POLICY IF EXISTS "Coaches can manage races they created" ON public.races;
DROP POLICY IF EXISTS "Coaches can view races for their athletes" ON public.races;
DROP POLICY IF EXISTS "Athletes can see races assigned to them" ON public.races;

CREATE POLICY "Team staff can manage team races"
ON public.races FOR ALL
USING (
  public.is_team_staff()
  AND team_id = public.get_my_team_id()
)
WITH CHECK (
  team_id = public.get_my_team_id()
);

CREATE POLICY "Athletes can see races assigned to them"
ON public.races FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.athlete_races ar
    WHERE ar.race_id = races.id
      AND ar.athlete_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Coaches can manage races for their athletes" ON public.athlete_races;

CREATE POLICY "Team staff can manage races for team athletes"
ON public.athlete_races FOR ALL
USING (
  public.is_team_staff()
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = athlete_races.athlete_id
      AND p.team_id = public.get_my_team_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = athlete_races.athlete_id
      AND p.team_id = public.get_my_team_id()
  )
);

-- 6) Activity streams coach policy -> team staff policy
DROP POLICY IF EXISTS "Coaches can view streams for their athletes" ON public.activity_streams;

CREATE POLICY "Team staff can view streams for team athletes"
ON public.activity_streams FOR SELECT
USING (
  public.is_team_staff()
  AND EXISTS (
    SELECT 1
    FROM public.activities a
    JOIN public.profiles p ON p.id = a.user_id
    WHERE a.id = activity_streams.activity_id
      AND p.team_id = public.get_my_team_id()
  )
);
