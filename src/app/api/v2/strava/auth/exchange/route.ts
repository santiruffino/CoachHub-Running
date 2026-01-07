import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';

/**
 * Exchange Strava OAuth Code for Tokens
 * 
 * Exchanges the authorization code from Strava for access/refresh tokens
 * and stores the connection in the database.
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
        const { code } = await request.json();

        if (!code) {
            return NextResponse.json(
                { error: 'Authorization code is required' },
                { status: 400 }
            );
        }

        const clientId = process.env.STRAVA_CLIENT_ID;
        const clientSecret = process.env.STRAVA_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            return NextResponse.json(
                { error: 'Strava OAuth not configured' },
                { status: 500 }
            );
        }

        // Exchange code for tokens
        const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                code,
                grant_type: 'authorization_code',
            }),
        });

        if (!tokenResponse.ok) {
            const error = await tokenResponse.json();
            console.error('Strava token exchange error:', error);
            return NextResponse.json(
                { error: 'Failed to exchange authorization code' },
                { status: 400 }
            );
        }

        const tokenData = await tokenResponse.json();

        // Store connection in database
        const { error: upsertError } = await supabase
            .from('strava_connections')
            .upsert({
                user_id: user!.id,
                strava_athlete_id: tokenData.athlete.id.toString(),
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token,
                expires_at: tokenData.expires_at,
                scopes: tokenData.scope?.split(',') || [],
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id',
            });

        if (upsertError) {
            console.error('Failed to store Strava connection:', upsertError);
            return NextResponse.json(
                { error: 'Failed to save connection' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            athleteName: tokenData.athlete.username || tokenData.athlete.firstname,
            message: 'Successfully connected to Strava',
            shouldSync: true, // Indicate that frontend can trigger initial sync
        });
    } catch (error: any) {
        console.error('Exchange Strava code error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
