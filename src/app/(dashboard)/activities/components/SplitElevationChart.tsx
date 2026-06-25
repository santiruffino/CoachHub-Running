'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  Line,
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

  for (const point of chartData) {
    if (point.gradeCategory !== currentCategory) {
      if (currentSegment.length > 0 && currentCategory) {
        segmentsByCategory[currentCategory].push([...currentSegment]);
      }
      currentSegment = [point];
      currentCategory = point.gradeCategory;
      continue;
    }

    currentSegment.push(point);
  }

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
  const roundedHr = point.hr !== null ? Math.round(point.hr) : null;

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
              {roundedHr} bpm
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

  const gradeSegments = React.useMemo(() => createGradeSegments(chartData), [chartData]);

  if (chartData.length === 0) {
    return (
      <p className="text-sm text-endurix-black/50 dark:text-muted-foreground text-center py-8">
        {t('charts.noSplitData')}
      </p>
    );
  }

  const maxCumulative = Math.max(...chartData.map((d) => d.cumulative));
  const minCumulative = Math.min(...chartData.map((d) => d.cumulative));
  const domainPadding = Math.max((maxCumulative - minCumulative) * 0.18, 1);
  const yDomain: [number, number] = [
    Math.min(minCumulative, 0) - domainPadding,
    Math.max(maxCumulative, 0) + domainPadding,
  ];

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

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, bottom: 10, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.12)" />
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
              domain={yDomain}
              width={40}
              tickFormatter={(val: number) => `${val.toFixed(0)}m`}
            />
            <Tooltip content={<ElevationTooltip t={t} />} cursor={{ stroke: 'hsl(var(--muted-foreground) / 0.35)', strokeDasharray: '4 4' }} />
            <ReferenceLine y={0} stroke="hsl(var(--border) / 0.3)" strokeDasharray="4 4" />
            {GRADE_CATEGORIES.map((category) =>
              gradeSegments[category].map((segment, segmentIndex) => (
                <Area
                  key={`${category}-${segmentIndex}`}
                  type="monotone"
                  data={segment}
                  dataKey="cumulative"
                  stroke="none"
                  fill={GRADE_COLORS[category].fill}
                  fillOpacity={0.82}
                  isAnimationActive={false}
                  dot={false}
                  connectNulls={false}
                />
              ))
            )}
            <Line
              type="monotone"
              dataKey="cumulative"
              stroke="#64748b"
              strokeWidth={2.5}
              isAnimationActive={false}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: '#64748b', fill: '#ffffff' }}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
