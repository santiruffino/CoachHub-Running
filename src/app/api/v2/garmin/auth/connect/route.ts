import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';
import { createRequestLogger } from '@/lib/logger';
import { apiError } from '@/lib/api/error-response';
import { reportApiError } from '@/lib/api/report-error';
import { buildRateLimitKey, consumeRateLimit, getClientIpFromHeaders } from '@/lib/api/rate-limit';
import { isGarminPilotEnabled } from '@/lib/garmin/pilot';
import { isGarminConfigured } from '@/lib/garmin/push-workout';
import { GarminAuthError, loginWithCredentials, looksLikeMfa } from '@/lib/garmin/client';
import { encryptJson } from '@/lib/garmin/crypto';

// garmin-connect emulates the browser SSO login → needs the full Node runtime.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Connect Garmin (UNOFFICIAL, pilot only).
 *
 * Performs a one-time Garmin login with the athlete's credentials and stores the
 * resulting session tokens ENCRYPTED. The password is never persisted. Requires
 * explicit consent and the garmin_pilot_enabled flag.
 *
 * Access: ATHLETE only.
 */
export async function POST(request: NextRequest) {
    const { requestId, logger } = createRequestLogger('/api/v2/garmin/auth/connect', request);
    try {
        const authResult = await requireRole('ATHLETE');
        if (authResult.response) return authResult.response;
        const { supabase, user } = authResult;

        if (!isGarminConfigured()) {
            return NextResponse.json(apiError('GARMIN_NOT_CONFIGURED', 'Garmin integration is not configured'), { status: 503 });
        }

        if (!(await isGarminPilotEnabled(supabase, user!.id))) {
            return NextResponse.json(apiError('GARMIN_NOT_IN_PILOT', 'Garmin integration is not available for this account'), { status: 403 });
        }

        // Throttle login attempts (credential-stuffing / lockout protection).
        const ip = getClientIpFromHeaders(request.headers);
        const rate = await consumeRateLimit({
            key: buildRateLimitKey('/api/v2/garmin/auth/connect', ip, user!.id),
            limit: 5,
            windowMs: 10 * 60 * 1000,
        });
        if (!rate.allowed) {
            return NextResponse.json(apiError('RATE_LIMITED', 'Too many attempts, please wait'), { status: 429 });
        }

        const body = await request.json().catch(() => null);
        const username = typeof body?.username === 'string' ? body.username.trim() : '';
        const password = typeof body?.password === 'string' ? body.password : '';
        const consent = body?.consent === true;

        if (!username || !password) {
            return NextResponse.json(apiError('GARMIN_MISSING_CREDENTIALS', 'Garmin email and password are required'), { status: 400 });
        }
        if (!consent) {
            return NextResponse.json(apiError('GARMIN_CONSENT_REQUIRED', 'Explicit consent is required to connect Garmin'), { status: 400 });
        }

        let tokens;
        let garminUserId: string | null = null;
        try {
            ({ tokens, garminUserId } = await loginWithCredentials(username, password));
        } catch (error) {
            const mfa = looksLikeMfa(error);
            logger.warn('garmin.connect.login_failed', { userId: user!.id, mfa });
            if (error instanceof GarminAuthError) {
                return NextResponse.json(
                    apiError(mfa ? 'GARMIN_MFA_UNSUPPORTED' : 'GARMIN_AUTH_FAILED', error.message, { mfa }),
                    { status: 400 },
                );
            }
            throw error;
        }

        const expiresAt = tokens.oauth2?.expires_at
            ? new Date(tokens.oauth2.expires_at * 1000).toISOString()
            : null;

        const { error: upsertError } = await supabase
            .from('garmin_connections')
            .upsert(
                {
                    user_id: user!.id,
                    garmin_user_id: garminUserId,
                    oauth1_token: encryptJson(tokens.oauth1),
                    oauth2_token: encryptJson(tokens.oauth2),
                    token_expires_at: expiresAt,
                    status: 'active',
                    consent_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'user_id' },
            );

        if (upsertError) {
            logger.error('garmin.connect.persist_failed', { userId: user!.id, error: upsertError });
            return NextResponse.json(apiError('GARMIN_CONNECT_FAILED', 'Failed to save Garmin connection'), { status: 500 });
        }

        logger.info('garmin.connect.success', { userId: user!.id });
        return NextResponse.json({ success: true, status: 'active' });
    } catch (error: unknown) {
        reportApiError(error, { route: '/api/v2/garmin/auth/connect', method: 'POST', requestId, logger });
        return NextResponse.json(apiError('INTERNAL_SERVER_ERROR'), { status: 500 });
    }
}
