-- SQL Migration: Add missing API fields idempotently
-- This script ensures all backend API fields exist in the database schema.
-- The IF NOT EXISTS clause ensures it will safely skip columns that were already added.
-- Connect to your Supabase project's SQL Editor to run this.

-- 1. PROFILES Table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS team_id UUID;

-- 2. GROUPS Table
ALTER TABLE public.groups
ADD COLUMN IF NOT EXISTS group_type TEXT DEFAULT 'REGULAR',
ADD COLUMN IF NOT EXISTS race_name TEXT,
ADD COLUMN IF NOT EXISTS race_date DATE,
ADD COLUMN IF NOT EXISTS race_distance TEXT,
ADD COLUMN IF NOT EXISTS race_priority TEXT,
ADD COLUMN IF NOT EXISTS team_id UUID;

-- 3. TRAININGS Table
ALTER TABLE public.trainings
ADD COLUMN IF NOT EXISTS team_id UUID;

-- 4. INVITATIONS Table
ALTER TABLE public.invitations
ADD COLUMN IF NOT EXISTS team_id UUID;

-- 5. Add comments to help document the schema's tenant isolation
COMMENT ON COLUMN public.profiles.team_id IS 'Logical tenant boundary grouping users into a specific Running Team';
COMMENT ON COLUMN public.groups.team_id IS 'Logical tenant boundary grouping';
COMMENT ON COLUMN public.trainings.team_id IS 'Logical tenant boundary grouping';
COMMENT ON COLUMN public.invitations.team_id IS 'Logical tenant boundary grouping';
