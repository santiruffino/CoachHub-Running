import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';
import { createRequestLogger } from '@/lib/logger';
import { apiError } from '@/lib/api/error-response';
import { reportApiError } from '@/lib/api/report-error';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Disconnect Garmin: removes the stored session tokens and all Garmin-sourced
 * data. Does not (and cannot) revoke the session on Garmin's side.
 * Access: ATHLETE only.
 */
export async function POST(request: NextRequest) {
    const { requestId, logger } = createRequestLogger('/api/v2/garmin/auth/disconnect', request);
    try {
        const authResult = await requireRole('ATHLETE');
        if (authResult.response) return authResult.response;
        const { user } = authResult;

        // Service role: garmin_workout_links has no user-facing write policy.
        const service = createServiceRoleClient();

        await service.from('garmin_workout_links').delete().eq('user_id', user!.id);

        const { error: activitiesError } = await service
            .from('activities')
            .delete()
            .eq('user_id', user!.id)
            .eq('provider', 'garmin');
        if (activitiesError) {
            logger.error('garmin.disconnect.activities_purge_failed', { userId: user!.id, error: activitiesError });
            return NextResponse.json(apiError('GARMIN_DISCONNECT_FAILED', 'Failed to remove Garmin activities'), { status: 500 });
        }

        const { error: connError } = await service
            .from('garmin_connections')
            .delete()
            .eq('user_id', user!.id);
        if (connError) {
            logger.error('garmin.disconnect.connection_delete_failed', { userId: user!.id, error: connError });
            return NextResponse.json(apiError('GARMIN_DISCONNECT_FAILED', 'Failed to disconnect Garmin'), { status: 500 });
        }

        logger.info('garmin.disconnect.success', { userId: user!.id });
        return NextResponse.json({ success: true, message: 'Disconnected from Garmin and removed Garmin data' });
    } catch (error: unknown) {
        reportApiError(error, { route: '/api/v2/garmin/auth/disconnect', method: 'POST', requestId, logger });
        return NextResponse.json(apiError('INTERNAL_SERVER_ERROR'), { status: 500 });
    }
}
