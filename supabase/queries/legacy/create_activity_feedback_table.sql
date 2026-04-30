-- Create activity_feedback table
CREATE TABLE IF NOT EXISTS activity_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    activity_id UUID NOT NULL REFERENCES activities (id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
    training_assignment_id UUID REFERENCES training_assignments (id) ON DELETE SET NULL,
    rpe INTEGER CHECK (
        rpe >= 1
        AND rpe <= 10
    ),
    comments TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (activity_id, user_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_activity_feedback_activity ON activity_feedback (activity_id);

CREATE INDEX IF NOT EXISTS idx_activity_feedback_user ON activity_feedback (user_id);

CREATE INDEX IF NOT EXISTS idx_activity_feedback_assignment ON activity_feedback (training_assignment_id);

-- Enable RLS
ALTER TABLE activity_feedback ENABLE ROW LEVEL SECURITY;

-- Athletes can create, read, and update their own feedback
CREATE POLICY "Athletes manage own feedback" ON activity_feedback FOR ALL USING (auth.uid () = user_id);

-- Coaches can read feedback from their athletes
CREATE POLICY "Coaches view athlete feedback" ON activity_feedback FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM profiles
            WHERE
                profiles.id = activity_feedback.user_id
                AND profiles.coach_id = auth.uid ()
        )
    );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_activity_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER activity_feedback_updated_at
  BEFORE UPDATE ON activity_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_activity_feedback_updated_at();
