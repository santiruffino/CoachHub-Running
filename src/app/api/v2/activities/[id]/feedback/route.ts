import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/api-helpers';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Get Activity Feedback
 * 
 * Retrieves feedback for a specific activity.
 * Athletes can view their own feedback, coaches can view their athletes' feedback.
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

        // Get the activity to find the owner
        const { data: activity, error: activityError } = await supabase
            .from('activities')
            .select('user_id, external_id')
            .eq('external_id', id)
            .single();

        if (activityError || !activity) {
            return NextResponse.json(
                { error: 'Activity not found' },
                { status: 404 }
            );
        }

        // Check if user is the activity owner or their coach
        const isOwner = user!.id === activity.user_id;
        let isCoach = false;

        if (!isOwner) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('coach_id')
                .eq('id', activity.user_id)
                .single();

            isCoach = profile?.coach_id === user!.id;

            if (!isCoach) {
                return NextResponse.json(
                    { error: 'Not authorized to view this feedback' },
                    { status: 403 }
                );
            }
        }

        // Get feedback using service role to handle RLS
        const serviceSupabase = createServiceRoleClient();
        const { data: feedback, error: feedbackError } = await serviceSupabase
            .from('activity_feedback')
            .select('*')
            .eq('user_id', activity.user_id)
            .eq('activity_id', (await supabase
                .from('activities')
                .select('id')
                .eq('external_id', id)
                .single()).data?.id!)
            .maybeSingle();

        if (feedbackError) {
            console.error('Feedback fetch error:', feedbackError);
            return NextResponse.json(
                { error: 'Failed to fetch feedback' },
                { status: 500 }
            );
        }

        return NextResponse.json(feedback || null);
    } catch (error: any) {
        console.error('Get activity feedback error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * Submit/Update Activity Feedback
 * 
 * Athletes can submit or update their feedback for an activity.
 */
export async function POST(
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
        const body = await request.json();

        const { rpe, comments, training_assignment_id } = body;

        // Validate RPE if provided
        if (rpe !== undefined && (rpe < 1 || rpe > 10)) {
            return NextResponse.json(
                { error: 'RPE must be between 1 and 10' },
                { status: 400 }
            );
        }

        // Get the activity and verify ownership
        const { data: activity, error: activityError } = await supabase
            .from('activities')
            .select('id, user_id, external_id')
            .eq('external_id', id)
            .single();

        if (activityError || !activity) {
            return NextResponse.json(
                { error: 'Activity not found' },
                { status: 404 }
            );
        }

        // Verify user owns this activity
        if (activity.user_id !== user!.id) {
            return NextResponse.json(
                { error: 'Only the athlete can submit feedback on their own activities' },
                { status: 403 }
            );
        }

        // Upsert feedback
        const { data: feedback, error: feedbackError } = await supabase
            .from('activity_feedback')
            .upsert({
                activity_id: activity.id,
                user_id: user!.id,
                rpe: rpe || null,
                comments: comments || null,
                training_assignment_id: training_assignment_id || null,
            }, {
                onConflict: 'activity_id,user_id'
            })
            .select()
            .single();

        if (feedbackError) {
            console.error('Feedback upsert error:', feedbackError);
            return NextResponse.json(
                { error: 'Failed to save feedback' },
                { status: 500 }
            );
        }

        return NextResponse.json(feedback);
    } catch (error: any) {
        console.error('Submit activity feedback error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
