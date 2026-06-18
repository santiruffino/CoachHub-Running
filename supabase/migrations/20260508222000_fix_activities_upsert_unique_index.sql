-- Fix ON CONFLICT inference for activities upserts.
-- The previous partial unique index (`WHERE external_id IS NOT NULL`) can fail
-- conflict target inference for `ON CONFLICT (user_id, external_id)`.

DROP INDEX IF EXISTS public.idx_activities_user_external_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_activities_user_external_unique
ON public.activities (user_id, external_id);
