-- 20260422000001_add_group_archive_and_indexes.sql
-- Migration to support group archiving and performance optimizations

-- 1. Add is_archived column to groups
ALTER TABLE public.groups 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- 2. Add indexes for performance optimization
-- Index for filtering active/archived groups efficiently
CREATE INDEX IF NOT EXISTS idx_groups_is_archived ON public.groups(is_archived);

-- Index for race date and type (used in Dashboard and Group List)
CREATE INDEX IF NOT EXISTS idx_groups_type_race_date ON public.groups(group_type, race_date);

-- 3. Update existing data (Optional: auto-archive groups older than 1 month)
-- Uncomment the following line if you want to perform a one-time cleanup
-- UPDATE public.groups SET is_archived = true WHERE group_type = 'RACE' AND race_date < (CURRENT_DATE - INTERVAL '1 month');
