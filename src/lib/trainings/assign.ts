import type { SupabaseClient } from '@supabase/supabase-js';
import { createNotification } from '@/lib/notifications/create-notification';
import { pushAssignmentsForAthletes } from '@/lib/garmin/push-workout';
import { createLogger } from '@/lib/logger';

const logger = createLogger({ feature: 'trainings.assign' });

/** Minimal shape of a training template needed to snapshot an assignment. */
export interface TrainingSnapshotSource {
    id: string;
    title: string;
    description: string | null;
    type: string;
    blocks: unknown;
    team_id?: string | null;
}

/** One athlete×workout assignment to create. */
export interface ResolvedAssignment {
    userId: string;
    training: TrainingSnapshotSource;
    scheduledDate: string; // ISO datetime
    sourceGroupId?: string | null;
    workoutName?: string | null;
    expectedRpe?: number | null;
}

interface CreateAssignmentsOptions {
    /** Team the assignments belong to; every training must match it. */
    teamId: string;
    entries: ResolvedAssignment[];
    /**
     * Per-workout notification behaviour. `'per-workout'` sends one
     * `workout_assigned` notification per assignment (single-assign flow).
     * `'none'` skips them — the caller sends its own summary (plan apply,
     * copy-week). Defaults to `'per-workout'`.
     */
    notify?: 'per-workout' | 'none';
    /** For notification copy: how to format the scheduled date. */
    locale?: string;
}

export interface CreateAssignmentsResult {
    assignments: Array<Record<string, unknown>>;
    /** Athlete ids that received at least one assignment (deduped). */
    affectedAthleteIds: string[];
}

function buildSnapshot(training: TrainingSnapshotSource) {
    return {
        title: training.title,
        description: training.description,
        type: training.type,
        blocks: training.blocks,
        version: 1,
        timestamp: new Date().toISOString(),
    };
}

/**
 * Core assignment creation shared by the single-workout assign route, plan
 * apply, and calendar copy-week. Handles: workout snapshotting, bulk insert,
 * optional per-workout notifications, clearing resolved MISSING_WORKOUT alerts,
 * and best-effort Garmin push. Never throws on notification/Garmin side effects.
 *
 * Trainings whose `team_id` doesn't match `teamId` are dropped defensively
 * (callers are expected to have verified team ownership already).
 */
export async function createAssignments(
    supabase: SupabaseClient,
    { teamId, entries, notify = 'per-workout', locale = 'es-ES' }: CreateAssignmentsOptions,
): Promise<CreateAssignmentsResult> {
    const valid = entries.filter(
        (e) => e.training.team_id === undefined || e.training.team_id === null || e.training.team_id === teamId,
    );

    if (valid.length === 0) {
        return { assignments: [], affectedAthleteIds: [] };
    }

    const rows = valid.map((e) => ({
        user_id: e.userId,
        training_id: e.training.id,
        scheduled_date: e.scheduledDate,
        completed: false,
        expected_rpe: e.expectedRpe ?? null,
        workout_name: e.workoutName ?? null,
        source_group_id: e.sourceGroupId ?? null,
        workout_snapshot: buildSnapshot(e.training),
    }));

    const { data: assignments, error: insertError } = await supabase
        .from('training_assignments')
        .insert(rows)
        .select();

    if (insertError) {
        logger.error('assign.insert_failed', { teamId, count: rows.length, error: insertError.message });
        throw insertError;
    }

    const created = assignments || [];
    const affectedAthleteIds = Array.from(new Set(valid.map((e) => e.userId)));

    // Per-workout notifications (single-assign flow only).
    if (notify === 'per-workout') {
        await Promise.all(
            created.map((assignment) => {
                const source = valid.find(
                    (e) =>
                        e.userId === assignment.user_id &&
                        e.training.id === assignment.training_id &&
                        e.scheduledDate === assignment.scheduled_date,
                );
                const title = (assignment.workout_name as string) || source?.training.title || 'Entrenamiento';
                return createNotification({
                    userId: assignment.user_id as string,
                    category: 'workout_assigned',
                    title,
                    body: `Nuevo entrenamiento para el ${new Date(assignment.scheduled_date as string).toLocaleDateString(locale, { day: '2-digit', month: 'short' })}`,
                    link: `/workouts/${assignment.id}`,
                });
            }),
        );
    }

    // Assigning work resolves any outstanding "missing workout" alerts.
    if (affectedAthleteIds.length > 0) {
        const { error: resolveAlertsError } = await supabase
            .from('alerts')
            .delete()
            .eq('team_id', teamId)
            .in('type', ['MISSING_WORKOUT', 'missing_workout'])
            .in('athlete_id', affectedAthleteIds);

        if (resolveAlertsError) {
            logger.warn('assign.resolve_missing_alerts_failed', { teamId, error: resolveAlertsError.message });
        }
    }

    // Best-effort Garmin push for pilot athletes with an active connection.
    try {
        const pushable = created
            .filter((a) => a?.id && a?.user_id)
            .map((a) => ({ id: a.id as string, user_id: a.user_id as string }));
        const pushResults = await pushAssignmentsForAthletes(pushable);
        if (pushResults.length > 0) {
            logger.info('assign.garmin_push', {
                teamId,
                attempted: pushResults.length,
                synced: pushResults.filter((r) => r.status === 'synced').length,
                failed: pushResults.filter((r) => r.status === 'failed').length,
            });
        }
    } catch (garminError) {
        logger.warn('assign.garmin_push_unhandled', { teamId, error: String(garminError) });
    }

    return { assignments: created, affectedAthleteIds };
}
