import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/supabase/api-helpers';
import { createServiceRoleClient } from '@/lib/supabase/server';

type AssignmentWithTraining = {
    id: string;
    scheduled_date: string;
    completed: boolean;
    activity_id: string | null;
    expected_rpe: number | null;
    training: unknown;
};

/**
 * Get Athlete Details
 * 
 * Fetches comprehensive athlete information including:
 * - Profile data
 * - Athlete-specific data (metrics, stats)
 * - Groups membership
 * - Recent activities
 * 
 * Access: COACH (for their athletes) or ATHLETE (for their own data)
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
        const serviceSupabase = createServiceRoleClient();
        const athleteId = id;

        const { data: requesterProfile, error: requesterProfileError } = await supabase
            .from('profiles')
            .select('id, role, team_id')
            .eq('id', user!.id)
            .single();

        if (requesterProfileError || !requesterProfile) {
            return NextResponse.json(
                { error: 'Unable to resolve requester profile' },
                { status: 403 }
            );
        }

        // Athletes can only view their own data
        if (requesterProfile.role === 'ATHLETE' && requesterProfile.id !== athleteId) {
            return NextResponse.json(
                { error: 'You can only view your own data' },
                { status: 403 }
            );
        }

        // Team staff can only view athletes in their own team
        if (requesterProfile.role === 'COACH' || requesterProfile.role === 'ADMIN') {
            const { data: athleteProfile, error: athleteError } = await serviceSupabase
                .from('profiles')
                .select('id, team_id')
                .eq('id', athleteId)
                .eq('role', 'ATHLETE')
                .single();

            if (athleteError || !athleteProfile) {
                return NextResponse.json(
                    { error: 'Athlete not found' },
                    { status: 404 }
                );
            }

            // Check if this athlete belongs to the same team as the coach
            if (!requesterProfile.team_id || athleteProfile.team_id !== requesterProfile.team_id) {
                return NextResponse.json(
                    { error: 'You do not have permission to view this athlete' },
                    { status: 403 }
                );
            }
        }

        // Fetch athlete profile
        const { data: profile, error: profileError } = await serviceSupabase
            .from('profiles')
            .select('id, email, name, role, created_at')
            .eq('id', athleteId)
            .eq('role', 'ATHLETE')
            .single();

        if (profileError) {
            console.error('Profile fetch error:', profileError);
            return NextResponse.json(
                { error: `Athlete not found: ${profileError.message}` },
                { status: 404 }
            );
        }

        if (!profile) {
            console.error('Profile is null for athlete ID:', athleteId);
            return NextResponse.json(
                { error: 'Athlete not found' },
                { status: 404 }
            );
        }


        // Fetch athlete_profiles separately (maybeSingle allows null if profile doesn't exist yet)
        const { data: athleteProfileData } = await serviceSupabase
            .from('athlete_profiles')
            .select('*')
            .eq('user_id', athleteId)
            .maybeSingle();

        // Fetch athlete's groups
        const { data: groups } = await serviceSupabase
            .from('athlete_groups')
            .select(`
        joined_at,
        group:groups(
          id,
          name,
          description
        )
      `)
            .eq('athlete_id', athleteId);

        // Fetch recent activities (last 10)
        const { data: recentActivities } = await serviceSupabase
            .from('activities')
            .select(`
        id,
        title,
        type,
        distance,
        duration,
        start_date,
        elevation_gain,
        avg_hr,
        max_hr
      `)
            .eq('user_id', athleteId)
            .order('start_date', { ascending: false })
            .limit(10);

        // Fetch athlete metrics history
        let metricsHistory: unknown[] = [];
        if (athleteProfileData?.id) {
            const { data: metricsData } = await serviceSupabase
                .from('athlete_metrics')
                .select('*')
                .eq('athlete_profile_id', athleteProfileData.id)
                .order('date', { ascending: false })
                .limit(20);

            metricsHistory = metricsData || [];
        }

        // Fetch recent assignments (last 30 days + next 7 days)
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        const sevenDaysFromNow = new Date(today);
        sevenDaysFromNow.setDate(today.getDate() + 7);

        const { data: assignments } = await serviceSupabase
            .from('training_assignments')
            .select(`
                id,
                scheduled_date,
                completed,
                activity_id,
                expected_rpe,
                training:trainings(
                    id,
                    title,
                    type,
                    blocks
                )
            `)
            .eq('user_id', athleteId)
            .gte('scheduled_date', thirtyDaysAgo.toISOString())
            .lte('scheduled_date', sevenDaysFromNow.toISOString())
            .order('scheduled_date', { ascending: false });

        // Combine all data and transform to camelCase for frontend
        const athleteDetails = {
            ...profile,
            // Transform athlete_profile from snake_case to camelCase
            athleteProfile: athleteProfileData ? {
                id: athleteProfileData.id,
                dob: athleteProfileData.dob,
                height: athleteProfileData.height,
                weight: athleteProfileData.weight,
                injuries: athleteProfileData.injuries,
                restHR: athleteProfileData.rest_hr,
                maxHR: athleteProfileData.max_hr,
                lthr: athleteProfileData.lthr,
                vam: athleteProfileData.vam,
                uan: athleteProfileData.uan,
                hrZones: athleteProfileData.hr_zones,
                coachNotes: athleteProfileData.coach_notes,
                created_at: athleteProfileData.created_at,
                updated_at: athleteProfileData.updated_at,
            } : null,
            athleteGroups: groups?.map(g => ({ group: g.group })) || [],
            recentActivities: recentActivities || [],
            metricsHistory: metricsHistory || [],
            assignments: ((assignments || []) as AssignmentWithTraining[]).map((a) => ({
                id: a.id,
                scheduled_date: a.scheduled_date,
                completed: a.completed,
                activity_id: a.activity_id,
                expected_rpe: a.expected_rpe,
                workout: a.training
            })),
        };

        return NextResponse.json(athleteDetails);
    } catch (error: unknown) {
        console.error('Get athlete details error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * Update Athlete Details
 * 
 * Updates athlete profile information.
 * Supports updating: vam, uan, coachNotes, etc.
 * 
 * Access: COACH (for their athletes)
 */
