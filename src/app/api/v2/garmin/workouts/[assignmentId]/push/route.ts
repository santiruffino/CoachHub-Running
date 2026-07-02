import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/api-helpers';
import { createRequestLogger } from '@/lib/logger';
import { apiError } from '@/lib/api/error-response';
import { reportApiError } from '@/lib/api/report-error';
import { buildRateLimitKey, consumeRateLimit, getClientIpFromHeaders } from '@/lib/api/rate-limit';
import { isGarminConfigured, pushAssignmentToGarmin } from '@/lib/garmin/push-workout';

// Uploading to Garmin needs the full Node runtime (garmin-connect client).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Manually push / re-sync a training assignment to Garmin.
 *
 * Authorization: the caller must be able to see the assignment under RLS (its
 * owning athlete, or a coach on the athlete's team). The actual push runs with
 * the service role after that check.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ assignmentId: string }> }) {
    const { requestId, logger } = createRequestLogger('/api/v2/garmin/workouts/[assignmentId]/push', request);
    try {
        const authResult = await requireAuth();
        if (authResult.response) return authResult.response;
        const { supabase, user } = authResult;

        if (!isGarminConfigured()) {
            return NextResponse.json(apiError('GARMIN_NOT_CONFIGURED', 'Garmin integration is not configured'), { status: 503 });
        }

        const { assignmentId } = await context.params;

        // RLS-scoped read doubles as the authorization check.
        const { data: assignment, error: readError } = await supabase
            .from('training_assignments')
            .select('id')
            .eq('id', assignmentId)
            .maybeSingle();

        if (readError || !assignment) {
            return NextResponse.json(apiError('TRAINING_ASSIGNMENT_NOT_FOUND', 'Assignment not found'), { status: 404 });
        }

        const ip = getClientIpFromHeaders(request.headers);
        const rate = await consumeRateLimit({
            key: buildRateLimitKey('/api/v2/garmin/workouts/push', ip, user!.id),
            limit: 30,
            windowMs: 10 * 60 * 1000,
        });
        if (!rate.allowed) {
            return NextResponse.json(apiError('RATE_LIMITED', 'Too many attempts, please wait'), { status: 429 });
        }

        const result = await pushAssignmentToGarmin(assignmentId);

        if (result.status === 'failed') {
            return NextResponse.json(apiError('GARMIN_PUSH_FAILED', result.error || 'Push failed', { result }), { status: 502 });
        }
        if (result.status === 'skipped') {
            return NextResponse.json(apiError('GARMIN_PUSH_SKIPPED', result.error || 'Nothing to push', { result }), { status: 409 });
        }

        logger.info('garmin.push.manual_success', { userId: user!.id, assignmentId, garminWorkoutId: result.garminWorkoutId });
        return NextResponse.json({ success: true, ...result });
    } catch (error: unknown) {
        reportApiError(error, { route: '/api/v2/garmin/workouts/[assignmentId]/push', method: 'POST', requestId, logger });
        return NextResponse.json(apiError('INTERNAL_SERVER_ERROR'), { status: 500 });
    }
}
