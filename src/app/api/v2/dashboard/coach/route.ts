import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

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

        // Verify coach role and get team reference
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, team_id')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'COACH' && profile?.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // --- Date helpers ---
        const now = new Date();

        // Current week (Mon–Sun)
        const dayOfWeek = now.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() + diffToMonday);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        // Next week
        const nextWeekStart = new Date(weekEnd);
        nextWeekStart.setDate(weekEnd.getDate() + 1);
        nextWeekStart.setHours(0, 0, 0, 0);
        const nextWeekEnd = new Date(nextWeekStart);
        nextWeekEnd.setDate(nextWeekStart.getDate() + 6);
        nextWeekEnd.setHours(23, 59, 59, 999);

        // Last 7 days for weekly activity
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        // --- Step 1: Get athletes for this team/coach ---
        let athletesQuery = supabase
            .from('profiles')
            .select('id, name')
            .eq('role', 'ATHLETE');

        if (profile.role === 'ADMIN') {
            athletesQuery = athletesQuery.eq('team_id', profile.team_id);
        } else {
            athletesQuery = athletesQuery.eq('coach_id', user.id);
        }

        const { data: athletes } = await athletesQuery;

        const athleteIds = (athletes || []).map((a) => a.id);
        const athleteMap = new Map((athletes || []).map((a) => [a.id, a.name]));

        // --- Step 2: Get groups for this team/coach ---
        let groupsQuery = supabase
            .from('groups')
            .select('id, name, athlete_groups(count)');

        if (profile.role === 'ADMIN') {
            groupsQuery = groupsQuery.eq('team_id', profile.team_id);
        } else {
            groupsQuery = groupsQuery.eq('coach_id', user.id);
        }

        const { data: groups } = await groupsQuery;

        // --- Prepare Trainings Query ---
        let trainingsQuery = supabase
            .from('trainings')
            .select('id', { count: 'exact', head: true });

        if (profile.role === 'ADMIN') {
            trainingsQuery = trainingsQuery.eq('team_id', profile.team_id);
        } else {
            trainingsQuery = trainingsQuery.eq('coach_id', user.id);
        }

        // --- Step 3: Parallel data fetches ---
        const [
            assignmentsRes,
            nextWeekAssignmentsRes,
            activitiesRes,
            trainingsCountRes,
            alertsRes,
        ] = await Promise.all([
            // Current week assignments
            supabase
                .from('training_assignments')
                .select('id, user_id, completed, scheduled_date, expected_rpe, feedback')
                .in('user_id', athleteIds.length > 0 ? athleteIds : ['__none__'])
                .gte('scheduled_date', weekStart.toISOString())
                .lte('scheduled_date', weekEnd.toISOString()),

            // Next week assignments — to detect athletes without a plan
            supabase
                .from('training_assignments')
                .select('user_id')
                .in('user_id', athleteIds.length > 0 ? athleteIds : ['__none__'])
                .gte('scheduled_date', nextWeekStart.toISOString())
                .lte('scheduled_date', nextWeekEnd.toISOString()),

            // Activities window
            supabase
                .from('activities')
                .select('id, user_id, start_date, title, type')
                .in('user_id', athleteIds.length > 0 ? athleteIds : ['__none__'])
                .gte('start_date', (() => { const d = new Date(weekStart); d.setDate(d.getDate() - 1); return d.toISOString(); })())
                .lte('start_date', weekEnd.toISOString())
                .order('start_date', { ascending: false }),

            // Total training templates count
            trainingsQuery,

            // Fetch alerts from the new alerts table
            supabase
                .from('alerts')
                .select(`
                    id, athlete_id, type, message, created_at, activity_id,
                    athlete:profiles!alerts_athlete_id_fkey(name),
                    activity:activities(title, type)
                `)
                .eq('coach_id', user.id)
                .eq('is_read', false)
                .order('created_at', { ascending: false }),
        ]);

        const assignments = assignmentsRes.data || [];
        const nextWeekAssignments = nextWeekAssignmentsRes.data || [];
        const activities = activitiesRes.data || [];
        const totalPlans = trainingsCountRes.count ?? 0;
        const dbAlerts = alertsRes.data || [];

        const zoneViolations = dbAlerts
            .filter(a => a.type === 'ZONE_VIOLATION')
            .map(a => ({
                id: a.athlete_id,
                name: (a.athlete as any)?.name || 'Athlete',
                type: 'zone_violation' as const,
                time: a.created_at,
                message: a.message,
                details: (a.activity as any)?.title || (a.activity as any)?.type || 'Activity',
                activityId: a.activity_id
            }));

        // --- Completion helper ---
        // An assignment is considered completed if:
        //   1. The `completed` flag is explicitly true, OR
        //   2. The athlete has ANY Strava activity recorded on the same calendar date
        //
        // We intentionally skip type-matching here because:
        //   a) The training:trainings join can silently return null (deleted/group workouts)
        //   b) Server-side UTC date splitting can differ from browser local-time formatting
        //   c) For a compliance DASHBOARD, "did the athlete do something that day?" is the right question
        const isAssignmentCompleted = (
            assignment: { completed: boolean; scheduled_date: string; user_id: string },
            allActivities: typeof activities
        ): boolean => {
            if (assignment.completed) return true;
            // scheduled_date is stored as a date string (YYYY-MM-DD or ISO), take date part
            const assignmentDate = assignment.scheduled_date.slice(0, 10);
            return allActivities.some((act) => {
                if (act.user_id !== assignment.user_id) return false;
                // start_date is a timestamptz from Supabase; slice(0,10) gives YYYY-MM-DD in UTC.
                // This is consistent with how scheduled_date is stored (UTC date).
                const actDate = act.start_date.slice(0, 10);
                return actDate === assignmentDate;
            });
        };

        // --- Filter assignments for compliance checking (only previous days) ---
        const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
        const pastAssignments = assignments.filter((a) => a.scheduled_date.slice(0, 10) < todayStr);

        // --- Stats ---
        const completedThisWeek = assignments.filter((a) => isAssignmentCompleted(a, activities)).length;
        const totalThisWeek = assignments.length;
        const completionRate =
            totalThisWeek > 0 ? Math.round((completedThisWeek / totalThisWeek) * 100) : 0;

        const activeAthleteIds = new Set(
            assignments.filter((a) => isAssignmentCompleted(a, activities)).map((a) => a.user_id)
        );

        // --- Missing workouts next week ---
        // Athletes without any assignment next week
        const athletesWithNextWeek = new Set(nextWeekAssignments.map((a) => a.user_id));

        // Groups: check if any member of the group has a next-week assignment
        const groupMissingPromises = (groups || []).map(async (group) => {
            const { data: members } = await supabase
                .from('athlete_groups')
                .select('athlete_id')
                .eq('group_id', group.id);

            const memberIds = (members || []).map((m) => m.athlete_id);
            const hasAssignment = memberIds.some((id) => athletesWithNextWeek.has(id));
            const countArr = group.athlete_groups as any;
            const memberCount =
                Array.isArray(countArr) && countArr[0]?.count != null
                    ? Number(countArr[0].count)
                    : memberIds.length;

            return hasAssignment ? null : { id: group.id, name: group.name, type: 'group' as const, memberCount };
        });

        const groupMissingResults = await Promise.all(groupMissingPromises);

        const missingWorkouts = [
            ...(athletes || [])
                .filter((a) => !athletesWithNextWeek.has(a.id))
                .map((a) => ({ id: a.id, name: a.name, type: 'athlete' as const })),
            ...groupMissingResults.filter(Boolean) as { id: string; name: string; type: 'group'; memberCount: number }[],
        ];

        // --- Low compliance (< 50% this week, at least 1 past assignment) ---
        const complianceByAthlete = new Map<string, { completed: number; total: number }>();
        pastAssignments.forEach((a) => {
            const entry = complianceByAthlete.get(a.user_id) || { completed: 0, total: 0 };
            entry.total++;
            if (isAssignmentCompleted(a, activities)) entry.completed++;
            complianceByAthlete.set(a.user_id, entry);
        });

        const lowCompliance = Array.from(complianceByAthlete.entries())
            .filter(([, s]) => s.total > 0 && s.completed / s.total < 0.5)
            .map(([athleteId, s]) => ({
                athleteId,
                athleteName: athleteMap.get(athleteId) || 'Unknown',
                completed: s.completed,
                total: s.total,
                completionRate: Math.round((s.completed / s.total) * 100),
            }));

        // --- RPE mismatches ---
        // NOTE: activities.rpe doesn't exist — RPE is stored in a separate activity_feedback table.
        // Skipping for now; needs a dedicated join query.
        const rpeMismatches: any[] = [];

        // --- Recent feedback & Timeline ---
        // NOTE: activities.feedback doesn't exist — feedback is stored in a separate table.
        // Using all recent activities for the timeline instead.
        const recentFeedback: any[] = [];

        const activityTimeline = activities
            .slice(0, 8)
            .map((act) => ({
                id: act.id,
                time: act.start_date,
                athleteName: athleteMap.get(act.user_id) || 'Unknown',
                activityName: act.title || act.type || 'Activity',
                content: '',
            }));

        // --- Group compliance ---
        const groupCompliance = await Promise.all(
            (groups || []).map(async (group) => {
                const { data: members } = await supabase
                    .from('athlete_groups')
                    .select('athlete_id')
                    .eq('group_id', group.id);

                const memberIds = (members || []).map((m) => m.athlete_id);
                const groupAssignments = pastAssignments.filter((a) => memberIds.includes(a.user_id));
                const groupCompleted = groupAssignments.filter((a) => isAssignmentCompleted(a, activities)).length;
                const groupTotal = groupAssignments.length;
                const countArr = group.athlete_groups as any;
                const athleteCount =
                    Array.isArray(countArr) && countArr[0]?.count != null
                        ? Number(countArr[0].count)
                        : memberIds.length;

                return {
                    groupId: group.id,
                    groupName: group.name,
                    athleteCount,
                    // If no past assignments yet, assume 100% compliance
                    completionRate: groupTotal > 0 ? Math.round((groupCompleted / groupTotal) * 100) : 100,
                };
            })
        );

        // --- Weekly activity (last 7 days — count of activities per day) ---
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const activityByDay = new Map<string, number>();
        for (let i = 0; i < 7; i++) {
            const d = new Date(sevenDaysAgo);
            d.setDate(sevenDaysAgo.getDate() + i);
            activityByDay.set(d.toDateString(), 0);
        }
        activities.forEach((act) => {
            const key = new Date(act.start_date).toDateString();
            if (activityByDay.has(key)) {
                activityByDay.set(key, (activityByDay.get(key) || 0) + 1);
            }
        });
        const weeklyActivity = Array.from(activityByDay.entries()).map(([dateStr, value]) => ({
            day: dayNames[new Date(dateStr).getDay()],
            value,
        }));

        // --- Performance trend (last 6 weeks — completion rate per week) ---
        const performanceTrend: { week: string; value: number }[] = [];
        for (let w = 5; w >= 0; w--) {
            const wStart = new Date(weekStart);
            wStart.setDate(weekStart.getDate() - w * 7);
            const wEnd = new Date(wStart);
            wEnd.setDate(wStart.getDate() + 6);
            wEnd.setHours(23, 59, 59, 999);

            const { data: wAssignments } = await supabase
                .from('training_assignments')
                .select('completed')
                .in('user_id', athleteIds.length > 0 ? athleteIds : ['__none__'])
                .gte('scheduled_date', wStart.toISOString())
                .lte('scheduled_date', wEnd.toISOString());

            const wTotal = (wAssignments || []).length;
            // For historical weeks we only have the `completed` flag since we can't
            // cross-join with activities here — use it for trend data only.
            const wCompleted = (wAssignments || []).filter((a) => a.completed).length;
            performanceTrend.push({
                week: `W${6 - w}`,
                value: wTotal > 0 ? Math.round((wCompleted / wTotal) * 100) : 0,
            });
        }

        const activeAthletes = activeAthleteIds.size;
        const completedTodayCount = 0; // Needs specific date check
        const pendingActionCount = rpeMismatches.length + missingWorkouts.length + lowCompliance.length + zoneViolations.length;

        return NextResponse.json({
            stats: {
                activeAthletes,
                totalAthletes: athleteIds.length,
                activePlans: totalPlans,
                totalPlans,
                completedSessions: completedThisWeek,
                thisWeekSessions: totalThisWeek,
                completedToday: completedTodayCount,
                actionNeeded: pendingActionCount,
                completionRate,
                totalGroups: (groups || []).length,
                athletesWithoutNextWeek: missingWorkouts.filter((m) => m.type === 'athlete').length,
                groupsWithoutNextWeek: missingWorkouts.filter((m) => m.type === 'group').length,
            },
            alerts: {
                rpeMismatches,
                lowCompliance,
                missingWorkouts,
                recentFeedback,
                zoneViolations,
            },
            groupCompliance,
            weeklyActivity,
            performanceTrend,
            activityTimeline,
        });
    } catch (error: any) {
        console.error('Error in /api/v2/dashboard/coach:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
