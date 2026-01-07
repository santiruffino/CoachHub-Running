'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/dashboard/StatCard';
import { SessionItem } from '@/components/dashboard/SessionItem';
import { WeeklyWorkoutsChart } from '@/components/dashboard/WeeklyWorkoutsChart';
import { PerformanceTrendChart } from '@/components/dashboard/PerformanceTrendChart';
import { Users, Calendar, CheckCircle2, TrendingUp, Clock, AlertTriangle, FolderOpen } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/axios';
import { DashboardStats, RecentSession } from '../types';
import { startOfWeek, endOfWeek, isWithinInterval, format, eachDayOfInterval, startOfDay, isToday, subWeeks, addWeeks } from 'date-fns';

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

        // Build allAssignments from the athletes' data (if needed for other calculations)
        // Note: We now have weekly stats directly, but we still need all assignments for charts
        const assignmentPromises = athletesWithStats.map((athlete: any) =>
          api.get(`/v2/users/${athlete.id}/details`).catch(() => ({ data: null }))
        );
        const athleteDetailsRes = await Promise.all(assignmentPromises);

        // Collect all assignments
        const allAssignments: any[] = [];
        athleteDetailsRes.forEach((res, idx) => {
          if (res.data?.assignments) {
            res.data.assignments.forEach((assignment: any) => {
              allAssignments.push({
                ...assignment,
                athleteName: athletesWithStats[idx].name || athletesWithStats[idx].email,
                athleteId: athletesWithStats[idx].id,
              });
            });
          }
        });


        // Calculate stats using date strings to avoid timezone issues
        const completedCount = allAssignments.filter((a) => a.completed).length;
        const todayStr = format(new Date(), 'yyyy-MM-dd');

        const completedToday = allAssignments.filter((a) => {
          const assignmentDateStr = a.scheduled_date.split('T')[0];
          return assignmentDateStr === todayStr && a.completed;
        }).length;

        // Calculate completion rate
        const totalAssignments = allAssignments.length;
        const completionRate = totalAssignments > 0
          ? Math.round((completedCount / totalAssignments) * 100)
          : 0;

        // This week's sessions
        const now = new Date();
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

        const weekStartStr = format(weekStart, 'yyyy-MM-dd');
        const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

        const thisWeekSessions = allAssignments.filter((a) => {
          const assignmentDateStr = a.scheduled_date.split('T')[0];
          return assignmentDateStr >= weekStartStr && assignmentDateStr <= weekEndStr;
        }).length;

        // Calculate completion rate for this week
        const thisWeekCompleted = allAssignments.filter((a) => {
          const assignmentDateStr = a.scheduled_date.split('T')[0];
          return assignmentDateStr >= weekStartStr && assignmentDateStr <= weekEndStr && a.completed;
        }).length;

        const thisWeekCompletionRate = thisWeekSessions > 0
          ? Math.round((thisWeekCompleted / thisWeekSessions) * 100)
          : 0;

        // Calculate next week's date range (next Monday to next Sunday)
        const nextWeekStart = addWeeks(startOfWeek(now, { weekStartsOn: 1 }), 1);
        const nextWeekEnd = endOfWeek(nextWeekStart, { weekStartsOn: 1 });
        const nextWeekStartStr = format(nextWeekStart, 'yyyy-MM-dd');
        const nextWeekEndStr = format(nextWeekEnd, 'yyyy-MM-dd');

        // Check which athletes have assignments for next week
        const athletesWithNextWeekWorkouts = new Set<string>();
        allAssignments.forEach((assignment) => {
          const assignmentDateStr = assignment.scheduled_date.split('T')[0];
          if (assignmentDateStr >= nextWeekStartStr && assignmentDateStr <= nextWeekEndStr) {
            athletesWithNextWeekWorkouts.add(assignment.athleteId);
          }
        });

        // Calculate athletes without next week workouts
        const athletesWithoutNextWeek = athletesWithStats.length - athletesWithNextWeekWorkouts.size;

        // Calculate groups without next week workouts
        // A group has no next week workouts if NONE of its members have workouts scheduled
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

        // Weekly data for bar chart
        const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
        const weeklyWorkouts = weekDays.map(day => {
          const dayStr = format(day, 'yyyy-MM-dd');

          const count = allAssignments.filter((a) => {
            const assignmentDateStr = a.scheduled_date.split('T')[0];
            return assignmentDateStr === dayStr;
          }).length;

          const dayAbbr = format(day, 'EEE').slice(0, 3);
          return {
            day: dayAbbr,
            value: count,
          };
        });
        setWeeklyData(weeklyWorkouts);

        // Performance trend data (last 6 weeks)
        const performanceWeeks = [];
        for (let i = 5; i >= 0; i--) {
          const week = subWeeks(now, i);
          const weekStart = startOfWeek(week, { weekStartsOn: 1 });
          const weekEnd = endOfWeek(week, { weekStartsOn: 1 });

          const weekStartStr = format(weekStart, 'yyyy-MM-dd');
          const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

          const weekCompleted = allAssignments.filter((a) => {
            const assignmentDateStr = a.scheduled_date.split('T')[0];
            return assignmentDateStr >= weekStartStr && assignmentDateStr <= weekEndStr && a.completed;
          }).length;

          const weekTotal = allAssignments.filter((a) => {
            const assignmentDateStr = a.scheduled_date.split('T')[0];
            return assignmentDateStr >= weekStartStr && assignmentDateStr <= weekEndStr;
          }).length;

          const rate = weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : 0;

          performanceWeeks.push({
            week: `Sem ${6 - i}`,
            value: rate,
          });
        }
        setPerformanceData(performanceWeeks);

        // Get recent 5 sessions (sort by scheduled date desc)
        const sortedAssignments = [...allAssignments].sort(
          (a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime()
        );

        const recentSessions: RecentSession[] = sortedAssignments.slice(0, 5).map((a) => ({
          id: a.id,
          athleteName: a.athleteName,
          activityType: TRAINING_TYPE_LABELS[a.training?.type] || a.training?.type || 'Entrenamiento',
          duration: undefined,
          date: new Date(a.scheduled_date),
          completed: a.completed,
        }));

        setRecentSessions(recentSessions);
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
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Vista general de tu programa de entrenamiento
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Atletas"
          value={stats?.totalAthletes || 0}
          change={athletesChange}
          icon={Users}
        />
        <StatCard
          title="Total Grupos"
          value={stats?.totalGroups || 0}
          change="+2"
          icon={FolderOpen}
        />
        <StatCard
          title="Entrenamientos Activos"
          value={stats?.activePlans || 0}
          change={activeTrainingsChange}
          icon={Calendar}
        />
        <StatCard
          title="Tasa de Cumplimiento"
          value={`${stats?.completionRate || 0}%`}
          change={completionRateChange}
          icon={TrendingUp}
        />
      </div>

      {/* Warning Stats - Athletes and Groups without next week workouts */}
      {(stats && (stats.athletesWithoutNextWeek > 0 || stats.groupsWithoutNextWeek > 0)) && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Atletas sin Entrenamientos (Próxima Semana)"
            value={stats?.athletesWithoutNextWeek || 0}
            icon={AlertTriangle}
          />
          <StatCard
            title="Grupos sin Entrenamientos (Próxima Semana)"
            value={stats?.groupsWithoutNextWeek || 0}
            icon={AlertTriangle}
          />
          <StatCard
            title="Completados Hoy"
            value={stats?.completedToday || 0}
            change={completedTodayChange}
            icon={CheckCircle2}
          />
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <WeeklyWorkoutsChart data={weeklyData} />
        <PerformanceTrendChart data={performanceData} />
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Actividad Reciente</CardTitle>
        </CardHeader>
        <CardContent>
          {recentSessions.length > 0 ? (
            <div className="divide-y">
              {recentSessions.map((session) => (
                <SessionItem
                  key={session.id}
                  name={session.athleteName}
                  activityType={session.activityType}
                  duration={session.duration}
                  date={session.date}
                  status={session.completed ? 'Completada' : 'Programada'}
                  icon={
                    session.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    )
                  }
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No hay actividad reciente
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
