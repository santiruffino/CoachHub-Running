'use client';

import { useEffect, useState } from 'react';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { CriticalAlertItem } from '@/components/dashboard/CriticalAlertItem';
import { GroupStatusCard } from '@/components/dashboard/GroupStatusCard';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/axios';
import { DashboardStats, LowCompliance, MissingWorkout, RPEMismatch, TimelineEvent } from '../types';
import { useTranslations } from 'next-intl';

interface DashboardData {
  stats: DashboardStats;
  alerts: {
    rpeMismatches: RPEMismatch[];
    lowCompliance: LowCompliance[];
    missingWorkouts: MissingWorkout[];
    recentFeedback: any[];
  };
  groupCompliance: { groupId: string; groupName: string; athleteCount: number; completionRate: number }[];
  activityTimeline: TimelineEvent[];
}

function TimelineItem({ time, content, isSystem = false }: any) {
  return (
    <div className="relative pl-6 pb-7 last:pb-0">
      <div className={`absolute left-0 top-1.5 w-2 h-2 rounded-full ${isSystem ? 'bg-primary' : 'bg-red-500'}`} />
      <div className="absolute left-[3px] top-4 bottom-0 w-px bg-border/40" />
      <div className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wide">{time}</div>
      <div className="text-sm leading-relaxed text-foreground/90">
        {content}
      </div>
    </div>
  );
}

export default function CoachDashboard({ user }: { user: any }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const t = useTranslations();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const res = await api.get('/v2/dashboard/coach');
        setData(res.data);
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 p-8 max-w-7xl mx-auto">
        <div>
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  const activeAthletes = data?.stats?.activeAthletes ?? 0;
  const completedToday = data?.stats?.completedToday ?? 0;
  const rpeCount = data?.alerts?.rpeMismatches?.length ?? 0;
  const missingCount = data?.alerts?.missingWorkouts?.length ?? 0;
  const lowComplianceCount = data?.alerts?.lowCompliance?.length ?? 0;
  const pendingActionCount = rpeCount + missingCount + lowComplianceCount;
  const groupCount = data?.stats?.totalGroups ?? 0;

  const formatPlanSub = (groupName?: string, raceDate?: string) => {
    if (!groupName && !raceDate) return "";
    return t("dashboard.planSubtitle", { 
        groupName: groupName || t("dashboard.athlete.defaultName"), 
        timeframe: raceDate || "" 
    }).replace(/ - $/, ""); // Remove trailing separator if no timeframe
  };

  // Real alerts mapped to UI properties
  const allAlerts = [
    ...(data?.alerts?.recentFeedback?.map((fb: any) => ({
      id: fb.athleteId,
      name: fb.athleteName,
      type: 'new_feedback' as const,
      time: fb.timestamp || t("dashboard.alerts.new"),
      message: t("dashboard.alertTypes.new_feedback"),
      details: fb.activityName,
    })) || []),
    ...(data?.alerts?.rpeMismatches?.map((m: RPEMismatch) => ({
      id: m.athleteId,
      name: m.athleteName,
      type: 'rpe_mismatch' as const,
      time: t("dashboard.alerts.rpeCheck"),
      message: t("dashboard.alertTypes.rpe_mismatch"),
      details: formatPlanSub(m.groupName, m.targetRace)
    })) || []),
    ...(data?.alerts?.lowCompliance?.map((l: LowCompliance) => ({
      id: l.athleteId,
      name: l.athleteName,
      type: 'low_compliance' as const,
      time: t("athletes.detail.complianceRate") + `: ${l.completionRate}%`,
      message: t("dashboard.alertTypes.low_compliance"),
      details: formatPlanSub(l.groupName, l.targetRace)
    })) || []),
    ...(data?.alerts?.missingWorkouts?.map((m: MissingWorkout) => ({
      id: m.id,
      name: m.name,
      type: 'missing_workout' as const,
      time: t("dashboard.alerts.nextWeek"),
      message: t("dashboard.alertTypes.missing_workout"),
      details: formatPlanSub(m.groupName, m.targetRace)
    })) || [])
  ];

  const groupComplianceData = data?.groupCompliance ?? [];

  return (
    <div className="p-4 md:p-8 pt-4 pb-20 max-w-[1400px] mx-auto">

      {/* Header Area */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl sm:text-4xl font-display tracking-tight font-light mb-2 text-foreground">
            {t("dashboard.messages.hi", { name: user.firstName || user.name?.split(' ')[0] })}
          </h1>
          <p className="text-sm text-muted-foreground font-medium">
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^\w/, c => c.toUpperCase())}
          </p>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-12">
        <MetricCard title={t('dashboard.metrics.activeAthletes')} value={activeAthletes} valueColor="text-primary" />
        <MetricCard title={t('dashboard.metrics.completedToday')} value={completedToday} valueColor="text-primary" />
        <MetricCard title={t('dashboard.metrics.actionNeeded')} value={pendingActionCount} valueColor="text-orange-500" />
        <MetricCard title={t('dashboard.metrics.totalGroups')} value={groupCount} valueColor="text-primary" />
      </div>

      {/* Main Asymmetrical Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">

        {/* Left Column (Approx 65%) */}
        <div className="lg:col-span-8 space-y-12">

          {/* Athlete Compliance Wrapper */}
          <div className="bg-muted p-6 md:p-8 rounded-[1.5rem]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">{t("dashboard.alerts.athletesCompliance")}</h2>
            </div>

            <div className="space-y-3">
              {allAlerts.length > 0 ? allAlerts.map((alert, idx) => (
                <CriticalAlertItem
                  key={`alert-${idx}`}
                  athleteId={alert.id}
                  athleteName={alert.name}
                  alertType={alert.type}
                  timestamp={alert.time}
                  message={alert.message}
                  details={alert.details}
                />
              )) : (
                <p className="text-sm text-muted-foreground p-4 text-center">{t("dashboard.alerts.noCurrentAlerts")}</p>
              )}
            </div>
          </div>

          {/* Group Status Section (Replacing Old Performance Snapshots if data exists) */}
          {groupComplianceData.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-6">{t("dashboard.alerts.groupStatus")}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                {groupComplianceData.map((group) => (
                  <GroupStatusCard
                    key={group.groupId}
                    groupId={group.groupId}
                    groupName={group.groupName}
                    athleteCount={group.athleteCount}
                    completionRate={group.completionRate}
                  />
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right Column (Approx 35%) */}
        <div className="lg:col-span-4 space-y-8 lg:space-y-10">

          {/* Recent Activity Timeline */}
          <div className="bg-muted p-6 rounded-2xl">
            <h2 className="text-base font-semibold text-foreground mb-6">{t("dashboard.alerts.recentActivity")}</h2>
            <div className="space-y-1">
              {data?.activityTimeline && data.activityTimeline.length > 0 ? (
                data.activityTimeline.map((item, idx) => (
                  <TimelineItem
                    key={item.id || idx}
                    time={new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    isSystem={false}
                    content={
                      <>
                        <span className="font-semibold text-foreground">{item.athleteName}</span>{" "}
                        {t('athletes.detail.updated')}{" "}
                        <span className="text-primary hover:underline cursor-pointer">{item.activityName}</span>.
                        <br /><br />
                        <span className="italic text-muted-foreground">&#34;{item.content}&#34;</span>
                      </>
                    }
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">{t("dashboard.alerts.noRecentActivity")}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
