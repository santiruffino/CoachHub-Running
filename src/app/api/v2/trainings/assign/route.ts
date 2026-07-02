import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';
import * as Sentry from '@sentry/nextjs';
import { createRequestLogger, withRequestId } from '@/lib/logger';
import { apiError } from '@/lib/api/error-response';
import { appendAdminActionLog } from '@/lib/audit/admin-action-log';
import { assignTrainingSchema, validateBody } from '@/lib/validation/schemas';
import { createNotification } from '@/lib/notifications/create-notification';
import { pushAssignmentsForAthletes } from '@/lib/garmin/push-workout';

interface AssignmentToCreate {
    user_id: string;
    training_id: string;
    scheduled_date: string;
    completed: boolean;
    expected_rpe: number | null;
    workout_name: string | null;
    source_group_id: string | null;
    workout_snapshot: {
        title: string;
        description: string | null;
        type: string;
        blocks: unknown;
        version: number;
        timestamp: string;
    };
}

/**
 * Assign Training
 * 
 * Assigns a training to one or more athletes and/or groups on specific dates.
 * 
 * Request Body:
 * {
 *   trainingId: string,
 *   scheduledDate: string (ISO date),
 *   athleteIds?: string[],
 *   groupIds?: string[],
 *   expectedRpe?: number (1-10)
 * }
 * 
 * Access: COACH only
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

        const { supabase, user } = authResult;
        const rawBody = await request.json();
        const { data: body, error: validationError } = validateBody(assignTrainingSchema, rawBody);

        if (validationError || !body) {
            logger.warn('assign_training.validation_failed', { userId: user!.id, issues: validationError?.issues });
            return respond(apiError('VALIDATION_INVALID_REQUEST_BODY'),
                { status: 400 }
            );
        }

        const { trainingId, scheduledDate, athleteIds, groupIds, expectedRpe, workoutName } = body;

        const { data: profile } = await supabase
            .from('profiles')
            .select('team_id')
            .eq('id', user!.id)
            .single();

        if (!profile?.team_id) {
            logger.warn('assign_training.missing_team', { userId: user!.id });
            return respond(apiError('AUTH_FORBIDDEN'),
                { status: 403 }
            );
        }

        // Verify training exists and belongs to coach team
        const { data: training, error: trainingError } = await supabase
            .from('trainings')
            .select('*')
            .eq('id', trainingId)
            .single();

        if (trainingError || !training) {
            logger.warn('assign_training.training_not_found', { userId: user!.id, trainingId, error: trainingError });
            return respond(apiError('TRAINING_NOT_FOUND'),
                { status: 404 }
            );
        }

        if (training.team_id !== profile.team_id) {
            logger.warn('assign_training.forbidden_training', { userId: user!.id, trainingId });
            return respond(apiError('AUTH_FORBIDDEN'),
                { status: 403 }
            );
        }

        // Create a snapshot of the workout at this point in time
        const workoutSnapshot = {
            title: training.title,
            description: training.description,
            type: training.type,
            blocks: training.blocks,
            version: 1,
            timestamp: new Date().toISOString()
        };

        const assignmentsToCreate: AssignmentToCreate[] = [];

        // Collect athlete IDs from direct selection and map them to their source_group_id
        const athleteSourceMap = new Map<string, string | null>();

        // Direct selections are personalized (source_group_id = null)
        (athleteIds || []).forEach((id: string) => {
            athleteSourceMap.set(id, null);
        });

        // If groupIds provided, get all athletes in those groups
        if (groupIds && groupIds.length > 0) {
            // Verify all groups belong to coach team
            const groupsQuery = supabase
                .from('groups')
                .select('id')
                .in('id', groupIds)
                .eq('team_id', profile.team_id);

            const { data: groups } = await groupsQuery;

            if (!groups || groups.length !== groupIds.length) {
                logger.warn('assign_training.group_not_found_or_forbidden', {
                    userId: user!.id,
                    requestedGroups: groupIds.length,
                    resolvedGroups: groups?.length || 0,
                });
                return respond(apiError('GROUP_NOT_FOUND'),
                    { status: 404 }
                );
            }

            // Get all athletes in these groups
            const { data: memberships } = await supabase
                .from('athlete_groups')
                .select('athlete_id, group_id')
                .in('group_id', groupIds);

            if (memberships) {
                memberships.forEach(m => {
                    // Personalized assignments take precedence over group assignments
                    if (!athleteSourceMap.has(m.athlete_id)) {
                        athleteSourceMap.set(m.athlete_id, m.group_id);
                    }
                });
            }
        }

        // Create assignment for each unique athlete
        for (const [athleteId, sourceGroupId] of athleteSourceMap.entries()) {
            assignmentsToCreate.push({
                user_id: athleteId,
                training_id: trainingId,
                scheduled_date: scheduledDate,
                completed: false,
                expected_rpe: expectedRpe || null,
                workout_name: workoutName || null,
                source_group_id: sourceGroupId,
                workout_snapshot: workoutSnapshot, // Store the historical snapshot
            });
        }

        if (assignmentsToCreate.length === 0) {
            return respond(apiError('VALIDATION_NO_ATHLETES_FOUND_TO_ASSIGN_TRAINING_TO'),
                { status: 400 }
            );
        }

        // Insert all assignments
        const { data: assignments, error: insertError } = await supabase
            .from('training_assignments')
            .insert(assignmentsToCreate)
            .select();

        if (insertError) {
            logger.error('assign_training.insert_failed', {
                userId: user!.id,
                trainingId,
                assignmentCount: assignmentsToCreate.length,
                error: insertError,
            });
            return respond(apiError('FAILED_TO_ASSIGN_TRAINING'),
                { status: 500 }
            );
        }

        const notifiedAthleteIds = Array.from(athleteSourceMap.keys());
        await Promise.all(
            notifiedAthleteIds.map((athleteId) =>
                createNotification({
                    userId: athleteId,
                    category: 'workout_assigned',
                    title: workoutName || training.title,
                    body: `Nuevo entrenamiento para el ${new Date(scheduledDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}`,
                    link: `/dashboard?calendarDate=${scheduledDate.slice(0, 10)}`,
                })
            )
        );

        // Auto-resolve missing-workout alerts once a coach assigns training.
        // This keeps the dashboard clean when the underlying issue is solved.
        const resolvedAthleteIds = Array.from(athleteSourceMap.keys());
        if (resolvedAthleteIds.length > 0) {
            const { error: resolveAlertsError } = await supabase
                .from('alerts')
                .delete()
                .eq('team_id', profile.team_id)
                .in('type', ['MISSING_WORKOUT', 'missing_workout'])
                .in('athlete_id', resolvedAthleteIds);

            if (resolveAlertsError) {
                logger.warn('assign_training.resolve_missing_alerts_failed', {
                    userId: user!.id,
                    error: resolveAlertsError,
                    resolvedAthletes: resolvedAthleteIds.length,
                });
            }
        }

        logger.info('assign_training.completed', {
            userId: user!.id,
            trainingId,
            assignments: assignments?.length || 0,
            athleteCount: athleteSourceMap.size,
        });

        // Best-effort: push the workout to Garmin for pilot athletes who have an
        // active connection. Never fail the assignment if a Garmin push fails —
        // failures are recorded on garmin_workout_links for later retry.
        try {
            const pushable = (assignments || [])
                .filter((a) => a?.id && a?.user_id)
                .map((a) => ({ id: a.id as string, user_id: a.user_id as string }));
            const pushResults = await pushAssignmentsForAthletes(pushable);
            if (pushResults.length > 0) {
                logger.info('assign_training.garmin_push', {
                    userId: user!.id,
                    trainingId,
                    attempted: pushResults.length,
                    synced: pushResults.filter((r) => r.status === 'synced').length,
                    failed: pushResults.filter((r) => r.status === 'failed').length,
                });
            }
        } catch (garminError) {
            logger.warn('assign_training.garmin_push_unhandled', { userId: user!.id, error: String(garminError) });
        }

        const { data: actorProfile } = await supabase
            .from('profiles')
            .select('role, team_id')
            .eq('id', user!.id)
            .single();

        if (actorProfile?.role === 'ADMIN') {
            await appendAdminActionLog({
                actorId: user!.id,
                actorRole: 'ADMIN',
                teamId: actorProfile.team_id,
                action: 'training.assigned',
                targetType: 'training',
                targetId: trainingId,
                metadata: {
                    assignmentCount: assignments?.length || 0,
                },
            });
        }

        return respond({
            message: `Training assigned to ${assignments?.length || 0} athlete(s)`,
            assignments: assignments || [],
        }, { status: 201 });
    } catch (error: unknown) {
        logger.error('assign_training.unhandled_error', { error });
        Sentry.captureException(error, {
            tags: { route: '/api/v2/trainings/assign', requestId },
        });
        return respond(apiError('INTERNAL_SERVER_ERROR'),
            { status: 500 }
        );
    }
}
