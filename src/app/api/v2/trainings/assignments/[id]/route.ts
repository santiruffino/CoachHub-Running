import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';
import { requireAuth } from '@/lib/supabase/api-helpers';

/**
 * Get Training Assignment Details
 * 
 * Fetches a training assignment with full training details.
 * Athletes can view their own assignments, coaches can view any.
 * 
 * Access: Authenticated users
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const authResult = await requireAuth();

        if (authResult.response) {
            return authResult.response;
        }

        const { supabase, user } = authResult;
        const assignmentId = id;

        // Fetch assignment with training details
        const { data: assignment, error: fetchError } = await supabase
            .from('training_assignments')
            .select(`
                id,
                user_id,
                scheduled_date,
                completed,
                expected_rpe,
                training:trainings!inner(
                    id,
                    title,
                    description,
                    type,
                    blocks,
                    coach_id
                ),
                user:profiles!training_assignments_user_id_fkey(
                    id,
                    name,
                    email
                )
            `)
            .eq('id', assignmentId)
            .single();

        if (fetchError || !assignment) {
            return NextResponse.json(
                { error: 'Assignment not found' },
                { status: 404 }
            );
        }

        // Type assertions for nested relations
        const training = assignment.training as unknown as {
            id: string;
            title: string;
            description: string;
            type: string;
            blocks: any;
            coach_id: string;
        };
        const assignedUser = assignment.user as unknown as {
            id: string;
            name: string;
            email: string;
        };

        // Fetch user's profile to get the correct role
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user!.id)
            .single();

        const userRole = profile?.role || 'ATHLETE';

        // Authorization check: must be the assigned athlete OR a coach
        if (userRole === 'ATHLETE' && assignedUser.id !== user!.id) {
            return NextResponse.json(
                { error: 'Not authorized to view this assignment' },
                { status: 403 }
            );
        }

        // Coaches can view any assignment, but can only edit if they own the training
        const canEdit = userRole === 'COACH' && training.coach_id === user!.id;

        return NextResponse.json({
            id: assignment.id,
            scheduledDate: assignment.scheduled_date,
            completed: assignment.completed,
            expectedRpe: assignment.expected_rpe,
            training: {
                id: training.id,
                title: training.title,
                description: training.description,
                type: training.type,
                blocks: training.blocks || [],
            },
            athlete: {
                id: assignedUser.id,
                name: assignedUser.name,
                email: assignedUser.email,
            },
            canEdit,
        });
    } catch (error: any) {
        console.error('Get assignment error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * Update Training Assignment Workout
 * 
 * Updates the workout blocks for an assignment.
 * Creates a new non-template training with updated blocks.
 * 
 * Access: COACH only
 */
export async function PATCH(
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
        const body = await request.json();
        const { blocks, expectedRpe } = body;

        if (!blocks || !Array.isArray(blocks)) {
            return NextResponse.json(
                { error: 'Invalid blocks data' },
                { status: 400 }
            );
        }

        // Fetch assignment with training to verify ownership
        const { data: assignment, error: fetchError } = await supabase
            .from('training_assignments')
            .select(`
                id,
                training:trainings!inner(
                    id,
                    title,
                    type,
                    description,
                    coach_id
                )
            `)
            .eq('id', assignmentId)
            .single();

        if (fetchError || !assignment) {
            return NextResponse.json(
                { error: 'Assignment not found' },
                { status: 404 }
            );
        }

        const training = assignment.training as unknown as {
            id: string;
            title: string;
            type: string;
            description: string;
            coach_id: string;
        };

        // Verify coach owns the training
        if (training.coach_id !== user!.id) {
            return NextResponse.json(
                { error: 'Not authorized to update this assignment' },
                { status: 403 }
            );
        }

        // Create a new non-template training with updated blocks (forking)
        // We do this to preserve the history of the original training while allowing
        // the coach to customize this specific assignment.
        const { data: newTraining, error: createError } = await supabase
            .from('trainings')
            .insert({
                title: training.title,
                type: training.type,
                description: training.description || 'Modified workout',
                blocks: blocks,
                is_template: false,
                coach_id: user!.id,
                // We don't necessarily copy expected_rpe here because the assignment
                // has its own expected_rpe field which overrides it.
            })
            .select()
            .single();

        if (createError || !newTraining) {
            console.error('Create training error:', createError);
            return NextResponse.json(
                { error: 'Failed to create updated training' },
                { status: 500 }
            );
        }

        // Update assignment to reference new training and update RPE if provided
        const updatePayload: any = { training_id: newTraining.id };
        if (expectedRpe !== undefined) {
            updatePayload.expected_rpe = expectedRpe;
        }

        const { error: updateError } = await supabase
            .from('training_assignments')
            .update(updatePayload)
            .eq('id', assignmentId);

        if (updateError) {
            console.error('Update assignment error:', updateError);
            return NextResponse.json(
                { error: 'Failed to update assignment' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            message: 'Workout updated successfully',
            trainingId: newTraining.id,
        });
    } catch (error: any) {
        console.error('Update assignment error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

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
