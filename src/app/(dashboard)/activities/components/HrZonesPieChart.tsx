'use client';

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslations } from 'next-intl';

interface Lap {
  average_heartrate?: number;
  moving_time: number;
  elapsed_time: number;
}

interface Split {
  average_heartrate?: number;
  moving_time: number;
  elapsed_time: number;
}

interface HeartRateZone {
  min: number;
  max: number;
}

interface HrZonesPieChartProps {
  laps?: Lap[];
  splits?: Split[];
  zones: HeartRateZone[];
  zoneNames?: string[];
}

const ZONE_COLORS = ['#94a3b8', '#22c55e', '#eab308', '#f97316', '#ef4444'];

interface TooltipContentProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: {
      zone: number;
      name: string;
      time: number;
      percentage: number;
      bpmRange: string;
    };
  }>;
}

function ZoneTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;
  const mins = Math.floor(data.time / 60);
  const secs = Math.round(data.time % 60);

  return (
    <div className="bg-card border border-border p-4 rounded-xl shadow-xl">
      <p
        className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2"
        style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
      >
        {data.name}
      </p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-6">
          <span className="text-sm font-medium text-muted-foreground">Time</span>
          <span className="text-sm font-bold text-foreground">
            {mins}:{secs.toString().padStart(2, '0')}
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-sm font-medium text-muted-foreground">Share</span>
          <span className="text-sm font-bold text-foreground">
            {data.percentage.toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-sm font-medium text-muted-foreground">Range</span>
          <span className="text-sm font-bold text-foreground">
            {data.bpmRange}
          </span>
        </div>
      </div>
    </div>
  );
}

interface CenterLabelProps {
  viewBox: { cx: number; cy: number };
  totalTime: number;
  formatTime: (seconds: number) => string;
}

function CenterLabel({ viewBox, totalTime, formatTime }: CenterLabelProps) {
  const { cx, cy } = viewBox;
  return (
    <g>
      <text x={cx} y={cy - 8} textAnchor="middle" className="fill-foreground text-2xl font-bold" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>
        {formatTime(totalTime)}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" className="fill-muted-foreground text-[10px] uppercase tracking-widest" style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>
        Total Time
      </text>
    </g>
  );
}

export function HrZonesPieChart({ laps, splits, zones, zoneNames }: HrZonesPieChartProps) {
  const t = useTranslations('activities.detail.zones');

  const defaultZoneNames = [
    t('names.z1'),
    t('names.z2_hr'),
    t('names.z3'),
    t('names.z4'),
    t('names.z5_hr'),
  ];

  const actualZoneNames = zoneNames || defaultZoneNames;

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}`;
    return `${minutes}m`;
  };

  const calculateZoneDistribution = () => {
    const zoneDistribution = new Array(zones.length).fill(0);
    let totalTime = 0;

    const dataSource = laps ?? splits ?? [];

    dataSource.forEach((item) => {
      const hr = item.average_heartrate;
      const time = item.moving_time || item.elapsed_time;

      if (!hr || !time) return;

      totalTime += time;

      for (let i = 0; i < zones.length; i++) {
        const zone = zones[i];
        if (i === zones.length - 1) {
          if (hr >= zone.min) {
            zoneDistribution[i] += time;
            break;
          }
        } else {
          if (hr >= zone.min && hr < zone.max) {
            zoneDistribution[i] += time;
            break;
          }
        }
      }
    });

    return {
      data: zoneDistribution
        .map((time, index) => ({
          zone: index + 1,
          name: actualZoneNames[index],
          time,
          percentage: totalTime > 0 ? (time / totalTime) * 100 : 0,
          bpmRange: `${zones[index].min}-${zones[index].max} bpm`,
        }))
        .filter((d) => d.time > 0),
      totalTime,
    };
  };

  const { data, totalTime } = calculateZoneDistribution();

  if (totalTime === 0) {
    return (
      <p className="text-sm text-endurix-black/50 dark:text-muted-foreground text-center py-8">
        {t('noHrData')}
      </p>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between px-2">
        <h3
          className="text-lg font-semibold text-foreground"
          style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
        >
          {t('hrZonesTitle')}
        </h3>
        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {data.map((d) => (
            <div key={d.zone} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-sm"
                style={{ backgroundColor: ZONE_COLORS[d.zone - 1] }}
              />
              <span>Z{d.zone}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-8">
        <div className="h-[280px] w-[280px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                paddingAngle={2}
                dataKey="time"
                nameKey="name"
                strokeWidth={0}
              >
                {data.map((entry) => (
                  <Cell
                    key={`cell-${entry.zone}`}
                    fill={ZONE_COLORS[entry.zone - 1]}
                    fillOpacity={0.85}
                  />
                ))}
              </Pie>
              <Tooltip content={<ZoneTooltip />} />
              <CenterLabel viewBox={{ cx: 140, cy: 140 }} totalTime={totalTime} formatTime={formatTime} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 space-y-3">
          {data.map((item) => (
            <div key={item.zone} className="flex items-center gap-4">
              <div className="w-[140px] shrink-0">
                <span
                  className="text-[10px] font-semibold text-endurix-black/50 dark:text-muted-foreground tracking-widest uppercase"
                  style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                >
                  {item.name}
                </span>
                <p
                  className="text-[9px] text-endurix-black/40 dark:text-muted-foreground mt-0.5"
                  style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                >
                  {item.bpmRange}
                </p>
              </div>
              <div className="flex-1 h-1.5 bg-endurix-black/15 dark:bg-border relative">
                <div
                  className="absolute inset-y-0 left-0 transition-all duration-500"
                  style={{
                    width: `${item.percentage}%`,
                    backgroundColor: ZONE_COLORS[item.zone - 1],
                  }}
                />
              </div>
              <span
                className="text-[10px] font-bold text-endurix-black dark:text-foreground w-12 text-right"
                style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
              >
                {item.percentage.toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
