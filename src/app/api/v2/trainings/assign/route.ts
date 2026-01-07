import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';

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
 *   groupIds?: string[]
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
        const body = await request.json();
        const { trainingId, scheduledDate, athleteIds, groupIds } = body;

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

        // Verify training exists and coach owns it
        const { data: training, error: trainingError } = await supabase
            .from('trainings')
            .select('coach_id')
            .eq('id', trainingId)
            .single();

        if (trainingError || !training) {
            return NextResponse.json(
                { error: 'Training not found' },
                { status: 404 }
            );
        }

        if (training.coach_id !== user!.id) {
            return NextResponse.json(
                { error: 'Not authorized to assign this training' },
                { status: 403 }
            );
        }

        const assignmentsToCreate: any[] = [];

        // Collect athlete IDs from direct selection
        const targetAthleteIds = new Set<string>(athleteIds || []);

        // If groupIds provided, get all athletes in those groups
        if (groupIds && groupIds.length > 0) {
            // Verify all groups belong to coach
            const { data: groups } = await supabase
                .from('groups')
                .select('id')
                .in('id', groupIds)
                .eq('coach_id', user!.id);

            if (!groups || groups.length !== groupIds.length) {
                return NextResponse.json(
                    { error: 'One or more groups not found or not owned by you' },
                    { status: 404 }
                );
            }

            // Get all athletes in these groups
            const { data: memberships } = await supabase
                .from('athlete_groups')
                .select('athlete_id')
                .in('group_id', groupIds);

            if (memberships) {
                memberships.forEach(m => targetAthleteIds.add(m.athlete_id));
            }
        }

        // Create assignment for each unique athlete
        for (const athleteId of targetAthleteIds) {
            assignmentsToCreate.push({
                user_id: athleteId,
                training_id: trainingId,
                scheduled_date: scheduledDate,
                completed: false,
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
                    error: 'Failed to assign training',
                    details: insertError.message,
                    code: insertError.code
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            message: `Training assigned to ${assignments?.length || 0} athlete(s)`,
            assignments: assignments || [],
        }, { status: 201 });
    } catch (error: any) {
        console.error('Assign training error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
