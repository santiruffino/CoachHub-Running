import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';
import * as Sentry from '@sentry/nextjs';
import { createRequestLogger, withRequestId } from '@/lib/logger';

interface MarkReadPayload {
    alertIds?: string[];
    scope?: 'mine' | 'team';
    athleteId?: string;
    action?: 'read' | 'resolve' | 'snooze';
    snoozeHours?: number;
}

export async function POST(request: NextRequest) {
    const { requestId, logger } = createRequestLogger('/api/v2/dashboard/coach/alerts/read', request);
    const respond = (body: unknown, init?: ResponseInit) =>
        NextResponse.json(body, withRequestId(init, requestId));

    try {
        const authResult = await requireRole(['COACH', 'ADMIN']);
        if (authResult.response) {
            authResult.response.headers.set('x-request-id', requestId);
            return authResult.response;
        }

        const { supabase, user } = authResult;
        const body = (await request.json().catch(() => ({}))) as MarkReadPayload;
        const scope = body.scope === 'team' ? 'team' : 'mine';
        const action = body.action || 'read';

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role, team_id')
            .eq('id', user!.id)
            .single();

        if (profileError || !profile?.team_id) {
            logger.warn('alerts_read.missing_team', { userId: user!.id, profileError });
            return respond({ error: 'Coach must belong to a team' }, { status: 403 });
        }

        let scopedAthleteIds: string[] | null = null;
        if (scope === 'mine' && profile.role === 'COACH') {
            const { data: mineAthletes, error: athletesError } = await supabase
                .from('profiles')
                .select('id')
                .eq('role', 'ATHLETE')
                .eq('team_id', profile.team_id)
                .eq('coach_id', user!.id);

            if (athletesError) {
                logger.error('alerts_read.resolve_athletes_failed', { userId: user!.id, error: athletesError });
                return respond({ error: 'Failed to resolve coach athletes' }, { status: 500 });
            }

            scopedAthleteIds = (mineAthletes || []).map((a) => a.id);
        }

        const updates: {
            is_read?: boolean;
            status?: 'OPEN' | 'SNOOZED' | 'RESOLVED';
            resolved_at?: string | null;
            snoozed_until?: string | null;
        } = {};

        if (action === 'resolve') {
            updates.is_read = true;
            updates.status = 'RESOLVED';
            updates.resolved_at = new Date().toISOString();
            updates.snoozed_until = null;
        } else if (action === 'snooze') {
            const hours = typeof body.snoozeHours === 'number' && body.snoozeHours > 0 ? body.snoozeHours : 24;
            const snoozedUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
            updates.status = 'SNOOZED';
            updates.snoozed_until = snoozedUntil;
            updates.resolved_at = null;
        } else {
            updates.is_read = true;
        }

        let query = supabase
            .from('alerts')
            .update(updates)
            .eq('team_id', profile.team_id);

        if (action === 'read') {
            query = query.eq('is_read', false);
        }

        const alertIds = Array.isArray(body.alertIds)
            ? body.alertIds.filter((id) => typeof id === 'string' && id.length > 0)
            : [];

        if (alertIds.length > 0) {
            query = query.in('id', alertIds);
        }

        if (body.athleteId && typeof body.athleteId === 'string') {
            query = query.eq('athlete_id', body.athleteId);
        }

        if (scopedAthleteIds) {
            query = query.in('athlete_id', scopedAthleteIds.length > 0 ? scopedAthleteIds : ['__none__']);
        }

        const { data, error } = await query.select('id');
        if (error) {
            logger.error('alerts_read.update_failed', { userId: user!.id, action, scope, alertIds, error });
            return respond({ error: 'Failed to update alerts' }, { status: 500 });
        }

        logger.info('alerts_read.updated', {
            userId: user!.id,
            action,
            scope,
            requestedIds: alertIds.length,
            updated: (data || []).length,
        });

        return respond({ updated: (data || []).length, ids: (data || []).map((d) => d.id) }, { status: 200 });
    } catch (error: unknown) {
        logger.error('alerts_read.unhandled_error', { error });
        Sentry.captureException(error, {
            tags: { route: '/api/v2/dashboard/coach/alerts/read', requestId },
        });
        return respond(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
