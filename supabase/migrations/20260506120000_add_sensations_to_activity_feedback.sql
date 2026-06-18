ALTER TABLE public.activity_feedback
ADD COLUMN IF NOT EXISTS sensations INTEGER CHECK (sensations >= 1 AND sensations <= 10);
