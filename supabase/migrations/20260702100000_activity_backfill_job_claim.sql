-- Index for the cron worker to scan queued jobs efficiently across all users,
-- oldest-first (FIFO), without touching every row via the existing per-user index.
CREATE INDEX IF NOT EXISTS idx_activity_backfill_jobs_queued_scan
  ON public.activity_backfill_jobs (created_at)
  WHERE status = 'queued';

-- Atomic claim: selects up to p_limit queued jobs (or running jobs stuck past
-- p_stuck_after) and flips them to 'running' in one transaction, using
-- FOR UPDATE SKIP LOCKED so concurrent cron invocations never grab the same row.
CREATE OR REPLACE FUNCTION public.claim_activity_backfill_jobs(
  p_limit INT DEFAULT 5,
  p_stuck_after INTERVAL DEFAULT INTERVAL '10 minutes'
)
RETURNS SETOF public.activity_backfill_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT id
    FROM public.activity_backfill_jobs
    WHERE status = 'queued'
       OR (status = 'running' AND started_at < NOW() - p_stuck_after)
    ORDER BY created_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.activity_backfill_jobs job
  SET status = 'running',
      started_at = NOW(),
      updated_at = NOW(),
      error = NULL
  FROM candidates
  WHERE job.id = candidates.id
  RETURNING job.*;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_activity_backfill_jobs(INT, INTERVAL) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_activity_backfill_jobs(INT, INTERVAL) TO service_role;

-- claim_activity_backfill_jobs mutates job state (and returns other users'
-- job rows via RETURNING); unlike read-only helpers such as is_admin(), it
-- must not be reachable by anon/authenticated over PostgREST. Supabase grants
-- EXECUTE on new public-schema functions to anon/authenticated by default
-- privileges, which REVOKE ... FROM PUBLIC does not undo.
REVOKE EXECUTE ON FUNCTION public.claim_activity_backfill_jobs(INT, INTERVAL) FROM anon, authenticated;
