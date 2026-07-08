import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CoachesList } from '@/features/users/components/CoachesList';
import { PageContainer } from '@/components/layout/PageContainer';

export const dynamic = 'force-dynamic';

export default async function CoachesPage() {
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect('/login');
    }

    // Check if user is admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, team_id')
        .eq('id', user.id)
        .single();

    if (!profile || profile.role !== 'ADMIN') {
        redirect('/dashboard');
    }

    // Fetch all coaches for this team
    const { data: coachesData, error } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('role', 'COACH')
        .eq('team_id', profile.team_id);

    if (error) {
        return (
            <div className="p-4 sm:p-8 text-center text-muted-foreground">
                Failed to load coaches. Please try again later.
            </div>
        );
    }

    // Parallel fetch athlete counts for each coach
    const coachesWithStats = await Promise.all((coachesData || []).map(async (coach) => {
        const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('coach_id', coach.id)
            .eq('team_id', profile.team_id);
            
        return {
            ...coach,
            totalAthletes: count || 0
        };
    }));

    return (
        <PageContainer>
            <CoachesList initialCoaches={coachesWithStats} />
        </PageContainer>
    );
}
