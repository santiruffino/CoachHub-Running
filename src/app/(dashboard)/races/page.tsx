import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { RacesList } from '@/features/races/components/RacesList';

export const dynamic = 'force-dynamic';

export default async function RacesPage() {
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect('/login');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, team_id')
        .eq('id', user.id)
        .single();

    if (!profile) {
        redirect('/login');
    }

    const isCoach = profile.role === 'COACH' || profile.role === 'ADMIN';

    // Parallel fetch based on role
    const [racesRes, athleteRacesRes] = await Promise.all([
        isCoach 
            ? supabase.from('races').select('*').order('name', { ascending: true })
            : Promise.resolve({ data: [] }),
        !isCoach
            ? supabase.from('athlete_races').select('*').eq('athlete_id', user.id).order('date', { ascending: true })
            : Promise.resolve({ data: [] })
    ]);

    return (
        <div className="p-0">
            <RacesList 
                initialRaces={racesRes.data || []} 
                initialAthleteRaces={athleteRacesRes.data || []} 
                isCoach={isCoach}
                userId={user.id}
            />
        </div>
    );
}
