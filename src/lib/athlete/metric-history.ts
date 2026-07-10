import type { SupabaseClient } from '@supabase/supabase-js';
import type { MetricType } from '@/interfaces/athlete';

export interface MetricChange {
    type: MetricType;
    /** Value stored before this update (null/undefined if the profile had none). */
    previous?: string | null;
    /** Value coming in with this update (undefined if the field wasn't touched). */
    next?: string | number | null;
}

function normalize(value: string | number | null | undefined): string {
    return value == null ? '' : String(value).trim();
}

/**
 * Appends a row to `athlete_metrics` for each VAM/UAN test whose value actually
 * changed to a non-empty value, giving athletes a historical record of their tests.
 *
 * Must be called with a service-role client: `athlete_metrics` has RLS enabled with
 * no policies (deny-all to the authenticated role), so only the service role can
 * read or write it. History is best-effort — a failure here is logged by the caller
 * and never fails the surrounding profile update.
 */
export async function recordTestMetricHistory(
    serviceClient: SupabaseClient,
    athleteProfileId: string,
    changes: MetricChange[],
): Promise<{ inserted: number; error: unknown }> {
    const rows = changes
        .filter((c) => {
            const next = normalize(c.next);
            // Skip untouched/empty values and no-op updates that match the current value.
            return next !== '' && next !== normalize(c.previous);
        })
        .map((c) => ({
            athlete_profile_id: athleteProfileId,
            type: c.type,
            value: normalize(c.next),
        }));

    if (rows.length === 0) {
        return { inserted: 0, error: null };
    }

    const { error } = await serviceClient.from('athlete_metrics').insert(rows);
    return { inserted: error ? 0 : rows.length, error: error ?? null };
}
