/**
 * Pushes an Endurix training assignment to the athlete's Garmin calendar:
 * translate the workout snapshot → upload to Garmin → schedule it on the day →
 * record the outcome in garmin_workout_links.
 *
 * Runs with the service-role client (writes garmin_workout_links, reads/updates
 * encrypted tokens) and MUST only be invoked after an authorization check.
 * Best-effort: a failure is recorded on the link row for retry and never throws
 * back into the assignment flow.
 */

import * as Sentry from '@sentry/nextjs';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/logger';

const logger = createLogger({ feature: 'garmin.push' });
import { translateWorkout } from './workout-translator';
import {
    GarminAuthError,
    currentTokens,
    looksLikeMfa,
    restoreSession,
    scheduleWorkout,
    uploadWorkout,
    type GarminStoredTokens,
} from './client';
import { decryptJson, encryptJson } from './crypto';
import type { GarminAthleteProfile } from './zone-resolver';
import type { WorkoutBlock } from '@/features/trainings/components/builder/types';

type ServiceClient = ReturnType<typeof createServiceRoleClient>;

export interface PushResult {
    assignmentId: string;
    status: 'synced' | 'failed' | 'skipped';
    error?: string;
    garminWorkoutId?: string;
}

interface WorkoutSnapshot {
    title: string;
    description: string | null;
    type: string;
    blocks: WorkoutBlock[];
}

/**
 * Whether the server has the config the Garmin integration requires (the token
 * encryption key). This is an infrastructure guard, NOT a feature flag — the
 * single feature flag is per-athlete: profiles.garmin_pilot_enabled.
 */
export function isGarminConfigured(): boolean {
    return Boolean(process.env.GARMIN_TOKEN_ENC_KEY);
}

/**
 * Of the given athlete ids, which are in the pilot AND have an active Garmin
 * connection. Used to decide who to push to on assignment.
 */
export async function getGarminEligibleUserIds(
    service: ServiceClient,
    userIds: string[],
): Promise<Set<string>> {
    if (!isGarminConfigured() || userIds.length === 0) return new Set();

    const [{ data: pilots }, { data: connections }] = await Promise.all([
        service.from('profiles').select('id').in('id', userIds).eq('garmin_pilot_enabled', true),
        service.from('garmin_connections').select('user_id').in('user_id', userIds).eq('status', 'active'),
    ]);

    const pilotSet = new Set((pilots ?? []).map((p) => p.id as string));
    const eligible = new Set<string>();
    for (const conn of connections ?? []) {
        const id = conn.user_id as string;
        if (pilotSet.has(id)) eligible.add(id);
    }
    return eligible;
}

async function recordLink(
    service: ServiceClient,
    row: {
        assignment_id: string;
        user_id: string;
        garmin_workout_id?: string | null;
        garmin_schedule_id?: string | null;
        sync_status: 'synced' | 'failed';
        last_error?: string | null;
    },
): Promise<void> {
    await service
        .from('garmin_workout_links')
        .upsert(
            {
                ...row,
                synced_at: row.sync_status === 'synced' ? new Date().toISOString() : null,
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'assignment_id' },
        );
}

/**
 * Push a single assignment to Garmin. Loads the assignment, the athlete's
 * (active) Garmin connection and profile, translates and uploads the workout,
 * schedules it, persists any refreshed tokens, and records the result.
 */
