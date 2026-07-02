/**
 * Shared gate for the Garmin opt-in pilot. Every Garmin surface (UI + API)
 * checks this so the integration stays invisible to non-pilot users.
 */

// Loosely typed to avoid deep generic instantiation from the full
// SupabaseClient type; callers pass their authenticated/service client.
type SupabaseLike = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

export async function isGarminPilotEnabled(
    supabase: SupabaseLike,
    userId: string,
): Promise<boolean> {
    const { data } = await supabase
        .from('profiles')
        .select('garmin_pilot_enabled')
        .eq('id', userId)
        .maybeSingle();
    return Boolean(data?.garmin_pilot_enabled);
}
