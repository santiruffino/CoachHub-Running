import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';
import { access } from 'fs';

/**
 * Manual Strava Activity Sync
 * 
 * Fetches recent activities from Strava and stores them in the database.
 * This is a synchronous operation triggered by user button click.
 * 
 * Access: ATHLETE only
 */
export async function POST(request: NextRequest) {
    try {
        const authResult = await requireRole('ATHLETE');

        if (authResult.response) {
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
            return NextResponse.json(
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
                return NextResponse.json(
                    { error: 'Failed to refresh Strava token' },
                    { status: 401 }
                );
            }

            const tokenData = await refreshResponse.json();
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
            return NextResponse.json(
                { error: 'Failed to fetch activities from Strava' },
                { status: 500 }
            );
        }

        const stravaActivities = await activitiesResponse.json();

        let syncedCount = 0;
        let skippedCount = 0;

        // Process each activity
        for (const activity of stravaActivities) {
            // Check if activity already exists
            const { data: existing } = await supabase
                .from('activities')
                .select('id')
                .eq('external_id', activity.id.toString())
                .single();

            if (existing) {
                skippedCount++;
                continue;
            }

            // Insert new activity
            const { error: insertError } = await supabase
                .from('activities')
                .insert({
                    user_id: user!.id,
                    external_id: activity.id.toString(),
                    title: activity.name,
                    type: activity.type,
                    distance: activity.distance,
                    duration: activity.moving_time,
                    start_date: activity.start_date,
                    elapsed_time: activity.elapsed_time,
                    elevation_gain: activity.total_elevation_gain,
                    avg_hr: activity.average_heartrate,
                    max_hr: activity.max_heartrate,
                    is_private: activity.private,
                    metadata: activity,
                });

            if (!insertError) {
                syncedCount++;
            }
        }

        // Log sync
        await supabase
            .from('sync_logs')
            .insert({
                user_id: user!.id,
                status: 'SUCCESS',
                message: `Synced ${syncedCount} activities, skipped ${skippedCount} existing`,
                items_processed: stravaActivities.length,
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
            console.warn('Failed to sync heart rate zones during activity sync:', zonesResult.error);
            // Don't fail the sync if zones sync fails
        }

        return NextResponse.json({
            success: true,
            message: `Sync complete: ${syncedCount} new, ${skippedCount} existing`,
            synced: syncedCount,
            skipped: skippedCount,
            total: stravaActivities.length,
            zonesSynced: zonesResult.success,
        });
    } catch (error: any) {
        console.error('Strava sync error:', error);

        // Log failure
        try {
            const { supabase, user } = await requireRole('ATHLETE');
            if (user) {
                await supabase.from('sync_logs').insert({
                    user_id: user.id,
                    status: 'FAILED',
                    message: error.message || 'Sync failed',
                    completed_at: new Date().toISOString(),
                });
            }
        } catch (logError) {
            console.error('Failed to log sync error:', logError);
        }

        return NextResponse.json(
            { error: 'Sync failed: ' + error.message },
            { status: 500 }
        );
    }
}
