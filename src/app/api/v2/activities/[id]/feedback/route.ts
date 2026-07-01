import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/api-helpers';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createRequestLogger } from '@/lib/logger';
import { apiError } from '@/lib/api/error-response';
import { reportApiError } from '@/lib/api/report-error';

/**
 * Get Activity Feedback
 * 
 * Retrieves feedback for a specific activity.
 * Athletes can view their own feedback, coaches can view their athletes' feedback.
 */
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { requestId, logger } = createRequestLogger('/api/v2/activities/[id]/feedback', _request);
    try {
        const { id } = await params;
        const authResult = await requireAuth();

        if (authResult.response) {
            return authResult.response;
        }

        const { supabase, user } = authResult;
        const serviceSupabase = createServiceRoleClient();

        // Get the activity to find the owner
        const { data: activity, error: activityError } = await serviceSupabase
            .from('activities')
            .select('id, user_id')
            .eq('id', id)
            .single();

        if (activityError || !activity) {
            return NextResponse.json(
                apiError('ACTIVITY_NOT_FOUND'),
                { status: 404 }
            );
        }

        // Check if user is the activity owner or coach/admin in the same team
        const isOwner = user!.id === activity.user_id;

        if (!isOwner) {
            const { data: myProfile } = await supabase
                .from('profiles')
                .select('role, team_id')
                .eq('id', user!.id)
                .single();

            const { data: athleteProfile } = await supabase
                .from('profiles')
                .select('team_id')
                .eq('id', activity.user_id)
                .single();

            const isTeamMember = (myProfile?.role === 'COACH' || myProfile?.role === 'ADMIN')
                && myProfile.team_id
                && athleteProfile?.team_id === myProfile.team_id;

            if (!isTeamMember) {
                return NextResponse.json(
                    apiError('FEEDBACK_VIEW_FORBIDDEN'),
                    { status: 403 }
                );
            }
        }

        // Get feedback using service role to handle RLS
        const { data: feedback, error: feedbackError } = await serviceSupabase
            .from('activity_feedback')
            .select('*')
            .eq('user_id', activity.user_id)
            .eq('activity_id', activity.id)
            .maybeSingle();

        if (feedbackError) {
            logger.error('Feedback fetch error', { error: feedbackError });
            return NextResponse.json(
                apiError('FEEDBACK_FETCH_FAILED'),
                { status: 500 }
            );
        }

        return NextResponse.json(feedback || null);
    } catch (error: unknown) {
        reportApiError(error, { route: '/api/v2/activities/[id]/feedback', method: 'GET', requestId, logger });
        return NextResponse.json(
            apiError('INTERNAL_SERVER_ERROR'),
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
    const { requestId, logger } = createRequestLogger('/api/v2/activities/[id]/feedback', request);
    try {
        const { id } = await params;
        const authResult = await requireAuth();

        if (authResult.response) {
            return authResult.response;
        }

        const { user } = authResult;
        const serviceSupabase = createServiceRoleClient();
        const body = (await request.json()) as {
            rpe?: number;
            comments?: string;
            training_assignment_id?: string;
        };

        const { rpe, comments, training_assignment_id } = body;

        // Validate RPE if provided
        if (rpe !== undefined && (rpe < 1 || rpe > 10)) {
            return NextResponse.json(
                apiError('RPE_OUT_OF_RANGE'),
                { status: 400 }
            );
        }

        // Get the activity and verify ownership
        const { data: activity, error: activityError } = await serviceSupabase
            .from('activities')
            .select('id, user_id')
            .eq('id', id)
            .single();

        if (activityError || !activity) {
            return NextResponse.json(
                apiError('ACTIVITY_NOT_FOUND'),
                { status: 404 }
            );
        }

        // Verify user owns this activity
        if (activity.user_id !== user!.id) {
            return NextResponse.json(
                apiError('FEEDBACK_SUBMIT_FORBIDDEN'),
                { status: 403 }
            );
        }

        // Upsert feedback
        const payload: {
            activity_id: string;
            user_id: string;
            training_assignment_id: string | null;
            rpe?: number | null;
            comments?: string | null;
        } = {
            activity_id: activity.id,
            user_id: user!.id,
            training_assignment_id: training_assignment_id || null,
        };

        if (rpe !== undefined) {
            payload.rpe = rpe || null;
        }

        if (comments !== undefined) {
            payload.comments = comments || null;
        }

        const { data: feedback, error: feedbackError } = await serviceSupabase
            .from('activity_feedback')
            .upsert(payload, {
                onConflict: 'activity_id,user_id'
            })
            .select()
            .single();

        if (feedbackError) {
            logger.error('Feedback upsert error', { error: feedbackError });
            return NextResponse.json(
                apiError('FEEDBACK_SAVE_FAILED'),
                { status: 500 }
            );
        }


        return NextResponse.json(feedback);
    } catch (error: unknown) {
        reportApiError(error, { route: '/api/v2/activities/[id]/feedback', method: 'POST', requestId, logger });
        return NextResponse.json(
            apiError('INTERNAL_SERVER_ERROR'),
            { status: 500 }
        );
    }
}
