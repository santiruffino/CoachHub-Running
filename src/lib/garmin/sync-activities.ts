/**
 * Pulls recent activities from Garmin Connect into the shared `activities` table
 * (provider = 'garmin', external_id = 'garmin:<id>').
 *
 * Dedup rule: Garmin is the primary source. If a Strava-sourced activity already
 * exists for the same athlete at (roughly) the same start time and distance, the
 * Strava copy is removed and Garmin's version is kept.
 */

import * as Sentry from '@sentry/nextjs';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/logger';
import { estimateLoadFromActivity } from '@/lib/training/load';
import { notifyActivitySync } from '@/lib/notifications/activity-sync';
import {
    GarminAuthError,
    currentTokens,
    fetchActivities,
    looksLikeMfa,
    restoreSession,
    type GarminStoredTokens,
} from './client';
import { decryptJson, encryptJson } from './crypto';

const logger = createLogger({ feature: 'garmin.sync' });

type ServiceClient = ReturnType<typeof createServiceRoleClient>;

// Dedup tolerances against Strava.
const TIME_WINDOW_MS = 5 * 60 * 1000; // ±5 min
const DISTANCE_TOLERANCE = 0.05; // ±5%

export interface GarminSyncResult {
    userId: string;
    fetched: number;
    inserted: number;
    replacedDuplicates: number;
    status: 'ok' | 'needs_reauth' | 'error';
    error?: string;
}

