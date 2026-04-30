-- Add hr_zones column to athlete_profiles table
-- This stores heart rate zones synced from Strava as JSONB

ALTER TABLE athlete_profiles
ADD COLUMN IF NOT EXISTS hr_zones JSONB;

-- Add a comment to document the structure
COMMENT ON COLUMN athlete_profiles.hr_zones IS 'Heart rate zones from Strava. Structure: { zones: [{ min: number, max: number }], custom_zones: boolean }';

-- Optional: Create an index for JSONB queries if needed in the future
CREATE INDEX IF NOT EXISTS idx_athlete_profiles_hr_zones ON athlete_profiles USING GIN (hr_zones);
