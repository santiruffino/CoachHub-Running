'use client';

import { useEffect, useState } from 'react';
import { StatCard } from '@/components/dashboard/StatCard';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { CriticalAlertItem } from '@/components/dashboard/CriticalAlertItem';
import { GroupStatusCard } from '@/components/dashboard/GroupStatusCard';
import { SessionItem } from '@/components/dashboard/SessionItem';
import { WeeklyWorkoutsChart } from '@/components/dashboard/WeeklyWorkoutsChart';
import { PerformanceTrendChart } from '@/components/dashboard/PerformanceTrendChart';
import { AlertTriangle, Calendar, CheckCircle2, FolderOpen, TrendingUp, Users, MessageSquare, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/axios';
import { DashboardStats, LowCompliance, MissingWorkout, RecentSession, RPEMismatch } from '../types';
import { addWeeks, eachDayOfInterval, endOfWeek, format, startOfWeek, subWeeks } from 'date-fns';

const TRAINING_TYPE_LABELS: Record<string, string> = {
  RUNNING: 'Running',
  STRENGTH: 'Fuerza',
  CYCLING: 'Ciclismo',
  SWIMMING: 'Natación',
  OTHER: 'Otro',
};

export default function CoachDashboard({ user }: { user: any }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [weeklyData, setWeeklyData] = useState<{ day: string; value: number }[]>([]);
  const [performanceData, setPerformanceData] = useState<{ week: string; value: number }[]>([]);
  const [rpeMismatches, setRpeMismatches] = useState<RPEMismatch[]>([]);
  const [missingWorkouts, setMissingWorkouts] = useState<MissingWorkout[]>([]);
  const [lowCompliance, setLowCompliance] = useState<LowCompliance[]>([]);
  const [athleteFeedback, setAthleteFeedback] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [groupCompliance, setGroupCompliance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch all necessary data in parallel - using new stats endpoint for athletes
        const [groupsRes, trainingsRes, athletesWithStatsRes] = await Promise.all([
          api.get('/v2/groups'),
          api.get('/v2/trainings'),
          api.get('/v2/users/athletes/stats'),
        ]);

        const groups = groupsRes.data;
        const trainings = trainingsRes.data;
        const athletesWithStats = athletesWithStatsRes.data;

        // Calculate unique active athletes from groups
        const uniqueAthletes = new Set<string>();
        groups.forEach((group: any) => {
          group.members?.forEach((member: any) => {
            if (member.athlete) {
              uniqueAthletes.add(member.athlete.id);
            }
          });
        });

        // 1. Fetch all athlete details and activities in parallel
        // This avoids the N+1 sequential loop bottleneck
        const athleteDataPromises = athletesWithStats.map(async (athlete: any) => {
          try {
            const [detailsRes, activitiesRes] = await Promise.all([
              api.get(`/v2/users/${athlete.id}/details`),
              api.get(`/v2/users/${athlete.id}/activities`)
            ]);
            return {
              athleteId: athlete.id,
              athleteName: athlete.name || athlete.email,
              details: detailsRes.data,
              activities: activitiesRes.data || []
            };
          } catch (err) {
            console.error(`Failed to fetch data for athlete ${athlete.id}`, err);
            return { athleteId: athlete.id, athleteName: athlete.name || athlete.email, details: null, activities: [] };
          }
        });

        const athleteDataResults = await Promise.all(athleteDataPromises);

        // Map for quick access to athlete details (deduplication)
        const athleteDataMap = new Map();
        athleteDataResults.forEach(data => athleteDataMap.set(data.athleteId, data));

        // 2. Collect all assignments for stats and charts
        const allAssignments: any[] = [];
        athleteDataResults.forEach((data) => {
          if (data.details?.assignments) {
            data.details.assignments.forEach((assignment: any) => {
              allAssignments.push({
                ...assignment,
                athleteName: data.athleteName,
                athleteId: data.athleteId,
              });
            });
          }
        });

        // 3. Prepare for RPE Mismatch and Feedback collection
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const todayStr = format(today, 'yyyy-MM-dd');
        const yesterdayStr = format(yesterday, 'yyyy-MM-dd');
        const sevenDaysAgoStr = format(sevenDaysAgo, 'yyyy-MM-dd');

        // Identify which activities need feedback fetched
        const feedbackPromises: Promise<any>[] = [];

        athleteDataResults.forEach(data => {
          const recentActivities = data.activities.filter((activity: any) => {
            const activityDateStr = activity.start_date.split('T')[0];
            // Need feedback for:
            // - RPE Mismatch (today/yesterday)
            // - New Feedback (last 7 days)
            return activityDateStr >= sevenDaysAgoStr;
          });

          recentActivities.forEach((activity: any) => {
            if (activity.external_id) {
              feedbackPromises.push(
                api.get(`/v2/activities/${activity.external_id}/feedback`)
                  .then(res => ({
                    athleteId: data.athleteId,
                    athleteName: data.athleteName,
                    activity,
                    feedback: res.data
                  }))
                  .catch(() => null)
              );
            }
          });
        });

        // Fetch all necessary feedback in parallel
        const feedbackResults = (await Promise.all(feedbackPromises)).filter(Boolean);

        // 4. Calculate RPE Mismatches
        const rpeMismatchList: RPEMismatch[] = [];
        feedbackResults.forEach(item => {
          const { athleteId, athleteName, activity, feedback } = item;
          const activityDateStr = activity.start_date.split('T')[0];

          // Only check RPE for today and yesterday
          if ((activityDateStr === todayStr || activityDateStr === yesterdayStr) && feedback?.rpe) {
            const data = athleteDataMap.get(athleteId);
            const assignments = data?.details?.assignments || [];

            const matchingAssignment = assignments.find((a: any) => {
              const assignmentDateStr = a.scheduled_date.split('T')[0];
              return assignmentDateStr === activityDateStr && a.completed;
            });

            if (matchingAssignment?.expected_rpe) {
              const difference = Math.abs(feedback.rpe - matchingAssignment.expected_rpe);
              if (difference >= 3) {
                rpeMismatchList.push({
                  athleteId,
                  athleteName,
                  workoutType: activity.type || 'Entrenamiento',
                  expectedRPE: matchingAssignment.expected_rpe,
                  actualRPE: feedback.rpe,
                  difference,
                });
              }
            }
          }
        });

        rpeMismatchList.sort((a, b) => b.difference - a.difference);
        setRpeMismatches(rpeMismatchList.slice(0, 5));

        // 5. Collect Recent Athlete Feedback with Comments
        const finalFeedbackList = feedbackResults
          .filter(item => {
            const activityDateStr = item.activity.start_date.split('T')[0];
            return activityDateStr >= sevenDaysAgoStr && item.feedback?.comments && item.feedback.comments.trim() !== '';
          })
          .map(item => {
            const activityDate = new Date(item.activity.start_date);
            const hoursDiff = Math.floor((today.getTime() - activityDate.getTime()) / (1000 * 60 * 60));
            return {
              athleteId: item.athleteId,
              athleteName: item.athleteName,
              activityName: item.activity.title,
              activityType: item.activity.type || 'Workout',
              comments: item.feedback.comments,
              rpe: item.feedback.rpe,
              timestamp: hoursDiff < 24 ? `${hoursDiff}h ago` : `${Math.floor(hoursDiff / 24)}d ago`,
              activityDate: item.activity.start_date
            };
          })
          .sort((a, b) => new Date(b.activityDate).getTime() - new Date(a.activityDate).getTime())
          .slice(0, 5);

        setAthleteFeedback(finalFeedbackList);

        // --- Rest of calculation logic (already uses allAssignments and athleteDataResults) ---

        // Calculate overall stats
        const completedCount = allAssignments.filter((a) => a.completed).length;
        const completedToday = allAssignments.filter((a) => {
          const assignmentDateStr = a.scheduled_date.split('T')[0];
          return assignmentDateStr === todayStr && a.completed;
        }).length;

        const totalAssignments = allAssignments.length;
        const weekStart = startOfWeek(today, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
        const weekStartStr = format(weekStart, 'yyyy-MM-dd');
        const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

        const thisWeekSessions = allAssignments.filter((a) => {
          const assignmentDateStr = a.scheduled_date.split('T')[0];
          return assignmentDateStr >= weekStartStr && assignmentDateStr <= weekEndStr;
        }).length;

        const thisWeekCompleted = allAssignments.filter((a) => {
          const assignmentDateStr = a.scheduled_date.split('T')[0];
          return assignmentDateStr >= weekStartStr && assignmentDateStr <= weekEndStr && a.completed;
        }).length;

        const thisWeekCompletionRate = thisWeekSessions > 0
          ? Math.round((thisWeekCompleted / thisWeekSessions) * 100)
          : 0;

        const nextWeekStart = addWeeks(startOfWeek(today, { weekStartsOn: 1 }), 1);
        const nextWeekEnd = endOfWeek(nextWeekStart, { weekStartsOn: 1 });
        const nextWeekStartStr = format(nextWeekStart, 'yyyy-MM-dd');
        const nextWeekEndStr = format(nextWeekEnd, 'yyyy-MM-dd');

        const athletesWithNextWeekWorkouts = new Set<string>();
        allAssignments.forEach((assignment) => {
          const assignmentDateStr = assignment.scheduled_date.split('T')[0];
          if (assignmentDateStr >= nextWeekStartStr && assignmentDateStr <= nextWeekEndStr) {
            athletesWithNextWeekWorkouts.add(assignment.athleteId);
          }
        });

        const athletesWithoutNextWeek = athletesWithStats.length - athletesWithNextWeekWorkouts.size;

        let groupsWithoutNextWeek = 0;
        groups.forEach((group: any) => {
          const hasAnyMemberWithWorkout = group.members?.some((member: any) =>
            member.athlete && athletesWithNextWeekWorkouts.has(member.athlete.id)
          );
          if (!hasAnyMemberWithWorkout) {
            groupsWithoutNextWeek++;
          }
        });

        setStats({
          activeAthletes: uniqueAthletes.size,
          totalAthletes: athletesWithStats.length,
          activePlans: trainings.length,
          totalPlans: trainings.length,
          completedSessions: completedCount,
          thisWeekSessions,
          completedToday,
          completionRate: thisWeekCompletionRate,
          totalGroups: groups.length,
          athletesWithoutNextWeek,
          groupsWithoutNextWeek,
        });

        setGroups(groups);

        // Group compliance calculation
        const groupComplianceData = groups.map((group: any) => {
          const groupMemberIds = group.members?.map((m: any) => m.athlete?.id).filter(Boolean) || [];
          const groupAssignments = allAssignments.filter((a: any) => groupMemberIds.includes(a.athleteId));
          const groupThisWeek = groupAssignments.filter((a: any) => {
            const assignmentDateStr = a.scheduled_date.split('T')[0];
            return assignmentDateStr >= weekStartStr && assignmentDateStr <= weekEndStr;
          });
          const groupCompleted = groupThisWeek.filter((a: any) => a.completed);
          const rate = groupThisWeek.length > 0 ? Math.round((groupCompleted.length / groupThisWeek.length) * 100) : 0;

          return {
            groupId: group.id,
            groupName: group.name,
            athleteCount: groupMemberIds.length,
            completionRate: rate
          };
        });
        setGroupCompliance(groupComplianceData);

        // Weekly data for bar chart
        const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
        setWeeklyData(weekDays.map(day => {
          const dayStr = format(day, 'yyyy-MM-dd');
          const count = allAssignments.filter((a) => a.scheduled_date.split('T')[0] === dayStr).length;
          return { day: format(day, 'EEE').slice(0, 3), value: count };
        }));

        // Performance trend data (last 6 weeks)
        const performanceWeeks = [];
        for (let i = 5; i >= 0; i--) {
          const weekStart = startOfWeek(subWeeks(today, i), { weekStartsOn: 1 });
          const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
          const weekStartStr = format(weekStart, 'yyyy-MM-dd');
          const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

          const periodAssignments = allAssignments.filter((a) => {
            const d = a.scheduled_date.split('T')[0];
            return d >= weekStartStr && d <= weekEndStr;
          });
          const completed = periodAssignments.filter(a => a.completed).length;
          const rate = periodAssignments.length > 0 ? Math.round((completed / periodAssignments.length) * 100) : 0;

          performanceWeeks.push({ week: `Sem ${6 - i}`, value: rate });
        }
        setPerformanceData(performanceWeeks);

        // Recent sessions
        setRecentSessions([...allAssignments]
          .sort((a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime())
          .slice(0, 5)
          .map((a) => ({
            id: a.id,
            athleteName: a.athleteName,
            activityType: TRAINING_TYPE_LABELS[a.training?.type] || a.training?.type || 'Entrenamiento',
            duration: undefined,
            date: new Date(a.scheduled_date),
            completed: a.completed,
          }))
        );

        // Missing Workouts calculation
        const missingWorkoutsList: MissingWorkout[] = [];
        groups.forEach((group: any) => {
          if (!group.members?.some((m: any) => m.athlete && athletesWithNextWeekWorkouts.has(m.athlete.id))) {
            missingWorkoutsList.push({ id: group.id, name: group.name, type: 'group', memberCount: group.members?.length || 0 });
          }
        });

        athletesWithStats.forEach((athlete: any) => {
          if (!athletesWithNextWeekWorkouts.has(athlete.id)) {
            const inGroupWithoutWorkouts = groups.some((g: any) =>
              !g.members?.some((m: any) => m.athlete && athletesWithNextWeekWorkouts.has(m.athlete.id)) &&
              g.members?.some((m: any) => m.athlete?.id === athlete.id)
            );
            if (!inGroupWithoutWorkouts) {
              missingWorkoutsList.push({ id: athlete.id, name: athlete.name || athlete.email, type: 'athlete' });
            }
          }
        });
        setMissingWorkouts(missingWorkoutsList.slice(0, 5));

        // Low Compliance
        const lowComplianceList: LowCompliance[] = [];
        athleteDataResults.forEach((data) => {
          if (data.details?.assignments) {
            const thisWeek = data.details.assignments.filter((a: any) => {
              const d = a.scheduled_date.split('T')[0];
              return d >= weekStartStr && d <= weekEndStr;
            });
            const completed = thisWeek.filter((a: any) => a.completed).length;
            if (thisWeek.length > 0) {
              const rate = Math.round((completed / thisWeek.length) * 100);
              if (rate < 50) {
                lowComplianceList.push({ athleteId: data.athleteId, athleteName: data.athleteName, completed, total: thisWeek.length, completionRate: rate });
              }
            }
          }
        });
        setLowCompliance(lowComplianceList.slice(0, 5));
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 p-8">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  // Calculate changes (mock data for now - would need historical data for real changes)
  const athletesChange = '+3';
  const activeTrainingsChange = '+12';
  const completedTodayChange = '+5';
  const completionRateChange = '+2%';

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Coach Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Vista general de tu programa de entrenamiento
        </p>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="RPE Fallido"
          value={rpeMismatches.length}
          subtitle="Ultimas 48h"
          icon={AlertTriangle}
          accentColor="text-orange-500"
          iconBgColor="bg-orange-500/10"
        />
        <MetricCard
          title="Atletas sin entrenamientos"
          value={missingWorkouts.length}
          subtitle="Sin entrenamientos la proxima semana"
          icon={Calendar}
          accentColor="text-red-500"
          iconBgColor="bg-red-500/10"
        />
        <MetricCard
          title="Incumplimiento"
          value={lowCompliance.length}
          subtitle="Atletas con <50% de ejecucion"
          icon={TrendingUp}
          accentColor="text-yellow-500"
          iconBgColor="bg-yellow-500/10"
        />
      </div>

      {/* Main Content: Critical Alerts + Group Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Critical Alerts Feed - 2/3 width */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Alertas Importantes</CardTitle>
              <a href="#" className="text-sm text-primary hover:underline">Marcar como leidas</a>
            </CardHeader>
            <CardContent className="p-0">
              {(rpeMismatches.length > 0 || lowCompliance.length > 0 || missingWorkouts.length > 0 || athleteFeedback.length > 0) ? (
                <div className="px-6 divide-y divide-border">
                  {/* Athlete Feedback */}
                  {athleteFeedback.map((feedback, idx) => (
                    <CriticalAlertItem
                      key={`feedback-${idx}`}
                      athleteId={feedback.athleteId}
                      athleteName={feedback.athleteName}
                      alertType="new_feedback"
                      timestamp={feedback.timestamp}
                      message={`Dejó un comentario en "${feedback.activityName}"`}
                      details={feedback.comments}
                    />
                  ))}

                  {/* RPE Mismatches */}
                  {rpeMismatches.map((mismatch, idx) => (
                    <CriticalAlertItem
                      key={`rpe-${idx}`}
                      athleteId={mismatch.athleteId}
                      athleteName={mismatch.athleteName}
                      alertType="rpe_mismatch"
                      timestamp={`${Math.floor(Math.random() * 24)}h ago`}
                      message={`Interval session reported as RPE ${mismatch.actualRPE} (target: ${mismatch.expectedRPE}). "${mismatch.workoutType}"`}
                      details={`Expected RPE: ${mismatch.expectedRPE} → Actual RPE: ${mismatch.actualRPE}. Difference: +${mismatch.difference} points.`}
                    />
                  ))}

                  {/* Low Compliance */}
                  {lowCompliance.map((item) => (
                    <CriticalAlertItem
                      key={`compliance-${item.athleteId}`}
                      athleteId={item.athleteId}
                      athleteName={item.athleteName}
                      alertType="low_compliance"
                      timestamp="this week"
                      message={`Only ${item.completionRate}% completion this week (${item.completed}/${item.total} workouts)`}
                      details={`${item.athleteName} has completed ${item.completed} out of ${item.total} assigned workouts this week.`}
                    />
                  ))}

                  {/* Missing Workouts */}
                  {missingWorkouts.slice(0, 3).map((item) => (
                    <CriticalAlertItem
                      key={`missing-${item.id}`}
                      athleteId={item.id}
                      athleteName={item.name}
                      alertType="missing_workout"
                      timestamp="next week"
                      message={item.type === 'group' ? `Group has no workouts planned (${item.memberCount} athletes)` : 'No hay entrenamientos planificados'}
                    />
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                  <p className="text-sm">No critical alerts at this time</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Group Status Panel - 1/3 width */}
        <div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Estado de los grupos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {groupCompliance.length > 0 ? (
                groupCompliance.map((group) => (
                  <GroupStatusCard
                    key={group.groupId}
                    groupId={group.groupId}
                    groupName={group.groupName}
                    athleteCount={group.athleteCount}
                    completionRate={group.completionRate}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No se encontraron grupos
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