export async function PATCH(
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
        const athleteId = id;
        const updates = (await request.json()) as {
            vam?: number;
            uan?: number;
            restHR?: number;
            maxHR?: number;
            weight?: number;
            height?: number;
            coachNotes?: string;
        };

        // Only coaches and admins can update athlete details
        if (user!.role !== 'COACH' && user!.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Only coaches can update athlete details' },
                { status: 403 }
            );
        }

        // Verify coach has access to this athlete via team membership
        const { data: coachProfile } = await supabase
            .from('profiles')
            .select('team_id')
            .eq('id', user!.id)
            .single();

        const { data: athleteProfile, error: athleteError } = await supabase
            .from('profiles')
            .select('id, team_id')
            .eq('id', athleteId)
            .eq('role', 'ATHLETE')
            .single();

        if (athleteError || !athleteProfile) {
            return NextResponse.json(
                { error: 'Athlete not found' },
                { status: 404 }
            );
        }

        if (!coachProfile?.team_id || athleteProfile.team_id !== coachProfile.team_id) {
            return NextResponse.json(
                { error: 'You do not have permission to update this athlete' },
                { status: 403 }
            );
        }

        // Prepare update object for athlete_profiles table
        // Map frontend camelCase to DB snake_case
        const dbUpdates: Record<string, string | number> = {
            updated_at: new Date().toISOString(),
        };

        if (updates.vam !== undefined) dbUpdates.vam = updates.vam;
        if (updates.uan !== undefined) dbUpdates.uan = updates.uan;
        if (updates.restHR !== undefined) dbUpdates.rest_hr = updates.restHR;
        if (updates.maxHR !== undefined) dbUpdates.max_hr = updates.maxHR;
        if (updates.weight !== undefined) dbUpdates.weight = updates.weight;
        if (updates.height !== undefined) dbUpdates.height = updates.height;
        if (updates.coachNotes !== undefined) dbUpdates.coach_notes = updates.coachNotes;

        // Update athlete_profiles
        const { error: updateError } = await supabase
            .from('athlete_profiles')
            .update(dbUpdates)
            .eq('user_id', athleteId);

        if (updateError) {
            console.error('Update athlete profile error:', updateError);
            return NextResponse.json(
                { error: 'Failed to update athlete profile' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error('Update athlete details error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
