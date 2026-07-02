import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/api-helpers';
import { createRequestLogger } from '@/lib/logger';
import { apiError } from '@/lib/api/error-response';
import { reportApiError } from '@/lib/api/report-error';
import { isGarminPilotEnabled } from '@/lib/garmin/pilot';
import { isGarminConfigured } from '@/lib/garmin/push-workout';

export const dynamic = 'force-dynamic';

/**
 * Garmin connection status for the current user (pilot gating + connection).
 * Access: any authenticated user (reports their own connection).
 */
export async function GET(request: NextRequest) {
    const { requestId, logger } = createRequestLogger('/api/v2/garmin/auth/status', request);
    try {
        const authResult = await requireAuth();
        if (authResult.response) return authResult.response;
        const { supabase, user } = authResult;

        const pilotEnabled = isGarminConfigured() && (await isGarminPilotEnabled(supabase, user!.id));

        if (!pilotEnabled) {
            return NextResponse.json({ available: false, connected: false, status: null });
        }

        const { data: connection } = await supabase
            .from('garmin_connections')
            .select('status, garmin_user_id, last_synced_at, consent_at, updated_at')
            .eq('user_id', user!.id)
            .maybeSingle();

        return NextResponse.json({
            available: true,
            connected: Boolean(connection) && connection!.status === 'active',
            status: connection?.status ?? null,
            lastSyncedAt: connection?.last_synced_at ?? null,
            connectedAt: connection?.consent_at ?? null,
        });
    } catch (error: unknown) {
        reportApiError(error, { route: '/api/v2/garmin/auth/status', method: 'GET', requestId, logger });
        return NextResponse.json(apiError('INTERNAL_SERVER_ERROR'), { status: 500 });
    }
}
