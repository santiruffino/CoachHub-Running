import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';

/**
 * Sync Heart Rate Zones from Strava
 * 
 * Fetches the athlete's heart rate zones from Strava and syncs them to the 
 * athlete's profile in Coach Hub.
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

        // Fetch athlete zones from Strava
        const zonesResponse = await fetch(
            'https://www.strava.com/api/v3/athlete/zones',
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            }
        );

        if (!zonesResponse.ok) {
            const errorText = await zonesResponse.text();
            console.error('Strava zones API error:', errorText);
            return NextResponse.json(
                { error: 'Failed to fetch zones from Strava', details: errorText },
                { status: zonesResponse.status }
            );
        }

        const zonesData = await zonesResponse.json();

        // Extract heart rate zones
        // Strava returns: { heart_rate: { zones: [...], custom_zones: boolean } }
        const heartRateZones = zonesData.heart_rate;

        if (!heartRateZones || !heartRateZones.zones) {
            return NextResponse.json(
                { error: 'No heart rate zones found in Strava profile' },
                { status: 404 }
            );
        }

        // Transform zones to our format
        const hrZones = {
            zones: heartRateZones.zones.map((zone: any) => ({
                min: zone.min,
                max: zone.max,
            })),
            custom_zones: heartRateZones.custom_zones,
        };

        // Update athlete profile with zones
        const { error: updateError } = await supabase
            .from('athlete_profiles')
            .upsert({
                user_id: user!.id,
                hr_zones: hrZones,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id'
            });

        if (updateError) {
            console.error('Supabase error updating zones:', updateError);
            return NextResponse.json(
                { error: 'Failed to update zones in profile', details: updateError.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Heart rate zones synced successfully',
            zones: hrZones,
        });
    } catch (error: any) {
        console.error('Zones sync error:', error);
        return NextResponse.json(
            { error: 'Zones sync failed: ' + error.message },
            { status: 500 }
        );
    }
}
