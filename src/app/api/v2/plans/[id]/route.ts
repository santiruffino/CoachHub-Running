import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';
import { createRequestLogger, withRequestId } from '@/lib/logger';
import { apiError } from '@/lib/api/error-response';
import { reportApiError } from '@/lib/api/report-error';
import { updatePlanSchema, validateBody } from '@/lib/validation/schemas';
import { loadPlanWithItems, verifyTrainingsInTeam, insertPlanItems } from '@/lib/trainings/plans';

/**
 * Get / Update / Delete a training plan (mesocycle).
 *
 * Access: COACH only. Team ownership is enforced on every verb.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { requestId, logger } = createRequestLogger('/api/v2/plans/[id]', request);
    const respond = (body: unknown, init?: ResponseInit) =>
        NextResponse.json(body, withRequestId(init, requestId));

    try {
        const { id } = await params;
        const { supabase, profile, response } = await requireRole('COACH');
        if (response) {
            response.headers.set('x-request-id', requestId);
            return response;
        }
        if (!profile?.team_id) {
            return respond(apiError('AUTH_COACH_TEAM_REQUIRED'), { status: 403 });
        }

        const plan = await loadPlanWithItems(supabase, id, profile.team_id);
        if (!plan) {
            return respond(apiError('PLAN_NOT_FOUND'), { status: 404 });
        }

        return respond(plan);
    } catch (error) {
        reportApiError(error, { route: '/api/v2/plans/[id]', method: 'GET', requestId, logger });
        return respond(apiError('INTERNAL_SERVER_ERROR'), { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { requestId, logger } = createRequestLogger('/api/v2/plans/[id]', request);
    const respond = (body: unknown, init?: ResponseInit) =>
        NextResponse.json(body, withRequestId(init, requestId));

    try {
        const { id } = await params;
        const { supabase, profile, response } = await requireRole('COACH');
        if (response) {
            response.headers.set('x-request-id', requestId);
            return response;
        }
        if (!profile?.team_id) {
            return respond(apiError('AUTH_COACH_TEAM_REQUIRED'), { status: 403 });
        }

        const { data: body, error: validationError } = validateBody(updatePlanSchema, await request.json());
        if (validationError || !body) {
            return respond(apiError('VALIDATION_INVALID_REQUEST_BODY'), { status: 400 });
        }

        // Ownership check.
        const { data: existing } = await supabase
            .from('training_plans')
            .select('id, team_id')
            .eq('id', id)
            .maybeSingle();
        if (!existing || existing.team_id !== profile.team_id) {
            return respond(apiError('PLAN_NOT_FOUND'), { status: 404 });
        }

        const patch: Record<string, unknown> = {};
        if (body.name !== undefined) patch.name = body.name;
        if (body.description !== undefined) patch.description = body.description;
        if (body.type !== undefined) patch.type = body.type;
        if (body.durationWeeks !== undefined) patch.duration_weeks = body.durationWeeks;
        if (body.focus !== undefined) patch.focus = body.focus;

        if (Object.keys(patch).length > 0) {
            const { error: updateError } = await supabase.from('training_plans').update(patch).eq('id', id);
            if (updateError) {
                logger.error('plans.update_failed', { error: updateError.message });
                return respond(apiError('FAILED_TO_UPDATE_PLAN'), { status: 500 });
            }
        }

        // When items are provided, fully replace them (delete-then-insert).
        if (body.items !== undefined) {
            const trainingsOk = await verifyTrainingsInTeam(
                supabase,
                profile.team_id,
                body.items.map((i) => i.trainingId),
            );
            if (!trainingsOk) {
                return respond(apiError('TRAINING_NOT_FOUND'), { status: 404 });
            }

            const { error: deleteError } = await supabase
                .from('training_plan_items')
                .delete()
                .eq('plan_id', id);
            if (deleteError) {
                logger.error('plans.update_clear_items_failed', { error: deleteError.message });
                return respond(apiError('FAILED_TO_UPDATE_PLAN'), { status: 500 });
            }

            const { error: itemsError } = await insertPlanItems(supabase, id, body.items);
            if (itemsError) {
                logger.error('plans.update_items_failed', { error: itemsError.message });
                return respond(apiError('FAILED_TO_UPDATE_PLAN'), { status: 500 });
            }
        }

        const plan = await loadPlanWithItems(supabase, id, profile.team_id);
        return respond(plan);
    } catch (error) {
        reportApiError(error, { route: '/api/v2/plans/[id]', method: 'PATCH', requestId, logger });
        return respond(apiError('INTERNAL_SERVER_ERROR'), { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { requestId, logger } = createRequestLogger('/api/v2/plans/[id]', request);
    const respond = (body: unknown, init?: ResponseInit) =>
        NextResponse.json(body, withRequestId(init, requestId));

    try {
        const { id } = await params;
        const { supabase, profile, response } = await requireRole('COACH');
        if (response) {
            response.headers.set('x-request-id', requestId);
            return response;
        }
        if (!profile?.team_id) {
            return respond(apiError('AUTH_COACH_TEAM_REQUIRED'), { status: 403 });
        }

        const { data: existing } = await supabase
            .from('training_plans')
            .select('id, team_id')
            .eq('id', id)
            .maybeSingle();
        if (!existing || existing.team_id !== profile.team_id) {
            return respond(apiError('PLAN_NOT_FOUND'), { status: 404 });
        }

        // Soft archive so historical assignments keep their meaning.
        const { error } = await supabase
            .from('training_plans')
            .update({ is_archived: true })
            .eq('id', id);
        if (error) {
            logger.error('plans.archive_failed', { error: error.message });
            return respond(apiError('FAILED_TO_DELETE_PLAN'), { status: 500 });
        }

        return respond({ message: 'Plan archived' });
    } catch (error) {
        reportApiError(error, { route: '/api/v2/plans/[id]', method: 'DELETE', requestId, logger });
        return respond(apiError('INTERNAL_SERVER_ERROR'), { status: 500 });
    }
}
