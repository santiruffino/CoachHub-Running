import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/api-helpers';

interface GroupDetails {
    id: string;
    group_type: string | null;
    race_priority: string | null;
}

interface AssignmentWithGroup {
    user_id: string;
    scheduled_date: string;
    source_group_id: string | null;
    group?: GroupDetails;
    [key: string]: unknown;
}

/**
 * Get User Assignments
 * 
 * Fetches training assignments for the authenticated user.
 * Includes full training details for each assignment.
 */
export async function GET() {
    try {
        const authResult = await requireAuth();

        if (authResult.response) {
            return authResult.response;
        }

        const { supabase, user } = authResult;

        // Fetch assignments with training details
        const { data: assignments, error } = await supabase
            .from('training_assignments')
            .select(`
        user_id,
        id,
        scheduled_date,
        completed,
        feedback,
        created_at,
        updated_at,
        workout_name,
        source_group_id,
        training:trainings(
          id,
          title,
          description,
          type,
          blocks,
          is_template
        )
      `)
            .eq('user_id', user!.id)
            .order('scheduled_date', { ascending: true });

        if (error) {
            console.error('Fetch assignments error:', error);
            return NextResponse.json(
                { error: 'Failed to fetch assignments' },
                { status: 500 }
            );
        }

        const mutableAssignments = (assignments || []) as AssignmentWithGroup[];

        // Manual fetch for groups to resolve missing foreign key relationship
        const sgIds = [
            ...new Set(
                mutableAssignments
                    .map((assignment) => assignment.source_group_id)
                    .filter((value): value is string => typeof value === 'string' && value.length > 0)
            )
        ];
        if (sgIds.length > 0) {
            const { data: groupsData } = await supabase
                .from('groups')
                .select('id, group_type, race_priority')
                .in('id', sgIds);

            const groupMap = new Map((groupsData || []).map(group => [group.id, group]));
            mutableAssignments.forEach((assignment) => {
                if (assignment.source_group_id) {
                    assignment.group = groupMap.get(assignment.source_group_id);
                }
            });
        }

        // Apply Priority Engine Conflict Resolution
        const { resolveAssignmentConflicts } = await import('@/lib/training/priority-engine');
        const resolvedAssignments = resolveAssignmentConflicts(mutableAssignments);

        return NextResponse.json(resolvedAssignments);
    } catch (error: unknown) {
        console.error('Get assignments error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
