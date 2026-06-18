-- Ensure activities can be safely upserted by (user_id, external_id)

-- 1) Remove duplicate activities per athlete/external activity id, keeping the newest row.
WITH ranked AS (
    SELECT
        ctid,
        ROW_NUMBER() OVER (
            PARTITION BY user_id, external_id
            ORDER BY created_at DESC, id DESC
        ) AS row_num
    FROM public.activities
    WHERE external_id IS NOT NULL
), duplicates AS (
    SELECT ctid
    FROM ranked
    WHERE row_num > 1
)
DELETE FROM public.activities activity
USING duplicates
WHERE activity.ctid = duplicates.ctid;

-- 2) Add a composite uniqueness key for conflict-safe upserts.
CREATE UNIQUE INDEX IF NOT EXISTS idx_activities_user_external_unique
ON public.activities (user_id, external_id)
WHERE external_id IS NOT NULL;
