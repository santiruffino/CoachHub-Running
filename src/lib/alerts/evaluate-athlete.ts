import { SupabaseClient } from '@supabase/supabase-js';
import { computeAlertScore } from '@/lib/alerts/scoring';
import { ActivityLoadRow, buildDailyLoadSeries, classifyLoadRisk } from '@/lib/training/load';
import { CoachSettings } from '@/features/settings/types';

export type AthleteAlertType = 'RPE_MISMATCH' | 'LOW_COMPLIANCE' | 'TRAINING_LOAD';

export interface AthleteAlertResult {
    type: AthleteAlertType;
    message: string;
    score: number;
    priority: 'P1' | 'P2' | 'P3' | 'P4';
    reasonCodes: string[];
    recommendedAction: string;
}

const RECOMMENDED_ACTION_TEXT: Record<string, string> = {
    contactNowAdjustLoad: 'Contactar al atleta hoy y ajustar la carga inmediata',
    reviewAndAdjustWeek: 'Revisar y ajustar la planificacion de la semana',
    monitorAndCheckIn: 'Monitorear y hacer un seguimiento con el atleta',
    logAndMonitor: 'Registrar y continuar monitoreando',
};

function recommendedActionText(key: string): string {
    return RECOMMENDED_ACTION_TEXT[key] || RECOMMENDED_ACTION_TEXT.logAndMonitor;
}

function getTodayWeekRange(now: Date): { weekStart: Date; weekEnd: Date } {
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + diffToMonday);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return { weekStart, weekEnd };
}

export async function evaluateAthleteAlerts(
    supabase: SupabaseClient,
    athleteId: string,
    athleteName: string,
    settings: CoachSettings
): Promise<AthleteAlertResult[]> {
    const now = new Date();
    const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    const { weekStart, weekEnd } = getTodayWeekRange(now);
    const loadLookbackStart = new Date(now);
    loadLookbackStart.setDate(now.getDate() - 71);
    loadLookbackStart.setHours(0, 0, 0, 0);

    const [assignmentsRes, loadActivitiesRes, feedbackRes] = await Promise.all([
        supabase
            .from('training_assignments')
            .select('id, user_id, completed, scheduled_date, expected_rpe, workout_name')
            .eq('user_id', athleteId)
            .gte('scheduled_date', weekStart.toISOString())
            .lte('scheduled_date', weekEnd.toISOString()),
        supabase
            .from('activities')
            .select('user_id, start_date, load_score, suffer_score, duration, avg_hr, max_hr')
            .eq('user_id', athleteId)
            .gte('start_date', loadLookbackStart.toISOString())
            .lte('start_date', now.toISOString())
            .order('start_date', { ascending: true }),
        supabase
            .from('activity_feedback')
            .select('user_id, activity_id, training_assignment_id, rpe, comments, created_at')
            .eq('user_id', athleteId)
            .gte('created_at', weekStart.toISOString()),
    ]);

    const assignments = assignmentsRes.data || [];
    const loadActivities = (loadActivitiesRes.data || []) as ActivityLoadRow[];
    const feedbackRows = feedbackRes.data || [];

    const results: AthleteAlertResult[] = [];

    const activitiesByDate = new Map<string, string>();
    loadActivities.forEach((row) => {
        activitiesByDate.set(row.start_date.slice(0, 10), row.start_date);
    });

    const pastAssignments = assignments.filter((a) => a.scheduled_date.slice(0, 10) < todayStr);
    const isCompleted = (a: { completed: boolean; scheduled_date: string }) =>
        a.completed || activitiesByDate.has(a.scheduled_date.slice(0, 10));

    if (pastAssignments.length > 0) {
        const completed = pastAssignments.filter(isCompleted).length;
        const completionRate = Math.round((completed / pastAssignments.length) * 100);
        const lowComplianceThreshold = settings.thresholds.lowComplianceThreshold;

        if (completionRate < lowComplianceThreshold) {
            const scoring = computeAlertScore({
                type: 'low_compliance',
                recurrence7d: 0,
                complianceRate: completionRate,
                thresholds: settings.thresholds,
            });

            results.push({
                type: 'LOW_COMPLIANCE',
                message: `${athleteName} tiene un cumplimiento bajo esta semana (${completionRate}%).`,
                score: scoring.score,
                priority: scoring.priority,
                reasonCodes: scoring.reasonCodes,
                recommendedAction: recommendedActionText(scoring.recommendedActionKey),
            });
        }
    }

    const feedbackByAssignment = new Map<string, { rpe: number | null }>();
    feedbackRows.forEach((row) => {
        if (row.training_assignment_id && !feedbackByAssignment.has(row.training_assignment_id)) {
            feedbackByAssignment.set(row.training_assignment_id, row);
        }
    });

    for (const assignment of assignments) {
        if (typeof assignment.expected_rpe !== 'number' || assignment.expected_rpe < 1) continue;
        const feedback = feedbackByAssignment.get(assignment.id);
        if (!feedback || typeof feedback.rpe !== 'number') continue;

        const difference = Math.abs(Number(feedback.rpe) - Number(assignment.expected_rpe));
        if (difference < settings.thresholds.rpeMismatchThreshold) continue;

        const scoring = computeAlertScore({
            type: 'rpe_mismatch',
            recurrence7d: 0,
            rpeDifference: difference,
            thresholds: settings.thresholds,
        });

        results.push({
            type: 'RPE_MISMATCH',
            message: `${athleteName} reporto un RPE muy distinto al esperado en "${assignment.workout_name || 'un entrenamiento'}" (esperado ${assignment.expected_rpe}, real ${feedback.rpe}).`,
            score: scoring.score,
            priority: scoring.priority,
            reasonCodes: scoring.reasonCodes,
            recommendedAction: recommendedActionText(scoring.recommendedActionKey),
        });
        break;
    }

    if (loadActivities.length > 0) {
        const loadData = buildDailyLoadSeries(loadActivities, { rangeDays: 30, now });
        const risk = classifyLoadRisk(loadData.current.acwr, loadData.current.tsb, settings.thresholds);

        if (risk === 'high' || risk === 'moderate') {
            const scoring = computeAlertScore({
                type: 'training_load',
                recurrence7d: 0,
                loadRisk: risk,
                acwr: loadData.current.acwr,
                tsb: loadData.current.tsb,
                thresholds: settings.thresholds,
            });

            const riskLabel = risk === 'high' ? 'Riesgo alto' : 'Riesgo moderado';
            results.push({
                type: 'TRAINING_LOAD',
                message: `${athleteName} muestra ${riskLabel.toLowerCase()} de carga (ACWR ${loadData.current.acwr.toFixed(2)}, TSB ${Math.round(loadData.current.tsb)}).`,
                score: scoring.score,
                priority: scoring.priority,
                reasonCodes: scoring.reasonCodes,
                recommendedAction: recommendedActionText(scoring.recommendedActionKey),
            });
        }
    }

    return results;
}
