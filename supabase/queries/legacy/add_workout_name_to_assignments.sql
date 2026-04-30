-- Add workout_name column to training_assignments table
-- This allows coaches to set a custom name for a workout assignment
-- without modifying the underlying training template
-- Run this SQL in your Supabase SQL Editor

ALTER TABLE public.training_assignments
ADD COLUMN IF NOT EXISTS workout_name TEXT;

COMMENT ON COLUMN public.training_assignments.workout_name IS 'Custom name for this specific workout assignment. When set, this overrides the training template title for display purposes.';
