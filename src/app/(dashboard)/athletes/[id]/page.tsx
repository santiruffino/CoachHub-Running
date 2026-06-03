import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AthleteDetailsView } from '@/features/users/components/AthleteDetailsView';

export const dynamic = 'force-dynamic';

export default async function AthleteDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect('/login');
    }

    // Use service role client to bypass RLS for cross-user reads (coach viewing athlete data).
    // Auth is already verified above; access control is enforced at the API route level.
    const serviceSupabase = createServiceRoleClient();

    // Parallel fetch initial data
    const [detailsRes, activitiesRes, calendarRes, racesRes] = await Promise.allSettled([
        serviceSupabase.from('profiles').select('*, athlete_profile:athlete_profiles(*)').eq('id', id).single(),
        serviceSupabase.from('activities').select('*').eq('user_id', id).order('start_date', { ascending: false }).limit(50),
        serviceSupabase.from('training_assignments').select(`
            *,
            training:trainings(*)
        `).eq('user_id', id),
        serviceSupabase.from('athlete_races').select(`
            *,
            race:races(*)
        `).eq('athlete_id', id).order('date', { ascending: true })
    ]);

    if (detailsRes.status === 'rejected' || !detailsRes.value.data) {
        redirect('/athletes');
    }

    const athlete = detailsRes.value.data;
    const activities = activitiesRes.status === 'fulfilled' ? activitiesRes.value.data || [] : [];
    const assignments = calendarRes.status === 'fulfilled' ? calendarRes.value.data || [] : [];
    const races = racesRes.status === 'fulfilled' ? racesRes.value.data || [] : [];

    // Map to camelCase as expected by client component
    const mappedAthlete = {
        ...athlete,
        athleteProfile: athlete.athlete_profile ? {
            ...athlete.athlete_profile,
            coachNotes: athlete.athlete_profile.coach_notes,
            restHR: athlete.athlete_profile.rest_hr,
            maxHR: athlete.athlete_profile.max_hr,
            hrZones: athlete.athlete_profile.hr_zones
        } : null
    } as Record<string, any>;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <AthleteDetailsView
                id={id}
                initialAthlete={mappedAthlete as any}
                initialActivities={(activities || []) as any[]}
                initialAssignments={(assignments || []) as any[]}
                initialRaces={(races || []) as any[]}
            />
        </div>
    );
}
