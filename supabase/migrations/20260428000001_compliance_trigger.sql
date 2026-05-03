-- SQL to enable the compliance evaluation trigger
-- This should be applied via the Supabase Dashboard or CLI if the 'net' extension is enabled

-- 1. Create the trigger function
CREATE OR REPLACE FUNCTION public.tr_evaluate_compliance()
RETURNS TRIGGER AS $$
BEGIN
  -- Trigger the edge function only when a Strava activity is newly linked to an assignment
  IF (NEW.strava_activity_id IS NOT NULL AND OLD.strava_activity_id IS NULL) THEN
    -- In a real Supabase environment, this would call the edge function via pg_net or a built-in webhook
    -- For this implementation, we assume the user sets up a "Database Webhook" via the Dashboard
    -- that points to the 'evaluate-compliance' edge function on UPDATE of 'training_assignments'
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Add documentation comment
COMMENT ON FUNCTION public.tr_evaluate_compliance() IS 'Trigger function placeholder. Please set up a Database Webhook in the Supabase Dashboard for the training_assignments table on UPDATE events.';
