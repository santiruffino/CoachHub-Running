import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';

/**
 * Get Strava OAuth Authorization URL
 * 
 * Returns the URL to redirect the user to for Strava OAuth.
 * 
 * Access: ATHLETE only
 */
export async function GET(request: NextRequest) {
    try {
        const authResult = await requireRole('ATHLETE');

        if (authResult.response) {
            return authResult.response;
        }

        const { user } = authResult;

        const clientId = process.env.STRAVA_CLIENT_ID;
        const redirectUri = process.env.STRAVA_REDIRECT_URI;

        if (!clientId || !redirectUri) {
            return NextResponse.json(
                { error: 'Strava OAuth not configured' },
                { status: 500 }
            );
        }

        // Build authorization URL
        const scope = 'read,activity:read_all,activity:write,profile:read_all';
        const state = user!.id; // Use user ID as state for verification

        const authUrl = `https://www.strava.com/oauth/authorize?` +
            `client_id=${clientId}` +
            `&redirect_uri=${encodeURIComponent(redirectUri)}` +
            `&response_type=code` +
            `&approval_prompt=auto` +
            `&scope=${scope}` +
            `&state=${state}`;

        return NextResponse.json({ url: authUrl });
    } catch (error: any) {
        console.error('Get Strava auth URL error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
