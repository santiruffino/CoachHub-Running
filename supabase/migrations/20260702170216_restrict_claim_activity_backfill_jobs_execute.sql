-- claim_activity_backfill_jobs mutates job state (and returns other users'
-- job rows via RETURNING); unlike read-only helpers such as is_admin(), it
-- must not be reachable by anon/authenticated over PostgREST. Supabase grants
-- EXECUTE on new public-schema functions to anon/authenticated by default
-- privileges, which REVOKE ... FROM PUBLIC does not undo.
REVOKE EXECUTE ON FUNCTION public.claim_activity_backfill_jobs(INT, INTERVAL) FROM anon, authenticated;
