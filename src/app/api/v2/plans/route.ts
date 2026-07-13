import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';
import { createRequestLogger, withRequestId } from '@/lib/logger';
import { apiError } from '@/lib/api/error-response';
import { reportApiError } from '@/lib/api/report-error';
import { createPlanSchema, validateBody } from '@/lib/validation/schemas';
import { verifyTrainingsInTeam, insertPlanItems } from '@/lib/trainings/plans';

/**
 * List Plans
 *
 * Returns all non-archived training plans (mesocycles) for the coach's team,
 * with a lightweight item count.
 *
 * Access: COACH only
 */
export async function GET(request: NextRequest) {
    const { requestId, logger } = createRequestLogger('/api/v2/plans', request);
    const respond = (body: unknown, init?: ResponseInit) =>
        NextResponse.json(body, withRequestId(init, requestId));

    try {
        const { supabase, profile, response } = await requireRole('COACH');
        if (response) {
            response.headers.set('x-request-id', requestId);
            return response;
        }
        if (!profile?.team_id) {
            return respond(apiError('AUTH_COACH_TEAM_REQUIRED'), { status: 403 });
        }

        const { data: plans, error } = await supabase
            .from('training_plans')
            .select('*, training_plan_items(count)')
            .eq('team_id', profile.team_id)
            .eq('is_archived', false)
            .order('updated_at', { ascending: false });

        if (error) {
            logger.error('plans.list_failed', { error: error.message });
            return respond(apiError('FAILED_TO_FETCH_PLANS'), { status: 500 });
        }

        return respond(plans || []);
    } catch (error) {
        reportApiError(error, { route: '/api/v2/plans', method: 'GET', requestId, logger });
        return respond(apiError('INTERNAL_SERVER_ERROR'), { status: 500 });
    }
}

/**
 * Create Plan
 *
 * Creates a training plan and (optionally) its items in one call. Every item
 * must reference a workout template belonging to the coach's team.
 *
 * Access: COACH only
 */
export async function POST(request: NextRequest) {
    const { requestId, logger } = createRequestLogger('/api/v2/plans', request);
    const respond = (body: unknown, init?: ResponseInit) =>
        NextResponse.json(body, withRequestId(init, requestId));

    try {
        const { supabase, user, profile, response } = await requireRole('COACH');
        if (response) {
            response.headers.set('x-request-id', requestId);
            return response;
        }
        if (!profile?.team_id) {
            return respond(apiError('AUTH_COACH_TEAM_REQUIRED'), { status: 403 });
        }

        const { data: body, error: validationError } = validateBody(createPlanSchema, await request.json());
        if (validationError || !body) {
            logger.warn('plans.create_validation_failed', { issues: validationError?.issues });
            return respond(apiError('VALIDATION_INVALID_REQUEST_BODY'), { status: 400 });
        }

        const items = body.items || [];
        const trainingsOk = await verifyTrainingsInTeam(
            supabase,
            profile.team_id,
            items.map((i) => i.trainingId),
        );
        if (!trainingsOk) {
            return respond(apiError('TRAINING_NOT_FOUND'), { status: 404 });
        }

        const { data: plan, error: planError } = await supabase
            .from('training_plans')
            .insert({
                name: body.name,
                description: body.description ?? null,
                type: body.type ?? 'RUNNING',
                duration_weeks: body.durationWeeks,
                focus: body.focus ?? null,
                coach_id: user!.id,
                created_by: user!.id,
                team_id: profile.team_id,
            })
            .select()
            .single();

        if (planError || !plan) {
            logger.error('plans.create_failed', { error: planError?.message });
            return respond(apiError('FAILED_TO_CREATE_PLAN'), { status: 500 });
        }

        if (items.length > 0) {
            const { error: itemsError } = await insertPlanItems(supabase, plan.id, items);
            if (itemsError) {
                // Roll back the plan so we don't leave an empty shell behind.
                await supabase.from('training_plans').delete().eq('id', plan.id);
                logger.error('plans.create_items_failed', { error: itemsError.message });
                return respond(apiError('FAILED_TO_CREATE_PLAN'), { status: 500 });
            }
        }

        return respond(plan, { status: 201 });
    } catch (error) {
        reportApiError(error, { route: '/api/v2/plans', method: 'POST', requestId, logger });
        return respond(apiError('INTERNAL_SERVER_ERROR'), { status: 500 });
    }
}
