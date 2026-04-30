-- Fix RLS Policies for strava_connections table
-- Run this SQL in your Supabase SQL Editor

-- Allow users to read their own Strava connection
CREATE POLICY "Users can read own strava connection" ON public.strava_connections FOR
SELECT USING (auth.uid () = user_id);

-- Allow users to insert their own Strava connection
CREATE POLICY "Users can insert own strava connection" ON public.strava_connections FOR
INSERT
WITH
    CHECK (auth.uid () = user_id);

-- Allow users to update their own Strava connection
CREATE POLICY "Users can update own strava connection" ON public.strava_connections FOR
UPDATE USING (auth.uid () = user_id)
WITH
    CHECK (auth.uid () = user_id);

-- Allow users to delete their own Strava connection
CREATE POLICY "Users can delete own strava connection" ON public.strava_connections FOR DELETE USING (auth.uid () = user_id);

-- Optional: Allow coaches to read their athletes' Strava connections
-- Uncomment if coaches need to see athlete Strava connection status
/*
CREATE POLICY "Coaches can read athlete strava connections"
ON public.strava_connections FOR SELECT
USING (
EXISTS (
SELECT 1 FROM public.athlete_groups ag
JOIN public.groups g ON ag.group_id = g.id
WHERE ag.athlete_id = strava_connections.user_id 
AND g.coach_id = auth.uid()
)
);
*/
