import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createRequestLogger, withRequestId } from '@/lib/logger';
import { apiError } from '@/lib/api/error-response';
import { isGarminConfigured } from '@/lib/garmin/push-workout';
import { syncGarminActivitiesForUser } from '@/lib/garmin/sync-activities';
import { secureCompare } from '@/lib/api/secure-compare';

// Node runtime: the Garmin client needs full Node. Bounded to Vercel's limit.
export const runtime = 'nodejs';
export const maxDuration = 60;

// Pilot scale is small, so we iterate active connections directly rather than a
// job queue. Cap per invocation to stay within maxDuration on Vercel Hobby.
const MAX_CONNECTIONS_PER_RUN = 40;
const ACTIVITIES_PER_USER = 20;

/**
 * Daily pull of recent Garmin activities for all connected pilot athletes.
 * Auth: Authorization: Bearer $CRON_SECRET.
 */
export async function GET(request: NextRequest) {
    const { requestId, logger } = createRequestLogger('/api/cron/garmin-backfill', request);
    const respond = (body: unknown, init?: ResponseInit) => NextResponse.json(body, withRequestId(init, requestId));

    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');
    if (!cronSecret || !secureCompare(authHeader, `Bearer ${cronSecret}`)) {
        logger.warn('garmin_backfill_cron.unauthorized');
        return respond(apiError('AUTH_UNAUTHORIZED'), { status: 401 });
    }

    if (!isGarminConfigured()) {
        return respond({ success: true, skipped: 'garmin_not_configured' });
    }

    try {
        const service = createServiceRoleClient();

        // Oldest sync first so everyone gets covered across days.
        const { data: connections, error } = await service
            .from('garmin_connections')
            .select('user_id, oauth1_token, oauth2_token, last_synced_at')
            .eq('status', 'active')
            .order('last_synced_at', { ascending: true, nullsFirst: true })
            .limit(MAX_CONNECTIONS_PER_RUN);

        if (error) {
            logger.error('garmin_backfill_cron.list_failed', { error });
            return respond(apiError('INTERNAL_SERVER_ERROR'), { status: 500 });
        }

        let processed = 0;
        let inserted = 0;
        let replacedDuplicates = 0;
        let reauth = 0;
        let errors = 0;

        for (const conn of connections ?? []) {
            const result = await syncGarminActivitiesForUser(
                service,
                conn.user_id as string,
                { oauth1_token: conn.oauth1_token as string, oauth2_token: conn.oauth2_token as string },
                { limit: ACTIVITIES_PER_USER },
            );
            processed += 1;
            inserted += result.inserted;
            replacedDuplicates += result.replacedDuplicates;
            if (result.status === 'needs_reauth') reauth += 1;
            if (result.status === 'error') errors += 1;
        }

        logger.info('garmin_backfill_cron.completed', { processed, inserted, replacedDuplicates, reauth, errors });
        return respond({ success: true, processed, inserted, replacedDuplicates, reauth, errors });
    } catch (err) {
        logger.error('garmin_backfill_cron.unhandled', { error: String(err) });
        return respond(apiError('INTERNAL_SERVER_ERROR'), { status: 500 });
    }
}
