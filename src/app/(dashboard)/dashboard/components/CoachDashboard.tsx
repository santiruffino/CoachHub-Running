'use client';

import { useCallback, useEffect, useState } from 'react';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { CriticalAlertItem } from '@/components/dashboard/CriticalAlertItem';
import { GroupStatusCard } from '@/components/dashboard/GroupStatusCard';
import { NextRaces } from './NextRaces';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import api from '@/lib/axios';
import { DashboardStats, LowCompliance, MissingWorkout, RPEMismatch, SmartAlert, TimelineEvent } from '../types';
import { useTranslations } from 'next-intl';
import { User } from '@/interfaces/auth';

interface DashboardAlertItem {
  alertId?: string;
  id: string;
  name: string;
  type: 'zone_violation' | 'new_feedback' | 'rpe_mismatch' | 'low_compliance' | 'missing_workout';
  time: string;
  message: string;
  details: string;
  priority?: 'P1' | 'P2' | 'P3' | 'P4';
  score?: number;
  recommendedAction?: string;
}

interface ZoneViolation {
  alertId?: string;
  id: string;
  name: string;
  time: string;
  details: string;
}

interface RecentFeedbackItem {
  athleteId: string;
  athleteName: string;
  activityName: string;
  timestamp?: string;
}

interface RecentTimelineItemProps {
  time: string;
  content: React.ReactNode;
  isSystem?: boolean;
}

interface DashboardData {
  stats: DashboardStats;
  alerts: {
    rpeMismatches: RPEMismatch[];
    lowCompliance: LowCompliance[];
    missingWorkouts: MissingWorkout[];
    recentFeedback: RecentFeedbackItem[];
    zoneViolations: ZoneViolation[];
    smartAlerts: SmartAlert[];
  };
  groupCompliance: { groupId: string; groupName: string; athleteCount: number; completionRate: number }[];
  activityTimeline: TimelineEvent[];
}

