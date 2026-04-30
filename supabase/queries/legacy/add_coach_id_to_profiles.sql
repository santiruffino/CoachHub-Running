-- Add coach_id to profiles table for direct coach-athlete relationship
-- Run this SQL in your Supabase SQL Editor

-- Add coach_id column to profiles table
ALTER TABLE public.profiles
ADD COLUMN coach_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL;

-- Create index for faster coach queries
CREATE INDEX idx_profiles_coach_id ON public.profiles (coach_id);

-- Add RLS policy for athletes to read their coach's profile
CREATE POLICY "Athletes can read own coach profile" ON public.profiles FOR
SELECT USING (
        auth.uid () = id
        OR auth.uid () = coach_id
        OR EXISTS (
            SELECT 1
            FROM public.athlete_groups ag
                JOIN public.groups g ON ag.group_id = g.id
            WHERE
                ag.athlete_id = profiles.id
                AND g.coach_id = auth.uid ()
        )
    );

-- Note: The above policy combines:
-- 1. Users can read their own profile
-- 2. Athletes can read their coach's profile
-- 3. Coaches can read their athletes' profiles (via groups)
