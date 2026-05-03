-- Migration to support Race Management (SAN-79)

-- 1. Create Enums
DO $$ BEGIN
    CREATE TYPE public.race_priority AS ENUM ('A', 'B', 'C');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.race_status AS ENUM ('PLANNED', 'COMPLETED', 'DNR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create races table
CREATE TABLE IF NOT EXISTS public.races (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    team_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    distance TEXT, -- Using TEXT to support both decimal and descriptive strings (e.g. "5km", "Marathon")
    elevation_gain INTEGER,
    location TEXT,
    date DATE,
    is_template BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create athlete_races table
CREATE TABLE IF NOT EXISTS public.athlete_races (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    athlete_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    race_id UUID REFERENCES public.races(id) ON DELETE SET NULL,
    name_override TEXT,
    date DATE NOT NULL,
    priority public.race_priority DEFAULT 'C',
    target_time TEXT, -- Using TEXT for easier handling of various interval formats from frontend
    status public.race_status DEFAULT 'PLANNED',
    result_time TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE public.races ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_races ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for races

-- Coaches can manage races they created
CREATE POLICY "Coaches can manage races they created" ON public.races
    FOR ALL USING (coach_id = auth.uid());

-- Athletes can see races assigned to them
CREATE POLICY "Athletes can see races assigned to them" ON public.races
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.athlete_races ar
            WHERE ar.race_id = races.id
            AND ar.athlete_id = auth.uid()
        )
    );

-- Coaches can see races for their athletes (even if they didn't create the race template)
CREATE POLICY "Coaches can view races for their athletes" ON public.races
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.athlete_races ar
            JOIN public.profiles p ON p.id = ar.athlete_id
            WHERE ar.race_id = races.id
            AND p.coach_id = auth.uid()
        )
    );

-- 6. RLS Policies for athlete_races

-- Athletes can see their own races
CREATE POLICY "Athletes can view their own races" ON public.athlete_races
    FOR SELECT USING (athlete_id = auth.uid());

-- Athletes can update their own races (e.g. status, results)
CREATE POLICY "Athletes can update their own races" ON public.athlete_races
    FOR UPDATE USING (athlete_id = auth.uid());

-- Coaches can manage races for their athletes
CREATE POLICY "Coaches can manage races for their athletes" ON public.athlete_races
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = athlete_races.athlete_id
            AND p.coach_id = auth.uid()
        )
    );

-- 7. Triggers for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_races_updated_at ON public.races;
CREATE TRIGGER set_races_updated_at
    BEFORE UPDATE ON public.races
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_athlete_races_updated_at ON public.athlete_races;
CREATE TRIGGER set_athlete_races_updated_at
    BEFORE UPDATE ON public.athlete_races
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
