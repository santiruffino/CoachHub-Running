-- Add missing RLS policies for coach_profiles and athlete_profiles
-- These tables had RLS enabled but no policies, preventing any updates

-- Coach Profiles Policies
-- Coaches can read their own coach profile
CREATE POLICY "Coaches can read own coach profile" ON public.coach_profiles FOR
SELECT USING (auth.uid () = user_id);

-- Coaches can insert their own coach profile
CREATE POLICY "Coaches can insert own coach profile" ON public.coach_profiles FOR
INSERT
WITH
    CHECK (auth.uid () = user_id);

-- Coaches can update their own coach profile
CREATE POLICY "Coaches can update own coach profile" ON public.coach_profiles FOR
UPDATE USING (auth.uid () = user_id)
WITH
    CHECK (auth.uid () = user_id);

-- Athlete Profiles Policies
-- Athletes can read their own athlete profile
CREATE POLICY "Athletes can read own athlete profile" ON public.athlete_profiles FOR
SELECT USING (auth.uid () = user_id);

-- Athletes can insert their own athlete profile
CREATE POLICY "Athletes can insert own athlete profile" ON public.athlete_profiles FOR
INSERT
WITH
    CHECK (auth.uid () = user_id);

-- Athletes can update their own athlete profile
CREATE POLICY "Athletes can update own athlete profile" ON public.athlete_profiles FOR
UPDATE USING (auth.uid () = user_id)
WITH
    CHECK (auth.uid () = user_id);

-- Coaches can read athlete profiles for their athletes
CREATE POLICY "Coaches can read athlete profiles" ON public.athlete_profiles FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.athlete_groups ag
                JOIN public.groups g ON ag.group_id = g.id
            WHERE
                ag.athlete_id = athlete_profiles.user_id
                AND g.coach_id = auth.uid ()
        )
    );
