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
                source_group_id,
                group:groups(id, name),
                training:trainings!inner(
                    id,
                    title,
                    description,
                    type,
                    blocks,
                    team_id
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
            team_id: string | null;
        };
        const assignedUser = assignment.user as unknown as {
            id: string;
            name: string;
            email: string;
        };

        // Fetch user's profile to get the correct role
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, team_id')
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

        // Coaches can view any assignment, but can only edit if they own the training or are on the same team
        const canEdit = userRole === 'COACH' && !!profile?.team_id && training.team_id === profile.team_id;

        return NextResponse.json({
            id: assignment.id,
            scheduledDate: assignment.scheduled_date,
            completed: assignment.completed,
            expectedRpe: assignment.expected_rpe,
            sourceGroupId: assignment.source_group_id,
            groupName: (assignment as any).group?.name,
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
            
        const assignmentId = id;
        const body = await request.json();
        const { blocks, expectedRpe, scheduledDate, applyToGroup } = body;

        // Fetch assignment with training to verify ownership and get group info
        const { data: assignment, error: fetchError } = await supabase
            .from('training_assignments')
            .select(`
                id,
                training_id,
                scheduled_date,
                source_group_id,
                training:trainings!inner(
                    id,
                    title,
                    type,
                    description,
                    created_by,
                    team_id
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
            created_by: string | null;
            team_id: string | null;
        };

        // Verify training belongs to coach team
        if (training.team_id !== profile.team_id) {
            return NextResponse.json(
                { error: 'Not authorized to update this assignment' },
                { status: 403 }
            );
        }

        const updatePayload: any = {
            updated_at: new Date().toISOString()
        };

        let trainingIdToUse = assignment.training_id;

        // 1. Handle Workout Blocks Update (Forking)
        if (blocks && Array.isArray(blocks)) {
            const { data: newTraining, error: createError } = await supabase
                .from('trainings')
                .insert({
                    title: training.title,
                    type: training.type,
                    description: training.description || 'Modified workout',
                    blocks: blocks,
                    is_template: false,
                    coach_id: user!.id,
                    created_by: user!.id,
                    team_id: profile.team_id,
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

            trainingIdToUse = newTraining.id;
            updatePayload.training_id = newTraining.id;
            
            // Generate snapshot for the new workout
            updatePayload.workout_snapshot = {
                title: newTraining.title,
                description: newTraining.description,
                type: newTraining.type,
                blocks: newTraining.blocks,
                version: 1,
                timestamp: new Date().toISOString()
            };
        }

        // 2. Handle Rescheduling
        if (scheduledDate) {
            updatePayload.scheduled_date = scheduledDate;
        }

        // 3. Handle RPE Update
        if (expectedRpe !== undefined) {
            updatePayload.expected_rpe = expectedRpe;
        }

        // 4. Perform Update (Single or Group)
        if (applyToGroup && assignment.source_group_id) {
            const { count, error: updateError } = await supabase
                .from('training_assignments')
                .update(updatePayload)
                .eq('source_group_id', assignment.source_group_id)
                .eq('training_id', assignment.training_id)
                .eq('scheduled_date', assignment.scheduled_date)
                .select('id');

            if (updateError) {
                console.error('Update group assignments error:', updateError);
                return NextResponse.json(
                    { error: 'Failed to update group assignments' },
                    { status: 500 }
                );
            }

            return NextResponse.json({
                message: 'Group workouts updated successfully',
                updatedCount: count,
                trainingId: trainingIdToUse,
            });
        } else {
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
                trainingId: trainingIdToUse,
            });
        }
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
            
        const assignmentId = id;
        
        // Try to parse body for applyToGroup flag
        let applyToGroup = false;
        try {
            const body = await request.json();
            applyToGroup = body.applyToGroup || false;
        } catch (e) {
            // No body provided or not JSON, assume single delete
        }

        // Fetch assignment with training to verify ownership and get group info
        const { data: assignment, error: fetchError } = await supabase
            .from('training_assignments')
            .select(`
                id,
                training_id,
                scheduled_date,
                source_group_id,
                training:trainings!inner(team_id)
            `)
            .eq('id', assignmentId)
            .single();

        if (fetchError || !assignment) {
            return NextResponse.json(
                { error: 'Assignment not found' },
                { status: 404 }
            );
        }

        // Verify training belongs to coach team
        const training = assignment.training as unknown as { team_id: string | null };
        if (training.team_id !== profile.team_id) {
            return NextResponse.json(
                { error: 'Not authorized to delete this assignment' },
                { status: 403 }
            );
        }

        if (applyToGroup && assignment.source_group_id) {
            const { count, error: deleteError } = await supabase
                .from('training_assignments')
                .delete()
                .eq('source_group_id', assignment.source_group_id)
                .eq('training_id', assignment.training_id)
                .eq('scheduled_date', assignment.scheduled_date);

            if (deleteError) {
                console.error('Delete group assignments error:', deleteError);
                return NextResponse.json(
                    { error: 'Failed to delete group assignments' },
                    { status: 500 }
                );
            }

            return NextResponse.json({
                message: 'Group assignments deleted successfully',
                deletedCount: count,
            });
        } else {
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
        }
    } catch (error: any) {
        console.error('Delete assignment error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
