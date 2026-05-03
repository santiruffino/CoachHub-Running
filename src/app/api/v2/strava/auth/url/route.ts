import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';
import { randomBytes } from 'crypto';

/**
 * Get Strava OAuth Authorization URL
 * 
 * Returns the URL to redirect the user to for Strava OAuth.
 * 
 * Access: ATHLETE only
 */
export async function GET() {
    try {
        const authResult = await requireRole('ATHLETE');

        if (authResult.response) {
            return authResult.response;
        }

        const clientId = process.env.STRAVA_CLIENT_ID;
        const redirectUri = process.env.STRAVA_REDIRECT_URI;

        if (!clientId || !redirectUri) {
            return NextResponse.json(
                { error: 'Strava OAuth not configured' },
                { status: 500 }
            );
        }

        const oauthState = randomBytes(24).toString('hex');

        // Build authorization URL
        const scope = 'read,activity:read_all,activity:write,profile:read_all';

        const authUrl = `https://www.strava.com/oauth/authorize?` +
            `client_id=${clientId}` +
            `&redirect_uri=${encodeURIComponent(redirectUri)}` +
            `&response_type=code` +
            `&approval_prompt=auto` +
            `&scope=${scope}` +
            `&state=${oauthState}`;

        const response = NextResponse.json({ url: authUrl });
        response.cookies.set({
            name: 'strava_oauth_state',
            value: oauthState,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 10,
            path: '/',
        });

        return response;
    } catch (error: unknown) {
        console.error('Get Strava auth URL error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
