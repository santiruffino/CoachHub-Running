import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/api-helpers';

/**
 * PATCH /v2/users/[id]/races/[athleteRaceId]
 * 
 * Updates a specific race assignment for an athlete.
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; athleteRaceId: string }> }
) {
    try {
        const { id, athleteRaceId } = await params;
        const authResult = await requireAuth();

        if (authResult.response) {
            return authResult.response;
        }

        const { supabase, user } = authResult;
        const targetUserId = id;

        // Permission Check
        if (user!.id !== targetUserId) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user!.id)
                .single();

            if (profile?.role === 'COACH') {
                // Verify athlete belongs to this coach
                const { data: athleteProfile } = await supabase
                    .from('profiles')
                    .select('coach_id')
                    .eq('id', targetUserId)
                    .single();

                if (!athleteProfile || athleteProfile.coach_id !== user!.id) {
                    return NextResponse.json(
                        { error: 'Not authorized to update this user\'s races' },
                        { status: 403 }
                    );
                }
            } else if (profile?.role !== 'ADMIN') {
                return NextResponse.json(
                    { error: 'Not authorized to update this user\'s races' },
                    { status: 403 }
                );
            }
        }

        const body = await request.json();
        const {
            name_override,
            date,
            priority,
            target_time,
            status,
            result_time,
            notes
        } = body;

        const { data: athleteRace, error } = await supabase
            .from('athlete_races')
            .update({
                name_override,
                date,
                priority,
                target_time,
                status,
                result_time,
                notes
            })
            .eq('id', athleteRaceId)
            .eq('athlete_id', targetUserId)
            .select(`
                *,
                race:races(*)
            `)
            .single();

        if (error) {
            console.error('Update athlete race error:', error);
            return NextResponse.json(
                { error: 'Failed to update race assignment' },
                { status: 500 }
            );
        }

        return NextResponse.json(athleteRace);
    } catch (error: any) {
        console.error('PATCH /v2/users/[id]/races/[athleteRaceId] error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /v2/users/[id]/races/[athleteRaceId]
 * 
 * Removes a race assignment.
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; athleteRaceId: string }> }
) {
    try {
        const { id, athleteRaceId } = await params;
        const authResult = await requireAuth();

        if (authResult.response) {
            return authResult.response;
        }

        const { supabase, user } = authResult;
        const targetUserId = id;

        // Deletion is restricted to COACH or ADMIN roles per business logic and RLS
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user!.id)
            .single();

        if (profile?.role === 'COACH') {
            // Verify athlete belongs to this coach
            const { data: athleteProfile } = await supabase
                .from('profiles')
                .select('coach_id')
                .eq('id', targetUserId)
                .single();

            if (!athleteProfile || athleteProfile.coach_id !== user!.id) {
                return NextResponse.json(
                    { error: 'Not authorized to delete this user\'s races' },
                    { status: 403 }
                );
            }
        } else if (profile?.role !== 'ADMIN') {
            // Athletes cannot delete assignments, only update them (per RLS)
            return NextResponse.json(
                { error: 'Not authorized to delete race assignments' },
                { status: 403 }
            );
        }

        const { error } = await supabase
            .from('athlete_races')
            .delete()
            .eq('id', athleteRaceId)
            .eq('athlete_id', targetUserId);

        if (error) {
            console.error('Delete athlete race error:', error);
            return NextResponse.json(
                { error: 'Failed to delete race assignment' },
                { status: 500 }
            );
        }

        return new Response(null, { status: 204 });
    } catch (error: any) {
        console.error('DELETE /v2/users/[id]/races/[athleteRaceId] error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
