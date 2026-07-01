import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/api-helpers';
import { apiError } from '@/lib/api/error-response';
import { reportApiError } from '@/lib/api/report-error';
import { createRequestLogger } from '@/lib/logger';

/**
 * Get Activity Details with Streams
 * 
 * Fetches detailed activity information including stream data
 * (heart rate, pace, altitude, etc.)
 * 
 * Permissions:
 * - Activity owner can view
 * - Coach/Admin can view if athlete is in their team
 */
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ activityId: string }> }
) {
    const { requestId, logger } = createRequestLogger('/api/v2/users/activities/[activityId]', _request);
    try {
        const { activityId } = await params;
        const authResult = await requireAuth();

        if (authResult.response) {
            return authResult.response;
        }

        const { supabase, user } = authResult;


        // Fetch activity with streams
        const { data: activity, error: activityError } = await supabase
            .from('activities')
            .select(`
        *,
        streams:strava_activity_streams(
          id,
          type,
          data,
          resolution
        )
      `)
            .eq('id', activityId)
            .single();

        if (activityError || !activity) {
            return NextResponse.json(apiError('ACTIVITY_NOT_FOUND'),
                { status: 404 }
            );
        }

        // Check permissions
        if (activity.user_id !== user!.id) {
            // Check if user is a coach/admin viewing athlete's activity
            const { data: profile } = await supabase
                .from('profiles')
                .select('role, team_id')
                .eq('id', user!.id)
                .single();

            if (profile?.role === 'COACH' || profile?.role === 'ADMIN') {
                const { data: athleteProfile } = await supabase
                    .from('profiles')
                    .select('team_id')
                    .eq('id', activity.user_id)
                    .single();

                if (!athleteProfile || !profile.team_id || athleteProfile.team_id !== profile.team_id) {
                    return NextResponse.json(apiError('AUTH_FORBIDDEN'),
                        { status: 403 }
                    );
                }
            } else {
                return NextResponse.json(apiError('AUTH_FORBIDDEN'),
                    { status: 403 }
                );
            }
        }

        return NextResponse.json(activity);
    } catch (error: unknown) {
        reportApiError(error, { route: '/api/v2/users/activities/[activityId]', method: 'GET', requestId, logger });
        return NextResponse.json(apiError('INTERNAL_SERVER_ERROR'),
            { status: 500 }
        );
    }
}
