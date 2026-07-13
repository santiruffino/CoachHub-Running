import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';
import { createRequestLogger, withRequestId } from '@/lib/logger';
import { apiError } from '@/lib/api/error-response';
import { reportApiError } from '@/lib/api/report-error';
import { copyWeekSchema, validateBody } from '@/lib/validation/schemas';
import { resolveAthleteTargets } from '@/lib/trainings/expand-targets';
import { createAssignments, type ResolvedAssignment, type TrainingSnapshotSource } from '@/lib/trainings/assign';
import { mondayOf, shiftDateByDays, dayDiff } from '@/lib/trainings/plan-dates';

interface SourceAssignmentRow {
    scheduled_date: string;
    workout_name: string | null;
    expected_rpe: number | null;
    training: TrainingSnapshotSource | null;
}

/**
 * Copy Week
 *
 * Copies every assignment in a source athlete's week onto one or more target
 * athletes/groups at a target week, preserving each session's day-of-week offset.
 * Reuses the shared assignment pipeline (snapshot + Garmin push + notifications).
 *
 * Access: COACH only
 */
export async function POST(request: NextRequest) {
    const { requestId, logger } = createRequestLogger('/api/v2/trainings/calendar/copy-week', request);
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
        const teamId = profile.team_id;

        const { data: body, error: validationError } = validateBody(copyWeekSchema, await request.json());
        if (validationError || !body) {
            return respond(apiError('VALIDATION_INVALID_REQUEST_BODY'), { status: 400 });
        }

        // The source athlete must belong to the coach's team.
        const { data: sourceProfile } = await supabase
            .from('profiles')
            .select('id, team_id')
            .eq('id', body.sourceUserId)
            .maybeSingle();
        if (!sourceProfile || sourceProfile.team_id !== teamId) {
            return respond(apiError('AUTH_FORBIDDEN'), { status: 403 });
        }

        const sourceMonday = mondayOf(body.sourceWeekStart).toISOString();
        const sourceWeekEnd = shiftDateByDays(sourceMonday, 7);
        const targetMonday = mondayOf(body.targetWeekStart).toISOString();
        const shiftDays = dayDiff(sourceMonday, targetMonday);

        // Read the source week's assignments, joined to their live training template.
        const { data: sourceAssignments, error: readError } = await supabase
            .from('training_assignments')
            .select('scheduled_date, workout_name, expected_rpe, training:trainings(id, title, description, type, blocks, team_id)')
            .eq('user_id', body.sourceUserId)
            .gte('scheduled_date', sourceMonday)
            .lt('scheduled_date', sourceWeekEnd);

        if (readError) {
            logger.error('copy_week.read_failed', { error: readError.message });
            return respond(apiError('INTERNAL_SERVER_ERROR'), { status: 500 });
        }

        const rows = (sourceAssignments || []) as unknown as SourceAssignmentRow[];
        const withTraining = rows.filter((r) => r.training);
        if (withTraining.length === 0) {
            return respond(apiError('SOURCE_WEEK_EMPTY'), { status: 400 });
        }

        const { targets, error: targetError } = await resolveAthleteTargets(supabase, {
            teamId,
            athleteIds: body.targetAthleteIds,
            groupIds: body.targetGroupIds,
        });
        if (targetError) {
            return respond(apiError('GROUP_NOT_FOUND'), { status: 404 });
        }
        if (targets.size === 0) {
            return respond(apiError('VALIDATION_NO_ATHLETES_FOUND_TO_ASSIGN_TRAINING_TO'), { status: 400 });
        }

        const entries: ResolvedAssignment[] = [];
        for (const [userId, sourceGroupId] of targets.entries()) {
            for (const row of withTraining) {
                entries.push({
                    userId,
                    training: row.training!,
                    scheduledDate: shiftDateByDays(row.scheduled_date, shiftDays),
                    sourceGroupId,
                    workoutName: row.workout_name,
                    expectedRpe: row.expected_rpe,
                });
            }
        }

        let result;
        try {
            result = await createAssignments(supabase, { teamId, entries, notify: 'none' });
        } catch (insertError) {
            logger.error('copy_week.insert_failed', { error: insertError });
            return respond(apiError('FAILED_TO_ASSIGN_TRAINING'), { status: 500 });
        }

        logger.info('copy_week.completed', {
            sourceUserId: body.sourceUserId,
            athletes: result.affectedAthleteIds.length,
            assignments: result.assignments.length,
        });

        return respond(
            {
                message: `Week copied: ${result.assignments.length} assignment(s) across ${result.affectedAthleteIds.length} athlete(s)`,
                assignmentCount: result.assignments.length,
                athleteCount: result.affectedAthleteIds.length,
            },
            { status: 201 },
        );
    } catch (error) {
        reportApiError(error, { route: '/api/v2/trainings/calendar/copy-week', method: 'POST', requestId, logger });
        return respond(apiError('INTERNAL_SERVER_ERROR'), { status: 500 });
    }
}
