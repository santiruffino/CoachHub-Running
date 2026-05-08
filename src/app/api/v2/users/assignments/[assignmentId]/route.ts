import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/api-helpers';
import { appLogger } from '@/lib/app-logger';
import { apiError } from '@/lib/api/error-response';

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

        const { scheduledDate } = (await request.json()) as { scheduledDate?: string };

        if (!scheduledDate) {
            return NextResponse.json(apiError('VALIDATION_SCHEDULEDDATE_IS_REQUIRED', 'scheduledDate is required'),
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
            return NextResponse.json(apiError('ASSIGNMENT_NOT_FOUND', 'Assignment not found'),
                { status: 404 }
            );
        }

        if (assignment.user_id !== user!.id) {
            return NextResponse.json(apiError('AUTH_FORBIDDEN', 'Not authorized to update this assignment'),
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
            appLogger.error('Update assignment error:', updateError);
            return NextResponse.json(apiError('FAILED_TO_UPDATE_ASSIGNMENT', 'Failed to update assignment'),
                { status: 500 }
            );
        }

        return NextResponse.json(updated);
    } catch (error: unknown) {
        appLogger.error('Update assignment error:', error);
        return NextResponse.json(apiError('INTERNAL_SERVER_ERROR', 'Internal server error'),
            { status: 500 }
        );
    }
}
