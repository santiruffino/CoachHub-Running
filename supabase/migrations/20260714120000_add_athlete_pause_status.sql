-- SAN-161: Allow admins to pause/reactivate athletes without deleting them.
-- A paused athlete keeps their profile, access and roster visibility, but is
-- excluded from the "billable / commercially active" athlete universe.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_paused_manual boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paused_at timestamptz,
  ADD COLUMN IF NOT EXISTS paused_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pause_reason text;

COMMENT ON COLUMN public.profiles.is_paused_manual IS 'SAN-161: admin-set manual pause. A paused athlete stays in the roster and can log in, but is excluded from billing/active counts.';
COMMENT ON COLUMN public.profiles.paused_at IS 'SAN-161: timestamp of the last manual pause action (null when active).';
COMMENT ON COLUMN public.profiles.paused_by IS 'SAN-161: auth user id of the admin who applied the last manual pause (null when active).';
COMMENT ON COLUMN public.profiles.pause_reason IS 'SAN-161: optional free-text reason captured when pausing manually.';

-- Speeds up the common "billable athletes for a team" filter
-- (role = ATHLETE + team_id + is_paused_manual = false).
CREATE INDEX IF NOT EXISTS idx_profiles_team_paused
  ON public.profiles (team_id, is_paused_manual)
  WHERE role = 'ATHLETE';
