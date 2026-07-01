import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { apiError } from '@/lib/api/error-response';
import { reportApiError } from '@/lib/api/report-error';

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
            .select('id, team_id, is_active, expires_at, max_uses, uses, role, email')
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
            email: link.email ?? null,
            expiresAt: link.expires_at ?? null,
            maxUses: link.max_uses ?? null,
        });
    } catch (error: unknown) {
        reportApiError(error, { route: '/api/join/[token]', method: 'GET', extra: { event: 'join.resolve_unexpected' } });
        return NextResponse.json(apiError('INTERNAL_ERROR'), { status: 500 });
    }
}
