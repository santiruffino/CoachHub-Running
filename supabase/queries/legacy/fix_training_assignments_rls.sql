-- Fix training_assignments RLS policy to use coach_id instead of groups
-- Run this SQL in your Supabase SQL Editor

-- Drop the old group-based INSERT policy
DROP POLICY IF EXISTS "Coaches can insert athlete assignments" ON public.training_assignments;

-- Create new coach_id-based INSERT policy
CREATE POLICY "Coaches can insert athlete assignments" ON public.training_assignments FOR
INSERT
WITH
    CHECK (
        -- Coach can insert assignments for athletes they coach
        EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE
                p.id = training_assignments.user_id
                AND p.coach_id = auth.uid ()
        )
    );

-- Also update the UPDATE policy
DROP POLICY IF EXISTS "Coaches can update athlete assignments" ON public.training_assignments;

CREATE POLICY "Coaches can update athlete assignments" ON public.training_assignments FOR
UPDATE USING (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE
            p.id = training_assignments.user_id
            AND p.coach_id = auth.uid ()
    )
);

-- Also update the DELETE policy
DROP POLICY IF EXISTS "Coaches can delete athlete assignments" ON public.training_assignments;

CREATE POLICY "Coaches can delete athlete assignments" ON public.training_assignments FOR DELETE USING (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE
            p.id = training_assignments.user_id
            AND p.coach_id = auth.uid ()
    )
);

-- Also update the READ policy
DROP POLICY IF EXISTS "Coaches can read athlete assignments" ON public.training_assignments;

CREATE POLICY "Coaches can read athlete assignments" ON public.training_assignments FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE
                p.id = training_assignments.user_id
                AND p.coach_id = auth.uid ()
        )
    );
