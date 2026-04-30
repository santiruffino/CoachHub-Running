-- Migration to add onboarding fields and demographic fields
-- 1. Add is_onboarding_completed, phone, gender to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS gender TEXT;
