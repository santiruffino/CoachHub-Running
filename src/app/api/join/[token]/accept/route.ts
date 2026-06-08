import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { appLogger } from '@/lib/app-logger';
import { apiError } from '@/lib/api/error-response';
import { trackSignupStarted, trackSignupCompleted, trackSignupFailed } from '@/lib/analytics/events';

interface AcceptBody {
    email: string;
    name: string;
    password: string;
}

const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const { token } = await params;
        if (!token || typeof token !== 'string' || token.length < 16) {
            return NextResponse.json(apiError('INVALID_LINK', 'Invalid invite link.'), { status: 400 });
        }

        let body: AcceptBody;
        try {
            body = (await request.json()) as AcceptBody;
        } catch {
            return NextResponse.json(apiError('INVALID_BODY', 'Invalid request body.'), { status: 400 });
        }

        const email = String(body.email ?? '').trim().toLowerCase();
        const name = String(body.name ?? '').trim();
        const password = String(body.password ?? '');

        if (!EMAIL_REGEX.test(email)) {
            return NextResponse.json(apiError('INVALID_EMAIL', 'A valid email is required.'), { status: 400 });
        }
        if (name.length < 2) {
            return NextResponse.json(apiError('INVALID_NAME', 'Name must be at least 2 characters.'), { status: 400 });
        }
        if (password.length < 6) {
            return NextResponse.json(apiError('INVALID_PASSWORD', 'Password must be at least 6 characters.'), { status: 400 });
        }

        const adminClient = createServiceRoleClient();

        const { data: existingProfile } = await adminClient
            .from('profiles')
            .select('id')
            .eq('email', email)
            .maybeSingle();

        if (existingProfile) {
            return NextResponse.json(apiError('EMAIL_TAKEN', 'An account with this email already exists.'), { status: 409 });
        }

        const { data: consumed, error: consumeError } = await adminClient.rpc('consume_team_invite_link', {
            p_token: token,
        });

        if (consumeError || !consumed) {
            const message = (consumeError as { message?: string } | null)?.message ?? '';
            appLogger.warn('join.consume_failed', { tokenPrefix: token.slice(0, 8), message });

            if (message.includes('link_not_found')) {
                return NextResponse.json(apiError('LINK_NOT_FOUND', 'This invite link is invalid.'), { status: 404 });
            }
            if (message.includes('link_revoked')) {
                return NextResponse.json(apiError('LINK_REVOKED', 'This invite link has been disabled.'), { status: 410 });
            }
            if (message.includes('link_expired')) {
                return NextResponse.json(apiError('LINK_EXPIRED', 'This invite link has expired.'), { status: 410 });
            }
            if (message.includes('link_max_uses')) {
                return NextResponse.json(apiError('LINK_MAX_USES', 'This invite link has reached its usage limit.'), { status: 410 });
            }
            return NextResponse.json(apiError('INVALID_LINK', 'This invite link cannot be used.'), { status: 400 });
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
                        { status: 403 }
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
            return NextResponse.json(apiError('FAILED_TO_CREATE_USER', 'Could not create the user account.'), { status: 500 });
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

        return NextResponse.json({ success: true, email });
    } catch (error: unknown) {
        appLogger.error('join.accept_unexpected', { error });
        return NextResponse.json(apiError('INTERNAL_ERROR'), { status: 500 });
    }
}
