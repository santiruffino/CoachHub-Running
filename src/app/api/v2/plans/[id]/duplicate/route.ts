import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';
import { createRequestLogger, withRequestId } from '@/lib/logger';
import { apiError } from '@/lib/api/error-response';
import { reportApiError } from '@/lib/api/report-error';
import { loadPlanWithItems, insertPlanItems, type PlanItemInput } from '@/lib/trainings/plans';

interface PlanItemRow {
    training_id: string;
    week_index: number;
    day_of_week: number;
    workout_name: string | null;
    expected_rpe: number | null;
    sort_order: number;
    blocks: unknown[] | null;
}

/**
 * Duplicate Plan
 *
 * Clones a plan and all its items into a new plan named "<name> (copia)".
 *
 * Access: COACH only
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { requestId, logger } = createRequestLogger('/api/v2/plans/[id]/duplicate', request);
    const respond = (body: unknown, init?: ResponseInit) =>
        NextResponse.json(body, withRequestId(init, requestId));

    try {
        const { id } = await params;
        const { supabase, user, profile, response } = await requireRole('COACH');
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

        const { data: copy, error: createError } = await supabase
            .from('training_plans')
            .insert({
                name: `${plan.name} (copia)`,
                description: plan.description ?? null,
                type: plan.type ?? 'RUNNING',
                duration_weeks: plan.duration_weeks ?? 1,
                focus: plan.focus ?? null,
                coach_id: user!.id,
                created_by: user!.id,
                team_id: profile.team_id,
            })
            .select()
            .single();

        if (createError || !copy) {
            logger.error('plans.duplicate_failed', { error: createError?.message });
            return respond(apiError('FAILED_TO_CREATE_PLAN'), { status: 500 });
        }

        const items = (plan.items as PlanItemRow[]) || [];
        if (items.length > 0) {
            const cloned: PlanItemInput[] = items.map((i) => ({
                trainingId: i.training_id,
                weekIndex: i.week_index,
                dayOfWeek: i.day_of_week,
                workoutName: i.workout_name,
                expectedRpe: i.expected_rpe,
                sortOrder: i.sort_order,
                blocks: i.blocks,
            }));
            const { error: itemsError } = await insertPlanItems(supabase, copy.id, cloned);
            if (itemsError) {
                await supabase.from('training_plans').delete().eq('id', copy.id);
                logger.error('plans.duplicate_items_failed', { error: itemsError.message });
                return respond(apiError('FAILED_TO_CREATE_PLAN'), { status: 500 });
            }
        }

        return respond(copy, { status: 201 });
    } catch (error) {
        reportApiError(error, { route: '/api/v2/plans/[id]/duplicate', method: 'POST', requestId, logger });
        return respond(apiError('INTERNAL_SERVER_ERROR'), { status: 500 });
    }
}
