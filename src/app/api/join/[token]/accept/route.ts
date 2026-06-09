import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { appLogger } from '@/lib/app-logger';
import { apiError } from '@/lib/api/error-response';
import { trackSignupStarted, trackSignupCompleted, trackSignupFailed } from '@/lib/analytics/events';
import { buildRateLimitKey, consumeRateLimit, getClientIpFromHeaders } from '@/lib/api/rate-limit';
import { z } from 'zod';
import { acceptInviteSchema, validateBody } from '@/lib/validation/schemas';

const ACCEPT_INVITE_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const ACCEPT_INVITE_RATE_LIMIT_MAX_REQUESTS = 10;

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    const clientIp = getClientIpFromHeaders(request.headers);
    const rateLimitKey = buildRateLimitKey('/api/join/[token]/accept', clientIp, null);
    const rateLimit = consumeRateLimit({
        key: rateLimitKey,
        limit: ACCEPT_INVITE_RATE_LIMIT_MAX_REQUESTS,
        windowMs: ACCEPT_INVITE_RATE_LIMIT_WINDOW_MS,
    });

    const headers = new Headers();
    headers.set('x-ratelimit-limit', String(rateLimit.limit));
    headers.set('x-ratelimit-remaining', String(rateLimit.remaining));
    headers.set('x-ratelimit-reset', String(Math.floor(rateLimit.resetAt / 1000)));
    headers.set('retry-after', String(rateLimit.retryAfterSeconds));

    try {
        const { token } = await params;
        if (!token || typeof token !== 'string' || token.length < 16) {
            return NextResponse.json(apiError('INVALID_LINK', 'Invalid invite link.'), { status: 400, headers });
        }

        if (!rateLimit.allowed) {
            return NextResponse.json(apiError('RATE_LIMIT_EXCEEDED'), {
                status: 429,
                headers,
            });
        }

        let body: z.infer<typeof acceptInviteSchema>;
        try {
            const rawBody = await request.json();
            const { data, error } = validateBody(acceptInviteSchema, rawBody);
            if (error) {
                return NextResponse.json(
                    apiError('VALIDATION_ERROR', error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')),
                    { status: 400, headers }
                );
            }
            body = data!;
        } catch {
            return NextResponse.json(apiError('INVALID_BODY', 'Invalid request body.'), { status: 400, headers });
        }

        const email = body.email.trim().toLowerCase();
        const name = body.name.trim();
        const password = body.password;

        const adminClient = createServiceRoleClient();

        const { data: existingProfile } = await adminClient
            .from('profiles')
            .select('id')
            .eq('email', email)
            .maybeSingle();

        if (existingProfile) {
            return NextResponse.json(apiError('EMAIL_TAKEN', 'An account with this email already exists.'), { status: 409, headers });
        }

        const { data: consumed, error: consumeError } = await adminClient.rpc('consume_team_invite_link', {
            p_token: token,
        });

        if (consumeError || !consumed) {
            const message = (consumeError as { message?: string } | null)?.message ?? '';
            appLogger.warn('join.consume_failed', { tokenPrefix: token.slice(0, 8), message });

            if (message.includes('link_not_found')) {
                return NextResponse.json(apiError('LINK_NOT_FOUND', 'This invite link is invalid.'), { status: 404, headers });
            }
            if (message.includes('link_revoked')) {
                return NextResponse.json(apiError('LINK_REVOKED', 'This invite link has been disabled.'), { status: 410, headers });
            }
            if (message.includes('link_expired')) {
                return NextResponse.json(apiError('LINK_EXPIRED', 'This invite link has expired.'), { status: 410, headers });
            }
            if (message.includes('link_max_uses')) {
                return NextResponse.json(apiError('LINK_MAX_USES', 'This invite link has reached its usage limit.'), { status: 410, headers });
            }
            return NextResponse.json(apiError('INVALID_LINK', 'This invite link cannot be used.'), { status: 400, headers });
        }

        const linkRow = consumed as { id: string; team_id: string; role: string };

        // Check team athlete limit (if set) - team invite links only create ATHLETES
        if (linkRow.role === 'ATHLETE') {
            const { data: teamSettings } = await adminClient
                .from('team_settings')
                .select('max_athletes')
                .eq('team_id', linkRow.team_id)
                .maybeSingle();

            if (teamSettings && teamSettings.max_athletes !== null && teamSettings.max_athletes > 0) {
                const { count: currentAthletes } = await adminClient
                    .from('profiles')
                    .select('*', { count: 'exact', head: true })
                    .eq('team_id', linkRow.team_id)
                    .eq('role', 'ATHLETE');

                if (currentAthletes !== null && currentAthletes >= teamSettings.max_athletes) {
                    return NextResponse.json(
                        apiError('TEAM_FULL', `El equipo ha alcanzado el límite de ${teamSettings.max_athletes} atletas. Contacta al administrador.`),
                        { status: 403, headers }
                    );
                }
            }
        }

        trackSignupStarted({ role: linkRow.role, method: 'team_link' });

        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        });

        if (authError || !authData.user) {
            appLogger.error('join.create_user_failed', { authError });
            trackSignupFailed({ role: linkRow.role, method: 'team_link', reason: authError?.message ?? 'create_user_failed' });
            return NextResponse.json(apiError('FAILED_TO_CREATE_USER', 'Could not create the user account.'), { status: 500, headers });
        }

        const newUserId = authData.user.id;

        // The handle_new_user trigger creates a default profile with role=ATHLETE,
        // is_onboarding_completed=false and no team_id. Update it with the link's
        // team_id and any other defaults.
        const { error: profileError } = await adminClient
            .from('profiles')
            .update({
                name,
                role: linkRow.role,
                team_id: linkRow.team_id,
                coach_id: null,
                must_change_password: false,
                is_onboarding_completed: false,
            })
            .eq('id', newUserId);

        if (profileError) {
            appLogger.error('join.profile_update_failed', { profileError, newUserId });
            // continue - profile will exist via the trigger
        }

        // Ensure athlete_profiles placeholder exists
        const { error: athleteProfileError } = await adminClient
            .from('athlete_profiles')
            .insert({ user_id: newUserId });

        if (athleteProfileError && !String(athleteProfileError.message ?? '').includes('duplicate')) {
            appLogger.warn('join.athlete_profile_insert_warn', { athleteProfileError });
        }

        // Audit log: record usage of the link.
        const { error: auditError } = await adminClient.from('admin_action_logs').insert({
            actor_id: newUserId,
            actor_role: linkRow.role,
            team_id: linkRow.team_id,
            action: 'team_invite_link.used',
            target_type: 'team_invite_link',
            target_id: linkRow.id,
            metadata: {
                link_id: linkRow.id,
                athlete_email: email,
                athlete_id: newUserId,
            },
        });

        if (auditError) {
            appLogger.warn('join.audit_log_warn', { auditError });
        }

        trackSignupCompleted({ role: linkRow.role, method: 'team_link' });

        return NextResponse.json({ success: true, email }, { headers });
    } catch (error: unknown) {
        appLogger.error('join.accept_unexpected', { error });
        return NextResponse.json(apiError('INTERNAL_ERROR'), { status: 500, headers });
    }
}
