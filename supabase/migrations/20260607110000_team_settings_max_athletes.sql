-- =============================================
-- Migration: Add max_athletes to team_settings
-- 
-- Allows the team admin to set a hard cap on the number of athletes
-- in the team. Used for pricing tier enforcement.
-- NULL = unlimited (default for backward compatibility).
-- =============================================

ALTER TABLE public.team_settings
ADD COLUMN IF NOT EXISTS max_athletes INTEGER;

-- Optional: add a CHECK constraint to ensure positive values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints
        WHERE constraint_name = 'team_settings_max_athletes_positive'
    ) THEN
        ALTER TABLE public.team_settings
        ADD CONSTRAINT team_settings_max_athletes_positive
        CHECK (max_athletes IS NULL OR max_athletes > 0);
    END IF;
END $$;

COMMENT ON COLUMN public.team_settings.max_athletes IS
'Maximum number of athletes allowed in this team. NULL = unlimited.';
