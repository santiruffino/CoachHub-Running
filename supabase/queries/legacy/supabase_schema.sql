-- Supabase Database Schema Migration
-- This SQL script creates all tables needed for Coach Hub Running

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types (enums)
CREATE TYPE role_type AS ENUM ('COACH', 'ATHLETE');

CREATE TYPE training_type AS ENUM ('RUNNING', 'STRENGTH', 'CYCLING', 'SWIMMING', 'OTHER');

CREATE TYPE metric_type AS ENUM ('VAM', 'UAN');

CREATE TYPE stream_type AS ENUM ('LATLNG', 'ALTITUDE', 'HEART_RATE', 'PACE', 'CADENCE', 'WATTS', 'TEMP');

CREATE TYPE sync_status AS ENUM ('SUCCESS', 'PARTIAL', 'FAILED');

-- Users table (extends Supabase Auth users)
-- Note: Supabase Auth handles email, password, email verification
-- This table stores additional user data
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    gender TEXT,
    is_onboarding_completed BOOLEAN DEFAULT false,
    role role_type NOT NULL DEFAULT 'ATHLETE',
    coach_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL, -- Direct coach-athlete relationship
    must_change_password BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_coach_id ON public.profiles (coach_id);

-- Coach Profiles
CREATE TABLE IF NOT EXISTS public.coach_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    user_id UUID UNIQUE NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    bio TEXT,
    experience TEXT,
    specialty TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Athlete Profiles
CREATE TABLE IF NOT EXISTS public.athlete_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    user_id UUID UNIQUE NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    dob DATE,
    height FLOAT, -- in cm
    weight FLOAT, -- in kg
    injuries TEXT,
    rest_hr INTEGER, -- Resting Heart Rate
    max_hr INTEGER, -- Max Heart Rate
    vam TEXT, -- Latest VAM Test Time (hh:mm)
    uan TEXT, -- Latest UAN Test Time (hh:mm)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Athlete Metrics
CREATE TABLE IF NOT EXISTS public.athlete_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    athlete_profile_id UUID NOT NULL REFERENCES public.athlete_profiles (id) ON DELETE CASCADE,
    type metric_type NOT NULL,
    value TEXT NOT NULL, -- Stored as String (hh:mm)
    date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Groups
CREATE TABLE IF NOT EXISTS public.groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    name TEXT NOT NULL,
    description TEXT,
    coach_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Athlete Groups (Many-to-Many)
CREATE TABLE IF NOT EXISTS public.athlete_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    athlete_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES public.groups (id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (athlete_id, group_id)
);

-- Trainings
CREATE TABLE IF NOT EXISTS public.trainings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    title TEXT NOT NULL,
    description TEXT,
    type training_type NOT NULL DEFAULT 'RUNNING',
    blocks JSONB, -- Structured workout blocks
    is_template BOOLEAN DEFAULT true,
    coach_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Training Assignments
CREATE TABLE IF NOT EXISTS public.training_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    scheduled_date TIMESTAMPTZ NOT NULL,
    completed BOOLEAN DEFAULT false,
    feedback TEXT,
    user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    training_id UUID NOT NULL REFERENCES public.trainings (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activities (Strava)
CREATE TABLE IF NOT EXISTS public.activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    external_id TEXT UNIQUE, -- Strava Activity ID
    title TEXT NOT NULL,
    type TEXT NOT NULL, -- "Run", "Ride", etc.
    distance FLOAT NOT NULL, -- meters
    duration INTEGER NOT NULL, -- seconds
    start_date TIMESTAMPTZ NOT NULL,
    elapsed_time INTEGER,
    elevation_gain FLOAT,
    avg_hr FLOAT,
    max_hr FLOAT,
    is_private BOOLEAN DEFAULT false,
    metadata JSONB, -- Raw Strava data
    user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_user_date ON public.activities (user_id, start_date);

-- Strava Connections
CREATE TABLE IF NOT EXISTS public.strava_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  strava_athlete_id TEXT UNIQUE NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  scopes TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Strava Activity Streams
CREATE TABLE IF NOT EXISTS public.strava_activity_streams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    activity_id UUID NOT NULL REFERENCES public.activities (id) ON DELETE CASCADE,
    type stream_type NOT NULL,
    data JSONB NOT NULL,
    resolution TEXT,
    UNIQUE (activity_id, type)
);

