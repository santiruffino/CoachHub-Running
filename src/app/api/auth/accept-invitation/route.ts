import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createRequestLogger } from '@/lib/logger';
import { apiError } from '@/lib/api/error-response';
import { reportApiError } from '@/lib/api/report-error';
import { acceptTeamInviteLink } from '@/lib/invitations/accept-team-invite';

/**
 * Legacy per-email invite acceptance.
 *
 * Kept as a thin alias over the same `team_invite_links` data + accept logic
 * used by `/api/join/[token]/accept` (SAN-59) -- this route only differs in
 * that the recipient's email isn't supplied by the caller (the legacy signup
 * form never collected it), so it's resolved from the link record by token
 * first.
 */
export async function POST(request: NextRequest) {
    const { requestId, logger } = createRequestLogger('/api/auth/accept-invitation', request);
    try {
        const { token, name, password } = await request.json();

        if (!token || !name || !password) {
            return NextResponse.json(apiError('VALIDATION_MISSING_FIELDS', 'Missing required fields'), { status: 400 });
        }

        const adminClient = createServiceRoleClient();
        const { data: link, error: linkError } = await adminClient
            .from('team_invite_links')
            .select('email')
            .eq('token', token)
            .maybeSingle();

        if (linkError || !link?.email) {
            return NextResponse.json(apiError('LINK_NOT_FOUND', 'Invalid or expired invitation'), { status: 404 });
        }

        const result = await acceptTeamInviteLink({
            token,
            email: link.email.trim().toLowerCase(),
            name: String(name).trim(),
            password,
            logger,
        });

        if (!result.ok) {
            return NextResponse.json(apiError(result.code, result.message), { status: result.status });
        }

        return NextResponse.json({
            success: true,
            message: 'Account created successfully',
            email: result.email,
        });
    } catch (error: unknown) {
        reportApiError(error, { route: '/api/auth/accept-invitation', method: 'POST', requestId, logger });
        return NextResponse.json(apiError('INTERNAL_SERVER_ERROR'), { status: 500 });
    }
}
