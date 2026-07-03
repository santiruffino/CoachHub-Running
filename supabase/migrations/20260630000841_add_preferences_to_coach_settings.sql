ALTER TABLE coach_settings ADD COLUMN IF NOT EXISTS preferences jsonb DEFAULT '{}'::jsonb NOT NULL;
