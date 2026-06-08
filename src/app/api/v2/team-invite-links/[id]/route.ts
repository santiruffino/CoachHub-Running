import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { appLogger } from '@/lib/app-logger';
import { trackTeamInviteLinkRevoked } from '@/lib/analytics/events';
import { apiError } from '@/lib/api/error-response';

interface PatchBody {
    isActive?: boolean;
    label?: string | null;
    expiresInDays?: number | null;
    maxUses?: number | null;
}

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

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { profile, response } = await requireRole(['COACH', 'ADMIN']);
        if (response) return response;

        const { id } = await params;
        if (!id) {
            return NextResponse.json(apiError('INVALID_ID'), { status: 400 });
        }

        if (!profile?.team_id) {
            return NextResponse.json(apiError('TEAM_REQUIRED'), { status: 403 });
        }

        let body: PatchBody = {};
        try {
            body = (await request.json()) as PatchBody;
        } catch {
            body = {};
        }

        const updates: Record<string, unknown> = {};
        if (typeof body.isActive === 'boolean') updates.is_active = body.isActive;
        if (body.label !== undefined) {
            updates.label = body.label ? String(body.label).trim().slice(0, 120) || null : null;
        }
        if (body.expiresInDays !== undefined) {
            if (body.expiresInDays === null) {
                updates.expires_at = null;
            } else if (Number.isFinite(body.expiresInDays) && body.expiresInDays > 0) {
                updates.expires_at = new Date(Date.now() + body.expiresInDays * 24 * 60 * 60 * 1000).toISOString();
            } else {
                return NextResponse.json(apiError('INVALID_EXPIRY'), { status: 400 });
            }
        }
        if (body.maxUses !== undefined) {
            if (body.maxUses === null) {
                updates.max_uses = null;
            } else if (Number.isInteger(body.maxUses) && body.maxUses > 0) {
                updates.max_uses = body.maxUses;
            } else {
                return NextResponse.json(apiError('INVALID_MAX_USES'), { status: 400 });
            }
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json(apiError('NO_UPDATES', 'Provide at least one field to update.'), { status: 400 });
        }

        const adminClient = createServiceRoleClient();
        const { data, error } = await adminClient
            .from('team_invite_links')
            .update(updates)
            .eq('id', id)
            .eq('team_id', profile.team_id)
            .select('*')
            .single();

        if (error || !data) {
            appLogger.error('team_invite_links.patch_failed', { id, error });
            return NextResponse.json(apiError('LINK_NOT_FOUND'), { status: 404 });
        }

        if (updates.is_active === false) {
            trackTeamInviteLinkRevoked({ linkId: id });
        }

        return NextResponse.json(rowToDto(data, request));
    } catch (error: unknown) {
        appLogger.error('team_invite_links.patch_unexpected', { error });
        return NextResponse.json(apiError('INTERNAL_ERROR'), { status: 500 });
    }
}
