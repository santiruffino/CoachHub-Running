import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/api-helpers';

/**
 * Get User Assignments
 * 
 * Fetches training assignments for the authenticated user.
 * Includes full training details for each assignment.
 */
export async function GET(request: NextRequest) {
    try {
        const authResult = await requireAuth();

        if (authResult.response) {
            return authResult.response;
        }

        const { supabase, user } = authResult;

        // Fetch assignments with training details
        const { data: assignments, error } = await supabase
            .from('training_assignments')
            .select(`
        id,
        scheduled_date,
        completed,
        feedback,
        created_at,
        updated_at,
        workout_name,
        training:trainings(
          id,
          title,
          description,
          type,
          blocks,
          is_template
        )
      `)
            .eq('user_id', user!.id)
            .order('scheduled_date', { ascending: true });

        if (error) {
            console.error('Fetch assignments error:', error);
            return NextResponse.json(
                { error: 'Failed to fetch assignments' },
                { status: 500 }
            );
        }

        return NextResponse.json(assignments || []);
    } catch (error: any) {
        console.error('Get assignments error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
