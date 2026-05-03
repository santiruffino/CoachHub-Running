-- 20260422000000_matching_engine.sql
-- Migration to support the Matching Engine (SAN-27)

-- 1. Create matching_log table
CREATE TABLE IF NOT EXISTS public.matching_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES public.training_assignments(id) ON DELETE CASCADE,
    score FLOAT NOT NULL, -- Confidence score (0-1)
    match_details JSONB, -- Lap-by-lap comparison details
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add Strava activity reference and compliance status to training_assignments
ALTER TABLE public.training_assignments 
ADD COLUMN IF NOT EXISTS strava_activity_id UUID REFERENCES public.activities(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS compliance_status TEXT DEFAULT 'planned' CHECK (compliance_status IN ('planned', 'completed', 'partial'));

-- 3. Add index for performance on matching lookups
CREATE INDEX IF NOT EXISTS idx_training_assignments_strava_activity ON public.training_assignments(strava_activity_id);
CREATE INDEX IF NOT EXISTS idx_matching_log_activity ON public.matching_log(activity_id);
CREATE INDEX IF NOT EXISTS idx_matching_log_assignment ON public.matching_log(assignment_id);

-- 4. Enable RLS on matching_log (consistent with training_assignments access)
ALTER TABLE public.matching_log ENABLE ROW LEVEL SECURITY;

-- Policy: Athletes can see their own matching logs
CREATE POLICY "Athletes can view their own matching logs" ON public.matching_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.activities a 
            WHERE a.id = matching_log.activity_id 
            AND a.user_id = auth.uid()
        )
    );

-- Policy: Coaches can see matching logs for their athletes
CREATE POLICY "Coaches can view matching logs for their athletes" ON public.matching_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.activities a
            JOIN public.profiles p ON p.id = a.user_id
            WHERE a.id = matching_log.activity_id 
            AND p.coach_id = auth.uid()
        )
    );
