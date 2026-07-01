-- Schedule hourly purge for expired rate limit buckets

DO $$
DECLARE
  existing_job_id BIGINT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron') THEN
    SELECT jobid
    INTO existing_job_id
    FROM cron.job
    WHERE jobname = 'purge-expired-rate-limit-buckets-hourly'
    LIMIT 1;

    IF existing_job_id IS NOT NULL THEN
      PERFORM cron.unschedule(existing_job_id);
    END IF;

    PERFORM cron.schedule(
      'purge-expired-rate-limit-buckets-hourly',
      '0 * * * *',
      $job$SELECT public.purge_expired_rate_limit_buckets();$job$
    );
  END IF;
END;
$$;
