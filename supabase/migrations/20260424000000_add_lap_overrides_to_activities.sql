-- 20260424000000_add_lap_overrides_to_activities.sql
-- Migration to add manual lap overrides to activities table

ALTER TABLE public.activities 
ADD COLUMN IF NOT EXISTS lap_overrides JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.activities.lap_overrides IS 'Stores manual coach overrides for lap interval types, mapped by lap index.';
