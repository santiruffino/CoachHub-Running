import { createServiceRoleClient } from '@/lib/supabase/server';
import { trackSignupStarted, trackSignupCompleted, trackSignupFailed } from '@/lib/analytics/events';
import type { Logger } from '@/lib/logger';

interface AcceptTeamInviteParams {
    token: string;
    email: string;
    name: string;
    password: string;
    logger: Logger;
}

type AcceptTeamInviteResult =
    | { ok: true; email: string }
    | { ok: false; status: number; code: string; message: string };

/**
 * Consumes a `team_invite_links` token and creates the resulting account.
 *
 * This is the single source of truth for "accept an invite" -- both
 * `/api/join/[token]/accept` (generic team links) and
 * `/api/auth/accept-invitation` (legacy per-email invites, now backed by the
 * same table) call this so the signup/profile-assignment logic only exists
 * once (SAN-59).
 */
export async function acceptTeamInviteLink({
    token,
    email,
    name,
    password,
    logger,
}: AcceptTeamInviteParams): Promise<AcceptTeamInviteResult> {
    const adminClient = createServiceRoleClient();

    const { data: existingProfile } = await adminClient
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

    if (existingProfile) {
        return { ok: false, status: 409, code: 'EMAIL_TAKEN', message: 'An account with this email already exists.' };
    }

    const { data: consumed, error: consumeError } = await adminClient.rpc('consume_team_invite_link', {
        p_token: token,
        p_email: email,
    });

    if (consumeError || !consumed) {
        const message = (consumeError as { message?: string } | null)?.message ?? '';
        logger.warn('accept_invite.consume_failed', { tokenPrefix: token.slice(0, 8), message });

        if (message.includes('link_not_found')) {
            return { ok: false, status: 404, code: 'LINK_NOT_FOUND', message: 'This invite link is invalid.' };
        }
        if (message.includes('link_revoked')) {
            return { ok: false, status: 410, code: 'LINK_REVOKED', message: 'This invite link has been disabled.' };
        }
        if (message.includes('link_expired')) {
            return { ok: false, status: 410, code: 'LINK_EXPIRED', message: 'This invite link has expired.' };
        }
        if (message.includes('link_max_uses')) {
            return { ok: false, status: 410, code: 'LINK_MAX_USES', message: 'This invite link has reached its usage limit.' };
        }
        if (message.includes('link_email_mismatch')) {
            return { ok: false, status: 403, code: 'EMAIL_MISMATCH', message: 'This invite link was sent to a different email address.' };
        }
        return { ok: false, status: 400, code: 'INVALID_LINK', message: 'This invite link cannot be used.' };
    }

    const linkRow = consumed as { id: string; team_id: string; role: string; coach_id: string | null };

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
                return {
                    ok: false,
                    status: 403,
                    code: 'TEAM_FULL',
                    message: `El equipo ha alcanzado el límite de ${teamSettings.max_athletes} atletas. Contacta al administrador.`,
                };
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
        logger.error('accept_invite.create_user_failed', { authError });
        trackSignupFailed({ role: linkRow.role, method: 'team_link', reason: authError?.message ?? 'create_user_failed' });
        return { ok: false, status: 500, code: 'FAILED_TO_CREATE_USER', message: 'Could not create the user account.' };
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
            coach_id: linkRow.coach_id ?? null,
            must_change_password: false,
            is_onboarding_completed: false,
        })
        .eq('id', newUserId);

    if (profileError) {
        logger.error('accept_invite.profile_update_failed', { profileError, newUserId });
        // continue - profile will exist via the trigger
    }

    // Ensure athlete_profiles placeholder exists
    const { error: athleteProfileError } = await adminClient
        .from('athlete_profiles')
        .insert({ user_id: newUserId });

    if (athleteProfileError && !String(athleteProfileError.message ?? '').includes('duplicate')) {
        logger.warn('accept_invite.athlete_profile_insert_warn', { athleteProfileError });
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
        logger.warn('accept_invite.audit_log_warn', { auditError });
    }

    trackSignupCompleted({ role: linkRow.role, method: 'team_link' });

    return { ok: true, email };
}
