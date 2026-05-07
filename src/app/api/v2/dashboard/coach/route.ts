import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { computeAlertScore, extractRiskKeywords, SmartAlertType } from '@/lib/alerts/scoring';
import * as Sentry from '@sentry/nextjs';
import { createRequestLogger, withRequestId } from '@/lib/logger';

interface AlertAthleteRelation {
    name?: string;
}

interface AlertActivityRelation {
    title?: string;
    type?: string;
}

interface DashboardAlert {
    id: string;
    athlete_id: string;
    type: string;
    message: string;
    created_at: string;
    activity_id: string | null;
    score?: number | null;
    priority?: 'P1' | 'P2' | 'P3' | 'P4' | null;
    reason_codes?: string[] | null;
    recommended_action?: string | null;
    is_read?: boolean | null;
    resolved_at?: string | null;
    status?: 'OPEN' | 'SNOOZED' | 'RESOLVED' | null;
    snoozed_until?: string | null;
    athlete?: AlertAthleteRelation | AlertAthleteRelation[] | null;
    activity?: AlertActivityRelation | AlertActivityRelation[] | null;
}

interface AlertScoreView {
    athlete_id: string;
    type: string;
    score: number | null;
    priority: string | null;
    is_read: boolean | null;
    created_at: string;
    resolved_at: string | null;
}

interface ActivityFeedbackActivityRelation {
    title?: string;
    type?: string;
}

interface ActivityFeedbackRow {
    user_id: string;
    activity_id: string | null;
    training_assignment_id: string | null;
    rpe: number | null;
    comments: string | null;
    created_at: string;
    activity?: ActivityFeedbackActivityRelation | ActivityFeedbackActivityRelation[] | null;
}

interface GroupCountRelation {
    count?: number;
}

interface DashboardGroup {
    id: string;
    name: string;
    athlete_groups?: GroupCountRelation[] | null;
}

function getSingleRelation<T>(relation: T | T[] | null | undefined): T | undefined {
    if (Array.isArray(relation)) {
        return relation[0];
    }

    return relation || undefined;
}

function normalizeAlertType(type: string): SmartAlertType | null {
    const normalized = String(type || '').toLowerCase();

    if (normalized === 'zone_violation') return 'zone_violation';
    if (normalized === 'new_feedback') return 'new_feedback';
    if (normalized === 'rpe_mismatch') return 'rpe_mismatch';
    if (normalized === 'low_compliance') return 'low_compliance';
    if (normalized === 'missing_workout') return 'missing_workout';

    return null;
}

