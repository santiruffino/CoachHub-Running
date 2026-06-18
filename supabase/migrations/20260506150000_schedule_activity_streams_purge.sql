-- Schedule daily purge for Strava streams cache retention (7 days)

DO $$
DECLARE
  existing_job_id BIGINT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron') THEN
    SELECT jobid
    INTO existing_job_id
    FROM cron.job
    WHERE jobname = 'purge-expired-activity-streams-daily'
    LIMIT 1;

    IF existing_job_id IS NOT NULL THEN
      PERFORM cron.unschedule(existing_job_id);
    END IF;

    PERFORM cron.schedule(
      'purge-expired-activity-streams-daily',
      '17 3 * * *',
      $job$SELECT public.purge_expired_activity_streams();$job$
    );
  END IF;
END;
$$;
