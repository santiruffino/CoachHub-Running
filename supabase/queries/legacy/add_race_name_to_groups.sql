-- SQL Migration: Add race_name to groups table
-- Run this query in your Supabase SQL Editor

ALTER TABLE public.groups
ADD COLUMN race_name text;
