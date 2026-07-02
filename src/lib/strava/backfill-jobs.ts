import type { SupabaseClient } from '@supabase/supabase-js';
import { appLogger } from '@/lib/app-logger';

interface EnqueueBackfillJobParams {
    userId: string;
    requestedBy: string;
    windowDays?: number;
}

/**
 * Enqueues a Strava activity backfill job, picked up by the
 * /api/cron/strava-backfill worker. The partial unique index
 * `idx_activity_backfill_jobs_active_unique` already guarantees at most one
 * queued/running job per user, so a conflict here just means a job is
 * already in flight — not an error.
 */
export async function enqueueStravaBackfillJob(
    supabase: SupabaseClient,
    { userId, requestedBy, windowDays = 90 }: EnqueueBackfillJobParams
): Promise<{ queued: boolean }> {
    const { error } = await supabase
        .from('activity_backfill_jobs')
        .insert({
            user_id: userId,
            requested_by: requestedBy,
            status: 'queued',
            window_days: windowDays,
            updated_at: new Date().toISOString(),
        });

    if (error) {
        if (error.code === '23505') {
            return { queued: false };
        }
        appLogger.error('strava_backfill.enqueue_failed', { userId, error });
        return { queued: false };
    }

    return { queued: true };
}
