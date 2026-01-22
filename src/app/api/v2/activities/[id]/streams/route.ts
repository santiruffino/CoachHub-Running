import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/api-helpers';

/**
 * GET /api/v2/activities/[id]/streams
 * Fetches activity streams from Strava for detailed metrics
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

        // Fetch the activity to check ownership
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

        // Check authorization: user must own the activity or be the coach of the athlete
        if (activity.user_id !== user.id) {
            // Check if current user is a coach of this athlete
            const { data: coachRelation } = await supabase
                .from('coach_athletes')
                .select('id')
                .eq('coach_id', user.id)
                .eq('athlete_id', activity.user_id)
                .single();

            if (!coachRelation) {
                return NextResponse.json(
                    { error: 'Unauthorized to view this activity' },
                    { status: 403 }
                );
            }
        }

        // Get the athlete's Strava access token
        const { data: athlete, error: athleteError } = await supabase
            .from('strava_connections')
            .select('access_token, refresh_token, expires_at')
            .eq('user_id', activity.user_id)
            .single();

        if (athleteError || !athlete) {
            return NextResponse.json(
                { error: 'Strava account not connected', details: athleteError?.message },
                { status: 400 }
            );
        }

        // Check if token needs refresh
        let accessToken = athlete.access_token;
        const now = Math.floor(Date.now() / 1000);

        if (athlete.expires_at && athlete.expires_at < now) {
            // Token expired, refresh it
            const refreshResponse = await fetch('https://www.strava.com/oauth/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client_id: process.env.STRAVA_CLIENT_ID,
                    client_secret: process.env.STRAVA_CLIENT_SECRET,
                    grant_type: 'refresh_token',
                    refresh_token: athlete.refresh_token,
                }),
            });

            if (!refreshResponse.ok) {
                return NextResponse.json(
                    { error: 'Failed to refresh Strava token' },
                    { status: 500 }
                );
            }

            const refreshData = await refreshResponse.json();
            accessToken = refreshData.access_token;

            // Update tokens in database
            await supabase
                .from('strava_connections')
                .update({
                    access_token: refreshData.access_token,
                    refresh_token: refreshData.refresh_token,
                    expires_at: refreshData.expires_at,
                })
                .eq('user_id', activity.user_id);
        }

        // Fetch streams from Strava
        // Request multiple stream types: time, distance, altitude, grade_smooth, heartrate, cadence, velocity_smooth
        const streamTypes = [
            'time',
            'distance',
            'latlng',
            'altitude',
            'grade_smooth',
            'heartrate',
            'cadence',
            'velocity_smooth',
        ];

        const streamsResponse = await fetch(
            `https://www.strava.com/api/v3/activities/${id}/streams?keys=${streamTypes.join(',')}&key_by_type=true`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );

        if (!streamsResponse.ok) {
            const errorText = await streamsResponse.text();
            console.error('Strava streams API error:', errorText);
            return NextResponse.json(
                { error: 'Failed to fetch streams from Strava', details: errorText },
                { status: streamsResponse.status }
            );
        }

        const streamsData = await streamsResponse.json();

        return NextResponse.json(streamsData);
    } catch (error: any) {
        console.error('Get activity streams error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
