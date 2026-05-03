-- =============================================
-- Migration: Team-Based RLS Policies
-- 
-- Transitions RLS from coach_id-based to team_id-based access.
-- This allows all coaches within the same Running Team to view
-- and manage shared resources (groups, athletes, trainings).
-- =============================================

-- =============================================
-- HELPER FUNCTION (avoids circular RLS on profiles)
-- =============================================

CREATE OR REPLACE FUNCTION public.get_my_team_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT team_id FROM public.profiles WHERE id = auth.uid()
$$;


-- =============================================
-- GROUPS TABLE
-- =============================================

-- Drop old coach-based policies (try multiple common names)
DROP POLICY IF EXISTS "Coaches can view their own groups" ON public.groups;
DROP POLICY IF EXISTS "Coaches can view own groups" ON public.groups;
DROP POLICY IF EXISTS "Coaches can manage their own groups" ON public.groups;
DROP POLICY IF EXISTS "Coaches can update their own groups" ON public.groups;
DROP POLICY IF EXISTS "Coaches can update own groups" ON public.groups;
DROP POLICY IF EXISTS "Coaches can delete their own groups" ON public.groups;
DROP POLICY IF EXISTS "Coaches can delete own groups" ON public.groups;
DROP POLICY IF EXISTS "Coaches can insert groups" ON public.groups;
DROP POLICY IF EXISTS "Coaches can create groups" ON public.groups;

-- Drop in case of re-run
DROP POLICY IF EXISTS "Team staff can view team groups" ON public.groups;
DROP POLICY IF EXISTS "Team staff can manage team groups" ON public.groups;
DROP POLICY IF EXISTS "Team staff can insert groups" ON public.groups;
DROP POLICY IF EXISTS "Team staff can delete team groups" ON public.groups;

CREATE POLICY "Team staff can view team groups"
ON public.groups FOR SELECT
USING (team_id = public.get_my_team_id());

CREATE POLICY "Team staff can insert groups"
ON public.groups FOR INSERT
WITH CHECK (team_id = public.get_my_team_id());

CREATE POLICY "Team staff can manage team groups"
ON public.groups FOR UPDATE
USING (team_id = public.get_my_team_id());

CREATE POLICY "Team staff can delete team groups"
ON public.groups FOR DELETE
USING (team_id = public.get_my_team_id());


-- =============================================
-- PROFILES TABLE
-- =============================================

DROP POLICY IF EXISTS "Coaches can view their athletes" ON public.profiles;
DROP POLICY IF EXISTS "Coaches can view assigned athletes" ON public.profiles;
DROP POLICY IF EXISTS "Coaches can view own athletes" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view team members" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own and team profiles" ON public.profiles;

-- SELECT: Users can see themselves + all members sharing their team_id
CREATE POLICY "Users can view own and team profiles"
ON public.profiles FOR SELECT
USING (
  id = auth.uid()
  OR
  team_id = public.get_my_team_id()
);

-- UPDATE: Users can update their own profile, or team staff can update team members
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (
  id = auth.uid()
  OR
  team_id = public.get_my_team_id()
);


-- =============================================
-- TRAININGS TABLE
-- =============================================

DROP POLICY IF EXISTS "Coaches can view their own trainings" ON public.trainings;
DROP POLICY IF EXISTS "Coaches can view own trainings" ON public.trainings;
DROP POLICY IF EXISTS "Coaches can manage their own trainings" ON public.trainings;
DROP POLICY IF EXISTS "Coaches can manage own trainings" ON public.trainings;
DROP POLICY IF EXISTS "Coaches can create trainings" ON public.trainings;
DROP POLICY IF EXISTS "Coaches can insert trainings" ON public.trainings;
DROP POLICY IF EXISTS "Coaches can update their own trainings" ON public.trainings;
DROP POLICY IF EXISTS "Coaches can update own trainings" ON public.trainings;
DROP POLICY IF EXISTS "Coaches can delete their own trainings" ON public.trainings;
DROP POLICY IF EXISTS "Coaches can delete own trainings" ON public.trainings;

DROP POLICY IF EXISTS "Team staff can view team trainings" ON public.trainings;
DROP POLICY IF EXISTS "Team staff can insert trainings" ON public.trainings;
DROP POLICY IF EXISTS "Team staff can update team trainings" ON public.trainings;
DROP POLICY IF EXISTS "Team staff can delete team trainings" ON public.trainings;

CREATE POLICY "Team staff can view team trainings"
ON public.trainings FOR SELECT
USING (
  coach_id = auth.uid()
  OR
  team_id = public.get_my_team_id()
);

CREATE POLICY "Team staff can insert trainings"
ON public.trainings FOR INSERT
WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Team staff can update team trainings"
ON public.trainings FOR UPDATE
USING (
  coach_id = auth.uid()
  OR
  team_id = public.get_my_team_id()
);

CREATE POLICY "Team staff can delete team trainings"
ON public.trainings FOR DELETE
USING (
  coach_id = auth.uid()
  OR
  team_id = public.get_my_team_id()
);


-- =============================================
-- TRAINING_ASSIGNMENTS TABLE
-- =============================================

DROP POLICY IF EXISTS "Coaches can manage assignments for their athletes" ON public.training_assignments;
DROP POLICY IF EXISTS "Athletes can view their own assignments" ON public.training_assignments;
DROP POLICY IF EXISTS "Athletes can update their own assignments" ON public.training_assignments;
DROP POLICY IF EXISTS "Team staff can manage assignments" ON public.training_assignments;
DROP POLICY IF EXISTS "Athletes can view own assignments" ON public.training_assignments;
DROP POLICY IF EXISTS "Athletes can update own assignments" ON public.training_assignments;

-- Coaches can manage assignments for athletes in their team
CREATE POLICY "Team staff can manage assignments"
ON public.training_assignments FOR ALL
USING (
  user_id IN (
    SELECT p.id FROM public.profiles p
    WHERE p.team_id = public.get_my_team_id()
  )
  OR
  user_id = auth.uid()
);

-- Athletes can view their own assignments
CREATE POLICY "Athletes can view own assignments"
ON public.training_assignments FOR SELECT
USING (user_id = auth.uid());

-- Athletes can update their own assignments (mark completed, add feedback)
CREATE POLICY "Athletes can update own assignments"
ON public.training_assignments FOR UPDATE
USING (user_id = auth.uid());


-- =============================================
-- ATHLETE_GROUPS TABLE
-- =============================================

DROP POLICY IF EXISTS "Coaches can manage athlete groups" ON public.athlete_groups;
DROP POLICY IF EXISTS "Coaches can manage athlete group memberships" ON public.athlete_groups;
DROP POLICY IF EXISTS "Athletes can view their own groups" ON public.athlete_groups;
DROP POLICY IF EXISTS "Team staff can manage athlete groups" ON public.athlete_groups;
DROP POLICY IF EXISTS "Athletes can view own group memberships" ON public.athlete_groups;

CREATE POLICY "Team staff can manage athlete groups"
ON public.athlete_groups FOR ALL
USING (
  group_id IN (
    SELECT g.id FROM public.groups g
    WHERE g.team_id = public.get_my_team_id()
  )
);

CREATE POLICY "Athletes can view own group memberships"
ON public.athlete_groups FOR SELECT
USING (athlete_id = auth.uid());
