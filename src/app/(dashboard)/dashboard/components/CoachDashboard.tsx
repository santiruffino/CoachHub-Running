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

        const response = await api.get('/v2/dashboard/coach');
        const data = response.data;

        setStats(data.stats);
        setRecentSessions(data.recentSessions);
        setWeeklyData(data.charts.weeklyWorkouts);
        setPerformanceData(data.charts.performanceTrend);
        setRpeMismatches(data.alerts.rpeMismatches);
        setMissingWorkouts(data.alerts.missingWorkouts);
        setLowCompliance(data.alerts.lowCompliance);
        setAthleteFeedback(data.alerts.recentFeedback);
        setGroupCompliance(data.groups);

        // Note: raw groups are no longer needed in state as all calculations happened on backend
        setGroups(data.groups.map((g: any) => ({ id: g.groupId, name: g.groupName })));

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
          title="RPE MISMATCHES"
          value={rpeMismatches.length}
          subtitle="last 48h"
          icon={AlertTriangle}
          accentColor="text-orange-500"
          iconBgColor="bg-orange-500/10"
        />
        <MetricCard
          title="MISSING WORKOUTS"
          value={missingWorkouts.length}
          subtitle="next week no workouts"
          icon={Calendar}
          accentColor="text-red-500"
          iconBgColor="bg-red-500/10"
        />
        <MetricCard
          title="LOW COMPLIANCE"
          value={lowCompliance.length}
          subtitle="athletes < 50% completion"
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
              <CardTitle>Critical Alerts</CardTitle>
              <a href="#" className="text-sm text-primary hover:underline">Mark all read</a>
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
                      message={`Left a comment on "${feedback.activityType}"`}
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
                      message={item.type === 'group' ? `Group has no workouts planned (${item.memberCount} athletes)` : 'No workouts scheduled'}
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
              <CardTitle>Group Status</CardTitle>
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
                  No groups found
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

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