-- Sync Logs
CREATE TABLE IF NOT EXISTS public.sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    status sync_status NOT NULL,
    message TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    items_processed INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_user_date ON public.sync_logs (user_id, started_at);

-- Invitations
CREATE TABLE IF NOT EXISTS public.invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    email TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    accepted BOOLEAN DEFAULT false,
    expires_at TIMESTAMPTZ NOT NULL,
    coach_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Files (for future file storage)
CREATE TABLE IF NOT EXISTS public.files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    key TEXT NOT NULL, -- Storage key
    url TEXT NOT NULL,
    type TEXT NOT NULL, -- MIME type
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.coach_profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.athlete_profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.athlete_metrics ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.athlete_groups ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.training_assignments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.strava_connections ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.strava_activity_streams ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON public.profiles FOR
SELECT USING (auth.uid () = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles FOR
UPDATE USING (auth.uid () = id);

-- Coaches can read their athletes' profiles
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

-- Strava Connections policies
CREATE POLICY "Users can read own strava connection" ON public.strava_connections FOR
SELECT USING (auth.uid () = user_id);

CREATE POLICY "Users can insert own strava connection" ON public.strava_connections FOR
INSERT
WITH
    CHECK (auth.uid () = user_id);

CREATE POLICY "Users can update own strava connection" ON public.strava_connections FOR
UPDATE USING (auth.uid () = user_id)
WITH
    CHECK (auth.uid () = user_id);

CREATE POLICY "Users can delete own strava connection" ON public.strava_connections FOR DELETE USING (auth.uid () = user_id);

-- Groups table policies
CREATE POLICY "Coaches can read own groups" ON public.groups FOR
SELECT USING (auth.uid () = coach_id);

CREATE POLICY "Coaches can insert own groups" ON public.groups FOR
INSERT
WITH
    CHECK (auth.uid () = coach_id);

CREATE POLICY "Coaches can update own groups" ON public.groups FOR
UPDATE USING (auth.uid () = coach_id)
WITH
    CHECK (auth.uid () = coach_id);

CREATE POLICY "Coaches can delete own groups" ON public.groups FOR DELETE USING (auth.uid () = coach_id);

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

-- Athlete_groups table policies
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

CREATE POLICY "Coaches can delete athlete groups" ON public.athlete_groups FOR DELETE USING (
    EXISTS (
        SELECT 1
        FROM public.groups g
        WHERE
            g.id = athlete_groups.group_id
            AND g.coach_id = auth.uid ()
    )
);

CREATE POLICY "Athletes can read own group memberships" ON public.athlete_groups FOR
SELECT USING (auth.uid () = athlete_id);

-- Trainings table policies
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

-- Training_assignments table policies
CREATE POLICY "Athletes can read own assignments" ON public.training_assignments FOR
SELECT USING (auth.uid () = user_id);

CREATE POLICY "Athletes can update own assignments" ON public.training_assignments FOR
UPDATE USING (auth.uid () = user_id)
WITH
    CHECK (auth.uid () = user_id);

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

-- Activities table policies
CREATE POLICY "Users can read own activities" ON public.activities FOR
SELECT USING (auth.uid () = user_id);

CREATE POLICY "Users can insert own activities" ON public.activities FOR
INSERT
WITH
    CHECK (auth.uid () = user_id);

CREATE POLICY "Users can update own activities" ON public.activities FOR
UPDATE USING (auth.uid () = user_id)
WITH
    CHECK (auth.uid () = user_id);

CREATE POLICY "Users can delete own activities" ON public.activities FOR DELETE USING (auth.uid () = user_id);

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

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'ATHLETE');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when auth user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