function TimelineItem({ time, content, isSystem = false }: RecentTimelineItemProps) {
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

export default function CoachDashboard({ user }: { user: User }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [markingRead, setMarkingRead] = useState(false);
  const [scope, setScope] = useState<'mine' | 'team'>('mine');
  const t = useTranslations();
  const userDisplayName = user.firstName || user.name?.split(' ')[0] || user.email.split('@')[0];

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/v2/dashboard/coach', { params: { scope } });
      setData(res.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  const handleMarkAsRead = async () => {
    try {
      setMarkingRead(true);
      await api.post('/v2/dashboard/coach/alerts/read', { scope });
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          alerts: {
            ...prev.alerts,
            zoneViolations: [],
          },
        };
      });
      await fetchDashboard();
    } catch (error) {
      console.error('Failed to mark alerts as read', error);
    } finally {
      setMarkingRead(false);
    }
  };

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
  const zoneViolationCount = data?.alerts?.zoneViolations?.length ?? 0;
  const pendingActionCount = data?.alerts?.smartAlerts?.filter((alert) => alert.priority === 'P1' || alert.priority === 'P2').length
    ?? (rpeCount + missingCount + lowComplianceCount + zoneViolationCount);
  const groupCount = data?.stats?.totalGroups ?? 0;

  const allAlerts: DashboardAlertItem[] = (data?.alerts?.smartAlerts || []).map((alert) => ({
    alertId: alert.alertId,
    id: alert.athleteId,
    name: alert.athleteName,
    type: alert.type,
    time: new Date(alert.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    message: t(`dashboard.alertTypes.${alert.type}`),
    details: alert.details,
    priority: alert.priority,
    score: alert.score,
    recommendedAction: t(`dashboard.alertActions.recommended.${alert.recommendedActionKey}`),
  }));

  const groupComplianceData = data?.groupCompliance ?? [];

  const handleMarkSingleAlertAsRead = async (alert?: DashboardAlertItem) => {
    if (!alert || alert.type !== 'zone_violation' || !alert.alertId) {
      return;
    }

    try {
      await api.post('/v2/dashboard/coach/alerts/read', {
        scope,
        alertIds: [alert.alertId],
      });
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          alerts: {
            ...prev.alerts,
            zoneViolations: prev.alerts.zoneViolations.filter((z) => z.alertId !== alert.alertId),
          },
        };
      });
    } catch (error) {
      console.error('Failed to mark alert as read', error);
    }
  };

  const handleResolveAlert = async (alert?: DashboardAlertItem) => {
    if (!alert?.alertId) return;

    try {
      await api.post('/v2/dashboard/coach/alerts/read', {
        scope,
        action: 'resolve',
        alertIds: [alert.alertId],
      });
      await fetchDashboard();
    } catch (error) {
      console.error('Failed to resolve alert', error);
    }
  };

  const handleSnoozeAlert = async (alert?: DashboardAlertItem) => {
    if (!alert?.alertId) return;

    try {
      await api.post('/v2/dashboard/coach/alerts/read', {
        scope,
        action: 'snooze',
        snoozeHours: 24,
        alertIds: [alert.alertId],
      });
      await fetchDashboard();
    } catch (error) {
      console.error('Failed to snooze alert', error);
    }
  };

  return (
    <div className="p-4 md:p-8 pb-20 max-w-[1400px] mx-auto">

      {/* Header Area */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-foreground mb-2">
            {t("dashboard.messages.hi", { name: userDisplayName })}
          </h1>
          <p className="text-sm text-muted-foreground font-medium">
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^\w/, c => c.toUpperCase())}
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center gap-2 rounded-xl bg-muted p-1">
          <Button
            type="button"
            variant={scope === 'mine' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setScope('mine')}
          >
            {t('dashboard.alerts.myAthletes')}
          </Button>
          <Button
            type="button"
            variant={scope === 'team' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setScope('team')}
          >
            {t('dashboard.alerts.teamView')}
          </Button>
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleMarkAsRead}
                disabled={markingRead || zoneViolationCount === 0}
              >
                {markingRead ? t('common.loading') : t('dashboard.alerts.markAsRead')}
              </Button>
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
                  priority={alert.priority}
                  score={alert.score}
                  recommendedAction={alert.recommendedAction}
                  onMarkAsRead={() => void handleMarkSingleAlertAsRead(alert)}
                  canMarkAsRead={alert.type === 'zone_violation' && Boolean(alert.alertId)}
                  canResolve={Boolean(alert.alertId)}
                  onResolve={() => void handleResolveAlert(alert)}
                  canSnooze={Boolean(alert.alertId)}
                  onSnooze={() => void handleSnoozeAlert(alert)}
                />
              )) : (
                <p className="text-sm text-muted-foreground p-4 text-center">{t("dashboard.alerts.noCurrentAlerts")}</p>
              )}
            </div>
          </div>

          {/* Group Status Section (Replacing Old Performance Snapshots if data exists) */}
          {groupComplianceData.length > 0 && (
            <div>
              <h2 className="text-xl font-bold font-display tracking-tight text-foreground mb-6">{t("dashboard.alerts.groupStatus")}</h2>
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

          {/* Next Races Section */}
          <NextRaces />

          {/* Recent Activity Timeline */}
          <div className="bg-muted p-6 rounded-2xl">
            <h2 className="text-xl font-bold font-display tracking-tight text-foreground mb-6">{t("dashboard.alerts.recentActivity")}</h2>
            <div className="space-y-1">
              {(() => {
                const filteredTimeline = data?.activityTimeline?.filter(item => {
                  const hasFeedback = item.content && item.content.trim().length > 0;
                  const isRPEMismatch = data.alerts?.rpeMismatches?.some(
                    m => m.athleteName === item.athleteName && m.workoutType === item.activityName
                  );
                  return hasFeedback || isRPEMismatch;
                }) || [];

                if (filteredTimeline.length === 0) {
                  return <p className="text-sm text-muted-foreground">{t("dashboard.alerts.noRecentActivity")}</p>;
                }

                return filteredTimeline.map((item, idx) => {
                  const hasFeedback = item.content && item.content.trim().length > 0;
                  
                  return (
                    <TimelineItem
                      key={item.id || idx}
                      time={new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      isSystem={!hasFeedback}
                      content={
                        <>
                          <span className="font-semibold text-foreground">{item.athleteName}</span>{" "}
                          {t('athletes.detail.updated')}{" "}
                          <span className="text-primary hover:underline cursor-pointer">{item.activityName}</span>.
                          <br /><br />
                          {hasFeedback ? (
                            <span className="italic text-muted-foreground">&#34;{item.content}&#34;</span>
                          ) : (
                            <span className="text-[13px] text-orange-500/90 font-medium tracking-wide">⚠️ {t("dashboard.alertTypes.rpe_mismatch")}</span>
                          )}
                        </>
                      }
                    />
                  );
                });
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
