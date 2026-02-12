import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/api-helpers';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const assignmentId = id;
        const body = await request.json();
        const { activityId } = body;

        if (!activityId) {
            return NextResponse.json(
                { error: 'Activity ID is required' },
                { status: 400 }
            );
        }

        const authResult = await requireAuth();
        if (authResult.response) {
            return authResult.response;
        }

        const { supabase, user } = authResult;

        // Verify assignment belongs to user (or user is coach)
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

        // Authorization: Athlete owner OR Coach of athlete
        if (assignment.user_id !== user!.id) {
            if (user!.role === 'COACH') {
                const { data: isCoach, error: coachError } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('id', assignment.user_id)
                    .eq('coach_id', user!.id)
                    .single();

                if (coachError || !isCoach) {
                    return NextResponse.json(
                        { error: 'Not authorized' },
                        { status: 403 }
                    );
                }
            } else {
                return NextResponse.json(
                    { error: 'Not authorized' },
                    { status: 403 }
                );
            }
        }

        // Resolve activity ID (handle external ID case)
        // Try to find activity by ID or external_id
        let resolvedActivityId = activityId;

        // Check if it's a valid UUID (simple regex check)
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activityId);

        if (!isUuid) {
            // Likely an external ID, look it up
            const { data: activity } = await supabase
                .from('activities')
                .select('id')
                .eq('external_id', activityId)
                .single();

            if (activity) {
                resolvedActivityId = activity.id;
            } else {
                return NextResponse.json(
                    { error: 'Activity not found' },
                    { status: 404 }
                );
            }
        }

        const { error: updateError } = await supabase
            .from('training_assignments')
            .update({ activity_id: resolvedActivityId })
            .eq('id', assignmentId);

        if (updateError) {
            console.error('Failed to link activity:', updateError);
            return NextResponse.json(
                { error: 'Failed to link activity' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Link activity error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const assignmentId = id;

        const authResult = await requireAuth();
        if (authResult.response) {
            return authResult.response;
        }

        const { supabase, user } = authResult;

        // Verify ownership before unlinking
        const { data: assignment } = await supabase
            .from('training_assignments')
            .select('user_id')
            .eq('id', assignmentId)
            .single();

        if (assignment && assignment.user_id !== user!.id) {
            return NextResponse.json(
                { error: 'Not authorized' },
                { status: 403 }
            );
        }

        const { error: updateError } = await supabase
            .from('training_assignments')
            .update({ activity_id: null })
            .eq('id', assignmentId);

        if (updateError) {
            console.error('Failed to unlink activity:', updateError);
            return NextResponse.json(
                { error: 'Failed to unlink activity' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Unlink activity error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
