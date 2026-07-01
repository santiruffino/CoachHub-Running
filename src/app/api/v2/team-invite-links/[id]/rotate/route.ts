import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { requireRole } from '@/lib/supabase/api-helpers';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createRequestLogger } from '@/lib/logger';
import { trackTeamInviteLinkRotated } from '@/lib/analytics/events';
import { apiError } from '@/lib/api/error-response';
import { reportApiError } from '@/lib/api/report-error';

function buildLinkUrl(token: string): string {
    const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://endurix.app';
    return `${appUrl.replace(/\/$/, '')}/join/${token}`;
}

function rowToDto(row: Record<string, unknown>, request: NextRequest) {
    const token = String(row.token);
    const origin = request.nextUrl.origin;
    const url = `${origin}/join/${token}`;
    return {
        id: row.id,
        teamId: row.team_id,
        createdBy: row.created_by,
        role: row.role,
        token,
        url,
        externalUrl: buildLinkUrl(token),
        label: row.label ?? null,
        isActive: row.is_active,
        expiresAt: row.expires_at,
        maxUses: row.max_uses,
        uses: row.uses,
        lastUsedAt: row.last_used_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { requestId, logger } = createRequestLogger('/api/v2/team-invite-links/[id]/rotate', request);
    try {
        const { user, profile, response } = await requireRole(['COACH', 'ADMIN']);
        if (response) return response;

        const { id } = await params;
        if (!id) {
            return NextResponse.json(apiError('INVALID_ID'), { status: 400 });
        }

        if (!profile?.team_id) {
            return NextResponse.json(apiError('TEAM_REQUIRED'), { status: 403 });
        }

        const adminClient = createServiceRoleClient();

        const { data: existing, error: fetchError } = await adminClient
            .from('team_invite_links')
            .select('*')
            .eq('id', id)
            .eq('team_id', profile.team_id)
            .single();

        if (fetchError || !existing) {
            return NextResponse.json(apiError('LINK_NOT_FOUND'), { status: 404 });
        }

        const { error: deactivateError } = await adminClient
            .from('team_invite_links')
            .update({ is_active: false })
            .eq('id', existing.id);

        if (deactivateError) {
            logger.error('team_invite_links.rotate.deactivate_failed', { error: { deactivateError } });
            return NextResponse.json(apiError('FAILED_TO_ROTATE_LINK'), { status: 500 });
        }

        const newToken = randomBytes(32).toString('hex');
        const { data: created, error: createError } = await adminClient
            .from('team_invite_links')
            .insert({
                team_id: existing.team_id,
                created_by: user!.id,
                role: existing.role,
                token: newToken,
                label: existing.label,
                is_active: true,
                expires_at: existing.expires_at,
                max_uses: existing.max_uses,
                uses: 0,
            })
            .select('*')
            .single();

        if (createError || !created) {
            logger.error('team_invite_links.rotate.create_failed', { error: { createError } });
            return NextResponse.json(apiError('FAILED_TO_ROTATE_LINK'), { status: 500 });
        }

        trackTeamInviteLinkRotated({ linkId: existing.id });

        return NextResponse.json(rowToDto(created, request), { status: 201 });
    } catch (error: unknown) {
        reportApiError(error, { route: '/api/v2/team-invite-links/[id]/rotate', method: 'POST', requestId, logger });
        return NextResponse.json(apiError('INTERNAL_ERROR'), { status: 500 });
    }
}
