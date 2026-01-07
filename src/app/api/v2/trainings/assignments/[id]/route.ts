import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';

/**
 * Delete Training Assignment
 * 
 * Deletes a training assignment. Coach must own the training.
 * 
 * Access: COACH only
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const authResult = await requireRole('COACH');

        if (authResult.response) {
            return authResult.response;
        }

        const { supabase, user } = authResult;
        const assignmentId = id;

        // Fetch assignment with training to verify ownership
        const { data: assignment, error: fetchError } = await supabase
            .from('training_assignments')
            .select(`
        id,
        training:trainings!inner(coach_id)
      `)
            .eq('id', assignmentId)
            .single();

        if (fetchError || !assignment) {
            return NextResponse.json(
                { error: 'Assignment not found' },
                { status: 404 }
            );
        }

        // Verify coach owns the training
        // Type assertion needed because Supabase types the nested relation as an array
        const training = assignment.training as unknown as { coach_id: string };
        if (training.coach_id !== user!.id) {
            return NextResponse.json(
                { error: 'Not authorized to delete this assignment' },
                { status: 403 }
            );
        }

        // Delete assignment
        const { error: deleteError } = await supabase
            .from('training_assignments')
            .delete()
            .eq('id', assignmentId);

        if (deleteError) {
            console.error('Delete assignment error:', deleteError);
            return NextResponse.json(
                { error: 'Failed to delete assignment' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            message: 'Assignment deleted successfully',
        });
    } catch (error: any) {
        console.error('Delete assignment error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
