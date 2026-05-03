-- Migration for SAN-85: Activity Streams Caching
CREATE TABLE IF NOT EXISTS public.activity_streams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE,
    external_id TEXT NOT NULL, -- Strava activity ID
    stream_data JSONB NOT NULL, -- Full stream payload
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup by internal activity_id
CREATE INDEX IF NOT EXISTS idx_activity_streams_activity ON public.activity_streams(activity_id);
-- Index for lookup by external_id (useful for matching during sync)
CREATE INDEX IF NOT EXISTS idx_activity_streams_external ON public.activity_streams(external_id);

-- Enable RLS
ALTER TABLE public.activity_streams ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view streams for their own activities" ON public.activity_streams
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.activities a 
            WHERE a.id = activity_streams.activity_id 
            AND a.user_id = auth.uid()
        )
    );

CREATE POLICY "Coaches can view streams for their athletes" ON public.activity_streams
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.activities a
            JOIN public.profiles p ON p.id = a.user_id
            WHERE a.id = activity_streams.activity_id 
            AND p.coach_id = auth.uid()
        )
    );
