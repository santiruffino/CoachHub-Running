-- SAN-91 + SAN-102
-- Coach/Team persisted settings and append-only admin action logs.

CREATE TABLE IF NOT EXISTS public.team_settings (
  team_id UUID PRIMARY KEY,
  thresholds JSONB NOT NULL DEFAULT '{}'::jsonb,
  branding JSONB NOT NULL DEFAULT '{}'::jsonb,
  default_models JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.coach_settings (
  coach_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id UUID NOT NULL,
  thresholds JSONB NOT NULL DEFAULT '{}'::jsonb,
  default_models JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_settings_team_id ON public.coach_settings(team_id);

CREATE TABLE IF NOT EXISTS public.admin_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  actor_role TEXT NOT NULL,
  team_id UUID,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_action_logs_team_created_at ON public.admin_action_logs(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_actor_created_at ON public.admin_action_logs(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_action_created_at ON public.admin_action_logs(action, created_at DESC);

ALTER TABLE public.team_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_action_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Team staff can read team settings" ON public.team_settings;
DROP POLICY IF EXISTS "Admins can write team settings" ON public.team_settings;

CREATE POLICY "Team staff can read team settings"
ON public.team_settings
FOR SELECT
USING (
  team_id = public.get_my_team_id()
);

CREATE POLICY "Admins can write team settings"
ON public.team_settings
FOR ALL
USING (
  team_id = public.get_my_team_id()
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'ADMIN'
  )
)
WITH CHECK (
  team_id = public.get_my_team_id()
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'ADMIN'
  )
);

DROP POLICY IF EXISTS "Team staff can read coach settings" ON public.coach_settings;
DROP POLICY IF EXISTS "Coaches can manage own settings" ON public.coach_settings;

CREATE POLICY "Team staff can read coach settings"
ON public.coach_settings
FOR SELECT
USING (
  team_id = public.get_my_team_id()
);

CREATE POLICY "Coaches can manage own settings"
ON public.coach_settings
FOR ALL
USING (
  team_id = public.get_my_team_id()
  AND (
    coach_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'ADMIN'
    )
  )
)
WITH CHECK (
  team_id = public.get_my_team_id()
  AND (
    coach_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'ADMIN'
    )
  )
);

DROP POLICY IF EXISTS "Admins can read team admin action logs" ON public.admin_action_logs;
DROP POLICY IF EXISTS "Admins can insert own admin action logs" ON public.admin_action_logs;

CREATE POLICY "Admins can read team admin action logs"
ON public.admin_action_logs
FOR SELECT
USING (
  team_id = public.get_my_team_id()
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'ADMIN'
  )
);

CREATE POLICY "Admins can insert own admin action logs"
ON public.admin_action_logs
FOR INSERT
WITH CHECK (
  actor_id = auth.uid()
  AND team_id = public.get_my_team_id()
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'ADMIN'
  )
);

CREATE OR REPLACE FUNCTION public.prevent_admin_action_log_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'admin_action_logs is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_admin_action_log_update ON public.admin_action_logs;
DROP TRIGGER IF EXISTS trg_prevent_admin_action_log_delete ON public.admin_action_logs;

CREATE TRIGGER trg_prevent_admin_action_log_update
BEFORE UPDATE ON public.admin_action_logs
FOR EACH ROW EXECUTE FUNCTION public.prevent_admin_action_log_mutation();

CREATE TRIGGER trg_prevent_admin_action_log_delete
BEFORE DELETE ON public.admin_action_logs
FOR EACH ROW EXECUTE FUNCTION public.prevent_admin_action_log_mutation();
