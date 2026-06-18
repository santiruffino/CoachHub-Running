ALTER TABLE public.alerts
ADD COLUMN IF NOT EXISTS score INTEGER,
ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN ('P1', 'P2', 'P3', 'P4')),
ADD COLUMN IF NOT EXISTS reason_codes TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS recommended_action TEXT,
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'SNOOZED', 'RESOLVED')),
ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_alerts_priority_unread_created
ON public.alerts(priority, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_status
ON public.alerts(status);
