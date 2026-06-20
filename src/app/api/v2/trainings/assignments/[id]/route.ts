import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';
import { appLogger } from '@/lib/app-logger';
import { apiError } from '@/lib/api/error-response';
import { appendAdminActionLog } from '@/lib/audit/admin-action-log';

interface TrainingForResponse {
    id: string;
    title: string;
    description: string;
    type: string;
    blocks: unknown;
    team_id: string | null;
}

interface AssignedUser {
    id: string;
    name: string;
    email: string;
}

interface AssignmentGroup {
    name: string;
}

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
        void request;
        const { id } = await params;
        const { user, supabase, profile, response } = await requireRole(['ATHLETE', 'COACH', 'ADMIN']);

        if (response) {
            return response;
        }

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
            return NextResponse.json(apiError('ASSIGNMENT_NOT_FOUND'),
                { status: 404 }
            );
        }

        // Type assertions for nested relations
        const training = assignment.training as unknown as {
            id: string;
            title: string;
            description: string;
            type: string;
            blocks: unknown;
            team_id: string | null;
        };
        const assignedUser = assignment.user as unknown as AssignedUser;

        const userRole = profile!.role;

        // Authorization check: must be the assigned athlete OR a coach
        if (userRole === 'ATHLETE' && assignedUser.id !== user!.id) {
            return NextResponse.json(apiError('AUTH_VIEW_ASSIGNMENT_FORBIDDEN'),
                { status: 403 }
            );
        }

        // Pending assignments can be edited by the owning coach or any admin
        const canEdit = !assignment.completed && (
            userRole === 'ADMIN' ||
            (userRole === 'COACH' && !!profile?.team_id && training.team_id === profile.team_id)
        );
        const groupRelation = (assignment as unknown as { group?: AssignmentGroup | AssignmentGroup[] | null }).group;
        const groupName = Array.isArray(groupRelation) ? groupRelation[0]?.name : groupRelation?.name;

        return NextResponse.json({
            id: assignment.id,
            scheduledDate: assignment.scheduled_date,
            completed: assignment.completed,
            expectedRpe: assignment.expected_rpe,
            workoutName: (assignment as { workout_name?: string | null }).workout_name ?? null,
            sourceGroupId: assignment.source_group_id,
            groupName,
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
    } catch (error: unknown) {
        appLogger.error('Get assignment error:', error);
        return NextResponse.json(apiError('INTERNAL_SERVER_ERROR'),
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
        const { user, supabase, profile, response } = await requireRole('COACH');

        if (response) {
            return response;
        }

        if (profile!.role !== 'ADMIN' && !profile?.team_id) {
            return NextResponse.json(apiError('AUTH_COACH_TEAM_REQUIRED'),
                { status: 403 }
            );
        }
            
        const assignmentId = id;
        const body = await request.json();
        const { blocks, expectedRpe, scheduledDate, workoutName, applyToGroup } = body;

        // Fetch assignment with training to verify ownership and get group info
        const { data: assignment, error: fetchError } = await supabase
            .from('training_assignments')
            .select(`
                id,
                training_id,
                scheduled_date,
                completed,
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
            return NextResponse.json(apiError('ASSIGNMENT_NOT_FOUND'),
                { status: 404 }
            );
        }

        if (assignment.completed) {
            return NextResponse.json(apiError('AUTH_UPDATE_ASSIGNMENT_FORBIDDEN'),
                { status: 403 }
            );
        }

        const training = assignment.training as unknown as TrainingForResponse;
        const actorTeamId = profile?.team_id ?? training.team_id;

        // Verify training belongs to coach team unless this is a global admin
        if (profile!.role === 'COACH' && training.team_id !== profile.team_id) {
            return NextResponse.json(apiError('AUTH_UPDATE_ASSIGNMENT_FORBIDDEN'),
                { status: 403 }
            );
        }

        const updatePayload: Record<string, unknown> = {
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
                    team_id: actorTeamId,
                })
                .select()
                .single();

            if (createError || !newTraining) {
                appLogger.error('Create training error:', createError);
                return NextResponse.json(apiError('FAILED_TO_CREATE_UPDATED_TRAINING'),
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

        if (workoutName !== undefined) {
            updatePayload.workout_name = typeof workoutName === 'string' && workoutName.trim()
                ? workoutName.trim()
                : null;
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
                appLogger.error('Update group assignments error:', updateError);
                return NextResponse.json(apiError('FAILED_TO_UPDATE_GROUP_ASSIGNMENTS'),
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
                appLogger.error('Update assignment error:', updateError);
                return NextResponse.json(apiError('FAILED_TO_UPDATE_ASSIGNMENT'),
                    { status: 500 }
                );
            }

            if (profile!.role === 'ADMIN') {
                await appendAdminActionLog({
                    actorId: user!.id,
                    actorRole: 'ADMIN',
                    teamId: actorTeamId,
                    action: 'training_assignment.updated',
                    targetType: 'training_assignment',
                    targetId: assignmentId,
                    metadata: {
                        applyToGroup: !!applyToGroup,
                        updatedFields: Object.keys(updatePayload),
                    },
                });
            }

            return NextResponse.json({
                message: 'Workout updated successfully',
                trainingId: trainingIdToUse,
            });
        }
    } catch (error: unknown) {
        appLogger.error('Update assignment error:', error);
        return NextResponse.json(apiError('INTERNAL_SERVER_ERROR'),
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
        const { user, supabase, profile, response } = await requireRole('COACH');

        if (response) {
            return response;
        }

        if (!profile?.team_id) {
            return NextResponse.json(apiError('AUTH_COACH_TEAM_REQUIRED'),
                { status: 403 }
            );
        }
            
        const assignmentId = id;
        
        // Try to parse body for applyToGroup flag
        let applyToGroup = false;
        try {
            const body = await request.json();
            applyToGroup = body.applyToGroup || false;
        } catch {
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
            return NextResponse.json(apiError('ASSIGNMENT_NOT_FOUND'),
                { status: 404 }
            );
        }

        // Verify training belongs to coach team
        const training = assignment.training as unknown as { team_id: string | null };
        if (training.team_id !== profile.team_id) {
            return NextResponse.json(apiError('AUTH_DELETE_ASSIGNMENT_FORBIDDEN'),
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
                appLogger.error('Delete group assignments error:', deleteError);
                return NextResponse.json(apiError('FAILED_TO_DELETE_GROUP_ASSIGNMENTS'),
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
                appLogger.error('Delete assignment error:', deleteError);
                return NextResponse.json(apiError('FAILED_TO_DELETE_ASSIGNMENT'),
                    { status: 500 }
                );
            }

            if (profile!.role === 'ADMIN') {
                await appendAdminActionLog({
                    actorId: user!.id,
                    actorRole: 'ADMIN',
                    teamId: profile!.team_id!,
                    action: 'training_assignment.deleted',
                    targetType: 'training_assignment',
                    targetId: assignmentId,
                    metadata: {
                        applyToGroup: !!applyToGroup,
                    },
                });
            }

            return NextResponse.json({
                message: 'Assignment deleted successfully',
            });
        }
    } catch (error: unknown) {
        appLogger.error('Delete assignment error:', error);
        return NextResponse.json(apiError('INTERNAL_SERVER_ERROR'),
            { status: 500 }
        );
    }
}
