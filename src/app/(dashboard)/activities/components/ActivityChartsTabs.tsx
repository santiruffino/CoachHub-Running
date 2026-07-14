'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IntervalsAnalysisChart } from '@/app/(dashboard)/activities/components/IntervalsAnalysisChart';
import { SplitElevationChart } from '@/app/(dashboard)/activities/components/SplitElevationChart';
import { PaceHrScatterChart } from '@/app/(dashboard)/activities/components/PaceHrScatterChart';
import { LapsTable } from '@/app/(dashboard)/activities/components/LapsTable';
import { MatchedLap } from '@/features/trainings/utils/workoutMatcher';
import { ActivityDetail } from '@/interfaces/activity';

function ActivityChartLoading() {
  return (
    <div className="h-full w-full p-6 lg:p-8">
      <div className="h-full w-full border border-endurix-black/12 dark:border-border bg-endurix-paper dark:bg-muted p-5 lg:p-6">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="grid grid-cols-12 gap-2 h-[360px] lg:h-[440px] items-end">
          {Array.from({ length: 12 }).map((_, idx) => (
            <Skeleton
              key={idx}
              className="w-full"
              style={{ height: `${40 + ((idx * 29) % 55)}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const ActivityChart = dynamic(
  () => import('@/app/(dashboard)/activities/components/ActivityChart').then(mod => ({ default: mod.ActivityChart })),
  { ssr: false, loading: () => <ActivityChartLoading /> }
);

const TrailRunningChart = dynamic(
  () => import('@/app/(dashboard)/activities/components/TrailRunningChart').then(mod => ({ default: mod.TrailRunningChart })),
  { ssr: false, loading: () => <ActivityChartLoading /> }
);

const ActivityMap = dynamic(
  () => import('@/app/(dashboard)/activities/components/ActivityMap').then(mod => ({ default: mod.ActivityMap })),
  { ssr: false, loading: () => <ActivityChartLoading /> }
);

interface ActivityChartsTabsProps {
  activity: ActivityDetail;
  internalId: string;
  heartrateZones: { zones: Array<{ min: number; max: number }> } | null;
  matchedLaps: MatchedLap[];
  isRunning: (sportType: string) => boolean;
  isWeightTraining: (sportType: string) => boolean;
  isAthlete: boolean;
  lapOverrides: Record<string, string>;
  onOverrideStepType: (lapIndex: number, newStepType: string) => void;
  onBulkOverrideStepType: (lapIndices: number[], newStepType: string) => void;
  formatTime: (seconds: number) => string;
  formatPace: (metersPerSecond: number) => string;
  getHRZoneColor: (hr: number) => string;
  t: ReturnType<typeof useTranslations>;
}

type TabType = 'streams' | 'map' | 'intervals' | 'analysis';

const ACTIVITY_TAB_TRIGGER_CLASS =
  'text-[10px] font-bold uppercase tracking-widest py-2 px-3 text-center text-endurix-black/60 dark:text-muted-foreground transition-colors hover:text-endurix-black dark:hover:text-foreground data-[state=active]:bg-endurix-orange data-[state=active]:text-white data-[state=active]:shadow-sm';

export function ActivityChartsTabs({
  activity,
  internalId,
  heartrateZones,
  matchedLaps,
  isRunning,
  isWeightTraining,
  isAthlete,
  lapOverrides,
  onOverrideStepType,
  onBulkOverrideStepType,
  formatTime,
  formatPace,
  getHRZoneColor,
  t,
}: ActivityChartsTabsProps) {
  const [selectedTab, setSelectedTab] = useState<TabType>('streams');
  const [lapFilter, setLapFilter] = useState<'all' | 'warmup' | 'active' | 'recovery' | 'cooldown'>('all');

  const hasLaps = activity.laps && activity.laps.length > 0;
  const hasSplits = activity.splits_metric || activity.splits_standard;
  // The splits table below only renders per-kilometer (metric) splits, so gate it
  // on splits_metric specifically. hasSplits also covers splits_standard, which
  // would let an activity with only imperial splits reach the table and crash.
  const metricSplits = activity.splits_metric ?? [];
  const hasMetricSplits = metricSplits.length > 0;
  const hasHR = activity.average_heartrate && heartrateZones?.zones;
  const isWeight = isWeightTraining(activity.sport_type);
  const isRun = isRunning(activity.sport_type);
  const routePolyline = activity.map?.polyline || activity.map?.summary_polyline;

  const tabs: Array<{ key: TabType; label: string; hidden?: boolean }> = [
    { key: 'streams', label: t('charts.liveTracking'), hidden: isWeight },
    { key: 'map', label: t('charts.map'), hidden: isWeight || !routePolyline },
    { key: 'intervals', label: t('charts.intervalsAnalysis'), hidden: isWeight || (!hasLaps && !hasSplits) },
    { key: 'analysis', label: t('tabs.analysis'), hidden: isWeight },
  ];

  const visibleTabs = tabs.filter((tab) => !tab.hidden);

  const activeTab: TabType = visibleTabs.find((tab) => tab.key === selectedTab)
    ? selectedTab
    : visibleTabs[0]?.key ?? 'streams';

  if (visibleTabs.length === 0) return null;

  return (
    <article className="border border-endurix-black/12 dark:border-border bg-white dark:bg-card">
      <div className="px-4 py-2.5 bg-endurix-paper dark:bg-muted border-b border-endurix-black/8 dark:border-border">
        <span
          className="text-[9px] text-endurix-black/60 dark:text-muted-foreground tracking-widest"
          style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
        >
          {t('charts.intensityDistribution')}
        </span>
      </div>
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={(value) => setSelectedTab(value as TabType)} className="mb-6">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 bg-endurix-black/8 p-1 dark:bg-white/8 md:grid-cols-4">
            {visibleTabs.map((tab) => (
              <TabsTrigger
                key={tab.key}
                value={tab.key}
                className={ACTIVITY_TAB_TRIGGER_CLASS}
                style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Tab: Streams */}
        {activeTab === 'streams' && !isWeight && (
          <div className="h-[460px] lg:h-[560px] w-full bg-white dark:bg-card overflow-hidden relative">
            {activity.sport_type === 'TrailRun' ? (
              <TrailRunningChart activityId={internalId} laps={activity.laps} hrZones={heartrateZones?.zones} />
            ) : (
              <ActivityChart activityId={internalId} laps={activity.laps} hrZones={heartrateZones?.zones} isRunning={isRun} />
            )}
          </div>
        )}

        {/* Tab: Map */}
        {activeTab === 'map' && routePolyline && (
          <div className="w-full bg-white dark:bg-card overflow-hidden relative">
            <ActivityMap activityId={internalId} encodedPolyline={routePolyline} />
          </div>
        )}

        {/* Tab: Intervals */}
        {activeTab === 'intervals' && (
          <div>
            {hasLaps && (
              <IntervalsAnalysisChart
                laps={activity.laps!}
                isRunning={isRun}
                lapOverrides={lapOverrides}
                matchedLaps={matchedLaps}
              />
            )}

            {hasLaps && (
              <div className="mt-6">
                <LapsTable
                  laps={activity.laps!}
                  matchedLaps={matchedLaps}
                  lapFilter={lapFilter}
                  onLapFilterChange={setLapFilter}
                  isAthlete={isAthlete}
                  lapOverrides={lapOverrides}
                  onOverrideStepType={onOverrideStepType}
                  onBulkOverrideStepType={onBulkOverrideStepType}
                  formatTime={formatTime}
                  formatPace={formatPace}
                  getHRZoneColor={getHRZoneColor}
                  t={t}
                />
              </div>
            )}

            {!hasLaps && hasMetricSplits && (
              <div className="overflow-x-auto border border-endurix-black/12 dark:border-border bg-white dark:bg-card">
                <table className="w-full text-left">
                  <thead className="border-b border-endurix-black/10 dark:border-border bg-endurix-paper dark:bg-muted text-[10px] uppercase tracking-[0.14em] text-endurix-black/50 dark:text-muted-foreground" style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>
                    <tr>
                      <th className="px-4 py-3">{t('table.split')}</th>
                      <th className="px-4 py-3">{t('table.time')}</th>
                      <th className="px-4 py-3">{t('table.distance')}</th>
                      <th className="px-4 py-3">{t('table.avgPace')}</th>
                      {!!metricSplits[0]?.average_heartrate && (
                        <th className="px-4 py-3">{t('table.avgHr')}</th>
                      )}
                      <th className="px-4 py-3">{t('table.elevGain')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metricSplits.map((split) => (
                      <tr key={split.split} className="border-b border-endurix-black/8 dark:border-border text-sm">
                        <td className="px-4 py-3 font-medium">{split.split}</td>
                        <td className="px-4 py-3">{formatTime(split.moving_time)}</td>
                        <td className="px-4 py-3">{(split.distance / 1000).toFixed(2)} {t('metrics.units.km')}</td>
                        <td className="px-4 py-3">{formatPace(split.average_speed)}</td>
                        {!!metricSplits[0]?.average_heartrate && (
                          <td className="px-4 py-3">
                            {split.average_heartrate ? (
                              <span className={`px-2 py-1 font-medium ${getHRZoneColor(split.average_heartrate)}`}>
                                {split.average_heartrate.toFixed(0)} {t('metrics.units.bpm')}
                              </span>
                            ) : (
                              <span className="text-endurix-black/50 dark:text-muted-foreground">-</span>
                            )}
                          </td>
                        )}
                        <td className="px-4 py-3">{split.elevation_difference > 0 ? '+' : ''}{split.elevation_difference.toFixed(1)} {t('metrics.units.m')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab: Analysis */}
        {activeTab === 'analysis' && (
          <div className="space-y-8">
            {/* Elevation Profile */}
            {activity.splits_metric && activity.splits_metric.length > 0 && (
              <article className="border border-endurix-black/8 dark:border-border p-6 bg-endurix-paper/50 dark:bg-muted/50">
                <SplitElevationChart
                  splits={activity.splits_metric}
                  totalElevationGain={activity.total_elevation_gain}
                />
              </article>
            )}

            {/* Pace vs HR Scatter */}
            {hasLaps && hasHR && (
              <article className="border border-endurix-black/8 dark:border-border p-6 bg-endurix-paper/50 dark:bg-muted/50">
                <PaceHrScatterChart laps={activity.laps!} isRunning={isRun} />
              </article>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
