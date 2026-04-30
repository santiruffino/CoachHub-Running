-- Add expected_rpe column to training_assignments table
ALTER TABLE training_assignments
ADD COLUMN expected_rpe INTEGER CHECK (
    expected_rpe >= 1
    AND expected_rpe <= 10
);

-- Add comment for documentation
COMMENT ON COLUMN training_assignments.expected_rpe IS 'Expected Rate of Perceived Exertion (RPE) set by coach when assigning workout, scale 1-10';
