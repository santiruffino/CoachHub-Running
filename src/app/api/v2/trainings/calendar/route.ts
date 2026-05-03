import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/api-helpers';

interface AssignmentWithGroup {
    user_id: string;
    scheduled_date: string;
    source_group_id: string | null;
    group?: {
        id: string;
        group_type: string | null;
        race_priority: string | null;
    };
    [key: string]: unknown;
}

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
        const authResult = await requireAuth();

        if (authResult.response) {
            return authResult.response;
        }

        const { supabase, user } = authResult;

        const { data: profile } = await supabase
            .from('profiles')
            .select('role, team_id')
            .eq('id', user!.id)
            .single();

        if (profile?.role !== 'COACH' && profile?.role !== 'ADMIN') {
            console.warn('[TRAININGS_CALENDAR] Forbidden role access attempt', {
                userId: user!.id,
                role: profile?.role || null,
            });
            return NextResponse.json(
                { error: 'Only coach or admin users can access calendar assignments' },
                { status: 403 }
            );
        }

        if (!profile?.team_id) {
            console.warn('[TRAININGS_CALENDAR] Missing team_id for coach/admin', {
                userId: user!.id,
                role: profile?.role,
            });
            return NextResponse.json(
                { error: 'Coach must belong to a team' },
                { status: 403 }
            );
        }

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
            // Verify groups belong to coach team
            const groupsQuery = supabase
                .from('groups')
                .select('id')
                .in('id', groupIds)
                .eq('team_id', profile.team_id);

            const { data: groups } = await groupsQuery;

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
        source_group_id,
        user:profiles!training_assignments_user_id_fkey(
          id,
          name,
          email,
          team_id
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
            .order('scheduled_date', { ascending: true });

        // Filter assignments based on team_id
        query = query.eq('user.team_id', profile.team_id);

        // Filter by athletes if specified
        if (targetAthleteIds && targetAthleteIds.length > 0) {
            query = query.in('user_id', targetAthleteIds);
        }

        const { data: assignments, error } = await query;

        if (error) {
            console.error('Fetch calendar assignments error:', error);
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

            const groupMap = new Map((groupsData || []).map(g => [g.id, g]));
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
        console.error('Get calendar assignments error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