export async function pushAssignmentToGarmin(
    assignmentId: string,
    service: ServiceClient = createServiceRoleClient(),
): Promise<PushResult> {
    if (!isGarminConfigured()) {
        return { assignmentId, status: 'skipped', error: 'garmin_not_configured' };
    }

    const { data: assignment } = await service
        .from('training_assignments')
        .select('id, user_id, scheduled_date, workout_name, workout_snapshot')
        .eq('id', assignmentId)
        .maybeSingle();

    if (!assignment) {
        return { assignmentId, status: 'skipped', error: 'assignment_not_found' };
    }

    const { data: connection } = await service
        .from('garmin_connections')
        .select('user_id, oauth1_token, oauth2_token, status')
        .eq('user_id', assignment.user_id)
        .eq('status', 'active')
        .maybeSingle();

    if (!connection) {
        return { assignmentId, status: 'skipped', error: 'no_active_connection' };
    }

    const snapshot = assignment.workout_snapshot as WorkoutSnapshot | null;
    if (!snapshot?.blocks?.length) {
        return { assignmentId, status: 'skipped', error: 'empty_workout' };
    }

    const { data: ap } = await service
        .from('athlete_profiles')
        .select('lthr, rest_hr, max_hr, vam, ftp')
        .eq('user_id', assignment.user_id)
        .maybeSingle();

    const profile: GarminAthleteProfile = {
        lthr: ap?.lthr ?? null,
        restHR: ap?.rest_hr ?? null,
        maxHR: ap?.max_hr ?? null,
        vam: ap?.vam ?? null,
        ftp: ap?.ftp ?? null,
    };

    const workout = translateWorkout({
        name: assignment.workout_name || snapshot.title,
        description: snapshot.description,
        type: snapshot.type,
        blocks: snapshot.blocks,
        profile,
    });

    try {
        const tokens: GarminStoredTokens = {
            oauth1: decryptJson(connection.oauth1_token as string),
            oauth2: decryptJson(connection.oauth2_token as string),
        };
        const gc = restoreSession(tokens);

        const garminWorkoutId = await uploadWorkout(gc, workout);
        const scheduleId = await scheduleWorkout(
            gc,
            garminWorkoutId,
            String(assignment.scheduled_date).slice(0, 10),
        );

        // Persist any refreshed OAuth2 token so the next push doesn't re-refresh.
        try {
            const fresh = currentTokens(gc);
            await service
                .from('garmin_connections')
                .update({
                    oauth2_token: encryptJson(fresh.oauth2),
                    token_expires_at: fresh.oauth2?.expires_at
                        ? new Date(fresh.oauth2.expires_at * 1000).toISOString()
                        : null,
                    last_synced_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('user_id', assignment.user_id);
        } catch (persistError) {
            logger.warn('garmin.push.token_persist_failed', { assignmentId, error: String(persistError) });
        }

        await recordLink(service, {
            assignment_id: assignmentId,
            user_id: assignment.user_id,
            garmin_workout_id: garminWorkoutId,
            garmin_schedule_id: scheduleId,
            sync_status: 'synced',
            last_error: null,
        });

        logger.info('garmin.push.synced', { assignmentId, userId: assignment.user_id, garminWorkoutId });
        return { assignmentId, status: 'synced', garminWorkoutId };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        // An auth failure means the stored session is dead — force a reconnect.
        if (error instanceof GarminAuthError || looksLikeMfa(error)) {
            await service
                .from('garmin_connections')
                .update({ status: 'needs_reauth', updated_at: new Date().toISOString() })
                .eq('user_id', assignment.user_id);
        }

        await recordLink(service, {
            assignment_id: assignmentId,
            user_id: assignment.user_id,
            sync_status: 'failed',
            last_error: message.slice(0, 500),
        });

        logger.error('garmin.push.failed', { assignmentId, userId: assignment.user_id, error: message });
        Sentry.captureException(error, { tags: { feature: 'garmin.push' } });
        return { assignmentId, status: 'failed', error: message };
    }
}

/**
 * Push a batch of freshly-created assignments, filtering to pilot athletes with
 * an active connection. Never throws — returns a per-assignment summary.
 */
export async function pushAssignmentsForAthletes(
    assignments: Array<{ id: string; user_id: string }>,
): Promise<PushResult[]> {
    if (!isGarminConfigured() || assignments.length === 0) return [];

    const service = createServiceRoleClient();
    const eligible = await getGarminEligibleUserIds(
        service,
        assignments.map((a) => a.user_id),
    );

    const targets = assignments.filter((a) => eligible.has(a.user_id));
    if (targets.length === 0) return [];

    const settled = await Promise.allSettled(
        targets.map((a) => pushAssignmentToGarmin(a.id, service)),
    );

    return settled.map((result, i) =>
        result.status === 'fulfilled'
            ? result.value
            : { assignmentId: targets[i].id, status: 'failed' as const, error: String(result.reason) },
    );
}
