-- Enforce Strava streams cache retention window (7 days max)

CREATE INDEX IF NOT EXISTS idx_activity_streams_created_at
  ON public.activity_streams(created_at);

CREATE OR REPLACE FUNCTION public.purge_expired_activity_streams()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.activity_streams
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$;
