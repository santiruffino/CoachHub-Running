-- Fix RLS Policies for profiles table
-- Run this SQL in your Supabase SQL Editor

-- ============================================
-- PROFILES TABLE POLICIES
-- ============================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON public.profiles FOR
SELECT USING (auth.uid () = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles FOR
UPDATE USING (auth.uid () = id);

-- Coaches can read their athletes' profiles
-- This policy includes both: coaches reading their own profile AND reading athlete profiles
CREATE POLICY "Coaches can read athlete profiles" ON public.profiles FOR
SELECT USING (
        auth.uid () = id
        OR EXISTS (
            SELECT 1
            FROM public.athlete_groups ag
                JOIN public.groups g ON ag.group_id = g.id
            WHERE
                ag.athlete_id = profiles.id
                AND g.coach_id = auth.uid ()
        )
    );
