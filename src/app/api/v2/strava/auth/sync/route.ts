import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';
import * as Sentry from '@sentry/nextjs';
import { createRequestLogger, withRequestId } from '@/lib/logger';

interface StravaTokenResponse {
    access_token: string;
    refresh_token: string;
    expires_at: number;
}

interface StravaActivity {
    id: number;
    name: string;
    type: string;
    distance: number;
    moving_time: number;
    start_date: string;
    elapsed_time: number;
    total_elevation_gain: number;
    average_speed?: number | null;
    max_speed?: number | null;
    average_heartrate: number | null;
    max_heartrate: number | null;
    private: boolean;
}

interface ActivityUpsertRow {
    user_id: string;
    external_id: string;
    title: string;
    type: string;
    distance: number;
    duration: number;
    start_date: string;
    elapsed_time: number;
    elevation_gain: number;
    average_speed: number;
    max_speed: number;
    avg_hr: number | null;
    max_hr: number | null;
    is_private: boolean;
    metadata: StravaActivity;
    updated_at: string;
}

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
    if (items.length === 0) return [];

    const chunks: T[][] = [];
    for (let index = 0; index < items.length; index += chunkSize) {
        chunks.push(items.slice(index, index + chunkSize));
    }

    return chunks;
}

/**
 * Manual Strava Activity Sync
 * 
 * Fetches recent activities from Strava and stores them in the database.
 * This is a synchronous operation triggered by user button click.
 * 
 * Access: ATHLETE only
 */
export async function POST(request: NextRequest) {
    const { requestId, logger } = createRequestLogger('/api/v2/strava/auth/sync', request);
    const respond = (body: unknown, init?: ResponseInit) =>
        NextResponse.json(body, withRequestId(init, requestId));

    try {
        void request;
        const authResult = await requireRole('ATHLETE');

        if (authResult.response) {
            authResult.response.headers.set('x-request-id', requestId);
            return authResult.response;
        }

        const { supabase, user } = authResult;

        // Get Strava connection
        const { data: connection, error: connError } = await supabase
            .from('strava_connections')
            .select('*')
            .eq('user_id', user!.id)
            .single();

        if (connError || !connection) {
            logger.warn('strava_sync.connection_missing', { userId: user!.id, error: connError });
            return respond(
                { error: 'Strava not connected' },
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
                return respond(
                    { error: 'Failed to refresh Strava token' },
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

        // Fetch activities from Strava (last 30 activities)
        const activitiesResponse = await fetch(
            'https://www.strava.com/api/v3/athlete/activities?per_page=30',
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            }
        );

        if (!activitiesResponse.ok) {
            logger.error('strava_sync.fetch_activities_failed', { userId: user!.id, status: activitiesResponse.status });
            return respond(
                { error: 'Failed to fetch activities from Strava' },
                { status: 500 }
            );
        }

        const stravaActivities = (await activitiesResponse.json()) as StravaActivity[];

        const dedupedActivities = Array.from(
            new Map(stravaActivities.map((activity) => [activity.id.toString(), activity])).values()
        );

        const externalIds = dedupedActivities.map((activity) => activity.id.toString());

        let existingExternalIds = new Set<string>();
        if (externalIds.length > 0) {
            const { data: existingRows, error: existingError } = await supabase
                .from('activities')
                .select('external_id')
                .eq('user_id', user!.id)
                .in('external_id', externalIds);

            if (existingError) {
                logger.error('strava_sync.load_existing_failed', { userId: user!.id, error: existingError });
                return respond(
                    { error: 'Failed to prepare activity sync' },
                    { status: 500 }
                );
            }

            existingExternalIds = new Set((existingRows || []).map((row) => row.external_id));
        }

        const upsertRows: ActivityUpsertRow[] = dedupedActivities.map((activity) => ({
            user_id: user!.id,
            external_id: activity.id.toString(),
            title: activity.name,
            type: activity.type,
            distance: activity.distance || 0,
            duration: activity.moving_time || activity.elapsed_time || 0,
            start_date: activity.start_date,
            elapsed_time: activity.elapsed_time || 0,
            elevation_gain: activity.total_elevation_gain || 0,
            average_speed: activity.average_speed || 0,
            max_speed: activity.max_speed || 0,
            avg_hr: activity.average_heartrate,
            max_hr: activity.max_heartrate,
            is_private: activity.private || false,
            metadata: activity,
            updated_at: new Date().toISOString(),
        }));

        for (const batch of chunkArray(upsertRows, 100)) {
            const { error: upsertError } = await supabase
                .from('activities')
                .upsert(batch, { onConflict: 'user_id,external_id' });

            if (upsertError) {
                logger.error('strava_sync.bulk_upsert_failed', { userId: user!.id, error: upsertError });
                return respond(
                    { error: 'Failed to sync activities to database' },
                    { status: 500 }
                );
            }
        }

        const insertedCount = dedupedActivities.filter(
            (activity) => !existingExternalIds.has(activity.id.toString())
        ).length;
        const updatedCount = dedupedActivities.length - insertedCount;

        // Log sync
        await supabase
            .from('sync_logs')
            .insert({
                user_id: user!.id,
                status: 'SUCCESS',
                message: `Synced ${insertedCount} new activities, updated ${updatedCount} existing`,
                items_processed: dedupedActivities.length,
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
            inserted: insertedCount,
            updated: updatedCount,
            total: dedupedActivities.length,
            zonesSynced: zonesResult.success,
        });

        return respond({
            success: true,
            message: `Sync complete: ${insertedCount} new, ${updatedCount} updated`,
            inserted: insertedCount,
            updated: updatedCount,
            total: dedupedActivities.length,
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

        return respond(
            { error: `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
            { status: 500 }
        );
    }
}
