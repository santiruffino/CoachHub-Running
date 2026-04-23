import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/supabase/api-helpers';

/**
 * GET /v2/users/[id]/races
 * 
 * Fetches races for a specific user.
 * 
 * Permissions:
 * - User can view their own races
 * - Coach can view their athletes' races
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
                        { error: 'Not authorized to view this user\'s races' },
                        { status: 403 }
                    );
                }
            } else if (profile?.role !== 'ADMIN') {
                return NextResponse.json(
                    { error: 'Not authorized to view this user\'s races' },
                    { status: 403 }
                );
            }
        }

        // Fetch athlete races with joined race info
        const { data: athleteRaces, error } = await supabase
            .from('athlete_races')
            .select(`
                *,
                race:races(*)
            `)
            .eq('athlete_id', targetUserId)
            .order('date', { ascending: true });

        if (error) {
            console.error('Fetch athlete races error:', error);
            return NextResponse.json(
                { error: 'Failed to fetch athlete races' },
                { status: 500 }
            );
        }

        return NextResponse.json(athleteRaces || []);
    } catch (error: any) {
        console.error('GET /v2/users/[id]/races error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * POST /v2/users/[id]/races
 * 
 * Assigns a race to a user.
 * 
 * Permissions:
 * - Coaches can manage races for their athletes
 * - Admins can manage races for any athlete
 */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const authResult = await requireRole(['COACH', 'ADMIN']);
        if (authResult.response) {
            return authResult.response;
        }

        const { supabase, user } = authResult;
        const targetUserId = id;

        // If coach, verify they manage this athlete
        const { data: userProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user!.id)
            .single();

        if (userProfile?.role === 'COACH') {
            const { data: athleteProfile } = await supabase
                .from('profiles')
                .select('coach_id')
                .eq('id', targetUserId)
                .single();

            if (!athleteProfile || athleteProfile.coach_id !== user!.id) {
                return NextResponse.json(
                    { error: 'Not authorized to assign races to this athlete' },
                    { status: 403 }
                );
            }
        }

        const body = await request.json();
        const {
            race_id,
            name_override,
            date,
            priority,
            target_time,
            status,
            notes
        } = body;

        if (!date) {
            return NextResponse.json(
                { error: 'Race date is required' },
                { status: 400 }
            );
        }

        const { data: athleteRace, error } = await supabase
            .from('athlete_races')
            .insert({
                athlete_id: targetUserId,
                race_id,
                name_override,
                date,
                priority: priority || 'C',
                target_time,
                status: status || 'PLANNED',
                notes
            })
            .select(`
                *,
                race:races(*)
            `)
            .single();

        if (error) {
            console.error('Create athlete race error:', error);
            return NextResponse.json(
                { error: 'Failed to assign race' },
                { status: 500 }
            );
        }

        return NextResponse.json(athleteRace, { status: 201 });
    } catch (error: any) {
        console.error('POST /v2/users/[id]/races error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
