-- Add role column to invitations table
-- Default is 'ATHLETE' for backwards compatibility
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS role text DEFAULT 'ATHLETE';

-- Update any existing rows to ensure they have the ATHLETE role (just in case)
UPDATE public.invitations SET role = 'ATHLETE' WHERE role IS NULL;
