-- 20260427000000_workout_snapshots.sql
-- Migration to support Workout Snapshots (SAN-21)

-- 1. Add missing columns to training_assignments
ALTER TABLE public.training_assignments 
ADD COLUMN IF NOT EXISTS workout_snapshot JSONB,
ADD COLUMN IF NOT EXISTS expected_rpe INTEGER,
ADD COLUMN IF NOT EXISTS workout_name TEXT,
ADD COLUMN IF NOT EXISTS source_group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL;

-- 2. Add composite index for calendar performance
CREATE INDEX IF NOT EXISTS idx_training_assignments_athlete_date 
ON public.training_assignments(user_id, scheduled_date);

-- 3. Update RLS (Ensure comprehensive coach access)
-- Coaches should be able to manage any assignment for athletes they manage
DROP POLICY IF EXISTS "Coaches can manage assignments for their athletes" ON public.training_assignments;

CREATE POLICY "Coaches can manage assignments for their athletes" ON public.training_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = training_assignments.user_id
            AND p.coach_id = auth.uid()
        )
    );
