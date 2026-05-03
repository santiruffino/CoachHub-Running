-- 20260422000002_add_speed_to_activities.sql
-- Migration to add speed columns to activities table (Fixes "Could not find average_speed" error)

-- 1. Add speed columns to activities
ALTER TABLE public.activities 
ADD COLUMN IF NOT EXISTS average_speed FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_speed FLOAT DEFAULT 0;

-- 2. Add comment for documentation
COMMENT ON COLUMN public.activities.average_speed IS 'Average speed in meters per second (from Strava)';
COMMENT ON COLUMN public.activities.max_speed IS 'Maximum speed in meters per second (from Strava)';
