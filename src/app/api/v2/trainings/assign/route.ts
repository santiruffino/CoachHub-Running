import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';
import * as Sentry from '@sentry/nextjs';
import { createRequestLogger, withRequestId } from '@/lib/logger';
import { apiError } from '@/lib/api/error-response';
import { appendAdminActionLog } from '@/lib/audit/admin-action-log';
import { assignTrainingSchema, validateBody } from '@/lib/validation/schemas';
import { resolveAthleteTargets } from '@/lib/trainings/expand-targets';
import { createAssignments, type ResolvedAssignment } from '@/lib/trainings/assign';

/**
 * Assign Training
 *
 * Assigns a single training to one or more athletes and/or groups on a date.
 *
 * Request Body:
 * {
 *   trainingId: string,
 *   scheduledDate: string (ISO date),
 *   athleteIds?: string[],
 *   groupIds?: string[],
 *   expectedRpe?: number (1-10),
 *   workoutName?: string
 * }
 *
 * Access: COACH only (ADMIN allowed via requireRole super-role)
 */
export async function POST(request: NextRequest) {
    const { requestId, logger } = createRequestLogger('/api/v2/trainings/assign', request);
    const respond = (body: unknown, init?: ResponseInit) =>
        NextResponse.json(body, withRequestId(init, requestId));

    try {
        const authResult = await requireRole('COACH');

        if (authResult.response) {
            authResult.response.headers.set('x-request-id', requestId);
            return authResult.response;
        }

        const { supabase, user, profile } = authResult;
        const rawBody = await request.json();
        const { data: body, error: validationError } = validateBody(assignTrainingSchema, rawBody);

        if (validationError || !body) {
            logger.warn('assign_training.validation_failed', { userId: user!.id, issues: validationError?.issues });
            return respond(apiError('VALIDATION_INVALID_REQUEST_BODY'), { status: 400 });
        }

        const { trainingId, scheduledDate, athleteIds, groupIds, expectedRpe, workoutName } = body;

        if (!profile?.team_id) {
            logger.warn('assign_training.missing_team', { userId: user!.id });
            return respond(apiError('AUTH_FORBIDDEN'), { status: 403 });
        }
        const teamId = profile.team_id;

        // Verify training exists and belongs to the coach's team.
        const { data: training, error: trainingError } = await supabase
            .from('trainings')
            .select('*')
            .eq('id', trainingId)
            .single();

        if (trainingError || !training) {
            logger.warn('assign_training.training_not_found', { userId: user!.id, trainingId, error: trainingError });
            return respond(apiError('TRAINING_NOT_FOUND'), { status: 404 });
        }

        if (training.team_id !== teamId) {
            logger.warn('assign_training.forbidden_training', { userId: user!.id, trainingId });
            return respond(apiError('AUTH_FORBIDDEN'), { status: 403 });
        }

        const { targets, error: targetError } = await resolveAthleteTargets(supabase, {
            teamId,
            athleteIds,
            groupIds,
        });

        if (targetError) {
            logger.warn('assign_training.group_not_found_or_forbidden', { userId: user!.id, groupIds });
            return respond(apiError('GROUP_NOT_FOUND'), { status: 404 });
        }

        if (targets.size === 0) {
            return respond(apiError('VALIDATION_NO_ATHLETES_FOUND_TO_ASSIGN_TRAINING_TO'), { status: 400 });
        }

        const entries: ResolvedAssignment[] = Array.from(targets.entries()).map(([userId, sourceGroupId]) => ({
            userId,
            training,
            scheduledDate,
            sourceGroupId,
            workoutName: workoutName || null,
            expectedRpe: expectedRpe ?? null,
        }));

        let result;
        try {
            result = await createAssignments(supabase, { teamId, entries, notify: 'per-workout' });
        } catch (insertError) {
            logger.error('assign_training.insert_failed', {
                userId: user!.id,
                trainingId,
                assignmentCount: entries.length,
                error: insertError,
            });
            return respond(apiError('FAILED_TO_ASSIGN_TRAINING'), { status: 500 });
        }

        logger.info('assign_training.completed', {
            userId: user!.id,
            trainingId,
            assignments: result.assignments.length,
            athleteCount: targets.size,
        });

        if (profile.role === 'ADMIN') {
            await appendAdminActionLog({
                actorId: user!.id,
                actorRole: 'ADMIN',
                teamId,
                action: 'training.assigned',
                targetType: 'training',
                targetId: trainingId,
                metadata: { assignmentCount: result.assignments.length },
            });
        }

        return respond(
            {
                message: `Training assigned to ${result.assignments.length} athlete(s)`,
                assignments: result.assignments,
            },
            { status: 201 },
        );
    } catch (error: unknown) {
        logger.error('assign_training.unhandled_error', { error });
        Sentry.captureException(error, { tags: { route: '/api/v2/trainings/assign', requestId } });
        return respond(apiError('INTERNAL_SERVER_ERROR'), { status: 500 });
    }
}
