-- Tag each activity with the provider it came from so Garmin-sourced activities
-- can be filtered, deduplicated and cleaned up independently of Strava.
--
-- We deliberately do NOT change the (user_id, external_id) unique index: Garmin
-- activities are stored with a namespaced external_id ('garmin:<id>') so they
-- can never collide with Strava's numeric ids, and the existing Strava upserts
-- (ON CONFLICT user_id,external_id) keep working untouched.

ALTER TABLE public.activities
    ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'strava'
        CHECK (provider IN ('strava', 'garmin'));

-- Existing rows are all Strava; the default already covers them.
CREATE INDEX IF NOT EXISTS idx_activities_user_provider
    ON public.activities (user_id, provider);
