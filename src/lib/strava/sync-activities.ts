import type { SupabaseClient } from '@supabase/supabase-js';
import { consumeRateLimit } from '@/lib/api/rate-limit';
import { estimateLoadFromActivity, type LoadProfileInput } from '@/lib/training/load';

interface StravaActivity {
    id: number;
    name: string;
    type: string;
    distance: number;
    moving_time: number;
    start_date: string;
    elapsed_time: number;
    total_elevation_gain: number;
    average_speed?: number | null;
    max_speed?: number | null;
    average_heartrate: number | null;
    max_heartrate: number | null;
    suffer_score?: number | null;
    private: boolean;
}

interface ActivityUpsertRow {
    user_id: string;
    external_id: string;
    title: string;
    type: string;
    distance: number;
    duration: number;
    start_date: string;
    elapsed_time: number;
    elevation_gain: number;
    average_speed: number;
    max_speed: number;
    avg_hr: number | null;
    max_hr: number | null;
    suffer_score: number | null;
    load_score: number;
    is_private: boolean;
    metadata: StravaActivity;
    updated_at: string;
}

export interface SyncResult {
    inserted: number;
    updated: number;
    total: number;
    pages: number;
}

export interface SyncOptions {
    days?: number;
    maxPages?: number;
}

// Strava free tier rate limit is app-wide (not per-athlete): 200 req/15min,
// 2000/day. Leave headroom below the hard limit so manual /auth/sync calls
// from users browsing the app concurrently with the backfill cron worker
// don't get starved.
const STRAVA_GLOBAL_RATE_KEY = 'strava:api:global';
const STRAVA_RATE_LIMIT_MAX = 180;
const STRAVA_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

async function waitForStravaRateLimit(): Promise<void> {
    for (let attempt = 0; attempt < 20; attempt++) {
        const result = await consumeRateLimit({
            key: STRAVA_GLOBAL_RATE_KEY,
            limit: STRAVA_RATE_LIMIT_MAX,
            windowMs: STRAVA_RATE_LIMIT_WINDOW_MS,
        });
        if (result.allowed) return;

        // Bounded wait: never block a serverless invocation indefinitely.
        const waitMs = Math.min(result.retryAfterSeconds * 1000, 30_000);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    throw new Error('STRAVA_RATE_LIMIT_EXHAUSTED');
}

async function fetchWithRetry(url: string, accessToken: string, maxRetries = 3): Promise<Response> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        await waitForStravaRateLimit();

        const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });

        if (response.status === 429) {
            if (attempt === maxRetries) {
                throw new Error(`Strava API error: ${response.status} rate limited after ${maxRetries} retries`);
            }
            const retryAfterHeader = response.headers.get('Retry-After');
            const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : 2 ** attempt * 1000;
            await new Promise((resolve) => setTimeout(resolve, Math.min(retryAfterMs, 60_000)));
            continue;
        }

        if (response.status >= 500 && attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 500));
            continue;
        }

        return response;
    }
    throw new Error('unreachable');
}

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
    if (items.length === 0) return [];

    const chunks: T[][] = [];
    for (let index = 0; index < items.length; index += chunkSize) {
        chunks.push(items.slice(index, index + chunkSize));
    }

    return chunks;
}

/**
 * Fetches activities from Strava API with pagination and optional date filtering.
 */
async function fetchStravaActivities(
    accessToken: string,
    options: { afterTimestamp?: number; maxPages: number }
): Promise<StravaActivity[]> {
    const allActivities: StravaActivity[] = [];
    const perPage = 200;

    for (let page = 1; page <= options.maxPages; page++) {
        const params = new URLSearchParams({
            per_page: perPage.toString(),
            page: page.toString(),
        });

        if (options.afterTimestamp) {
            params.set('after', options.afterTimestamp.toString());
        }

        const response = await fetchWithRetry(
            `https://www.strava.com/api/v3/athlete/activities?${params.toString()}`,
            accessToken
        );

        if (!response.ok) {
            throw new Error(`Strava API error: ${response.status} ${response.statusText}`);
        }

        const activities = (await response.json()) as StravaActivity[];
        allActivities.push(...activities);

        // If fewer than perPage results, we've reached the end
        if (activities.length < perPage) {
            break;
        }
    }

    // Deduplicate by activity ID
    return Array.from(
        new Map(allActivities.map((activity) => [activity.id.toString(), activity])).values()
    );
}

