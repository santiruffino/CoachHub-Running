-- Dedup marker for the race-approaching reminder cron (SAN-92): ensures each
-- athlete_races row triggers at most one push/in-app reminder even if the
-- cron job is retried or re-runs for the same day.
ALTER TABLE public.athlete_races
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP WITH TIME ZONE;
