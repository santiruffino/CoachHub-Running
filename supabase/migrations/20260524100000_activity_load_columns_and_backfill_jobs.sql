-- Add typed activity load columns and async backfill tracking table

ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS suffer_score NUMERIC,
  ADD COLUMN IF NOT EXISTS load_score NUMERIC;

UPDATE public.activities
SET
  suffer_score = CASE
    WHEN metadata ? 'suffer_score'
      AND jsonb_typeof(metadata->'suffer_score') = 'number'
      THEN (metadata->>'suffer_score')::NUMERIC
    ELSE suffer_score
  END
WHERE suffer_score IS NULL;

UPDATE public.activities
SET load_score = CASE
  WHEN load_score IS NOT NULL THEN load_score
  WHEN suffer_score IS NOT NULL THEN GREATEST(0, suffer_score)
  ELSE GREATEST(0, (duration::NUMERIC / 3600.0) * 45)
END
WHERE load_score IS NULL;

CREATE INDEX IF NOT EXISTS idx_activities_user_start_date_load
  ON public.activities (user_id, start_date DESC)
  INCLUDE (load_score, suffer_score, duration, avg_hr, max_hr);

CREATE TABLE IF NOT EXISTS public.activity_backfill_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'success', 'failed')),
  window_days INTEGER NOT NULL DEFAULT 90 CHECK (window_days > 0),
  activities_processed INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_backfill_jobs_user_created
  ON public.activity_backfill_jobs (user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_activity_backfill_jobs_active_unique
  ON public.activity_backfill_jobs (user_id)
  WHERE status IN ('queued', 'running');

ALTER TABLE public.activity_backfill_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage activity backfill jobs" ON public.activity_backfill_jobs;
CREATE POLICY "Service role can manage activity backfill jobs"
ON public.activity_backfill_jobs
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
