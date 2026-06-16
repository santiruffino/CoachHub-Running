'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Split } from '@/interfaces/activity';
import { useTranslations } from 'next-intl';

interface SplitElevationChartProps {
  splits: Split[];
  totalElevationGain: number;
}

interface ChartDataPoint {
  km: number;
  elevation: number;
  cumulative: number;
  pace: string;
  hr: number | null;
  rawSplit: Split;
  grade: number;
  gradeCategory: GradeCategory;
}

type GradeCategory = 'steepDownhill' | 'downhill' | 'flat' | 'uphill' | 'steepUphill';

const GRADE_THRESHOLDS = {
  steepDownhill: -6,
  downhill: -2,
  flat: 2,
  uphill: 6,
} as const;

function getGradeCategory(grade: number): GradeCategory {
  if (grade <= GRADE_THRESHOLDS.steepDownhill) return 'steepDownhill';
  if (grade <= GRADE_THRESHOLDS.downhill) return 'downhill';
  if (grade <= GRADE_THRESHOLDS.flat) return 'flat';
  if (grade <= GRADE_THRESHOLDS.uphill) return 'uphill';
  return 'steepUphill';
}

const GRADE_COLORS: Record<GradeCategory, { stroke: string; fill: string; label: string }> = {
  steepDownhill: { stroke: '#dc2626', fill: '#fecaca', label: 'Steep Downhill (≤-6%)' },
  downhill: { stroke: '#ef4444', fill: '#fca5a5', label: 'Downhill (-6% to -2%)' },
  flat: { stroke: '#6b7280', fill: '#d1d5db', label: 'Flat (-2% to 2%)' },
  uphill: { stroke: '#22c55e', fill: '#86efac', label: 'Uphill (2% to 6%)' },
  steepUphill: { stroke: '#15803d', fill: '#4ade80', label: 'Steep Uphill (>6%)' },
};

const GRADE_CATEGORIES: GradeCategory[] = ['steepDownhill', 'downhill', 'flat', 'uphill', 'steepUphill'];

// Create continuous segments for each grade category
// Each segment is a continuous run of splits with the same grade category
function createGradeSegments(chartData: ChartDataPoint[]) {
  const segmentsByCategory: Record<GradeCategory, ChartDataPoint[][]> = {
    steepDownhill: [],
    downhill: [],
    flat: [],
    uphill: [],
    steepUphill: [],
  };

  let currentSegment: ChartDataPoint[] = [];
  let currentCategory: GradeCategory | null = null;

  for (let i = 0; i < chartData.length; i++) {
    const point = chartData[i];
    const category = point.gradeCategory;

    if (category !== currentCategory) {
      // Category changed - save previous segment and start new one
      if (currentSegment.length > 0 && currentCategory) {
        segmentsByCategory[currentCategory].push([...currentSegment]);
      }
      currentSegment = [point];
      currentCategory = category;
    } else {
      // Same category - continue segment
      currentSegment.push(point);
    }
  }

  // Don't forget the last segment
  if (currentSegment.length > 0 && currentCategory) {
    segmentsByCategory[currentCategory].push([...currentSegment]);
  }

  return segmentsByCategory;
}

interface TooltipContentProps {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint }>;
  label?: string;
  t: ReturnType<typeof useTranslations>;
}

