ALTER TABLE public.training_assignments
  ADD COLUMN IF NOT EXISTS link_status text;

ALTER TABLE public.training_assignments
  ADD CONSTRAINT training_assignments_link_status_check
  CHECK (link_status IS NULL OR link_status = ANY (ARRAY['auto_linked', 'pending_review', 'manually_linked', 'rejected']));

CREATE INDEX idx_training_assignments_pending_review
  ON public.training_assignments (user_id)
  WHERE link_status = 'pending_review';

COMMENT ON COLUMN public.training_assignments.link_status IS
  'Lifecycle of the Strava activity match for this assignment. NULL = not yet matched. auto_linked = matching engine was confident enough to link automatically (see matching_log). pending_review = a candidate activity exists but confidence was too low to auto-link; needs coach approval (candidate is in matching_log, not yet applied to activity_id/strava_activity_id/compliance_status). manually_linked = coach approved a suggestion or linked an activity by hand. rejected = coach dismissed a suggested match.';
