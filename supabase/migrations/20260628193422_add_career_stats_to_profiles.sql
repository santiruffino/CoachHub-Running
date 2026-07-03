ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS career_stats jsonb,
  ADD COLUMN IF NOT EXISTS career_stats_synced_at timestamptz;

COMMENT ON COLUMN public.profiles.career_stats IS 'Cached snapshot of Strava athlete stats (YTD/all-time run totals) for the Career Progress dashboard widget.';
COMMENT ON COLUMN public.profiles.career_stats_synced_at IS 'Timestamp of the last successful sync-athlete-stats run; used to enforce a 24h refresh TTL.';
