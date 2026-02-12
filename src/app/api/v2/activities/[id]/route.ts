import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/api-helpers';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Get Activity Detail
 * 
 * Fetches detailed activity data from Strava API.
 * 
 * Permissions:
 * - User can view their own activities
 * - Coach can view athlete's activities (if in their groups)
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const authResult = await requireAuth();

        if (authResult.response) {
            return authResult.response;
        }

        const { supabase, user } = authResult;

        // First, get the activity from database to find the owner and external_id
        const { data: activity, error: activityError } = await supabase
            .from('activities')
            .select('id, user_id, external_id')
            .eq('external_id', id)
            .single();

        if (activityError || !activity) {
            return NextResponse.json(
                { error: 'Activity not found' },
                { status: 404 }
            );
        }

        const activityOwnerId = activity.user_id;
        // Check permissions
        if (user!.id !== activityOwnerId) {
            // User is trying to view someone else's activity
            // Check if they're a coach viewing an athlete's activity
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user!.id)
                .single();

            if (profile?.role === 'COACH') {
                // Verify athlete belongs to this coach via coach_id
                const { data: athleteProfile } = await supabase
                    .from('profiles')
                    .select('coach_id')
                    .eq('id', activityOwnerId)
                    .single();

                if (!athleteProfile || athleteProfile.coach_id !== user!.id) {
                    return NextResponse.json(
                        { error: 'Not authorized to view this activity' },
                        { status: 403 }
                    );
                }
            } else {
                return NextResponse.json(
                    { error: 'Not authorized to view this activity' },
                    { status: 403 }
                );
            }
        }

        // Use service role client to bypass RLS when fetching athlete's Strava connection
        // This is safe because we've already verified authorization above
        const serviceSupabase = createServiceRoleClient();

        const { data: connection, error: connError } = await serviceSupabase
            .from('strava_connections')
            .select('*')
            .eq('user_id', activityOwnerId)
            .single();

        if (connError || !connection) {
            const isNotFound = connError?.code === 'PGRST116';

            return NextResponse.json(
                {
                    error: isNotFound
                        ? 'This athlete has not connected their Strava account. They need to authenticate with Strava to view activity details.'
                        : 'Failed to retrieve Strava connection',
                    details: isNotFound
                        ? 'The athlete must go to their profile and connect Strava to enable detailed activity views.'
                        : connError?.message
                },
                { status: isNotFound ? 404 : 500 }
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

            // Update stored tokens using service role client
            await serviceSupabase
                .from('strava_connections')
                .update({
                    access_token: tokenData.access_token,
                    refresh_token: tokenData.refresh_token,
                    expires_at: tokenData.expires_at,
                    updated_at: new Date().toISOString(),
                })
                .eq('user_id', activityOwnerId);
        }

        // Fetch detailed activity from Strava
        const stravaResponse = await fetch(
            `https://www.strava.com/api/v3/activities/${id}`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            }
        );

        if (!stravaResponse.ok) {
            console.error('Strava API error:', await stravaResponse.text());
            return NextResponse.json(
                { error: 'Failed to fetch activity from Strava' },
                { status: 500 }
            );
        }

        const activityDetail = await stravaResponse.json();

        // Add metadata about the viewer's relationship to this activity
        const isOwner = user!.id === activityOwnerId;

        return NextResponse.json({
            ...activityDetail,
            _viewerIsOwner: isOwner,
            _ownerId: activityOwnerId,
            _internalId: activity.id || (activity as any).id, // Pass internal UUID
        });
    } catch (error: any) {
        console.error('Get activity detail error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
