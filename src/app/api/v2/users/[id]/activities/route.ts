import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/api-helpers';

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
    try {
        const { id } = await params;
        const authResult = await requireAuth();

        if (authResult.response) {
            return authResult.response;
        }

        const { supabase, user } = authResult;
        const targetUserId = id;

        // Check permissions
        if (user!.id !== targetUserId) {
            // User is trying to view someone else's activities
            // Check if they're a coach viewing an athlete
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user!.id)
                .single();

            if (profile?.role === 'COACH') {
                // Verify athlete belongs to this coach via coach_id
                const { data: athleteProfile } = await supabase
                    .from('profiles')
                    .select('coach_id')
                    .eq('id', targetUserId)
                    .single();

                if (!athleteProfile || athleteProfile.coach_id !== user!.id) {
                    return NextResponse.json(
                        { error: 'Not authorized to view this user\'s activities' },
                        { status: 403 }
                    );
                }
            } else {
                return NextResponse.json(
                    { error: 'Not authorized to view this user\'s activities' },
                    { status: 403 }
                );
            }
        }

        // Fetch activities
        const { data: activities, error } = await supabase
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
        avg_hr,
        max_hr,
        is_private,
        created_at
      `)
            .eq('user_id', targetUserId)
            .order('start_date', { ascending: false });

        if (error) {
            console.error('Fetch activities error:', error);
            return NextResponse.json(
                { error: 'Failed to fetch activities' },
                { status: 500 }
            );
        }

        return NextResponse.json(activities || []);
    } catch (error: any) {
        console.error('Get activities error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
