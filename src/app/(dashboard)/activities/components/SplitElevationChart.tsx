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
}

interface TooltipContentProps {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint }>;
  label?: string;
}

function ElevationTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;

  const point = payload[0].payload;
  const elevationColor = point.elevation >= 0 ? 'text-green-500' : 'text-red-500';

  return (
    <div className="bg-card border border-border p-4 rounded-xl shadow-xl">
      <p
        className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2"
        style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
      >
        KM {point.km}
      </p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-6">
          <span className="text-sm font-medium text-muted-foreground">Elevation</span>
          <span className={`text-sm font-bold ${elevationColor}`}>
            {point.elevation >= 0 ? '+' : ''}{point.elevation.toFixed(1)} m
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-sm font-medium text-muted-foreground">Cumulative</span>
          <span className="text-sm font-bold text-foreground">
            {point.cumulative.toFixed(0)} m
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-sm font-medium text-muted-foreground">Pace</span>
          <span className="text-sm font-bold text-foreground">
            {point.pace} /km
          </span>
        </div>
        {point.hr !== null && (
          <div className="flex items-center justify-between gap-6">
            <span className="text-sm font-medium text-muted-foreground">HR</span>
            <span className="text-sm font-bold text-foreground">
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
      acc.items.push({
        km: split.split,
        elevation: split.elevation_difference,
        cumulative: newCumulative,
        pace: formatPace(split.average_speed),
        hr: split.average_heartrate ?? null,
        rawSplit: split,
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

  const maxElevation = Math.max(...chartData.map((d) => d.elevation));
  const minElevation = Math.min(...chartData.map((d) => d.elevation));
  const domainPadding = Math.max(Math.abs(maxElevation), Math.abs(minElevation)) * 0.2;

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between px-2">
        <h3
          className="text-lg font-semibold text-foreground"
          style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
        >
          {t('charts.elevationProfile')}
        </h3>
        <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm bg-green-500" />
            <span>Uphill</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm bg-red-400" />
            <span>Downhill</span>
          </div>
          <span
            className="text-endurix-black/50 dark:text-muted-foreground"
            style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
          >
            Total: +{totalElevationGain.toFixed(0)} m
          </span>
        </div>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, bottom: 10, left: 0 }}
          >
            <defs>
              <linearGradient id="elevationGradientUp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="elevationGradientDown" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f87171" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#f87171" stopOpacity={0.05} />
              </linearGradient>
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
                Math.min(0, minElevation - domainPadding),
                maxElevation + domainPadding,
              ]}
              width={40}
              tickFormatter={(val: number) => `${val.toFixed(0)}m`}
            />
            <Tooltip content={<ElevationTooltip />} />
            <ReferenceLine y={0} stroke="hsl(var(--border) / 0.3)" strokeDasharray="4 4" />
            <Area
              type="monotone"
              dataKey="elevation"
              stroke="#22c55e"
              strokeWidth={2}
              fill="url(#elevationGradientUp)"
              dot={(props: { cx?: number; cy?: number; payload: ChartDataPoint }) => {
                const { cx, cy, payload } = props;
                if (cx === undefined || cy === undefined) return null;
                const color = payload.elevation >= 0 ? '#22c55e' : '#f87171';
                return (
                  <circle
                    key={`dot-${payload.km}`}
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={color}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                );
              }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
