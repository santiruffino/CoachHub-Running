import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/api-helpers';
import { format, subDays, addDays } from 'date-fns';

/**
 * Get Candidate Activities for Assignment Match
 * 
 * Returns a list of activities around the scheduled date of the assignment
 * that are potential candidates for manual matching.
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
        const assignmentId = id;

        // Fetch assignment details
        const { data: assignment, error: fetchError } = await supabase
            .from('training_assignments')
            .select('user_id, scheduled_date')
            .eq('id', assignmentId)
            .single();

        if (fetchError || !assignment) {
            return NextResponse.json(
                { error: 'Assignment not found' },
                { status: 404 }
            );
        }

        // Authorization check
        if (user!.role === 'ATHLETE' && assignment.user_id !== user!.id) {
            return NextResponse.json(
                { error: 'Not authorized' },
                { status: 403 }
            );
        }

        // Search window: +/- 2 days from scheduled date
        const scheduledDate = new Date(assignment.scheduled_date);
        const startDate = subDays(scheduledDate, 2);
        const endDate = addDays(scheduledDate, 2);

        const { data: activities, error: activitiesError } = await supabase
            .from('activities')
            .select('id, title, start_date, distance, duration, sport_type')
            .eq('user_id', assignment.user_id)
            .gte('start_date', startDate.toISOString())
            .lte('start_date', endDate.toISOString())
            .order('start_date', { ascending: false });

        if (activitiesError) {
            throw activitiesError;
        }

        return NextResponse.json(activities || []);

    } catch (error: any) {
        console.error('Get candidate activities error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
