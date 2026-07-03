import { NextRequest, NextResponse } from 'next/server';
import { createRequestLogger } from '@/lib/logger';
import { reportApiError } from '@/lib/api/report-error';
import { apiError } from '@/lib/api/error-response';
import { requireRole } from '@/lib/supabase/api-helpers';
import { isGarminConfigured } from '@/lib/garmin/push-workout';
import { isGarminPilotEnabled } from '@/lib/garmin/pilot';
import { decryptJson } from '@/lib/garmin/crypto';
import { restoreSession, type GarminStoredTokens } from '@/lib/garmin/client';

type GarminDebugSection = 'status' | 'profile' | 'settings';

function parseSection(value: string | null): GarminDebugSection {
    return value === 'profile' || value === 'settings' || value === 'status' ? value : 'status';
}

export async function GET(request: NextRequest) {
    const { requestId, logger } = createRequestLogger('/api/v2/garmin/debug', request);

    try {
        const authResult = await requireRole('ATHLETE');
        if (authResult.response) return authResult.response;

        const { supabase, user } = authResult;
        const section = parseSection(request.nextUrl.searchParams.get('section'));

        if (!isGarminConfigured()) {
            return NextResponse.json(apiError('GARMIN_NOT_CONFIGURED', 'Garmin integration is not configured'), { status: 503 });
        }

        if (!(await isGarminPilotEnabled(supabase, user!.id))) {
            return NextResponse.json(apiError('GARMIN_NOT_IN_PILOT', 'Garmin integration is not available for this account'), { status: 403 });
        }

        const { data: connection, error } = await supabase
            .from('garmin_connections')
            .select('status, garmin_user_id, last_synced_at, consent_at, updated_at, oauth1_token, oauth2_token')
            .eq('user_id', user!.id)
            .maybeSingle();

        if (error) {
            return NextResponse.json(apiError('FAILED_TO_FETCH_GARMIN_CONNECTION', 'Failed to fetch Garmin connection'), { status: 500 });
        }

        if (!connection) {
            return NextResponse.json({ section, available: true, connected: false, data: null });
        }

        if (section === 'status') {
            return NextResponse.json({
                section,
                available: true,
                connected: connection.status === 'active',
                data: {
                    status: connection.status,
                    garminUserId: connection.garmin_user_id ?? null,
                    lastSyncedAt: connection.last_synced_at ?? null,
                    connectedAt: connection.consent_at ?? null,
                    updatedAt: connection.updated_at ?? null,
                },
            });
        }

        if (!connection || connection.status !== 'active') {
            return NextResponse.json({
                section,
                available: true,
                connected: false,
                data: {
                    message: 'No active Garmin connection found',
                },
            });
        }

        const tokens: GarminStoredTokens = {
            oauth1: decryptJson(connection.oauth1_token as string),
            oauth2: decryptJson(connection.oauth2_token as string),
        };
        const realSession = restoreSession(tokens);

        if (section === 'profile') {
            const profile = await realSession.getUserProfile();
            return NextResponse.json({
                section,
                available: true,
                connected: connection.status === 'active',
                data: profile,
            });
        }

        if (section === 'settings') {
            const settings = await realSession.getUserSettings();
            return NextResponse.json({
                section,
                available: true,
                connected: connection.status === 'active',
                data: settings,
            });
        }

        return NextResponse.json({
            section,
            available: true,
            connected: connection.status === 'active',
            data: {
                connection: {
                    status: connection.status,
                    garminUserId: connection.garmin_user_id ?? null,
                    lastSyncedAt: connection.last_synced_at ?? null,
                    connectedAt: connection.consent_at ?? null,
                    updatedAt: connection.updated_at ?? null,
                },
            },
        });
    } catch (error: unknown) {
        reportApiError(error, { route: '/api/v2/garmin/debug', method: 'GET', requestId, logger });
        return NextResponse.json(apiError('INTERNAL_SERVER_ERROR'), { status: 500 });
    }
}
