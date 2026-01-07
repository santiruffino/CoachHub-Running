import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/api-helpers';

/**
 * Get Activity Details with Streams
 * 
 * Fetches detailed activity information including stream data
 * (heart rate, pace, altitude, etc.)
 * 
 * Permissions:
 * - Activity owner can view
 * - Coach can view if athlete is in their groups
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ activityId: string }> }
) {
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
            return NextResponse.json(
                { error: 'Activity not found' },
                { status: 404 }
            );
        }

        // Check permissions
        if (activity.user_id !== user!.id) {
            // Check if user is a coach viewing athlete's activity
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user!.id)
                .single();

            if (profile?.role === 'COACH') {
                // Verify athlete is in coach's groups
                const { data: membership } = await supabase
                    .from('athlete_groups')
                    .select(`
            group:groups!inner(
              coach_id
            )
          `)
                    .eq('athlete_id', activity.user_id)
                    .eq('group.coach_id', user!.id)
                    .limit(1)
                    .single();

                if (!membership) {
                    return NextResponse.json(
                        { error: 'Not authorized to view this activity' },
                        { status: 403 }
                    );
                }
            } else {
                return NextResponse.json(
                    { error: 'Not authorized to view this activity' },
                    { status: 403 }
                );
            }
        }

        return NextResponse.json(activity);
    } catch (error: any) {
        console.error('Get activity details error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