function ElevationTooltip({ active, payload, t }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;

  const point = payload[0].payload;
  const elevationColor = point.elevation >= 0 ? 'text-green-500' : 'text-red-500';
  const gradeCategory = point.gradeCategory;
  const gradeColor = gradeCategory ? GRADE_COLORS[gradeCategory]?.stroke : '#6b7280';
  const gradeLabel = gradeCategory ? t(`charts.gradeCategories.${gradeCategory}`) || GRADE_COLORS[gradeCategory]?.label : '—';

  return (
    <div className="bg-card border border-border p-3">
      <p
        className="text-[10px] font-bold text-endurix-black/50 dark:text-muted-foreground uppercase tracking-widest mb-2"
        style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
      >
        KM {point.km}
      </p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-6">
          <span className="text-[10px] text-endurix-black/60 dark:text-muted-foreground uppercase tracking-wider" style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>Grade</span>
          <span className="text-xs font-bold" style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)', color: gradeColor }}>
            {gradeLabel}
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-[10px] text-endurix-black/60 dark:text-muted-foreground uppercase tracking-wider" style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>Slope</span>
          <span className="text-xs font-bold text-endurix-black dark:text-foreground" style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>
            {point.grade.toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-[10px] text-endurix-black/60 dark:text-muted-foreground uppercase tracking-wider" style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>Elevation</span>
          <span className={`text-xs font-bold ${elevationColor}`} style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>
            {point.elevation >= 0 ? '+' : ''}{point.elevation.toFixed(1)} m
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-[10px] text-endurix-black/60 dark:text-muted-foreground uppercase tracking-wider" style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>Cumulative</span>
          <span className="text-xs font-bold text-endurix-black dark:text-foreground" style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>
            {point.cumulative?.toFixed(0) ?? '—'} m
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-[10px] text-endurix-black/60 dark:text-muted-foreground uppercase tracking-wider" style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>Pace</span>
          <span className="text-xs font-bold text-endurix-black dark:text-foreground" style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>
            {point.pace} /km
          </span>
        </div>
        {point.hr !== null && (
          <div className="flex items-center justify-between gap-6">
            <span className="text-[10px] text-endurix-black/60 dark:text-muted-foreground uppercase tracking-wider" style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>HR</span>
            <span className="text-xs font-bold text-endurix-black dark:text-foreground" style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>
              {point.hr} bpm
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function SplitElevationChart({ splits, totalElevationGain }: SplitElevationChartProps) {
  const t = useTranslations('activities.detail');

  const formatPace = (mps: number): string => {
    if (mps <= 0) return '--:--';
    const minutesPerKm = 1000 / (mps * 60);
    const mins = Math.floor(minutesPerKm);
    const secs = Math.round((minutesPerKm - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const chartData: ChartDataPoint[] = splits.reduce<{ items: ChartDataPoint[]; cumulative: number }>(
    (acc, split) => {
      const newCumulative = acc.cumulative + split.elevation_difference;
      // Calculate grade: elevation_difference / distance * 100 (distance is typically 1000m for km splits)
      const splitDistance = split.distance || 1000;
      const grade = (split.elevation_difference / splitDistance) * 100;
      const gradeCategory = getGradeCategory(grade);
      
      acc.items.push({
        km: split.split,
        elevation: split.elevation_difference,
        cumulative: newCumulative,
        pace: formatPace(split.average_speed),
        hr: split.average_heartrate ?? null,
        rawSplit: split,
        grade,
        gradeCategory,
      });
      return { items: acc.items, cumulative: newCumulative };
    },
    { items: [], cumulative: 0 }
  ).items;

  if (chartData.length === 0) {
    return (
      <p className="text-sm text-endurix-black/50 dark:text-muted-foreground text-center py-8">
        {t('charts.noSplitData')}
      </p>
    );
  }

  const maxCumulative = Math.max(...chartData.map((d) => d.cumulative));
  const minCumulative = Math.min(...chartData.map((d) => d.cumulative));
  const domainPadding = Math.max(Math.abs(maxCumulative), Math.abs(minCumulative)) * 0.1;

return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between px-2">
        <h3
          className="text-base uppercase tracking-widest font-bold text-endurix-black dark:text-foreground"
          style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
        >
          {t('charts.elevationProfile')}
        </h3>
        <span
          className="text-endurix-black/50 dark:text-muted-foreground"
          style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
        >
          Total: +{totalElevationGain.toFixed(0)} m
        </span>
      </div>

      {/* Grade Legend */}
      <div className="flex flex-wrap gap-2 px-2">
        {GRADE_CATEGORIES.map((category) => (
          <div key={category} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: GRADE_COLORS[category].fill, border: `1px solid ${GRADE_COLORS[category].stroke}` }}
            />
            <span className="text-[9px] font-medium text-endurix-black/60 dark:text-muted-foreground uppercase tracking-wider">
              {t(`charts.gradeCategories.${category}`) || GRADE_COLORS[category].label}
            </span>
          </div>
        ))}
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, bottom: 10, left: 0 }}
          >
            <defs>
              {GRADE_CATEGORIES.map((category) => (
                <linearGradient key={category} id={`gradeGradient${category}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={GRADE_COLORS[category].stroke} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={GRADE_COLORS[category].stroke} stopOpacity={0.05} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.1)" />
            <XAxis
              dataKey="km"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 500 }}
              dy={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              domain={[
                minCumulative - domainPadding,
                maxCumulative + domainPadding,
              ]}
              width={40}
              tickFormatter={(val: number) => `${val.toFixed(0)}m`}
            />
            <Tooltip content={<ElevationTooltip t={t} />} />
            <ReferenceLine y={0} stroke="hsl(var(--border) / 0.3)" strokeDasharray="4 4" />
            
            {/* Render each grade category as continuous segments */}
            {GRADE_CATEGORIES.map((category) => {
              const segments = createGradeSegments(chartData)[category];
              return segments.map((segment, segmentIndex) => (
                <Area
                  key={`${category}-${segmentIndex}`}
                  type="monotone"
                  data={segment}
                  dataKey="cumulative"
                  stroke={GRADE_COLORS[category].stroke}
                  strokeWidth={2}
                  fill={`url(#gradeGradient${category})`}
                  isAnimationActive={false}
                  dot={false}
                  // Connect the area to the baseline (min elevation) for proper fill
                  connectNulls={false}
                />
              ));
            })}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
