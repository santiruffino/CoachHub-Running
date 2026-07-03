/**
 * Thin, isolated wrapper around the (unofficial) `garmin-connect` npm client.
 *
 * Everything that touches Garmin's internal API lives behind this module so the
 * rest of Endurix depends only on our own types. The day Garmin reopens its
 * official Training API, only this file (and client.ts's callers' auth) needs to
 * change — the translator, DB and UI stay the same.
 *
 * IMPORTANT LIMITATIONS (garmin-connect@1.6.2):
 *  - No MFA/2FA support. `handleMFA` is a no-op; login throws if the account has
 *    two-factor enabled. Pilot athletes must disable 2FA on Garmin Connect.
 *  - Login is a browser-SSO emulation behind Cloudflare and may be blocked from
 *    datacenter IPs. Failures surface as GarminAuthError.
 *
 * Must run in the Node.js runtime (not Edge) — the client needs full Node.
 */

import { GarminConnect } from 'garmin-connect';
import type { IActivity, IOauth1Token, IOauth2Token } from 'garmin-connect/dist/garmin/types';
import type { IWorkoutDetail } from 'garmin-connect/dist/garmin/types';
import type { GarminWorkout } from './types';

export interface GarminStoredTokens {
    oauth1: IOauth1Token;
    oauth2: IOauth2Token;
}

export class GarminAuthError extends Error {
    constructor(message: string, readonly cause?: unknown) {
        super(message);
        this.name = 'GarminAuthError';
    }
}

/** Heuristic: does a login failure look like an MFA / 2FA block? */
export function looksLikeMfa(error: unknown): boolean {
    const msg = error instanceof Error ? error.message : String(error);
    return /mfa|ticket not found|two[- ]?factor/i.test(msg);
}

/**
 * Log in with the athlete's Garmin credentials. The password is used only for
 * this call and never persisted — callers store the returned tokens instead.
 */
export async function loginWithCredentials(
    username: string,
    password: string,
): Promise<{ tokens: GarminStoredTokens; garminUserId: string | null }> {
    const gc = new GarminConnect({ username, password });
    try {
        await gc.login();
    } catch (error) {
        if (looksLikeMfa(error)) {
            throw new GarminAuthError(
                'Garmin login failed — the account appears to have 2FA enabled, which is not supported.',
                error,
            );
        }
        throw new GarminAuthError('Garmin login failed — check the credentials.', error);
    }

    const tokens = gc.exportToken() as GarminStoredTokens;
    let garminUserId: string | null = null;
    try {
        const profile = await gc.getUserProfile();
        garminUserId = profile?.profileId != null ? String(profile.profileId) : null;
    } catch {
        // Non-fatal: the profile id is a nicety, not required for pushing.
    }
    return { tokens, garminUserId };
}

/**
 * Re-hydrate a Garmin session from stored tokens (no password, no re-login).
 * The underlying client refreshes the short-lived OAuth2 token on demand.
 */
export function restoreSession(tokens: GarminStoredTokens): GarminConnect {
    // garmin-connect requires a credentials object at construction time even
    // when we only want to reuse stored tokens.
    const gc = new GarminConnect({ username: '', password: '' });
    gc.loadToken(tokens.oauth1, tokens.oauth2);
    return gc;
}

/** Read back the (possibly refreshed) tokens so callers can persist them. */
export function currentTokens(gc: GarminConnect): GarminStoredTokens {
    return gc.exportToken() as GarminStoredTokens;
}

/** Upload a workout; returns Garmin's workout id. */
export async function uploadWorkout(gc: GarminConnect, workout: GarminWorkout): Promise<string> {
    const created = await gc.addWorkout(workout as unknown as IWorkoutDetail);
    const id = created?.workoutId;
    if (id == null) {
        throw new Error('Garmin did not return a workout id');
    }
    return String(id);
}

const GC_API = 'https://connectapi.garmin.com';

/** Schedule an uploaded workout onto the athlete's calendar for a given day. */
export async function scheduleWorkout(
    gc: GarminConnect,
    workoutId: string,
    date: string, // YYYY-MM-DD
): Promise<string | null> {
    const res = await gc.post<{ workoutScheduleId?: number | string }>(
        `${GC_API}/workout-service/schedule/${workoutId}`,
        { date },
    );
    return res?.workoutScheduleId != null ? String(res.workoutScheduleId) : null;
}

/** Remove a previously uploaded workout (used on unassign / re-sync). */
export async function deleteWorkout(gc: GarminConnect, workoutId: string): Promise<void> {
    await gc.deleteWorkout({ workoutId });
}

/** Pull the athlete's recent activities (newest first). */
export async function fetchActivities(
    gc: GarminConnect,
    start = 0,
    limit = 20,
): Promise<IActivity[]> {
    return gc.getActivities(start, limit);
}
