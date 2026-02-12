import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/api-helpers';
import { addDays, subDays } from 'date-fns';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const activityId = id;
        const authResult = await requireAuth();

        if (authResult.response) {
            return authResult.response;
        }

        const { supabase, user } = authResult;

        // Fetch activity to get user_id and start_date. The ID in URL is likely the external Strava ID
        // Try finding by external_id first, then fallback to id if not found (just in case)
        let { data: activity, error: activityError } = await supabase
            .from('activities')
            .select('user_id, start_date')
            .eq('external_id', activityId)
            .single();

        if (!activity) {
            // Fallback trial by UUID
            const { data: activityById, error: errorById } = await supabase
                .from('activities')
                .select('user_id, start_date')
                .eq('id', activityId)
                .single();

            activity = activityById;
            activityError = errorById;
        }

        if (activityError || !activity) {
            return NextResponse.json(
                { error: 'Activity not found' },
                { status: 404 }
            );
        }

        if (activity.user_id !== user!.id) {
            // Check if user is a coach for this athlete
            if (user!.role === 'COACH') {
                const { data: isCoach, error: coachError } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('id', activity.user_id)
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

        // Search window: +/- 2 days from activity date
        const activityDate = new Date(activity.start_date);
        const startDate = subDays(activityDate, 2);
        const endDate = addDays(activityDate, 2);

        // Fetch assignments in range for the ACTIVITY OWNER (not necessarily the logged in user)
        const { data: assignments, error: assignmentsError } = await supabase
            .from('training_assignments')
            .select(`
                id,
                scheduled_date,
                completed,
                activity_id,
                training:trainings(
                    title,
                    type
                )
            `)
            .eq('user_id', activity.user_id) // Use activity owner's ID
            .gte('scheduled_date', startDate.toISOString())
            .lte('scheduled_date', endDate.toISOString())
            .order('scheduled_date', { ascending: false });

        if (assignmentsError) {
            throw assignmentsError;
        }

        // Filter out assignments that are already linked to OTHER activities?
        // Or just return them all and let UI handle it. 
        // Returning all seems safer so user sees what's available.

        // Transform for UI
        const candidates = (assignments || []).map((a: any) => ({
            id: a.id,
            scheduledDate: a.scheduled_date,
            title: a.training?.title || 'Untitled Workout',
            type: a.training?.type,
            isLinked: !!a.activity_id,
            isLinkedToThis: a.activity_id === activityId
        }));

        return NextResponse.json(candidates);

    } catch (error: any) {
        console.error('Get candidate assignments error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
