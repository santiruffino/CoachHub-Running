import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';

interface AssignmentToCreate {
    user_id: string;
    training_id: string;
    scheduled_date: string;
    completed: boolean;
    expected_rpe: number | null;
    workout_name: string | null;
    source_group_id: string | null;
    workout_snapshot: {
        title: string;
        description: string | null;
        type: string;
        blocks: unknown;
        version: number;
        timestamp: string;
    };
}

/**
 * Assign Training
 * 
 * Assigns a training to one or more athletes and/or groups on specific dates.
 * 
 * Request Body:
 * {
 *   trainingId: string,
 *   scheduledDate: string (ISO date),
 *   athleteIds?: string[],
 *   groupIds?: string[],
 *   expectedRpe?: number (1-10)
 * }
 * 
 * Access: COACH only
 */
export async function POST(request: NextRequest) {
    try {
        const authResult = await requireRole('COACH');

        if (authResult.response) {
            return authResult.response;
        }

        const { supabase, user } = authResult;
        const body = (await request.json()) as {
            trainingId?: string;
            scheduledDate?: string;
            athleteIds?: string[];
            groupIds?: string[];
            expectedRpe?: number;
            workoutName?: string;
        };
        const { trainingId, scheduledDate, athleteIds, groupIds, expectedRpe, workoutName } = body;

        // Validation
        if (!trainingId) {
            return NextResponse.json(
                { error: 'trainingId is required' },
                { status: 400 }
            );
        }

        if (!scheduledDate) {
            return NextResponse.json(
                { error: 'scheduledDate is required' },
                { status: 400 }
            );
        }

        if ((!athleteIds || athleteIds.length === 0) && (!groupIds || groupIds.length === 0)) {
            return NextResponse.json(
                { error: 'At least one athleteId or groupId is required' },
                { status: 400 }
            );
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('team_id')
            .eq('id', user!.id)
            .single();

        if (!profile?.team_id) {
            return NextResponse.json(
                { error: 'Coach must belong to a team' },
                { status: 403 }
            );
        }

        // Verify training exists and belongs to coach team
        const { data: training, error: trainingError } = await supabase
            .from('trainings')
            .select('*')
            .eq('id', trainingId)
            .single();

        if (trainingError || !training) {
            return NextResponse.json(
                { error: 'Training not found' },
                { status: 404 }
            );
        }

        if (training.team_id !== profile.team_id) {
            return NextResponse.json(
                { error: 'Not authorized to assign this training' },
                { status: 403 }
            );
        }

        // Create a snapshot of the workout at this point in time
        const workoutSnapshot = {
            title: training.title,
            description: training.description,
            type: training.type,
            blocks: training.blocks,
            version: 1,
            timestamp: new Date().toISOString()
        };

        const assignmentsToCreate: AssignmentToCreate[] = [];

        // Collect athlete IDs from direct selection and map them to their source_group_id
        const athleteSourceMap = new Map<string, string | null>();

        // Direct selections are personalized (source_group_id = null)
        (athleteIds || []).forEach((id: string) => {
            athleteSourceMap.set(id, null);
        });

        // If groupIds provided, get all athletes in those groups
        if (groupIds && groupIds.length > 0) {
            // Verify all groups belong to coach team
            const groupsQuery = supabase
                .from('groups')
                .select('id')
                .in('id', groupIds)
                .eq('team_id', profile.team_id);

            const { data: groups } = await groupsQuery;

            if (!groups || groups.length !== groupIds.length) {
                return NextResponse.json(
                    { error: 'One or more groups not found or not owned by you' },
                    { status: 404 }
                );
            }

            // Get all athletes in these groups
            const { data: memberships } = await supabase
                .from('athlete_groups')
                .select('athlete_id, group_id')
                .in('group_id', groupIds);

            if (memberships) {
                memberships.forEach(m => {
                    // Personalized assignments take precedence over group assignments
                    if (!athleteSourceMap.has(m.athlete_id)) {
                        athleteSourceMap.set(m.athlete_id, m.group_id);
                    }
                });
            }
        }

        // Create assignment for each unique athlete
        for (const [athleteId, sourceGroupId] of athleteSourceMap.entries()) {
            assignmentsToCreate.push({
                user_id: athleteId,
                training_id: trainingId,
                scheduled_date: scheduledDate,
                completed: false,
                expected_rpe: expectedRpe || null,
                workout_name: workoutName || null,
                source_group_id: sourceGroupId,
                workout_snapshot: workoutSnapshot, // Store the historical snapshot
            });
        }

        if (assignmentsToCreate.length === 0) {
            return NextResponse.json(
                { error: 'No athletes found to assign training to' },
                { status: 400 }
            );
        }

        // Insert all assignments
        const { data: assignments, error: insertError } = await supabase
            .from('training_assignments')
            .insert(assignmentsToCreate)
            .select();

        if (insertError) {
            console.error('Assign training error:', insertError);
            console.error('Assignments to create:', assignmentsToCreate);
            return NextResponse.json(
                {
                    error: 'Failed to assign training'
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            message: `Training assigned to ${assignments?.length || 0} athlete(s)`,
            assignments: assignments || [],
        }, { status: 201 });
    } catch (error: unknown) {
        console.error('Assign training error:', error);
        return NextResponse.json(
            {
                error: 'Internal server error'
            },
            { status: 500 }
        );
    }
}
