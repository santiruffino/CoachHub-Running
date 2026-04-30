-- Update the coach read policy for athlete_profiles to also check coach_id
-- This allows coaches to read profiles of athletes assigned directly to them

-- First, drop the existing restrictive policy
DROP POLICY IF EXISTS "Coaches can read athlete profiles" ON public.athlete_profiles;

-- Create a new policy that checks BOTH groups AND direct coach assignment
CREATE POLICY "Coaches can read athlete profiles" ON public.athlete_profiles FOR
SELECT USING (
        -- Check through groups
        EXISTS (
            SELECT 1
            FROM public.athlete_groups ag
                JOIN public.groups g ON ag.group_id = g.id
            WHERE
                ag.athlete_id = athlete_profiles.user_id
                AND g.coach_id = auth.uid ()
        )
        OR
        -- Also check direct coach_id relationship on profiles table
        EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE
                p.id = athlete_profiles.user_id
                AND p.coach_id = auth.uid ()
        )
    );
