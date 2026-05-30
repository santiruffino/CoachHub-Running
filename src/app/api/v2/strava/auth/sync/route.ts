import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';
import * as Sentry from '@sentry/nextjs';
import { createRequestLogger, withRequestId } from '@/lib/logger';
import { apiError } from '@/lib/api/error-response';
import { syncStravaActivities } from '@/lib/strava/sync-activities';

interface StravaTokenResponse {
    access_token: string;
    refresh_token: string;
    expires_at: number;
}

/**
 * Manual Strava Activity Sync
 *
 * Fetches activities from Strava and stores them in the database.
 * Supports optional ?days=N query parameter (default: 30, max: 90).
 *
 * Access: ATHLETE only
 */
export async function POST(request: NextRequest) {
    const { requestId, logger } = createRequestLogger('/api/v2/strava/auth/sync', request);
    const respond = (body: unknown, init?: ResponseInit) =>
        NextResponse.json(body, withRequestId(init, requestId));

    try {
        const authResult = await requireRole('ATHLETE');

        if (authResult.response) {
            authResult.response.headers.set('x-request-id', requestId);
            return authResult.response;
        }

        const { supabase, user } = authResult;

        // Parse optional days parameter (default 30, max 90)
        const { searchParams } = new URL(request.url);
        const daysParam = parseInt(searchParams.get('days') || '30', 10);
        const days = Math.min(Math.max(daysParam, 1), 90);

        // Get Strava connection
        const { data: connection, error: connError } = await supabase
            .from('strava_connections')
            .select('*')
            .eq('user_id', user!.id)
            .single();

        if (connError || !connection) {
            logger.warn('strava_sync.connection_missing', { userId: user!.id, error: connError });
            return respond(apiError('STRAVA_NOT_CONNECTED'),
                { status: 404 }
            );
        }

        // Check if token needs refresh
        let accessToken = connection.access_token;
        const now = Math.floor(Date.now() / 1000);

        if (connection.expires_at <= now) {
            // Token expired, refresh it
            const clientId = process.env.STRAVA_CLIENT_ID;
            const clientSecret = process.env.STRAVA_CLIENT_SECRET;

            const refreshResponse = await fetch('https://www.strava.com/oauth/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client_id: clientId,
                    client_secret: clientSecret,
                    refresh_token: connection.refresh_token,
                    grant_type: 'refresh_token',
                }),
            });

            if (!refreshResponse.ok) {
                logger.error('strava_sync.token_refresh_failed', { userId: user!.id, status: refreshResponse.status });
                return respond(apiError('FAILED_TO_REFRESH_STRAVA_TOKEN'),
                    { status: 401 }
                );
            }

            const tokenData = (await refreshResponse.json()) as StravaTokenResponse;
            accessToken = tokenData.access_token;

            // Update stored tokens
            await supabase
                .from('strava_connections')
                .update({
                    access_token: tokenData.access_token,
                    refresh_token: tokenData.refresh_token,
                    expires_at: tokenData.expires_at,
                    updated_at: new Date().toISOString(),
                })
                .eq('user_id', user!.id);
        }

        // Fetch and upsert activities using shared helper
        const syncResult = await syncStravaActivities(supabase, user!.id, accessToken, { days });

        // Log sync
        await supabase
            .from('sync_logs')
            .insert({
                user_id: user!.id,
                status: 'SUCCESS',
                message: `Synced ${syncResult.inserted} new activities, updated ${syncResult.updated} existing (last ${days} days)`,
                items_processed: syncResult.total,
                completed_at: new Date().toISOString(),
            });

        // Sync heart rate zones from Strava (non-blocking)
        const { syncHeartRateZonesFromStrava } = await import('@/lib/strava/sync-zones');
        const zonesResult = await syncHeartRateZonesFromStrava(
            accessToken,
            supabase,
            user!.id
        );

        if (zonesResult.success) {
            // Zones synced successfully
        } else {
            logger.warn('strava_sync.zones_sync_failed', { userId: user!.id, error: zonesResult.error });
            // Don't fail the sync if zones sync fails
        }

        logger.info('strava_sync.completed', {
            userId: user!.id,
            inserted: syncResult.inserted,
            updated: syncResult.updated,
            total: syncResult.total,
            days,
            pages: syncResult.pages,
            zonesSynced: zonesResult.success,
        });

        return respond({
            success: true,
            message: `Sync complete: ${syncResult.inserted} new, ${syncResult.updated} updated (last ${days} days)`,
            inserted: syncResult.inserted,
            updated: syncResult.updated,
            total: syncResult.total,
            days,
            zonesSynced: zonesResult.success,
        }, { status: 200 });
    } catch (error: unknown) {
        logger.error('strava_sync.unhandled_error', { error });
        Sentry.captureException(error, {
            tags: { route: '/api/v2/strava/auth/sync', requestId },
        });

        // Log failure
        try {
            const { supabase, user } = await requireRole('ATHLETE');
            if (user) {
                await supabase.from('sync_logs').insert({
                    user_id: user.id,
                    status: 'FAILED',
                    message: error instanceof Error ? error.message : 'Sync failed',
                    completed_at: new Date().toISOString(),
                });
            }
        } catch (logError) {
            logger.error('strava_sync.log_failure_failed', { error: logError });
        }

        return respond(apiError('INTERNAL_SERVER_ERROR'),
            { status: 500 }
        );
    }
}
