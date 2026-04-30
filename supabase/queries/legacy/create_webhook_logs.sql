-- Create webhook_logs table for Strava and other incoming webhooks
CREATE TABLE IF NOT EXISTS public.webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL, -- e.g., 'strava'
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on source and created_at for auditing
CREATE INDEX IF NOT EXISTS idx_webhook_logs_source ON public.webhook_logs(source);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON public.webhook_logs(created_at);

-- Enable RLS
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Only admins/service role can view logs
CREATE POLICY "Service role only" ON public.webhook_logs 
USING (false); -- Default deny, service role bypasses this
