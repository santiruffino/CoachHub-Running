-- Fix Infinite Recursion in RLS Policies
-- This script DROPS and RECREATES policies to avoid circular dependencies
-- Run this SQL in your Supabase SQL Editor

-- ============================================
-- STEP 1: Drop problematic policies
-- ============================================

-- Drop the circular policies on groups and athlete_groups
DROP POLICY IF EXISTS "Athletes can read their groups" ON public.groups;

DROP POLICY IF EXISTS "Coaches can read athlete profiles" ON public.profiles;

-- ============================================
-- STEP 2: Recreate policies without recursion
-- ============================================

-- Simplified policy: Athletes can read groups they belong to
-- Uses SECURITY DEFINER to bypass RLS on athlete_groups lookup
CREATE OR REPLACE FUNCTION check_athlete_in_group(group_id_param UUID, athlete_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.athlete_groups
    WHERE group_id = group_id_param 
      AND athlete_id = athlete_id_param
  );
END;
$$;

-- Now create the policy using the function
CREATE POLICY "Athletes can read their groups" ON public.groups FOR
SELECT USING (
        check_athlete_in_group (id, auth.uid ())
    );

-- Simplified policy for coaches reading athlete profiles
-- Direct check without recursion
CREATE POLICY "Coaches can read athlete profiles" ON public.profiles FOR
SELECT USING (
        auth.uid () = id
        OR EXISTS (
            SELECT 1
            FROM public.groups g
            WHERE
                g.coach_id = auth.uid ()
                AND EXISTS (
                    SELECT 1
                    FROM public.athlete_groups ag
                    WHERE
                        ag.group_id = g.id
                        AND ag.athlete_id = profiles.id
                )
        )
    );

-- ============================================
-- ALTERNATIVE SIMPLER APPROACH (if above doesn't work)
-- ============================================
-- If the function approach has issues, uncomment this simpler version:
-- This removes the "Athletes can read their groups" policy entirely
-- Athletes will only see groups through other means (UI queries)

/*
DROP POLICY IF EXISTS "Athletes can read their groups" ON public.groups;

-- Keep only coach access to groups
-- Coaches can read their own groups (already exists, no change needed)
-- Athletes won't have direct SELECT on groups table
-- Instead, APIs will use service role or coach credentials to fetch group data
*/
