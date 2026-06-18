-- Team-based alert visibility + coach scoped ownership + feedback RLS alignment

-- 1) Alerts table: add team and visibility metadata
ALTER TABLE public.alerts
ADD COLUMN IF NOT EXISTS team_id UUID,
ADD COLUMN IF NOT EXISTS recipient_coach_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'TEAM' CHECK (scope IN ('TEAM', 'COACH'));

-- Backfill team_id from athlete profile when possible
UPDATE public.alerts a
SET team_id = p.team_id
FROM public.profiles p
WHERE p.id = a.athlete_id
  AND a.team_id IS NULL;

-- Backfill recipient coach and scope from legacy coach_id
UPDATE public.alerts
SET recipient_coach_id = coach_id,
    scope = CASE WHEN coach_id IS NULL THEN 'TEAM' ELSE 'COACH' END
WHERE recipient_coach_id IS NULL;

-- Indexes for dashboard alert reads
CREATE INDEX IF NOT EXISTS idx_alerts_team_unread_created
ON public.alerts(team_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_recipient_unread_created
ON public.alerts(recipient_coach_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_scope ON public.alerts(scope);

-- 2) RLS for alerts: team staff can read/write team alerts, athletes read own
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coaches can manage their alerts" ON public.alerts;
DROP POLICY IF EXISTS "Athletes can view their alerts" ON public.alerts;
DROP POLICY IF EXISTS "Team staff can view team alerts" ON public.alerts;
DROP POLICY IF EXISTS "Team staff can insert team alerts" ON public.alerts;
DROP POLICY IF EXISTS "Team staff can update team alerts" ON public.alerts;
DROP POLICY IF EXISTS "Team staff can delete team alerts" ON public.alerts;

CREATE POLICY "Team staff can view team alerts"
ON public.alerts FOR SELECT
USING (
  team_id = public.get_my_team_id()
  OR athlete_id = auth.uid()
);

CREATE POLICY "Team staff can insert team alerts"
ON public.alerts FOR INSERT
WITH CHECK (
  team_id = public.get_my_team_id()
);

CREATE POLICY "Team staff can update team alerts"
ON public.alerts FOR UPDATE
USING (
  team_id = public.get_my_team_id()
)
WITH CHECK (
  team_id = public.get_my_team_id()
);

CREATE POLICY "Team staff can delete team alerts"
ON public.alerts FOR DELETE
USING (
  team_id = public.get_my_team_id()
);

-- 3) activity_feedback RLS alignment with team-based model
ALTER TABLE public.activity_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Athletes manage own feedback" ON public.activity_feedback;
DROP POLICY IF EXISTS "Coaches view athlete feedback" ON public.activity_feedback;
DROP POLICY IF EXISTS "Athletes can manage own feedback" ON public.activity_feedback;
DROP POLICY IF EXISTS "Team staff can view team athlete feedback" ON public.activity_feedback;

CREATE POLICY "Athletes can manage own feedback"
ON public.activity_feedback FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Team staff can view team athlete feedback"
ON public.activity_feedback FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = activity_feedback.user_id
      AND p.team_id = public.get_my_team_id()
  )
);
