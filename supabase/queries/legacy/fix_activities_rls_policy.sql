-- Fix activities RLS policy to use coach_id instead of groups
-- Run this SQL in your Supabase SQL Editor

-- Drop the old group-based policy
DROP POLICY IF EXISTS "Coaches can read athlete activities" ON public.activities;

-- Create new coach_id-based policy
CREATE POLICY "Coaches can read athlete activities" ON public.activities FOR
SELECT USING (
        -- Coach can read activities of athletes they coach
        EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE
                p.id = activities.user_id
                AND p.coach_id = auth.uid ()
        )
    );
