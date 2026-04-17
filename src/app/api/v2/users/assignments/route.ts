import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/api-helpers';

/**
 * Get User Assignments
 * 
 * Fetches training assignments for the authenticated user.
 * Includes full training details for each assignment.
 */
export async function GET(request: NextRequest) {
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

        // Manual fetch for groups to resolve missing foreign key relationship
        const sgIds = [...new Set(assignments?.map(a => a.source_group_id).filter(Boolean))];
        if (sgIds.length > 0 && assignments) {
            const { data: groupsData } = await supabase
                .from('groups')
                .select('id, group_type, race_priority')
                .in('id', sgIds);
                
            const groupMap = new Map(groupsData?.map(g => [g.id, g]));
            assignments.forEach((a: any) => {
                if (a.source_group_id) {
                    a.group = groupMap.get(a.source_group_id);
                }
            });
        }

        // Apply Priority Engine Conflict Resolution
        const { resolveAssignmentConflicts } = await import('@/lib/training/priority-engine');
        const resolvedAssignments = resolveAssignmentConflicts(assignments || []);

        return NextResponse.json(resolvedAssignments);
    } catch (error: any) {
        console.error('Get assignments error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
