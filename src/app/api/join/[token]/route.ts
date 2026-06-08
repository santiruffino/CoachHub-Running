import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { appLogger } from '@/lib/app-logger';
import { apiError } from '@/lib/api/error-response';

type ResolveReason = 'not_found' | 'revoked' | 'expired' | 'max_uses_reached';

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const { token } = await params;
        if (!token || typeof token !== 'string' || token.length < 16) {
            return NextResponse.json({ valid: false, reason: 'not_found' as ResolveReason });
        }

        const adminClient = createServiceRoleClient();
        const { data: link, error } = await adminClient
            .from('team_invite_links')
            .select('id, team_id, is_active, expires_at, max_uses, uses, role')
            .eq('token', token)
            .single();

        if (error || !link) {
            return NextResponse.json({ valid: false, reason: 'not_found' as ResolveReason });
        }

        if (!link.is_active) {
            return NextResponse.json({ valid: false, reason: 'revoked' as ResolveReason });
        }

        if (link.expires_at && new Date(link.expires_at) < new Date()) {
            return NextResponse.json({ valid: false, reason: 'expired' as ResolveReason });
        }

        if (link.max_uses !== null && link.uses >= link.max_uses) {
            return NextResponse.json({ valid: false, reason: 'max_uses_reached' as ResolveReason });
        }

        const { data: team } = await adminClient
            .from('teams')
            .select('id, name')
            .eq('id', link.team_id)
            .single();

        return NextResponse.json({
            valid: true,
            teamId: link.team_id,
            teamName: team?.name ?? null,
            role: link.role,
            expiresAt: link.expires_at ?? null,
            maxUses: link.max_uses ?? null,
        });
    } catch (error: unknown) {
        appLogger.error('join.resolve_unexpected', { error });
        return NextResponse.json(apiError('INTERNAL_ERROR'), { status: 500 });
    }
}
