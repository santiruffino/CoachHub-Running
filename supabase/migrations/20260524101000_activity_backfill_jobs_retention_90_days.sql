-- Enforce activity backfill job retention window (90 days)

CREATE INDEX IF NOT EXISTS idx_activity_backfill_jobs_created_at
  ON public.activity_backfill_jobs(created_at);

CREATE OR REPLACE FUNCTION public.purge_expired_activity_backfill_jobs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.activity_backfill_jobs
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;
