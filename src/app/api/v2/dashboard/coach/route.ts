import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import {
    startOfWeek,
    endOfWeek,
    format,
    addWeeks,
    subWeeks,
    eachDayOfInterval,
    differenceInHours
} from 'date-fns';

export async function GET() {
    try {
        const supabase = await createClient();

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user is a coach
        const { data: coachProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (coachProfile?.role !== 'COACH') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const now = new Date();
        const todayStr = format(now, 'yyyy-MM-dd');
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const yesterdayStr = format(yesterday, 'yyyy-MM-dd');

        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
        const weekStartStr = format(weekStart, 'yyyy-MM-dd');
        const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

        const nextWeekStart = addWeeks(weekStart, 1);
        const nextWeekEnd = endOfWeek(nextWeekStart, { weekStartsOn: 1 });
        const nextWeekStartStr = format(nextWeekStart, 'yyyy-MM-dd');
        const nextWeekEndStr = format(nextWeekEnd, 'yyyy-MM-dd');

        const sixWeeksAgo = subWeeks(weekStart, 5);
        const sixWeeksAgoStr = format(sixWeeksAgo, 'yyyy-MM-dd');

        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 7);
        const sevenDaysAgoStr = format(sevenDaysAgo, 'yyyy-MM-dd');

        // 1. Fetch athletes and groups in parallel
        const [athletesRes, groupsRes] = await Promise.all([
            supabase
                .from('profiles')
                .select('id, email, name, role, created_at')
                .eq('role', 'ATHLETE')
                .eq('coach_id', user.id),
            supabase
                .from('groups')
                .select(`
                    id, 
                    name, 
                    members:athlete_groups(
                        athlete:profiles(id, name, email)
                    )
                `)
                .eq('coach_id', user.id)
        ]);

        const athletes = athletesRes.data || [];
        const athleteIds = athletes.map(a => a.id);
        const groups = groupsRes.data || [];

        if (athleteIds.length === 0) {
            return NextResponse.json({
                stats: { activeAthletes: 0, totalAthletes: 0, completionRate: 0, athletesWithoutNextWeek: 0, groupsWithoutNextWeek: 0 },
                alerts: { rpeMismatches: [], recentFeedback: [], missingWorkouts: [], lowCompliance: [] },
                groups: [],
                charts: { weeklyWorkouts: [], performanceTrend: [] },
                recentSessions: []
            });
        }

        // 2. Fetch Assignments and Activities in parallel
        const [assignmentsRes, activitiesRes, trainingsRes] = await Promise.all([
            supabase
                .from('training_assignments')
                .select(`
                    id, 
                    user_id, 
                    scheduled_date, 
                    completed, 
                    expected_rpe,
                    training:trainings(id, title, type)
                `)
                .in('user_id', athleteIds)
                .gte('scheduled_date', sixWeeksAgoStr)
                .lte('scheduled_date', nextWeekEndStr),
            supabase
                .from('activities')
                .select(`
                    id, external_id, user_id, title, type, start_date, distance, duration,
                    feedback:activities_feedback(rpe, comments)
                `)
                .in('user_id', athleteIds)
                .gte('start_date', sevenDaysAgoStr)
                .order('start_date', { ascending: false }),
            supabase
                .from('trainings')
                .select('id')
                .eq('coach_id', user.id)
        ]);

        const allAssignments = assignmentsRes.data || [];
        const allActivities = activitiesRes.data || [];
        const totalTrainings = trainingsRes.count || 0; // Or trainingsRes.data.length

        // --- CALCULATION LOGIC ---

        // Map athletes for quick lookup
        const athleteMap = new Map();
        athletes.forEach(a => athleteMap.set(a.id, a));

        // Stats
        const thisWeekAssignments = allAssignments.filter(a => {
            const date = a.scheduled_date.split('T')[0];
            return date >= weekStartStr && date <= weekEndStr;
        });
        const completedThisWeek = thisWeekAssignments.filter(a => a.completed).length;
        const completionRate = thisWeekAssignments.length > 0
            ? Math.round((completedThisWeek / thisWeekAssignments.length) * 100)
            : 0;

        const nextWeekAssignments = allAssignments.filter(a => {
            const date = a.scheduled_date.split('T')[0];
            return date >= nextWeekStartStr && date <= nextWeekEndStr;
        });
        const athletesWithNextWeek = new Set(nextWeekAssignments.map(a => a.user_id));
        const athletesWithoutNextWeekCount = athletes.length - athletesWithNextWeek.size;

        // Alerts: RPE Mismatches & Recent Feedback
        const rpeMismatches = [];
        const recentFeedback = [];

        allActivities.forEach(activity => {
            const dateStr = activity.start_date.split('T')[0];
            const feedback = activity.feedback?.[0]; // Assuming one feedback per activity
            const athlete = athleteMap.get(activity.user_id);

            // RPE Mismatch (Today/Yesterday)
            if ((dateStr === todayStr || dateStr === yesterdayStr) && feedback?.rpe) {
                const matchingAssignment = allAssignments.find(a =>
                    a.user_id === activity.user_id &&
                    a.scheduled_date.split('T')[0] === dateStr &&
                    a.completed
                );

                if (matchingAssignment?.expected_rpe) {
                    const diff = Math.abs(feedback.rpe - matchingAssignment.expected_rpe);
                    if (diff >= 3) {
                        rpeMismatches.push({
                            athleteId: activity.user_id,
                            athleteName: athlete.name || athlete.email,
                            workoutType: activity.type || 'Entrenamiento',
                            expectedRPE: matchingAssignment.expected_rpe,
                            actualRPE: feedback.rpe,
                            difference: diff
                        });
                    }
                }
            }

            // Recent Feedback (Comments in last 7 days)
            if (feedback?.comments?.trim()) {
                const hoursDiff = differenceInHours(now, new Date(activity.start_date));
                recentFeedback.push({
                    athleteId: activity.user_id,
                    athleteName: athlete.name || athlete.email,
                    activityType: activity.type || 'Workout',
                    comments: feedback.comments,
                    rpe: feedback.rpe,
                    timestamp: hoursDiff < 24 ? `${hoursDiff}h ago` : `${Math.floor(hoursDiff / 24)}d ago`,
                    activityDate: activity.start_date
                });
            }
        });

        // Alerts: Missing Workouts
        const missingWorkouts = [];
        const groupMembersWithNextWeek = new Map(); // groupId -> hasWorkouts

        groups.forEach(group => {
            const hasWorkouts = group.members?.some(m => athletesWithNextWeek.has(m.athlete?.id));
            if (!hasWorkouts) {
                missingWorkouts.push({
                    id: group.id,
                    name: group.name,
                    type: 'group',
                    memberCount: group.members?.length || 0
                });
            }
            group.members?.forEach(m => groupMembersWithNextWeek.set(m.athlete?.id, hasWorkouts));
        });

        athletes.forEach(athlete => {
            if (!athletesWithNextWeek.has(athlete.id)) {
                // Only add if not part of a group that's already alert-ed
                if (!groupMembersWithNextWeek.has(athlete.id) || groupMembersWithNextWeek.get(athlete.id) === true) {
                    missingWorkouts.push({
                        id: athlete.id,
                        name: athlete.name || athlete.email,
                        type: 'athlete'
                    });
                }
            }
        });

        // Alerts: Low Compliance
        const lowCompliance = [];
        athleteIds.forEach(id => {
            const athleteAssignments = thisWeekAssignments.filter(a => a.user_id === id);
            if (athleteAssignments.length > 0) {
                const completed = athleteAssignments.filter(a => a.completed).length;
                const rate = Math.round((completed / athleteAssignments.length) * 100);
                if (rate < 50) {
                    const athlete = athleteMap.get(id);
                    lowCompliance.push({
                        athleteId: id,
                        athleteName: athlete.name || athlete.email,
                        completed,
                        total: athleteAssignments.length,
                        completionRate: rate
                    });
                }
            }
        });

        // Group Compliance
        const groupCompliance = groups.map(group => {
            const memberIds = group.members?.map(m => m.athlete?.id) || [];
            const groupAssignments = thisWeekAssignments.filter(a => memberIds.includes(a.user_id));
            const completed = groupAssignments.filter(a => a.completed).length;
            const rate = groupAssignments.length > 0 ? Math.round((completed / groupAssignments.length) * 100) : 0;
            return {
                groupId: group.id,
                groupName: group.name,
                athleteCount: memberIds.length,
                completionRate: rate
            };
        });

        // Charts: Weekly Workouts
        const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
        const weeklyWorkouts = weekDays.map(day => {
            const dStr = format(day, 'yyyy-MM-dd');
            const count = thisWeekAssignments.filter(a => a.scheduled_date.split('T')[0] === dStr).length;
            return { day: format(day, 'EEE').slice(0, 3), value: count };
        });

        // Charts: Performance Trend (6 weeks)
        const performanceTrend = [];
        for (let i = 5; i >= 0; i--) {
            const wStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
            const wEnd = endOfWeek(wStart, { weekStartsOn: 1 });
            const sStr = format(wStart, 'yyyy-MM-dd');
            const eStr = format(wEnd, 'yyyy-MM-dd');

            const weekAss = allAssignments.filter(a => {
                const d = a.scheduled_date.split('T')[0];
                return d >= sStr && d <= eStr;
            });
            const comp = weekAss.filter(a => a.completed).length;
            const rate = weekAss.length > 0 ? Math.round((comp / weekAss.length) * 100) : 0;
            performanceTrend.push({ week: `Sem ${6 - i}`, value: rate });
        }

        // Recent Sessions
        const recentSessions = allAssignments
            .filter(a => a.completed)
            .sort((a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime())
            .slice(0, 5)
            .map(a => ({
                id: a.id,
                athleteName: athleteMap.get(a.user_id)?.name || athleteMap.get(a.user_id)?.email,
                activityType: a.training?.type || 'Entrenamiento',
                date: a.scheduled_date,
                completed: a.completed
            }));

        return NextResponse.json({
            stats: {
                activeAthletes: athletes.length, // Or unique active ones
                totalAthletes: athletes.length,
                activePlans: totalTrainings,
                totalPlans: totalTrainings,
                completionRate: completionRate,
                athletesWithoutNextWeek: athletesWithoutNextWeekCount,
                groupsWithoutNextWeek: missingWorkouts.filter(w => w.type === 'group').length
            },
            alerts: {
                rpeMismatches: rpeMismatches.slice(0, 5),
                recentFeedback: recentFeedback.slice(0, 5),
                missingWorkouts: missingWorkouts.slice(0, 5),
                lowCompliance: lowCompliance.slice(0, 5)
            },
            groups: groupCompliance,
            charts: {
                weeklyWorkouts,
                performanceTrend
            },
            recentSessions
        });

    } catch (error: any) {
        console.error('Coach Dashboard API Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
