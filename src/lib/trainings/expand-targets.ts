import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Resolve a set of directly-selected athletes and/or groups into the unique set
 * of athletes that a training/plan should be assigned to, mapping each athlete
 * to the group they came from (`null` for a personalized/direct selection).
 *
 * Direct athlete selections take precedence over group membership, so an athlete
 * picked directly is treated as personalized even if they also belong to a
 * selected group. Groups are verified to belong to `teamId` before expansion.
 *
 * Shared by the single-workout assign route, plan apply, and calendar copy-week
 * so all three expand targets identically.
 */
export async function resolveAthleteTargets(
    supabase: SupabaseClient,
    { teamId, athleteIds, groupIds }: { teamId: string; athleteIds?: string[]; groupIds?: string[] },
): Promise<{ targets: Map<string, string | null>; error?: 'GROUP_NOT_FOUND' }> {
    const targets = new Map<string, string | null>();

    // Direct selections are personalized (source_group_id = null).
    (athleteIds || []).forEach((id) => targets.set(id, null));

    if (groupIds && groupIds.length > 0) {
        const { data: groups } = await supabase
            .from('groups')
            .select('id')
            .in('id', groupIds)
            .eq('team_id', teamId);

        if (!groups || groups.length !== groupIds.length) {
            return { targets, error: 'GROUP_NOT_FOUND' };
        }

        const { data: memberships } = await supabase
            .from('athlete_groups')
            .select('athlete_id, group_id')
            .in('group_id', groupIds);

        (memberships || []).forEach((m) => {
            // Personalized (direct) assignments take precedence over group ones.
            if (!targets.has(m.athlete_id)) {
                targets.set(m.athlete_id, m.group_id);
            }
        });
    }

    return { targets };
}
