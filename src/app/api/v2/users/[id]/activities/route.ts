import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/api-helpers';
import { createServiceRoleClient } from '@/lib/supabase/server';
import * as Sentry from '@sentry/nextjs';
import { createRequestLogger, withRequestId } from '@/lib/logger';

/**
 * Get User Activities
 * 
 * Fetches activities for a specific user.
 * 
 * Permissions:
 * - User can view their own activities
 * - Coach can view athlete's activities (if in their groups)
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { requestId, logger } = createRequestLogger('/api/v2/users/[id]/activities', request);
    const respond = (body: unknown, init?: ResponseInit) =>
        NextResponse.json(body, withRequestId(init, requestId));

    try {
        const { id } = await params;
        const authResult = await requireAuth();

        if (authResult.response) {
            authResult.response.headers.set('x-request-id', requestId);
            return authResult.response;
        }

        const { supabase, user } = authResult;
        const targetUserId = id;

        // Check permissions
        if (user!.id !== targetUserId) {
            // User is trying to view someone else's activities
            // Check if they're a coach viewing a team athlete
            const { data: profile } = await supabase
                .from('profiles')
                .select('role, team_id')
                .eq('id', user!.id)
                .single();

            if (profile?.role === 'COACH' || profile?.role === 'ADMIN') {
                // Verify athlete belongs to the same team
                const { data: athleteProfile } = await supabase
                    .from('profiles')
                    .select('team_id')
                    .eq('id', targetUserId)
                    .single();

                if (!athleteProfile || !profile.team_id || athleteProfile.team_id !== profile.team_id) {
                    logger.warn('user_activities.forbidden_cross_team_access', { userId: user!.id, targetUserId });
                    return respond(
                        { error: 'Not authorized to view this user\'s activities' },
                        { status: 403 }
                    );
                }
            } else {
                logger.warn('user_activities.forbidden_role_access', { userId: user!.id, targetUserId });
                return respond(
                    { error: 'Not authorized to view this user\'s activities' },
                    { status: 403 }
                );
            }
        }

        // Fetch activities with service role to avoid RLS filtering after auth check above
        const serviceSupabase = createServiceRoleClient();
        const { data: activities, error } = await serviceSupabase
            .from('activities')
        .select(`
        id,
        external_id,
        title,
        type,
        distance,
        duration,
        start_date,
        elapsed_time,
        elevation_gain,
        metadata,
        avg_hr,
        max_hr,
        is_private,
        created_at
      `)
            .eq('user_id', targetUserId)
            .order('start_date', { ascending: false });

        if (error) {
            logger.error('user_activities.fetch_failed', { userId: user!.id, targetUserId, error });
            return respond(
                { error: 'Failed to fetch activities' },
                { status: 500 }
            );
        }

        const activityIds = (activities || []).map((activity) => activity.id);
        let feedbackByActivity = new Set<string>();

        if (activityIds.length > 0) {
            const { data: feedbackRows } = await serviceSupabase
                .from('activity_feedback')
                .select('activity_id')
                .eq('user_id', targetUserId)
                .in('activity_id', activityIds);

            feedbackByActivity = new Set(
                (feedbackRows || [])
                    .map((row) => row.activity_id)
                    .filter((value): value is string => typeof value === 'string')
            );
        }

        const activitiesWithFeedback = (activities || []).map((activity) => ({
            ...activity,
            deviceName: typeof activity.metadata?.device_name === 'string' ? activity.metadata.device_name : undefined,
            hasFeedback: feedbackByActivity.has(activity.id),
        }));

        logger.debug('user_activities.fetch_success', {
            userId: user!.id,
            targetUserId,
            activities: activitiesWithFeedback.length,
        });

        return respond(activitiesWithFeedback, { status: 200 });
    } catch (error: unknown) {
        logger.error('user_activities.unhandled_error', { error });
        Sentry.captureException(error, {
            tags: { route: '/api/v2/users/[id]/activities', requestId },
        });
        return respond(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
