import type { SupabaseClient } from '@supabase/supabase-js';

/** Item payload as received from the API (camelCase). */
export interface PlanItemInput {
    trainingId: string;
    weekIndex: number;
    dayOfWeek: number;
    workoutName?: string | null;
    expectedRpe?: number | null;
    sortOrder?: number;
    /** Optional per-slot structure override; null/undefined = follow the template. */
    blocks?: unknown[] | null;
}

/**
 * Verify that every referenced training belongs to the given team. Returns true
 * when the id list is empty or all ids resolve to team-owned trainings.
 */
export async function verifyTrainingsInTeam(
    supabase: SupabaseClient,
    teamId: string,
    trainingIds: string[],
): Promise<boolean> {
    const unique = Array.from(new Set(trainingIds));
    if (unique.length === 0) return true;

    const { data, error } = await supabase
        .from('trainings')
        .select('id')
        .eq('team_id', teamId)
        .in('id', unique);

    if (error) return false;
    return (data?.length || 0) === unique.length;
}

/** Insert plan items (camelCase input → snake_case rows). */
export async function insertPlanItems(
    supabase: SupabaseClient,
    planId: string,
    items: PlanItemInput[],
): Promise<{ error: { message: string } | null }> {
    if (items.length === 0) return { error: null };

    const rows = items.map((i, index) => ({
        plan_id: planId,
        training_id: i.trainingId,
        week_index: i.weekIndex,
        day_of_week: i.dayOfWeek,
        workout_name: i.workoutName ?? null,
        expected_rpe: i.expectedRpe ?? null,
        sort_order: i.sortOrder ?? index,
        blocks: i.blocks ?? null,
    }));

    const { error } = await supabase.from('training_plan_items').insert(rows);
    return { error: error ? { message: error.message } : null };
}

/**
 * Load a plan owned by the team, with its items joined to the referenced
 * training's title/type/blocks (needed both for the builder UI and to snapshot
 * on apply). Returns null when the plan doesn't exist or isn't team-owned.
 */
export async function loadPlanWithItems(
    supabase: SupabaseClient,
    planId: string,
    teamId: string,
): Promise<Record<string, unknown> | null> {
    const { data: plan, error } = await supabase
        .from('training_plans')
        .select(
            `*, items:training_plan_items(
                id, training_id, week_index, day_of_week, workout_name, expected_rpe, sort_order, blocks,
                training:trainings(id, title, description, type, blocks, team_id)
            )`,
        )
        .eq('id', planId)
        .eq('team_id', teamId)
        .maybeSingle();

    if (error || !plan) return null;
    return plan as Record<string, unknown>;
}
