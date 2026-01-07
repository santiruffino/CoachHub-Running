import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/api-helpers';

/**
 * Update Assignment Date
 * 
 * Allows users to reschedule their training assignments.
 * Users can only update their own assignments.
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ assignmentId: string }> }
) {
    try {
        const { assignmentId } = await params;
        const authResult = await requireAuth();

        if (authResult.response) {
            return authResult.response;
        }

        const { supabase, user } = authResult;

        const { scheduledDate } = await request.json();

        if (!scheduledDate) {
            return NextResponse.json(
                { error: 'scheduledDate is required' },
                { status: 400 }
            );
        }

        // Verify assignment belongs to user
        const { data: assignment, error: fetchError } = await supabase
            .from('training_assignments')
            .select('user_id')
            .eq('id', assignmentId)
            .single();

        if (fetchError || !assignment) {
            return NextResponse.json(
                { error: 'Assignment not found' },
                { status: 404 }
            );
        }

        if (assignment.user_id !== user!.id) {
            return NextResponse.json(
                { error: 'Not authorized to update this assignment' },
                { status: 403 }
            );
        }

        // Update assignment
        const { data: updated, error: updateError } = await supabase
            .from('training_assignments')
            .update({
                scheduled_date: scheduledDate,
                updated_at: new Date().toISOString(),
            })
            .eq('id', assignmentId)
            .select(`
        id,
        scheduled_date,
        completed,
        feedback,
        created_at,
        updated_at,
        training:trainings(
          id,
          title,
          description,
          type,
          blocks
        )
      `)
            .single();

        if (updateError) {
            console.error('Update assignment error:', updateError);
            return NextResponse.json(
                { error: 'Failed to update assignment' },
                { status: 500 }
            );
        }

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error('Update assignment error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
