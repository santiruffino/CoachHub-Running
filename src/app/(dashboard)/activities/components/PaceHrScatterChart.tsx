'use client';

import React from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Lap } from '@/interfaces/activity';
import { useTranslations } from 'next-intl';

interface PaceHrScatterChartProps {
  laps: Lap[];
  isRunning: boolean;
}

interface ScatterDataPoint {
  pace: number;
  hr: number;
  distance: number;
  lap: number;
  paceLabel: string;
  rawLap: Lap;
}

const LAP_COLORS = {
  warmup: '#3b82f6',
  active: '#f97316',
  recovery: '#22c55e',
  other: '#94a3b8',
};

interface TooltipContentProps {
  active?: boolean;
  payload?: Array<{ payload: ScatterDataPoint }>;
  t: ReturnType<typeof useTranslations>;
}

function ScatterTooltip({ active, payload, t }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;

  const point = payload[0].payload;

  return (
    <div className="bg-card border border-border p-3">
      <p
        className="text-[10px] font-bold text-endurix-black/50 dark:text-muted-foreground uppercase tracking-widest mb-2"
        style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
      >
        {t('charts.lap')} {point.lap}
      </p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-6">
          <span className="text-[10px] text-endurix-black/60 dark:text-muted-foreground uppercase tracking-wider" style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>{t('charts.pace')}</span>
          <span className="text-xs font-bold text-endurix-black dark:text-foreground" style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>
            {point.paceLabel} {t('metrics.units.perKm')}
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-[10px] text-endurix-black/60 dark:text-muted-foreground uppercase tracking-wider" style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>{t('charts.heartRate')}</span>
          <span className="text-xs font-bold text-endurix-black dark:text-foreground" style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>
            {point.hr} {t('metrics.units.bpm')}
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-[10px] text-endurix-black/60 dark:text-muted-foreground uppercase tracking-wider" style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>{t('charts.distance')}</span>
          <span className="text-xs font-bold text-endurix-black dark:text-foreground" style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>
            {(point.distance / 1000).toFixed(2)} km
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-[10px] text-endurix-black/60 dark:text-muted-foreground uppercase tracking-wider" style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>{t('charts.efficiency')}</span>
          <span className="text-xs font-bold text-endurix-orange" style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>
            {(point.hr / point.pace).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}

function getLapType(lapIndex: number, totalLaps: number): keyof typeof LAP_COLORS {
  if (lapIndex === 0) return 'warmup';
  if (lapIndex === totalLaps - 1) return 'recovery';
  return 'active';
}

export function PaceHrScatterChart({ laps, isRunning }: PaceHrScatterChartProps) {
  const t = useTranslations('activities.detail');

  const formatPace = (mps: number): string => {
    if (mps <= 0) return '--:--';
    const minutesPerKm = 1000 / (mps * 60);
    const mins = Math.floor(minutesPerKm);
    const secs = Math.round((minutesPerKm - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatSpeed = (mps: number): string => (mps * 3.6).toFixed(1);

  const chartData: ScatterDataPoint[] = laps
    .filter((lap) => lap.average_heartrate && lap.average_speed > 0)
    .map((lap) => ({
      pace: isRunning ? (1000 / lap.average_speed) / 60 : lap.average_speed * 3.6,
      hr: lap.average_heartrate || 0,
      distance: lap.distance,
      lap: lap.lap_index + 1,
      paceLabel: isRunning ? formatPace(lap.average_speed) : formatSpeed(lap.average_speed),
      rawLap: lap,
    }));

  if (chartData.length === 0) {
    return (
      <p className="text-sm text-endurix-black/50 dark:text-muted-foreground text-center py-8">
        {t('charts.noHrData')}
      </p>
    );
  }

  const hrValues = chartData.map((d) => d.hr);
  const minHr = Math.min(...hrValues);
  const maxHr = Math.max(...hrValues);
  const hrPadding = (maxHr - minHr) * 0.1;

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between px-2">
        <h3
          className="text-base uppercase tracking-widest font-bold text-endurix-black dark:text-foreground"
          style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
        >
          {t('charts.paceVsHr')}
        </h3>
        <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground" style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-blue-500" />
            <span>{t('charts.warmup')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-orange-500" />
            <span>{t('charts.active')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-green-500" />
            <span>{t('charts.recovery')}</span>
          </div>
        </div>
      </div>

      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.1)" />
            <XAxis
              type="number"
              dataKey="pace"
              name={isRunning ? t('charts.pace') : t('charts.speed')}
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              domain={['auto', 'auto']}
              tickFormatter={(val: number) => isRunning ? `${Math.floor(val)}:${Math.round((val % 1) * 60).toString().padStart(2, '0')}` : `${val.toFixed(0)}`}
              label={{
                value: isRunning ? t('charts.minPerKm') : t('charts.kmh'),
                position: 'insideBottom',
                offset: -5,
                fill: 'hsl(var(--muted-foreground))',
                style: { fontSize: 10, fontWeight: 600 },
              }}
            />
            <YAxis
              type="number"
              dataKey="hr"
              name={t('charts.heartRate')}
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              domain={[minHr - hrPadding, maxHr + hrPadding]}
              width={40}
              tickFormatter={(val: number) => `${Math.round(val)}`}
              label={{
                value: t('charts.bpm'),
                angle: -90,
                position: 'insideLeft',
                fill: 'hsl(var(--muted-foreground))',
                style: { fontSize: 10, fontWeight: 600 },
              }}
            />
            <ZAxis type="number" dataKey="distance" range={[100, 600]} />
            <Tooltip content={<ScatterTooltip t={t} />} />
            <Scatter data={chartData}>
              {chartData.map((entry, index) => {
                const lapType = getLapType(index, chartData.length);
                const color = LAP_COLORS[lapType];
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={color}
                    fillOpacity={0.8}
                    stroke={color}
                    strokeWidth={2}
                  />
                );
              })}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