export async function GET(request: NextRequest) {
    const { requestId, logger } = createRequestLogger('/api/v2/dashboard/coach', request);
    const respond = (body: unknown, init?: ResponseInit) =>
        NextResponse.json(body, withRequestId(init, requestId));

    try {
        const supabase = await createClient();

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            logger.warn('coach_dashboard.unauthorized');
            return respond({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role, team_id')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'COACH' && profile?.role !== 'ADMIN') {
            logger.warn('coach_dashboard.forbidden_role', { userId: user.id, role: profile?.role });
            return respond({ error: 'Forbidden' }, { status: 403 });
        }

        if (!profile?.team_id) {
            logger.warn('coach_dashboard.missing_team', { userId: user.id, role: profile.role });
            return respond({ error: 'Coach must belong to a team' }, { status: 403 });
        }

        const scopeParam = new URL(request.url).searchParams.get('scope');
        const scope = scopeParam === 'team' ? 'team' : 'mine';

        const now = new Date();
        const dayOfWeek = now.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() + diffToMonday);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        const nextWeekStart = new Date(weekEnd);
        nextWeekStart.setDate(weekEnd.getDate() + 1);
        nextWeekStart.setHours(0, 0, 0, 0);
        const nextWeekEnd = new Date(nextWeekStart);
        nextWeekEnd.setDate(nextWeekStart.getDate() + 6);
        nextWeekEnd.setHours(23, 59, 59, 999);

        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

        let athletesQuery = supabase
            .from('profiles')
            .select('id, name, coach_id')
            .eq('role', 'ATHLETE')
            .eq('team_id', profile.team_id);

        if (scope === 'mine') {
            athletesQuery = athletesQuery.eq('coach_id', user.id);
        }

        const { data: athletes } = await athletesQuery;

        const athleteIds = (athletes || []).map((a) => a.id);
        const athleteMap = new Map((athletes || []).map((a) => [a.id, a.name]));
        const scopedAthleteIds = new Set(athleteIds);

        const { data: groups } = await supabase
            .from('groups')
            .select('id, name, athlete_groups(count)')
            .eq('team_id', profile.team_id);

        const trainingsQuery = supabase
            .from('trainings')
            .select('id', { count: 'exact', head: true })
            .eq('team_id', profile.team_id);

        const [
            assignmentsRes,
            nextWeekAssignmentsRes,
            activitiesRes,
            feedbackRes,
            trainingsCountRes,
            alertsRes,
            athleteRacesRes,
            recentAlertsRes,
        ] = await Promise.all([
            supabase
                .from('training_assignments')
                .select('id, user_id, completed, scheduled_date, expected_rpe, workout_name')
                .in('user_id', athleteIds.length > 0 ? athleteIds : ['__none__'])
                .gte('scheduled_date', weekStart.toISOString())
                .lte('scheduled_date', weekEnd.toISOString()),
            supabase
                .from('training_assignments')
                .select('user_id')
                .in('user_id', athleteIds.length > 0 ? athleteIds : ['__none__'])
                .gte('scheduled_date', nextWeekStart.toISOString())
                .lte('scheduled_date', nextWeekEnd.toISOString()),
            supabase
                .from('activities')
                .select('id, user_id, start_date, title, type')
                .in('user_id', athleteIds.length > 0 ? athleteIds : ['__none__'])
                .gte('start_date', (() => {
                    const d = new Date(weekStart);
                    d.setDate(d.getDate() - 1);
                    return d.toISOString();
                })())
                .lte('start_date', weekEnd.toISOString())
                .order('start_date', { ascending: false }),
            supabase
                .from('activity_feedback')
                .select(`
                    user_id, activity_id, training_assignment_id, rpe, comments, created_at,
                    activity:activities(title, type)
                `)
                .in('user_id', athleteIds.length > 0 ? athleteIds : ['__none__'])
                .gte('created_at', sevenDaysAgo.toISOString())
                .order('created_at', { ascending: false }),
            trainingsQuery,
            supabase
                .from('alerts')
                .select(`
                    id, athlete_id, type, message, created_at, activity_id,
                    score, priority, reason_codes, recommended_action,
                    is_read, resolved_at, status, snoozed_until,
                    athlete:profiles!alerts_athlete_id_fkey(name),
                    activity:activities(title, type)
                `)
                .eq('team_id', profile.team_id)
                .in('athlete_id', athleteIds.length > 0 ? athleteIds : ['__none__'])
                .eq('is_read', false)
                .neq('status', 'RESOLVED')
                .order('created_at', { ascending: false }),
            supabase
                .from('athlete_races')
                .select('athlete_id, date, priority, status')
                .in('athlete_id', athleteIds.length > 0 ? athleteIds : ['__none__'])
                .gte('date', todayStr)
                .order('date', { ascending: true }),
            supabase
                .from('alerts')
                .select('athlete_id, type, is_read, created_at')
                .eq('team_id', profile.team_id)
                .in('athlete_id', athleteIds.length > 0 ? athleteIds : ['__none__'])
                .gte('created_at', sevenDaysAgo.toISOString())
                .order('created_at', { ascending: false }),
        ]);

        const assignments = assignmentsRes.data || [];
        const nextWeekAssignments = nextWeekAssignmentsRes.data || [];
        const activities = activitiesRes.data || [];
        const feedbackRows = (feedbackRes.data || []) as ActivityFeedbackRow[];
        const totalPlans = trainingsCountRes.count ?? 0;
        const dbAlerts = (alertsRes.data || []) as DashboardAlert[];
        const activeDbAlerts = dbAlerts.filter((alert) => {
            if (alert.status !== 'SNOOZED') return true;
            if (!alert.snoozed_until) return true;
            return new Date(alert.snoozed_until).getTime() <= now.getTime();
        });
        const athleteRaces = (athleteRacesRes.data || []) as Array<{
            athlete_id: string;
            date: string;
            priority: 'A' | 'B' | 'C' | null;
            status: string | null;
        }>;
        const recentAlertRows = (recentAlertsRes.data || []) as AlertScoreView[];

        const raceContextByAthlete = new Map<string, { raceDate: string; racePriority: 'A' | 'B' | 'C' | null; raceProximityDays: number }>();
        athleteRaces.forEach((race) => {
            if (!race.date || race.status === 'COMPLETED' || race.status === 'DNR') return;

            const current = raceContextByAthlete.get(race.athlete_id);
            if (current) return;

            const diffMs = new Date(race.date).getTime() - now.getTime();
            const raceProximityDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

            raceContextByAthlete.set(race.athlete_id, {
                raceDate: race.date,
                racePriority: race.priority,
                raceProximityDays,
            });
        });

        const recurrenceByKey = new Map<string, number>();
        recentAlertRows.forEach((row) => {
            const normalizedType = normalizeAlertType(row.type || '');
            if (!normalizedType) return;
            const key = `${row.athlete_id}:${normalizedType}`;
            recurrenceByKey.set(key, (recurrenceByKey.get(key) || 0) + 1);
        });

        const zoneViolations = activeDbAlerts
            .filter((alert) => normalizeAlertType(alert.type || '') === 'zone_violation')
            .map((alert) => {
                const athleteRelation = getSingleRelation(alert.athlete);
                const activityRelation = getSingleRelation(alert.activity);

                const raceContext = raceContextByAthlete.get(alert.athlete_id);
                const recurrence = recurrenceByKey.get(`${alert.athlete_id}:zone_violation`) || 0;
                const computed = computeAlertScore({
                    type: 'zone_violation',
                    recurrence7d: recurrence,
                    racePriority: raceContext?.racePriority,
                    raceProximityDays: raceContext?.raceProximityDays,
                    alreadyRead: Boolean(alert.is_read),
                    recentlyResolved: Boolean(alert.resolved_at),
                });

                return {
                    alertId: alert.id,
                    id: alert.athlete_id,
                    name: athleteRelation?.name || 'Athlete',
                    type: 'zone_violation' as const,
                    time: alert.created_at,
                    message: alert.message,
                    details: activityRelation?.title || activityRelation?.type || 'Activity',
                    activityId: alert.activity_id,
                    score: typeof alert.score === 'number' ? alert.score : computed.score,
                    priority: alert.priority || computed.priority,
                    reasonCodes: Array.isArray(alert.reason_codes) ? alert.reason_codes : computed.reasonCodes,
                    recommendedActionKey: computed.recommendedActionKey,
                };
            });

        const isAssignmentCompleted = (
            assignment: { completed: boolean; scheduled_date: string; user_id: string },
            allActivities: typeof activities
        ): boolean => {
            if (assignment.completed) return true;
            const assignmentDate = assignment.scheduled_date.slice(0, 10);
            return allActivities.some((act) => {
                if (act.user_id !== assignment.user_id) return false;
                const actDate = act.start_date.slice(0, 10);
                return actDate === assignmentDate;
            });
        };

        const pastAssignments = assignments.filter((a) => a.scheduled_date.slice(0, 10) < todayStr);

        const completedThisWeek = assignments.filter((a) => isAssignmentCompleted(a, activities)).length;
        const totalThisWeek = assignments.length;
        const completionRate = totalThisWeek > 0 ? Math.round((completedThisWeek / totalThisWeek) * 100) : 0;

        const activeAthleteIds = new Set(
            assignments.filter((a) => isAssignmentCompleted(a, activities)).map((a) => a.user_id)
        );

        const athletesWithNextWeek = new Set(nextWeekAssignments.map((a) => a.user_id));
        const groupMissingPromises = ((groups || []) as DashboardGroup[]).map(async (group) => {
            const { data: members } = await supabase
                .from('athlete_groups')
                .select('athlete_id')
                .eq('group_id', group.id);

            const memberIds = (members || []).map((m) => m.athlete_id).filter((id) => scopedAthleteIds.has(id));
            if (memberIds.length === 0) {
                return null;
            }

            const hasAssignment = memberIds.some((id) => athletesWithNextWeek.has(id));
            const countArr = group.athlete_groups;
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
            ...(groupMissingResults.filter(Boolean) as { id: string; name: string; type: 'group'; memberCount: number }[]),
        ];

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

        const feedbackByAssignment = new Map<string, ActivityFeedbackRow>();
        feedbackRows.forEach((row) => {
            if (row.training_assignment_id && !feedbackByAssignment.has(row.training_assignment_id)) {
                feedbackByAssignment.set(row.training_assignment_id, row);
            }
        });

        const rpeMismatches = assignments
            .map((assignment) => {
                if (typeof assignment.expected_rpe !== 'number' || assignment.expected_rpe < 1) {
                    return null;
                }

                const feedback = feedbackByAssignment.get(assignment.id);
                if (!feedback || typeof feedback.rpe !== 'number') {
                    return null;
                }

                const difference = Math.abs(Number(feedback.rpe) - Number(assignment.expected_rpe));
                if (difference < 2) {
                    return null;
                }

                const feedbackActivity = getSingleRelation(feedback.activity);
                return {
                    athleteId: assignment.user_id,
                    athleteName: athleteMap.get(assignment.user_id) || 'Unknown',
                    workoutType:
                        assignment.workout_name ||
                        feedbackActivity?.title ||
                        feedbackActivity?.type ||
                        'Workout',
                    expectedRPE: Number(assignment.expected_rpe),
                    actualRPE: Number(feedback.rpe),
                    difference,
                };
            })
            .filter((item): item is NonNullable<typeof item> => Boolean(item));

        const recentFeedback = feedbackRows
            .filter((row) => typeof row.comments === 'string' && row.comments.trim().length > 0)
            .slice(0, 10)
            .map((row) => {
                const activityRelation = getSingleRelation(row.activity);
                return {
                    athleteId: row.user_id,
                    athleteName: athleteMap.get(row.user_id) || 'Unknown',
                    activityName: activityRelation?.title || activityRelation?.type || 'Activity',
                    timestamp: row.created_at,
                    content: row.comments || '',
                };
            });

        const smartAlerts = [
            ...zoneViolations.map((alert) => {
                return {
                    id: `zone-${alert.alertId || `${alert.id}-${alert.time}`}`,
                    alertId: alert.alertId,
                    athleteId: alert.id,
                    athleteName: alert.name,
                    type: 'zone_violation' as const,
                    time: alert.time,
                    details: alert.details,
                    score: alert.score,
                    priority: alert.priority,
                    recommendedActionKey: alert.recommendedActionKey,
                    reasonCodes: alert.reasonCodes,
                };
            }),
            ...rpeMismatches.map((mismatch) => {
                const raceContext = raceContextByAthlete.get(mismatch.athleteId);
                const recurrence = recurrenceByKey.get(`${mismatch.athleteId}:rpe_mismatch`) || 0;
                const scoring = computeAlertScore({
                    type: 'rpe_mismatch',
                    recurrence7d: recurrence,
                    racePriority: raceContext?.racePriority,
                    raceProximityDays: raceContext?.raceProximityDays,
                    rpeDifference: mismatch.difference,
                });

                return {
                    id: `rpe-${mismatch.athleteId}-${mismatch.workoutType}`,
                    athleteId: mismatch.athleteId,
                    athleteName: mismatch.athleteName,
                    type: 'rpe_mismatch' as const,
                    time: now.toISOString(),
                    details: mismatch.workoutType,
                    score: scoring.score,
                    priority: scoring.priority,
                    recommendedActionKey: scoring.recommendedActionKey,
                    reasonCodes: scoring.reasonCodes,
                };
            }),
            ...lowCompliance.map((item) => {
                const raceContext = raceContextByAthlete.get(item.athleteId);
                const recurrence = recurrenceByKey.get(`${item.athleteId}:low_compliance`) || 0;
                const scoring = computeAlertScore({
                    type: 'low_compliance',
                    recurrence7d: recurrence,
                    racePriority: raceContext?.racePriority,
                    raceProximityDays: raceContext?.raceProximityDays,
                    complianceRate: item.completionRate,
                });

                return {
                    id: `compliance-${item.athleteId}`,
                    athleteId: item.athleteId,
                    athleteName: item.athleteName,
                    type: 'low_compliance' as const,
                    time: now.toISOString(),
                    details: `${item.completionRate}%`,
                    score: scoring.score,
                    priority: scoring.priority,
                    recommendedActionKey: scoring.recommendedActionKey,
                    reasonCodes: scoring.reasonCodes,
                };
            }),
            ...missingWorkouts.map((item) => {
                const athleteId = item.type === 'athlete' ? item.id : `group:${item.id}`;
                const recurrence = recurrenceByKey.get(`${athleteId}:missing_workout`) || 0;
                const scoring = computeAlertScore({
                    type: 'missing_workout',
                    recurrence7d: recurrence,
                    missingSessionCount: item.type === 'group' ? item.memberCount : 1,
                });

                return {
                    id: `missing-${athleteId}`,
                    athleteId,
                    athleteName: item.name,
                    type: 'missing_workout' as const,
                    time: now.toISOString(),
                    details: item.type === 'group' ? `Grupo (${item.memberCount})` : 'Sin sesiones planificadas',
                    score: scoring.score,
                    priority: scoring.priority,
                    recommendedActionKey: scoring.recommendedActionKey,
                    reasonCodes: scoring.reasonCodes,
                };
            }),
            ...recentFeedback.map((feedback) => {
                const raceContext = raceContextByAthlete.get(feedback.athleteId);
                const recurrence = recurrenceByKey.get(`${feedback.athleteId}:new_feedback`) || 0;
                const hasRiskKeywords = extractRiskKeywords(feedback.content);
                const scoring = computeAlertScore({
                    type: 'new_feedback',
                    recurrence7d: recurrence,
                    racePriority: raceContext?.racePriority,
                    raceProximityDays: raceContext?.raceProximityDays,
                    hasRiskKeywords,
                });

                return {
                    id: `feedback-${feedback.athleteId}-${feedback.timestamp}`,
                    athleteId: feedback.athleteId,
                    athleteName: feedback.athleteName,
                    type: 'new_feedback' as const,
                    time: feedback.timestamp || now.toISOString(),
                    details: feedback.activityName,
                    score: scoring.score,
                    priority: scoring.priority,
                    recommendedActionKey: scoring.recommendedActionKey,
                    reasonCodes: scoring.reasonCodes,
                };
            }),
        ]
            .sort((a, b) => {
                const priorityOrder = { P1: 0, P2: 1, P3: 2, P4: 3 };
                const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
                if (pDiff !== 0) return pDiff;
                return b.score - a.score;
            })
            .slice(0, 25);

        const feedbackByActivityId = new Map(
            feedbackRows
                .filter((row) => row.activity_id && typeof row.comments === 'string' && row.comments.trim().length > 0)
                .map((row) => [row.activity_id as string, row.comments as string])
        );
        const activityTimeline = activities.slice(0, 8).map((act) => {
            const activityName = act.title || act.type || 'Activity';
            return {
                id: act.id,
                time: act.start_date,
                athleteName: athleteMap.get(act.user_id) || 'Unknown',
                activityName,
                content: feedbackByActivityId.get(act.id) || '',
            };
        });

        const groupComplianceResults = await Promise.all(
            ((groups || []) as DashboardGroup[]).map(async (group) => {
                const { data: members } = await supabase
                    .from('athlete_groups')
                    .select('athlete_id')
                    .eq('group_id', group.id);

                const memberIds = (members || []).map((m) => m.athlete_id).filter((id) => scopedAthleteIds.has(id));
                if (memberIds.length === 0) {
                    return null;
                }

                const groupAssignments = pastAssignments.filter((a) => memberIds.includes(a.user_id));
                const groupCompleted = groupAssignments.filter((a) => isAssignmentCompleted(a, activities)).length;
                const groupTotal = groupAssignments.length;
                const countArr = group.athlete_groups;
                const athleteCount =
                    Array.isArray(countArr) && countArr[0]?.count != null
                        ? Number(countArr[0].count)
                        : memberIds.length;

                return {
                    groupId: group.id,
                    groupName: group.name,
                    athleteCount,
                    completionRate: groupTotal > 0 ? Math.round((groupCompleted / groupTotal) * 100) : 100,
                };
            })
        );

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
            const wCompleted = (wAssignments || []).filter((a) => a.completed).length;
            performanceTrend.push({
                week: `W${6 - w}`,
                value: wTotal > 0 ? Math.round((wCompleted / wTotal) * 100) : 0,
            });
        }

        const activeAthletes = activeAthleteIds.size;
        const completedTodayCount = 0;
        const pendingActionCount = smartAlerts.filter((alert) => alert.priority === 'P1' || alert.priority === 'P2').length;
        const scopedTotalGroups =
            scope === 'team'
                ? (groups || []).length
                : groupComplianceResults.filter((g): g is NonNullable<typeof g> => Boolean(g)).length;

        return respond({
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
                totalGroups: scopedTotalGroups,
                athletesWithoutNextWeek: missingWorkouts.filter((m) => m.type === 'athlete').length,
                groupsWithoutNextWeek: missingWorkouts.filter((m) => m.type === 'group').length,
            },
            alerts: {
                rpeMismatches,
                lowCompliance,
                missingWorkouts,
                recentFeedback,
                zoneViolations,
                smartAlerts,
            },
            groupCompliance: groupComplianceResults.filter((g): g is NonNullable<typeof g> => Boolean(g)),
            weeklyActivity,
            performanceTrend,
            activityTimeline,
            scope,
        }, { status: 200 });
    } catch (error: unknown) {
        logger.error('coach_dashboard.unhandled_error', { error });
        Sentry.captureException(error, {
            tags: { route: '/api/v2/dashboard/coach', requestId },
        });
        return respond(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
