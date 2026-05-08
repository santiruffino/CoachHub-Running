import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';
import { appLogger } from '@/lib/app-logger';
import { apiError } from '@/lib/api/error-response';
import { createSignedStravaOauthState } from '@/lib/strava/oauth-state';

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
        const oauthStateSecret = process.env.STRAVA_OAUTH_STATE_SECRET || process.env.STRAVA_CLIENT_SECRET;

        if (!clientId || !redirectUri || !oauthStateSecret) {
            return NextResponse.json(apiError('STRAVA_OAUTH_NOT_CONFIGURED', 'Strava OAuth not configured'),
                { status: 500 }
            );
        }

        const { state: oauthState, cookieValue, maxAgeSeconds } = createSignedStravaOauthState({
            userId: authResult.user!.id,
            secret: oauthStateSecret,
        });

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
            value: cookieValue,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: maxAgeSeconds,
            path: '/',
        });

        return response;
    } catch (error: unknown) {
        appLogger.error('Get Strava auth URL error:', error);
        return NextResponse.json(apiError('INTERNAL_SERVER_ERROR', 'Internal server error'),
            { status: 500 }
        );
    }
}
