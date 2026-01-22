import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';

/**
 * Get Calendar Assignments
 * 
 * Returns training assignments for a date range, optionally filtered by students or groups.
 * 
 * Query Parameters:
 * - startDate: ISO date string (required)
 * - endDate: ISO date string (required)
 * - studentIds: comma-separated athlete IDs (optional)
 * - groupIds: comma-separated group IDs (optional)
 * 
 * Access: COACH only
 */
export async function GET(request: NextRequest) {
    try {
        const authResult = await requireRole('COACH');

        if (authResult.response) {
            return authResult.response;
        }

        const { supabase, user } = authResult;
        const { searchParams } = new URL(request.url);

        // Get query params
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const studentIdsParam = searchParams.get('studentIds');
        const groupIdsParam = searchParams.get('groupIds');

        // Validation
        if (!startDate || !endDate) {
            return NextResponse.json(
                { error: 'startDate and endDate are required' },
                { status: 400 }
            );
        }

        // Parse student IDs if provided
        const studentIds = studentIdsParam
            ? studentIdsParam.split(',').filter(Boolean)
            : undefined;

        // Parse group IDs if provided
        const groupIds = groupIdsParam
            ? groupIdsParam.split(',').filter(Boolean)
            : undefined;

        let targetAthleteIds: string[] | undefined;

        // If groupIds provided, get all athletes in those groups
        if (groupIds && groupIds.length > 0) {
            // Verify groups belong to coach
            const { data: groups } = await supabase
                .from('groups')
                .select('id')
                .in('id', groupIds)
                .eq('coach_id', user!.id);

            if (!groups || groups.length === 0) {
                return NextResponse.json(
                    { error: 'No valid groups found' },
                    { status: 404 }
                );
            }

            const validGroupIds = groups.map(g => g.id);

            // Get athletes in these groups
            const { data: memberships } = await supabase
                .from('athlete_groups')
                .select('athlete_id')
                .in('group_id', validGroupIds);

            const groupAthleteIds = new Set(memberships?.map(m => m.athlete_id) || []);

            // Combine with studentIds if provided
            if (studentIds && studentIds.length > 0) {
                studentIds.forEach(id => groupAthleteIds.add(id));
            }

            targetAthleteIds = Array.from(groupAthleteIds);
        } else if (studentIds && studentIds.length > 0) {
            targetAthleteIds = studentIds;
        }

        let query = supabase
            .from('training_assignments')
            .select(`
        id,
        scheduled_date,
        completed,
        feedback,
        created_at,
        user_id,
        workout_name,
        user:profiles!training_assignments_user_id_fkey(
          id,
          name,
          email
        ),
        training:trainings(
          id,
          title,
          description,
          type,
          blocks,
          is_template
        )
      `)
            .gte('scheduled_date', startDate)
            .lte('scheduled_date', endDate)
            .eq('training.coach_id', user!.id)
            .order('scheduled_date', { ascending: true });

        // Filter by athletes if specified
        if (targetAthleteIds && targetAthleteIds.length > 0) {
            query = query.in('user_id', targetAthleteIds);
        } else {
            // If no filters, get all assignments for coach's trainings
            // This is already filtered by coach_id in the training join
        }

        const { data: assignments, error } = await query;

        if (error) {
            console.error('Fetch calendar assignments error:', error);
            return NextResponse.json(
                { error: 'Failed to fetch assignments' },
                { status: 500 }
            );
        }

        return NextResponse.json(assignments || []);
    } catch (error: any) {
        console.error('Get calendar assignments error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
