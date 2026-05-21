import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';
import { appLogger } from '@/lib/app-logger';
import { apiError } from '@/lib/api/error-response';
import { verifySignedStravaOauthState } from '@/lib/strava/oauth-state';

interface ExchangeRequestBody {
    code?: string;
    state?: string;
}

interface StravaTokenResponse {
    athlete: {
        id: number;
        username?: string;
        firstname?: string;
    };
    access_token: string;
    refresh_token: string;
    expires_at: number;
    scope?: string;
}

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
        const { code, state } = (await request.json()) as ExchangeRequestBody;

        if (!code) {
            return NextResponse.json(apiError('VALIDATION_AUTHORIZATION_CODE_IS_REQUIRED'),
                { status: 400 }
            );
        }

        const oauthStateSecret = process.env.STRAVA_OAUTH_STATE_SECRET || process.env.STRAVA_CLIENT_SECRET;
        if (!oauthStateSecret) {
            return NextResponse.json(apiError('STRAVA_OAUTH_NOT_CONFIGURED'),
                { status: 500 }
            );
        }

        const verification = verifySignedStravaOauthState({
            state: state || '',
            cookieValue: request.cookies.get('strava_oauth_state')?.value,
            userId: user!.id,
            secret: oauthStateSecret,
        });

        if (!state || !verification.isValid) {
            appLogger.warn('strava_oauth.invalid_state', { reason: verification.reason, userId: user!.id });
            return NextResponse.json(apiError('VALIDATION_INVALID_OAUTH_STATE'),
                { status: 400 }
            );
        }

        const clientId = process.env.STRAVA_CLIENT_ID;
        const clientSecret = process.env.STRAVA_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            return NextResponse.json(apiError('STRAVA_OAUTH_NOT_CONFIGURED'),
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
            appLogger.error('Strava token exchange error:', error);
            return NextResponse.json(apiError('VALIDATION_FAILED_TO_EXCHANGE_AUTHORIZATION_CODE'),
                { status: 400 }
            );
        }

        const tokenData = (await tokenResponse.json()) as StravaTokenResponse;

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
            appLogger.error('Failed to store Strava connection:', upsertError);
            return NextResponse.json(apiError('FAILED_TO_SAVE_CONNECTION'),
                { status: 500 }
            );
        }

        // Sync heart rate zones from Strava (non-blocking)
        // Import dynamically to avoid circular dependencies
        const { syncHeartRateZonesFromStrava } = await import('@/lib/strava/sync-zones');
        const zonesResult = await syncHeartRateZonesFromStrava(
            tokenData.access_token,
            supabase,
            user!.id
        );

        if (zonesResult.success) {
            // Zones synced successfully
        } else {
            appLogger.warn('Failed to sync heart rate zones:', zonesResult.error);
            // Don't fail the connection if zones sync fails
        }

        const response = NextResponse.json({
            success: true,
            athleteName: tokenData.athlete.username || tokenData.athlete.firstname,
            message: 'Successfully connected to Strava',
            shouldSync: true, // Indicate that frontend can trigger initial sync
            zonesSynced: zonesResult.success,
        });

        response.cookies.set({
            name: 'strava_oauth_state',
            value: '',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 0,
            path: '/',
        });

        return response;
    } catch (error: unknown) {
        appLogger.error('Exchange Strava code error:', error);
        return NextResponse.json(apiError('INTERNAL_SERVER_ERROR'),
            { status: 500 }
        );
    }
}
