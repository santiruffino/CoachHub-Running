-- =============================================
-- Migration: Activities & Feedback Team-Based RLS
-- 
-- Ensures coaches and admins can view activities and feedback
-- for all athletes within their team boundary.
-- =============================================

-- 1) Activities RLS
DROP POLICY IF EXISTS "Coaches can read athlete activities" ON public.activities;
DROP POLICY IF EXISTS "Team staff can view team athlete activities" ON public.activities;

CREATE POLICY "Team staff can view team athlete activities"
ON public.activities FOR SELECT
USING (
  public.is_team_staff()
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = activities.user_id
      AND p.team_id = public.get_my_team_id()
  )
);

-- 2) Activity Feedback RLS
DROP POLICY IF EXISTS "Coaches can view feedback for their athletes" ON public.activity_feedback;
DROP POLICY IF EXISTS "Coaches can manage feedback for their athletes" ON public.activity_feedback;
DROP POLICY IF EXISTS "Team staff can view team athlete feedback" ON public.activity_feedback;

CREATE POLICY "Team staff can view team athlete feedback"
ON public.activity_feedback FOR SELECT
USING (
  public.is_team_staff()
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = activity_feedback.user_id
      AND p.team_id = public.get_my_team_id()
  )
);

-- 3) Activity Compliance RLS
DROP POLICY IF EXISTS "Coaches can view compliance for their athletes" ON public.activity_compliance;
DROP POLICY IF EXISTS "Team staff can view team athlete compliance" ON public.activity_compliance;

CREATE POLICY "Team staff can view team athlete compliance"
ON public.activity_compliance FOR SELECT
USING (
  public.is_team_staff()
  AND EXISTS (
    SELECT 1 FROM public.activities a
    JOIN public.profiles p ON p.id = a.user_id
    WHERE a.id = activity_compliance.activity_id
      AND p.team_id = public.get_my_team_id()
  )
);
