-- Fix RLS Policies for groups, athlete_groups, and other missing tables
-- Run this SQL in your Supabase SQL Editor

-- ============================================
-- GROUPS TABLE POLICIES
-- ============================================

-- Coaches can read their own groups
CREATE POLICY "Coaches can read own groups" ON public.groups FOR
SELECT USING (auth.uid () = coach_id);

-- Coaches can insert their own groups
CREATE POLICY "Coaches can insert own groups" ON public.groups FOR
INSERT
WITH
    CHECK (auth.uid () = coach_id);

-- Coaches can update their own groups
CREATE POLICY "Coaches can update own groups" ON public.groups FOR
UPDATE USING (auth.uid () = coach_id)
WITH
    CHECK (auth.uid () = coach_id);

-- Coaches can delete their own groups
CREATE POLICY "Coaches can delete own groups" ON public.groups FOR DELETE USING (auth.uid () = coach_id);

-- Athletes can read groups they belong to
CREATE POLICY "Athletes can read their groups" ON public.groups FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.athlete_groups ag
            WHERE
                ag.group_id = groups.id
                AND ag.athlete_id = auth.uid ()
        )
    );

-- ============================================
-- ATHLETE_GROUPS TABLE POLICIES
-- ============================================

-- Coaches can read athlete_groups for their groups
CREATE POLICY "Coaches can read athlete groups" ON public.athlete_groups FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.groups g
            WHERE
                g.id = athlete_groups.group_id
                AND g.coach_id = auth.uid ()
        )
    );

-- Coaches can add athletes to their groups
CREATE POLICY "Coaches can insert athlete groups" ON public.athlete_groups FOR
INSERT
WITH
    CHECK (
        EXISTS (
            SELECT 1
            FROM public.groups g
            WHERE
                g.id = athlete_groups.group_id
                AND g.coach_id = auth.uid ()
        )
    );

-- Coaches can remove athletes from their groups
CREATE POLICY "Coaches can delete athlete groups" ON public.athlete_groups FOR DELETE USING (
    EXISTS (
        SELECT 1
        FROM public.groups g
        WHERE
            g.id = athlete_groups.group_id
            AND g.coach_id = auth.uid ()
    )
);

-- Athletes can read their own group memberships
CREATE POLICY "Athletes can read own group memberships" ON public.athlete_groups FOR
SELECT USING (auth.uid () = athlete_id);

-- ============================================
-- TRAININGS TABLE POLICIES
-- ============================================

-- Coaches can manage their own trainings
CREATE POLICY "Coaches can read own trainings" ON public.trainings FOR
SELECT USING (auth.uid () = coach_id);

CREATE POLICY "Coaches can insert own trainings" ON public.trainings FOR
INSERT
WITH
    CHECK (auth.uid () = coach_id);

CREATE POLICY "Coaches can update own trainings" ON public.trainings FOR
UPDATE USING (auth.uid () = coach_id)
WITH
    CHECK (auth.uid () = coach_id);

CREATE POLICY "Coaches can delete own trainings" ON public.trainings FOR DELETE USING (auth.uid () = coach_id);

-- Athletes can read trainings assigned to them
CREATE POLICY "Athletes can read assigned trainings" ON public.trainings FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.training_assignments ta
            WHERE
                ta.training_id = trainings.id
                AND ta.user_id = auth.uid ()
        )
    );

-- ============================================
-- TRAINING_ASSIGNMENTS TABLE POLICIES
-- ============================================

-- Athletes can read their own assignments
CREATE POLICY "Athletes can read own assignments" ON public.training_assignments FOR
SELECT USING (auth.uid () = user_id);

-- Athletes can update their own assignments (complete, add feedback)
CREATE POLICY "Athletes can update own assignments" ON public.training_assignments FOR
UPDATE USING (auth.uid () = user_id)
WITH
    CHECK (auth.uid () = user_id);

-- Coaches can read assignments for their athletes
CREATE POLICY "Coaches can read athlete assignments" ON public.training_assignments FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.athlete_groups ag
                JOIN public.groups g ON ag.group_id = g.id
            WHERE
                ag.athlete_id = training_assignments.user_id
                AND g.coach_id = auth.uid ()
        )
    );

-- Coaches can create assignments for their athletes
CREATE POLICY "Coaches can insert athlete assignments" ON public.training_assignments FOR
INSERT
WITH
    CHECK (
        EXISTS (
            SELECT 1
            FROM public.athlete_groups ag
                JOIN public.groups g ON ag.group_id = g.id
            WHERE
                ag.athlete_id = training_assignments.user_id
                AND g.coach_id = auth.uid ()
        )
    );

-- Coaches can update assignments for their athletes
CREATE POLICY "Coaches can update athlete assignments" ON public.training_assignments FOR
UPDATE USING (
    EXISTS (
        SELECT 1
        FROM public.athlete_groups ag
            JOIN public.groups g ON ag.group_id = g.id
        WHERE
            ag.athlete_id = training_assignments.user_id
            AND g.coach_id = auth.uid ()
    )
);

-- Coaches can delete assignments for their athletes
CREATE POLICY "Coaches can delete athlete assignments" ON public.training_assignments FOR DELETE USING (
    EXISTS (
        SELECT 1
        FROM public.athlete_groups ag
            JOIN public.groups g ON ag.group_id = g.id
        WHERE
            ag.athlete_id = training_assignments.user_id
            AND g.coach_id = auth.uid ()
    )
);

-- ============================================
-- ACTIVITIES TABLE POLICIES
-- ============================================

-- Users can read their own activities
CREATE POLICY "Users can read own activities" ON public.activities FOR
SELECT USING (auth.uid () = user_id);

-- Users can insert their own activities
CREATE POLICY "Users can insert own activities" ON public.activities FOR
INSERT
WITH
    CHECK (auth.uid () = user_id);

-- Users can update their own activities
CREATE POLICY "Users can update own activities" ON public.activities FOR
UPDATE USING (auth.uid () = user_id)
WITH
    CHECK (auth.uid () = user_id);

-- Users can delete their own activities
CREATE POLICY "Users can delete own activities" ON public.activities FOR DELETE USING (auth.uid () = user_id);

-- Coaches can read their athletes' activities
CREATE POLICY "Coaches can read athlete activities" ON public.activities FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.athlete_groups ag
                JOIN public.groups g ON ag.group_id = g.id
            WHERE
                ag.athlete_id = activities.user_id
                AND g.coach_id = auth.uid ()
        )
    );