/** Convert Garmin's "YYYY-MM-DD HH:MM:SS" (GMT) into an ISO string. */
function toIso(gmt: string | undefined): string | null {
    if (!gmt) return null;
    const normalized = gmt.includes('T') ? gmt : gmt.replace(' ', 'T');
    const withZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(normalized) ? normalized : `${normalized}Z`;
    const d = new Date(withZone);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

interface StravaRow {
    id: string;
    start: number;
    distance: number;
}

function isDuplicateMatch(startMs: number, distance: number, row: StravaRow): boolean {
    if (Math.abs(row.start - startMs) > TIME_WINDOW_MS) return false;
    if (distance <= 0 && row.distance <= 0) return true;
    const denom = Math.max(distance, row.distance, 1);
    return Math.abs(distance - row.distance) / denom <= DISTANCE_TOLERANCE;
}

function getMatchingStravaRowIds(startMs: number, distance: number, stravaRows: StravaRow[]): string[] {
    return stravaRows.filter((row) => isDuplicateMatch(startMs, distance, row)).map((row) => row.id);
}

/**
 * Sync one athlete's recent Garmin activities. Returns a summary and never
 * throws; auth failures flip the connection to `needs_reauth`.
 */
export async function syncGarminActivitiesForUser(
    service: ServiceClient,
    userId: string,
    connection: { oauth1_token: string; oauth2_token: string },
    options: { limit?: number } = {},
): Promise<GarminSyncResult> {
    const limit = options.limit ?? 20;

    let activities;
    let gc;
    try {
        const tokens: GarminStoredTokens = {
            oauth1: decryptJson(connection.oauth1_token),
            oauth2: decryptJson(connection.oauth2_token),
        };
        gc = restoreSession(tokens);
        activities = await fetchActivities(gc, 0, limit);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (error instanceof GarminAuthError || looksLikeMfa(error)) {
            await service
                .from('garmin_connections')
                .update({ status: 'needs_reauth', updated_at: new Date().toISOString() })
                .eq('user_id', userId);
            logger.warn('garmin.sync.needs_reauth', { userId });
            return { userId, fetched: 0, inserted: 0, replacedDuplicates: 0, status: 'needs_reauth', error: message };
        }
        logger.error('garmin.sync.fetch_failed', { userId, error: message });
        Sentry.captureException(error, { tags: { feature: 'garmin.sync' } });
        return { userId, fetched: 0, inserted: 0, replacedDuplicates: 0, status: 'error', error: message };
    }

    if (!activities.length) {
        await touchLastSynced(service, userId, gc);
        return { userId, fetched: 0, inserted: 0, replacedDuplicates: 0, status: 'ok' };
    }

    // Load athlete profile once for load estimation.
    const { data: ap } = await service
        .from('athlete_profiles')
        .select('lthr, rest_hr, max_hr')
        .eq('user_id', userId)
        .maybeSingle();
    const loadProfile = { lthr: ap?.lthr ?? null, restHR: ap?.rest_hr ?? null, maxHR: ap?.max_hr ?? null };

    // Pull Strava activities in the fetched window for dedup.
    const times = activities.map((a) => toIso(a.startTimeGMT)).filter(Boolean) as string[];
    const minDate = times.length ? new Date(Math.min(...times.map((t) => Date.parse(t))) - TIME_WINDOW_MS).toISOString() : null;
    const maxDate = times.length ? new Date(Math.max(...times.map((t) => Date.parse(t))) + TIME_WINDOW_MS).toISOString() : null;

    let stravaRows: StravaRow[] = [];
    if (minDate && maxDate) {
        const { data: existing } = await service
            .from('activities')
            .select('id, start_date, distance')
            .eq('user_id', userId)
            .eq('provider', 'strava')
            .gte('start_date', minDate)
            .lte('start_date', maxDate);
        stravaRows = (existing ?? []).map((r) => ({
            id: String(r.id),
            start: Date.parse(r.start_date as string),
            distance: Number(r.distance) || 0,
        }));
    }

    let replacedDuplicates = 0;
    // Per-Garmin-activity list of Strava ids it replaces, keyed by external_id
    // (not a flat set) so each Garmin row can be matched back to its own
    // replacement targets once we know the Garmin rows' real ids.
    const stravaMatchesByExternalId = new Map<string, string[]>();
    const rows = [];
    for (const activity of activities) {
        const startIso = toIso(activity.startTimeGMT) || toIso(activity.startTimeLocal);
        if (!startIso) continue;
        const startMs = Date.parse(startIso);
        const distance = activity.distance || 0;
        const externalId = `garmin:${activity.activityId}`;

        const matchingStravaIds = getMatchingStravaRowIds(startMs, distance, stravaRows);
        if (matchingStravaIds.length > 0) {
            stravaMatchesByExternalId.set(externalId, matchingStravaIds);
            replacedDuplicates += matchingStravaIds.length;
        }

        const duration = activity.duration || activity.elapsedDuration || 0;
        rows.push({
            user_id: userId,
            provider: 'garmin',
            external_id: externalId,
            title: activity.activityName,
            type: activity.activityType?.typeKey ?? 'other',
            distance,
            duration,
            start_date: startIso,
            elapsed_time: Math.round(activity.elapsedDuration || duration),
            elevation_gain: activity.elevationGain || 0,
            average_speed: activity.averageSpeed || 0,
            max_speed: activity.maxSpeed || 0,
            avg_hr: activity.averageHR ?? null,
            max_hr: activity.maxHR ?? null,
            suffer_score: null,
            load_score: estimateLoadFromActivity(
                { start_date: startIso, duration, avg_hr: activity.averageHR, max_hr: activity.maxHR },
                loadProfile,
            ),
            is_private: false,
            metadata: activity,
            updated_at: new Date().toISOString(),
        });
    }

    const externalIds = rows.map((row) => row.external_id);
    const { data: existingRows } = externalIds.length
        ? await service
            .from('activities')
            .select('external_id')
            .eq('user_id', userId)
            .in('external_id', externalIds)
        : { data: [] as Array<{ external_id: string }> };
    const existingExternalIds = new Set((existingRows || []).map((row) => row.external_id));
    const insertedExternalIds = externalIds.filter((externalId) => !existingExternalIds.has(externalId));

    let inserted = 0;
    let upsertedRows: { id: string; external_id: string }[] = [];
    if (rows.length) {
        const { data, error } = await service
            .from('activities')
            .upsert(rows, { onConflict: 'user_id,external_id' })
            .select('id, external_id');
        if (error) {
            logger.error('garmin.sync.upsert_failed', { userId, error });
            return { userId, fetched: activities.length, inserted: 0, replacedDuplicates, status: 'error', error: error.message };
        }
        inserted = insertedExternalIds.length;
        upsertedRows = (data ?? []) as { id: string; external_id: string }[];
    }

    // Before deleting the superseded Strava rows, repoint any training_assignments
    // that reference them at the new Garmin activity, so a previously matched/completed
    // assignment doesn't get its strava_activity_id nulled out (ON DELETE SET NULL) or
    // silently flip back to unlinked once the old Strava row is gone.
    const stravaIdsToDelete = new Set<string>();
    if (stravaMatchesByExternalId.size > 0 && upsertedRows.length > 0) {
        const garminIdByExternalId = new Map(upsertedRows.map((r) => [r.external_id, r.id]));

        for (const [externalId, matchingStravaIds] of stravaMatchesByExternalId) {
            matchingStravaIds.forEach((id) => stravaIdsToDelete.add(id));

            const garminId = garminIdByExternalId.get(externalId);
            if (!garminId) continue;

            const { error: relinkError } = await service
                .from('training_assignments')
                .update({ strava_activity_id: garminId, updated_at: new Date().toISOString() })
                .in('strava_activity_id', matchingStravaIds);

            if (relinkError) {
                logger.error('garmin.sync.relink_assignments_failed', { userId, error: relinkError.message, externalId });
                return {
                    userId,
                    fetched: activities.length,
                    inserted,
                    replacedDuplicates,
                    status: 'error',
                    error: relinkError.message,
                };
            }
        }
    }

    if (stravaIdsToDelete.size > 0) {
        const { error: deleteError } = await service
            .from('activities')
            .delete()
            .in('id', Array.from(stravaIdsToDelete));

        if (deleteError) {
            logger.error('garmin.sync.delete_conflicts_failed', { userId, error: deleteError.message });
            return {
                userId,
                fetched: activities.length,
                inserted,
                replacedDuplicates,
                status: 'error',
                error: deleteError.message,
            };
        }
    }

    const activityIdByExternalId = new Map(upsertedRows.map((row) => [row.external_id, row.id]));
    const firstInsertedActivityId = insertedExternalIds.length > 0
        ? (activityIdByExternalId.get(insertedExternalIds[0]) || null)
        : null;

    await notifyActivitySync(userId, inserted, firstInsertedActivityId);

    await touchLastSynced(service, userId, gc);
    logger.info('garmin.sync.done', { userId, fetched: activities.length, inserted, replacedDuplicates });
    return { userId, fetched: activities.length, inserted, replacedDuplicates, status: 'ok' };
}

async function touchLastSynced(service: ServiceClient, userId: string, gc: ReturnType<typeof restoreSession>): Promise<void> {
    try {
        const fresh = currentTokens(gc);
        await service
            .from('garmin_connections')
            .update({
                oauth2_token: encryptJson(fresh.oauth2),
                token_expires_at: fresh.oauth2?.expires_at ? new Date(fresh.oauth2.expires_at * 1000).toISOString() : null,
                last_synced_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);
    } catch (error) {
        logger.warn('garmin.sync.token_persist_failed', { userId, error: String(error) });
    }
}
