import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import CoachDashboard from './components/CoachDashboard';
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

async function getCoachDashboardData(supabase: SupabaseClient, user: User, profile: Record<string, any>) {
    // Basic stats for initial load
    const [athletesRes, groupsRes, alertsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'ATHLETE').eq('team_id', profile.team_id).eq('coach_id', user.id),
        supabase.from('groups').select('id', { count: 'exact', head: true }).eq('team_id', profile.team_id),
        supabase.from('alerts').select('*').eq('team_id', profile.team_id).eq('is_read', false).limit(5)
    ]);

    return {
        stats: {
            totalAthletes: athletesRes.count || 0,
            totalGroups: groupsRes.count || 0,
            actionNeeded: alertsRes.data?.length || 0,
            activeAthletes: 0, 
            activePlans: 0,
            totalPlans: 0,
            completedSessions: 0,
            thisWeekSessions: 0,
            completedToday: 0,
            completionRate: 0,
            athletesWithoutNextWeek: 0,
            groupsWithoutNextWeek: 0,
        },
        alerts: {
            smartAlerts: (alertsRes.data || []).map((a: Record<string, any>) => ({
                id: a.id,
                athleteId: a.athlete_id,
                athleteName: '...', 
                type: a.type,
                time: a.created_at,
                details: a.message,
                score: a.score || 0,
                priority: a.priority || 'P3'
            })),
            rpeMismatches: [],
            lowCompliance: [],
            missingWorkouts: [],
            recentFeedback: [],
            zoneViolations: []
        },
        groupCompliance: [],
        weeklyActivity: [],
        performanceTrend: [],
        activityTimeline: [],
        scope: 'mine' as const
    };
}

async function getAdminDashboardData(supabase: SupabaseClient, user: User, profile: Record<string, any>) {
    // Basic stats for initial load
    const [athletesRes, coachesRes, groupsRes, coachesDetailsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'ATHLETE').eq('team_id', profile.team_id),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'COACH').eq('team_id', profile.team_id),
        supabase.from('groups').select('id', { count: 'exact', head: true }).eq('team_id', profile.team_id),
        supabase.from('profiles').select('id, name, email').eq('role', 'COACH').eq('team_id', profile.team_id)
    ]);

    // For activity, we'll fetch just a placeholder or the first few
    return {
        metrics: {
            totalAthletes: athletesRes.count || 0,
            totalCoaches: coachesRes.count || 0,
            totalGroups: groupsRes.count || 0,
        },
        coaches: (coachesDetailsRes.data || []).map(c => ({
            ...c,
            lastActivity: null,
            totalAthletes: 0
        }))
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

    // Fetch profile to get role
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

    let initialData = null;
    if (user.role === 'ATHLETE') {
        initialData = await getAthleteDashboardData(supabase, user);
    } else if (user.role === 'COACH') {
        initialData = await getCoachDashboardData(supabase, user, profile);
    } else if (user.role === 'ADMIN') {
        initialData = await getAdminDashboardData(supabase, user, profile);
    }

    return (
        <DashboardClient user={user}>
            {user.role === 'ADMIN' && (
                <AdminDashboard 
                    user={user} 
                    initialData={initialData as React.ComponentProps<typeof AdminDashboard>['initialData']} 
                />
            )}
            {user.role === 'ATHLETE' && (
                <AthleteDashboard 
                    user={user} 
                    initialData={initialData as React.ComponentProps<typeof AthleteDashboard>['initialData']} 
                />
            )}
            {user.role === 'COACH' && (
                <CoachDashboard 
                    user={user} 
                    initialData={initialData as React.ComponentProps<typeof CoachDashboard>['initialData']} 
                />
            )}
        </DashboardClient>
    );
}
