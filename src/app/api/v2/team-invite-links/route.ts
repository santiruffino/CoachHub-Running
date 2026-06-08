import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { requireRole } from '@/lib/supabase/api-helpers';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { appLogger } from '@/lib/app-logger';
import { trackTeamInviteLinkCreated } from '@/lib/analytics/events';
import { apiError } from '@/lib/api/error-response';

const DEFAULT_TTL_DAYS: number | null = null;
const DEFAULT_MAX_USES: number | null = null;

interface CreateBody {
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

export async function GET(request: NextRequest) {
    try {
        const { profile, response } = await requireRole(['COACH', 'ADMIN']);
        if (response) return response;

        if (!profile?.team_id) {
            return NextResponse.json(apiError('TEAM_REQUIRED', 'You must belong to a team.'), { status: 403 });
        }

        const adminClient = createServiceRoleClient();
        const { data, error } = await adminClient
            .from('team_invite_links')
            .select('*')
            .eq('team_id', profile.team_id)
            .order('created_at', { ascending: false });

        if (error) {
            appLogger.error('team_invite_links.list_failed', { error });
            return NextResponse.json(apiError('FAILED_TO_LIST_LINKS'), { status: 500 });
        }

        return NextResponse.json({
            items: (data ?? []).map((row) => rowToDto(row, request)),
        });
    } catch (error: unknown) {
        appLogger.error('team_invite_links.list_unexpected', { error });
        return NextResponse.json(apiError('INTERNAL_ERROR'), { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { user, profile, response } = await requireRole(['COACH', 'ADMIN']);
        if (response) return response;

        if (!profile?.team_id) {
            return NextResponse.json(apiError('TEAM_REQUIRED', 'You must belong to a team.'), { status: 403 });
        }

        let body: CreateBody = {};
        try {
            body = (await request.json()) as CreateBody;
        } catch {
            body = {};
        }

        const label = (body.label ?? null) ? String(body.label).trim().slice(0, 120) || null : null;
        const expiresInDays = body.expiresInDays === undefined ? DEFAULT_TTL_DAYS : body.expiresInDays;
        const maxUses = body.maxUses === undefined ? DEFAULT_MAX_USES : body.maxUses;

        if (expiresInDays !== null && (!Number.isFinite(expiresInDays) || expiresInDays <= 0)) {
            return NextResponse.json(apiError('INVALID_EXPIRY', 'expiresInDays must be a positive number or null.'), { status: 400 });
        }
        if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses <= 0)) {
            return NextResponse.json(apiError('INVALID_MAX_USES', 'maxUses must be a positive integer or null.'), { status: 400 });
        }

        const expiresAt = expiresInDays === null
            ? null
            : new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();

        const token = randomBytes(32).toString('hex');

        const adminClient = createServiceRoleClient();
        const { data, error } = await adminClient
            .from('team_invite_links')
            .insert({
                team_id: profile.team_id,
                created_by: user!.id,
                role: 'ATHLETE',
                token,
                label,
                is_active: true,
                expires_at: expiresAt,
                max_uses: maxUses,
                uses: 0,
            })
            .select('*')
            .single();

        if (error) {
            appLogger.error('team_invite_links.create_failed', { error });
            return NextResponse.json(apiError('FAILED_TO_CREATE_LINK'), { status: 500 });
        }

        trackTeamInviteLinkCreated({
            teamId: profile.team_id,
            hasExpiry: expiresAt !== null,
            hasMaxUses: maxUses !== null,
        });

        return NextResponse.json(rowToDto(data, request), { status: 201 });
    } catch (error: unknown) {
        appLogger.error('team_invite_links.create_unexpected', { error });
        return NextResponse.json(apiError('INTERNAL_ERROR'), { status: 500 });
    }
}
