-- Migration to support Automated Training Zone Compliance Alerts (SAN-82)

-- 1. Create activity_compliance table
CREATE TABLE IF NOT EXISTS public.activity_compliance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE,
    compliance_score NUMERIC(5,2) NOT NULL, -- 0-100.00
    is_violation BOOLEAN DEFAULT false,
    violation_details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create alerts table
CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    athlete_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Add indexes
CREATE INDEX IF NOT EXISTS idx_activity_compliance_activity ON public.activity_compliance(activity_id);
CREATE INDEX IF NOT EXISTS idx_alerts_coach_id ON public.alerts(coach_id);
CREATE INDEX IF NOT EXISTS idx_alerts_athlete_id ON public.alerts(athlete_id);
CREATE INDEX IF NOT EXISTS idx_alerts_is_read ON public.alerts(is_read);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.activity_compliance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for activity_compliance

-- Athletes can view their own compliance data
CREATE POLICY "Athletes can view their own compliance" ON public.activity_compliance
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.activities a 
            WHERE a.id = activity_compliance.activity_id 
            AND a.user_id = auth.uid()
        )
    );

-- Coaches can view compliance data for their athletes
CREATE POLICY "Coaches can view compliance for their athletes" ON public.activity_compliance
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.activities a
            JOIN public.profiles p ON p.id = a.user_id
            WHERE a.id = activity_compliance.activity_id 
            AND p.coach_id = auth.uid()
        )
    );

-- 6. RLS Policies for alerts

-- Coaches can manage their own alerts
CREATE POLICY "Coaches can manage their alerts" ON public.alerts
    FOR ALL USING (coach_id = auth.uid());

-- Athletes can view alerts related to them
CREATE POLICY "Athletes can view their alerts" ON public.alerts
    FOR SELECT USING (athlete_id = auth.uid());
