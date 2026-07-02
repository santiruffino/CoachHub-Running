-- Feature flag gating the Garmin integration to a small opt-in pilot group.
-- Checked in both the UI and the API route handlers before exposing any Garmin
-- functionality. Flipped per-user by an admin during the pilot.

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS garmin_pilot_enabled BOOLEAN NOT NULL DEFAULT false;
