import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';
import { createRequestLogger, withRequestId } from '@/lib/logger';
import { apiError } from '@/lib/api/error-response';
import { reportApiError } from '@/lib/api/report-error';
import { appendAdminActionLog } from '@/lib/audit/admin-action-log';
import { applyPlanSchema, validateBody } from '@/lib/validation/schemas';
import { loadPlanWithItems } from '@/lib/trainings/plans';
import { resolveAthleteTargets } from '@/lib/trainings/expand-targets';
import { createAssignments, type ResolvedAssignment, type TrainingSnapshotSource } from '@/lib/trainings/assign';
import { planItemDate } from '@/lib/trainings/plan-dates';
import { createNotification } from '@/lib/notifications/create-notification';

interface PlanItemRow {
    week_index: number;
    day_of_week: number;
    workout_name: string | null;
    expected_rpe: number | null;
    blocks: unknown | null;
    training: TrainingSnapshotSource | null;
}

/**
 * Apply Plan
 *
 * Materializes a plan's items into training_assignments for the selected
 * athletes/groups, anchored to the Monday of `startDate`. Optionally limited to
 * specific weeks via `weekIndexes` (e.g. to assign a single week).
 *
 * Reuses the shared assignment pipeline (snapshot + Garmin push + alert
 * resolution) and sends one summary notification per athlete.
 *
 * Access: COACH only
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { requestId, logger } = createRequestLogger('/api/v2/plans/[id]/apply', request);
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
        const teamId = profile.team_id;

        const { data: body, error: validationError } = validateBody(applyPlanSchema, await request.json());
        if (validationError || !body) {
            return respond(apiError('VALIDATION_INVALID_REQUEST_BODY'), { status: 400 });
        }

        const plan = await loadPlanWithItems(supabase, id, teamId);
        if (!plan) {
            return respond(apiError('PLAN_NOT_FOUND'), { status: 404 });
        }

        const allItems = (plan.items as PlanItemRow[]) || [];
        const weekFilter = body.weekIndexes && body.weekIndexes.length > 0 ? new Set(body.weekIndexes) : null;
        const items = allItems.filter(
            (i) => i.training && (!weekFilter || weekFilter.has(i.week_index)),
        );

        if (items.length === 0) {
            return respond(apiError('PLAN_HAS_NO_ITEMS'), { status: 400 });
        }

        const { targets, error: targetError } = await resolveAthleteTargets(supabase, {
            teamId,
            athleteIds: body.athleteIds,
            groupIds: body.groupIds,
        });
        if (targetError) {
            return respond(apiError('GROUP_NOT_FOUND'), { status: 404 });
        }
        if (targets.size === 0) {
            return respond(apiError('VALIDATION_NO_ATHLETES_FOUND_TO_ASSIGN_TRAINING_TO'), { status: 400 });
        }

        const entries: ResolvedAssignment[] = [];
        for (const [userId, sourceGroupId] of targets.entries()) {
            for (const item of items) {
                // A per-slot `blocks` override wins over the template's structure.
                const training: TrainingSnapshotSource =
                    item.blocks != null ? { ...item.training!, blocks: item.blocks } : item.training!;
                entries.push({
                    userId,
                    training,
                    scheduledDate: planItemDate(body.startDate, item.week_index, item.day_of_week),
                    sourceGroupId,
                    workoutName: item.workout_name,
                    expectedRpe: item.expected_rpe,
                });
            }
        }

        let result;
        try {
            // Suppress per-workout notifications; we send one summary per athlete below.
            result = await createAssignments(supabase, { teamId, entries, notify: 'none' });
        } catch (insertError) {
            logger.error('plans.apply_insert_failed', { planId: id, error: insertError });
            return respond(apiError('FAILED_TO_ASSIGN_TRAINING'), { status: 500 });
        }

        const planName = (plan.name as string) || 'Plan';
        const sessionsPerAthlete = items.length;
        const firstAssignmentLinkByAthlete = new Map<string, string>();

        for (const assignment of result.assignments) {
            const athleteId = typeof assignment.user_id === 'string' ? assignment.user_id : null;
            const assignmentId = typeof assignment.id === 'string' ? assignment.id : null;

            if (!athleteId || !assignmentId || firstAssignmentLinkByAthlete.has(athleteId)) {
                continue;
            }

            firstAssignmentLinkByAthlete.set(athleteId, `/workouts/${assignmentId}`);
        }

        await Promise.all(
            result.affectedAthleteIds.map((athleteId) =>
                createNotification({
                    userId: athleteId,
                    category: 'workout_assigned',
                    title: `Plan "${planName}" asignado`,
                    body: `${sessionsPerAthlete} ${sessionsPerAthlete === 1 ? 'sesión programada' : 'sesiones programadas'}`,
                    link: firstAssignmentLinkByAthlete.get(athleteId) || '/dashboard',
                }),
            ),
        );

        logger.info('plans.apply_completed', {
            planId: id,
            athletes: result.affectedAthleteIds.length,
            assignments: result.assignments.length,
        });

        if (profile.role === 'ADMIN') {
            await appendAdminActionLog({
                actorId: user!.id,
                actorRole: 'ADMIN',
                teamId,
                action: 'plan.applied',
                targetType: 'training_plan',
                targetId: id,
                metadata: { assignmentCount: result.assignments.length, athletes: result.affectedAthleteIds.length },
            });
        }

        return respond(
            {
                message: `Plan applied: ${result.assignments.length} assignment(s) across ${result.affectedAthleteIds.length} athlete(s)`,
                assignmentCount: result.assignments.length,
                athleteCount: result.affectedAthleteIds.length,
            },
            { status: 201 },
        );
    } catch (error) {
        reportApiError(error, { route: '/api/v2/plans/[id]/apply', method: 'POST', requestId, logger });
        return respond(apiError('INTERNAL_SERVER_ERROR'), { status: 500 });
    }
}
