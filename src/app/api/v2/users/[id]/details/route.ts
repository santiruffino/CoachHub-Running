import { NextRequest, NextResponse } from 'next/server';
import { requireRole, requireAuth } from '@/lib/supabase/api-helpers';

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
        const athleteId = id;

        // Athletes can only view their own data
        if (user!.role === 'ATHLETE' && user!.id !== athleteId) {
            return NextResponse.json(
                { error: 'You can only view your own data' },
                { status: 403 }
            );
        }

        // Coaches can only view their athletes
        if (user!.role === 'COACH') {
            const { data: athleteProfile, error: athleteError } = await supabase
                .from('profiles')
                .select('id, coach_id')
                .eq('id', athleteId)
                .eq('role', 'ATHLETE')
                .single();

            if (athleteError || !athleteProfile) {
                return NextResponse.json(
                    { error: 'Athlete not found' },
                    { status: 404 }
                );
            }

            // Check if this athlete belongs to the requesting coach
            if (athleteProfile.coach_id !== user!.id) {
                return NextResponse.json(
                    { error: 'You do not have permission to view this athlete' },
                    { status: 403 }
                );
            }
        }

        // Fetch athlete profile
        const { data: profile, error: profileError } = await supabase
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
        const { data: athleteProfileData, error: athleteProfileError } = await supabase
            .from('athlete_profiles')
            .select('*')
            .eq('user_id', athleteId)
            .maybeSingle();

        // Fetch athlete's groups
        const { data: groups } = await supabase
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
        const { data: recentActivities } = await supabase
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
        const { data: metricsHistory } = await supabase
            .from('athlete_metrics')
            .select('*')
            .eq('athlete_profile.user_id', athleteId)
            .order('date', { ascending: false })
            .limit(20);

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
                vam: athleteProfileData.vam,
                uan: athleteProfileData.uan,
                hrZones: athleteProfileData.hr_zones,
                created_at: athleteProfileData.created_at,
                updated_at: athleteProfileData.updated_at,
            } : null,
            athleteGroups: groups?.map(g => ({ group: g.group })) || [],
            recentActivities: recentActivities || [],
            metricsHistory: metricsHistory || [],
        };

        return NextResponse.json(athleteDetails);
    } catch (error: any) {
        console.error('Get athlete details error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
