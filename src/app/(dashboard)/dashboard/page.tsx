import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import CoachDashboardNew from './components/CoachDashboardNew';
import AthleteDashboard from './components/AthleteDashboard';
import AdminDashboard from './components/AdminDashboard';
import { DashboardClient } from './components/DashboardClient';
import { User } from '@/interfaces/auth';
import { SupabaseClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

async function getAthleteDashboardData(supabase: SupabaseClient, user: User) {
    const [detailsRes, activitiesRes, calendarRes, racesRes] = await Promise.allSettled([
        supabase.from('profiles').select('*, athlete_profile:athlete_profiles(*)').eq('id', user.id).single(),
        supabase.from('activities').select('*').eq('user_id', user.id).order('start_date', { ascending: false }).limit(20),
        supabase.from('training_assignments').select(`
            *,
            training:trainings(*)
        `).eq('user_id', user.id),
        supabase.from('athlete_races').select('*').eq('athlete_id', user.id).order('date', { ascending: true })
    ]);

    let activities = activitiesRes.status === 'fulfilled' ? activitiesRes.value.data || [] : [];

    if (activities.length > 0) {
        const activityIds = activities.map(a => a.id);
        const { data: feedbackRows } = await supabase
            .from('activity_feedback')
            .select('activity_id')
            .eq('user_id', user.id)
            .in('activity_id', activityIds);

        const feedbackSet = new Set((feedbackRows || []).map(r => r.activity_id));
        activities = activities.map(a => ({
            ...a,
            hasFeedback: feedbackSet.has(a.id)
        }));
    }
    return {
        details: detailsRes.status === 'fulfilled' ? detailsRes.value.data as NonNullable<React.ComponentProps<typeof AthleteDashboard>['initialData']>['details'] : null,
        activities,
        assignments: calendarRes.status === 'fulfilled' ? calendarRes.value.data || [] : [],
        races: racesRes.status === 'fulfilled' ? racesRes.value.data || [] : []
    };
}

export default async function DashboardPage() {
    const supabase = await createClient();

    const {
        data: { user: authUser },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
        redirect('/login');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

    if (!profile) {
        redirect('/login');
    }

    const user: User = {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        firstName: profile.first_name,
        lastName: profile.last_name,
        role: profile.role,
        isOnboardingCompleted: profile.is_onboarding_completed
    };

    if (user.role === 'ATHLETE') {
        const initialData = await getAthleteDashboardData(supabase, user);
        return (
            <DashboardClient user={user}>
                <AthleteDashboard
                    user={user}
                    initialData={initialData}
                />
            </DashboardClient>
        );
    }

    return (
        <DashboardClient user={user}>
            {user.role === 'ADMIN' ? <AdminDashboard user={user} /> : <CoachDashboardNew user={user} />}
        </DashboardClient>
    );
}