/**
 * Upserts activities into the database in batches.
 */
async function upsertActivities(
    supabase: SupabaseClient,
    userId: string,
    activities: StravaActivity[]
): Promise<{ inserted: number; updated: number }> {
    if (activities.length === 0) {
        return { inserted: 0, updated: 0 };
    }

    const externalIds = activities.map((a) => a.id.toString());

    // Check which activities already exist
    const { data: existingRows } = await supabase
        .from('activities')
        .select('external_id')
        .eq('user_id', userId)
        .in('external_id', externalIds);

    const existingExternalIds = new Set((existingRows || []).map((row) => row.external_id));

    const { data: athleteProfile } = await supabase
        .from('athlete_profiles')
        .select('lthr, rest_hr, max_hr')
        .eq('user_id', userId)
        .maybeSingle();

    const loadProfile: LoadProfileInput = {
        lthr: athleteProfile?.lthr,
        restHR: athleteProfile?.rest_hr,
        maxHR: athleteProfile?.max_hr,
    };

    const upsertRows: ActivityUpsertRow[] = activities.map((activity) => {
        const sufferScore = typeof activity.suffer_score === 'number' ? activity.suffer_score : null;
        const duration = activity.moving_time || activity.elapsed_time || 0;
        return {
            user_id: userId,
            external_id: activity.id.toString(),
            title: activity.name,
            type: activity.type,
            distance: activity.distance || 0,
            duration,
            start_date: activity.start_date,
            elapsed_time: activity.elapsed_time || 0,
            elevation_gain: activity.total_elevation_gain || 0,
            average_speed: activity.average_speed || 0,
            max_speed: activity.max_speed || 0,
            avg_hr: activity.average_heartrate,
            max_hr: activity.max_heartrate,
            suffer_score: sufferScore,
            load_score: estimateLoadFromActivity(
                {
                    start_date: activity.start_date,
                    suffer_score: sufferScore,
                    duration,
                    avg_hr: activity.average_heartrate,
                    max_hr: activity.max_heartrate,
                },
                loadProfile
            ),
            is_private: activity.private || false,
            metadata: activity,
            updated_at: new Date().toISOString(),
        };
    });

    // Upsert in batches of 100
    for (const batch of chunkArray(upsertRows, 100)) {
        const { error: upsertError } = await supabase
            .from('activities')
            .upsert(batch, { onConflict: 'user_id,external_id' });

        if (upsertError) {
            throw new Error(`Database upsert failed: ${upsertError.message}`);
        }
    }

    const inserted = activities.filter((a) => !existingExternalIds.has(a.id.toString())).length;
    const updated = activities.length - inserted;

    return { inserted, updated };
}

/**
 * Syncs Strava activities for a user.
 *
 * @param supabase - Supabase client with service role
 * @param userId - The user ID
 * @param accessToken - Valid Strava access token
 * @param options - Sync options (days, maxPages)
 * @returns SyncResult with counts of inserted/updated activities
 */
export async function syncStravaActivities(
    supabase: SupabaseClient,
    userId: string,
    accessToken: string,
    options: SyncOptions = {}
): Promise<SyncResult> {
    const { days = 30, maxPages = 5 } = options;

    // Calculate 'after' timestamp for date filtering
    const afterTimestamp = days > 0
        ? Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000)
        : undefined;

    // Fetch activities from Strava
    const activities = await fetchStravaActivities(accessToken, {
        afterTimestamp,
        maxPages,
    });

    // Upsert into database
    const { inserted, updated } = await upsertActivities(supabase, userId, activities);

    // Calculate pages used (approximate)
    const pages = Math.ceil(activities.length / 200) || 1;

    return { inserted, updated, total: activities.length, pages };
}
