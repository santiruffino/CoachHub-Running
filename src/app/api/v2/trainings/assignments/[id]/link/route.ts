import { NextRequest, NextResponse } from 'next/server';
import { getRequesterProfile, requireAuth } from '@/lib/supabase/api-helpers';

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
        const { profile: requesterProfile, error: requesterError } = await getRequesterProfile(user!.id);

        if (requesterError || !requesterProfile) {
            return NextResponse.json(
                { error: 'Not authorized' },
                { status: 403 }
            );
        }

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

        // Authorization: Athlete owner OR Coach in the same team as athlete
        if (assignment.user_id !== requesterProfile.id) {
            if (requesterProfile.role === 'COACH' || requesterProfile.role === 'ADMIN') {
                if (!requesterProfile.team_id) {
                    return NextResponse.json(
                        { error: 'Not authorized' },
                        { status: 403 }
                    );
                }

                const { data: athleteProfile, error: coachError } = await supabase
                    .from('profiles')
                    .select('id, team_id')
                    .eq('id', assignment.user_id)
                    .eq('team_id', requesterProfile.team_id)
                    .single();

                if (coachError || !athleteProfile) {
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

        // Resolve activity ID (internal UUID only)
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activityId);
        if (!isUuid) {
            return NextResponse.json(
                { error: 'Activity ID must be a valid UUID' },
                { status: 400 }
            );
        }

        const resolvedActivityId = activityId;

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

    } catch (error: unknown) {
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
        const { profile: requesterProfile, error: requesterError } = await getRequesterProfile(user!.id);

        if (requesterError || !requesterProfile) {
            return NextResponse.json(
                { error: 'Not authorized' },
                { status: 403 }
            );
        }

        // Verify ownership before unlinking
        const { data: assignment, error: assignmentError } = await supabase
            .from('training_assignments')
            .select('user_id')
            .eq('id', assignmentId)
            .single();

        if (assignmentError || !assignment) {
            return NextResponse.json(
                { error: 'Assignment not found' },
                { status: 404 }
            );
        }

        if (assignment.user_id !== requesterProfile.id) {
            if (requesterProfile.role !== 'COACH' && requesterProfile.role !== 'ADMIN') {
                return NextResponse.json(
                    { error: 'Not authorized' },
                    { status: 403 }
                );
            }

            const { data: athleteProfile, error: athleteError } = await supabase
                .from('profiles')
                .select('team_id')
                .eq('id', assignment.user_id)
                .single();

            if (
                athleteError ||
                !athleteProfile ||
                !requesterProfile.team_id ||
                athleteProfile.team_id !== requesterProfile.team_id
            ) {
                return NextResponse.json(
                    { error: 'Not authorized' },
                    { status: 403 }
                );
            }
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
    } catch (error: unknown) {
        console.error('Unlink activity error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
