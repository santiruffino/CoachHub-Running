import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';
import { createRequestLogger } from '@/lib/logger';
import { apiError } from '@/lib/api/error-response';
import { reportApiError } from '@/lib/api/report-error';

/**
 * Disconnect from Strava
 * 
 * Removes the Strava connection and all Strava-derived data from the database.
 * Note: Does NOT revoke the token on Strava's side.
 * 
 * Access: ATHLETE only
 */
export async function POST(request: NextRequest) {
    const { requestId, logger } = createRequestLogger('/api/v2/strava/auth/disconnect', request);
    try {
        void request;
        const authResult = await requireRole('ATHLETE');

        if (authResult.response) {
            return authResult.response;
        }

        const { supabase, user } = authResult;

        const { error: activitiesError } = await supabase
            .from('activities')
            .delete()
            .eq('user_id', user!.id)
            .not('external_id', 'is', null);

        if (activitiesError) {
            logger.error('Disconnect Strava activities purge error', { error: activitiesError });
            return NextResponse.json(apiError('FAILED_TO_PURGE_STRAVA_ACTIVITIES'),
                { status: 500 }
            );
        }

        const { error: zonesError } = await supabase
            .from('athlete_profiles')
            .update({
                hr_zones: null,
                updated_at: new Date().toISOString(),
            })
            .eq('user_id', user!.id);

        if (zonesError) {
            logger.error('Disconnect Strava zones purge error', { error: zonesError });
            return NextResponse.json(apiError('FAILED_TO_PURGE_STRAVA_ZONES'),
                { status: 500 }
            );
        }

        const { error: logsError } = await supabase
            .from('sync_logs')
            .delete()
            .eq('user_id', user!.id);

        if (logsError) {
            logger.error('Disconnect Strava logs purge error', { error: logsError });
            return NextResponse.json(apiError('FAILED_TO_PURGE_STRAVA_SYNC_LOGS'),
                { status: 500 }
            );
        }

        // Delete the connection last to prevent further refreshes
        const { error } = await supabase
            .from('strava_connections')
            .delete()
            .eq('user_id', user!.id);

        if (error) {
            logger.error('Disconnect Strava error', { error: error });
            return NextResponse.json(apiError('FAILED_TO_DISCONNECT'),
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Successfully disconnected from Strava and deleted Strava data',
        });
    } catch (error: unknown) {
        reportApiError(error, { route: '/api/v2/strava/auth/disconnect', method: 'POST', requestId, logger });
        return NextResponse.json(apiError('INTERNAL_SERVER_ERROR'),
            { status: 500 }
        );
    }
}
