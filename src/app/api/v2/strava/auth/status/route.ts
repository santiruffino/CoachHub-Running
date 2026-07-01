import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';
import { createRequestLogger } from '@/lib/logger';
import { apiError } from '@/lib/api/error-response';
import { reportApiError } from '@/lib/api/report-error';

/**
 * Get Strava Connection Status
 * 
 * Returns whether the user has an active Strava connection.
 * 
 * Access: ATHLETE only
 */
export async function GET(request: NextRequest) {
    const { requestId, logger } = createRequestLogger('/api/v2/strava/auth/status', request);
    try {
        void request;
        const authResult = await requireRole('ATHLETE');

        if (authResult.response) {
            return authResult.response;
        }

        const { supabase, user } = authResult;

        // Fetch connection status
        const { data: connection, error } = await supabase
            .from('strava_connections')
            .select('strava_athlete_id, updated_at')
            .eq('user_id', user!.id)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = not found
            logger.error('Fetch Strava connection error', { error: error });
            return NextResponse.json(apiError('FAILED_TO_FETCH_CONNECTION_STATUS'),
                { status: 500 }
            );
        }

        // Check for last sync
        let lastSync: string | undefined;
        if (connection) {
            const { data: lastActivity } = await supabase
                .from('activities')
                .select('created_at')
                .eq('user_id', user!.id)
                .not('external_id', 'is', null)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            lastSync = lastActivity?.created_at;
        }

        return NextResponse.json({
            isConnected: !!connection,
            athleteId: connection?.strava_athlete_id,
            lastSync: lastSync || connection?.updated_at,
        });
    } catch (error: unknown) {
        reportApiError(error, { route: '/api/v2/strava/auth/status', method: 'GET', requestId, logger });
        return NextResponse.json(apiError('INTERNAL_SERVER_ERROR'),
            { status: 500 }
        );
    }
}
