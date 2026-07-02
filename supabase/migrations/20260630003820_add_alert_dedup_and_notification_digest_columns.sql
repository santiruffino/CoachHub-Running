
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS alert_date date NOT NULL DEFAULT CURRENT_DATE;

CREATE UNIQUE INDEX IF NOT EXISTS alerts_dedup_idx
  ON alerts (coach_id, athlete_id, type, alert_date)
  WHERE type IN ('RPE_MISMATCH', 'LOW_COMPLIANCE', 'TRAINING_LOAD');

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS push_sent_at timestamptz NULL;
