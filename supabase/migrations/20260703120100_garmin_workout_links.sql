-- Tracks the push of an Endurix training assignment to the athlete's Garmin
-- calendar. Kept separate from training_assignments.link_status (which tracks
-- Strava *activity* matching, a different concern) so the two never collide.

CREATE TABLE IF NOT EXISTS public.garmin_workout_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES public.training_assignments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    -- IDs returned by Garmin on upload / schedule.
    garmin_workout_id TEXT,
    garmin_schedule_id TEXT,
    sync_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (sync_status IN ('pending', 'synced', 'failed', 'stale')),
    last_error TEXT,
    synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- One push record per assignment (re-syncs update the row).
    CONSTRAINT garmin_workout_links_assignment_unique UNIQUE (assignment_id)
);

CREATE INDEX IF NOT EXISTS idx_garmin_workout_links_user
    ON public.garmin_workout_links (user_id);

CREATE INDEX IF NOT EXISTS idx_garmin_workout_links_pending
    ON public.garmin_workout_links (sync_status)
    WHERE sync_status IN ('pending', 'stale');

ALTER TABLE public.garmin_workout_links ENABLE ROW LEVEL SECURITY;

-- Athlete can read their own push records.
CREATE POLICY "Users can read own garmin workout links"
    ON public.garmin_workout_links FOR SELECT
    USING ((select auth.uid()) = user_id);

-- Coaches can read the push status for athletes in their groups.
CREATE POLICY "Coaches can read athlete garmin workout links"
    ON public.garmin_workout_links FOR SELECT
    USING (EXISTS (
        SELECT 1
        FROM public.athlete_groups ag
        JOIN public.groups g ON g.id = ag.group_id
        WHERE ag.athlete_id = garmin_workout_links.user_id
          AND g.coach_id = (select auth.uid())
    ));

CREATE POLICY "Admins can do everything on garmin workout links"
    ON public.garmin_workout_links FOR ALL
    USING (is_admin((select auth.uid())));

-- Writes happen exclusively via the service-role client after an explicit
-- authorization check (push service / cron), so no INSERT/UPDATE policy is
-- granted to authenticated users.
