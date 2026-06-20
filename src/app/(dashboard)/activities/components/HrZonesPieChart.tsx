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
  averageHr?: number | null;
  totalTimeSeconds?: number | null;
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
    <div className="bg-card border border-border p-3">
      <p
        className="text-[10px] font-bold text-endurix-black/50 dark:text-muted-foreground uppercase tracking-widest mb-2"
        style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
      >
        {data.name}
      </p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-6">
          <span className="text-[10px] text-endurix-black/60 dark:text-muted-foreground uppercase tracking-wider" style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>Time</span>
          <span className="text-xs font-bold text-endurix-black dark:text-foreground" style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>
            {mins}:{secs.toString().padStart(2, '0')}
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-[10px] text-endurix-black/60 dark:text-muted-foreground uppercase tracking-wider" style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>Share</span>
          <span className="text-xs font-bold text-endurix-black dark:text-foreground" style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>
            {data.percentage.toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-[10px] text-endurix-black/60 dark:text-muted-foreground uppercase tracking-wider" style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>Range</span>
          <span className="text-xs font-bold text-endurix-black dark:text-foreground" style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>
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

function getZoneIndexForHr(hr: number, zones: HeartRateZone[]): number {
  if (zones.length === 0) return -1;

  for (let i = 0; i < zones.length; i++) {
    const zone = zones[i];
    if (i === zones.length - 1) {
      if (hr >= zone.min) return i;
    } else if (hr >= zone.min && hr < zone.max) {
      return i;
    }
  }

  if (hr < zones[0].min) return 0;

  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  zones.forEach((zone, index) => {
    const midpoint = (zone.min + zone.max) / 2;
    const distance = Math.abs(hr - midpoint);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });

  return bestIndex;
}

export function HrZonesPieChart({ laps, splits, zones, zoneNames, averageHr, totalTimeSeconds }: HrZonesPieChartProps) {
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
    if (!zones || zones.length === 0) {
      return { data: [], totalTime: 0 };
    }

    const sortedZones = zones
      .map((zone, index) => ({
        zone,
        name: actualZoneNames[index] || `Z${index + 1}`,
      }))
      .sort((a, b) => a.zone.min - b.zone.min);

    const zoneDistribution = new Array(sortedZones.length).fill(0);
    let totalTime = 0;

    const lapSamples = laps ?? [];
    const splitSamples = splits ?? [];
    const hasHrSamples = (items: Array<{ average_heartrate?: number; moving_time: number; elapsed_time: number }>) =>
      items.some((item) => Boolean(item.average_heartrate) && (item.moving_time || item.elapsed_time));

    const dataSource = hasHrSamples(lapSamples)
      ? lapSamples
      : hasHrSamples(splitSamples)
        ? splitSamples
        : lapSamples.length > 0
          ? lapSamples
          : splitSamples;

    dataSource.forEach((item) => {
      const hr = item.average_heartrate;
      const time = item.moving_time || item.elapsed_time;

      if (!hr || !time) return;

      totalTime += time;

      const zoneIndex = getZoneIndexForHr(hr, sortedZones.map((entry) => entry.zone));
      if (zoneIndex !== -1) {
        zoneDistribution[zoneIndex] += time;
      }
    });

    const data = zoneDistribution
      .map((time, index) => {
        const zoneEntry = sortedZones[index];
        if (!zoneEntry) {
          return { zone: index + 1, name: actualZoneNames[index], time, percentage: 0, bpmRange: '' };
        }
        const zone = zoneEntry.zone;
        return {
          zone: index + 1,
          name: zoneEntry.name,
          time,
          percentage: totalTime > 0 ? (time / totalTime) * 100 : 0,
          bpmRange: `${zone.min}-${zone.max} bpm`,
        };
      })
      .filter((d) => d.time > 0);

    if (data.length > 0) {
      return { data, totalTime };
    }

    if (averageHr && totalTimeSeconds && totalTimeSeconds > 0) {
      const fallbackZoneIndex = getZoneIndexForHr(averageHr, sortedZones.map((entry) => entry.zone));
      if (fallbackZoneIndex !== -1) {
        const fallbackData = sortedZones.map((entry, index) => ({
          zone: index + 1,
          name: entry.name,
          time: index === fallbackZoneIndex ? totalTimeSeconds : 0,
          percentage: index === fallbackZoneIndex ? 100 : 0,
          bpmRange: `${entry.zone.min}-${entry.zone.max} bpm`,
        })).filter((d) => d.time > 0);

        return { data: fallbackData, totalTime: totalTimeSeconds };
      }
    }

    return {
      data: zoneDistribution
        .map((time, index) => {
          const zoneEntry = sortedZones[index];
          if (!zoneEntry) {
            return { zone: index + 1, name: actualZoneNames[index], time, percentage: 0, bpmRange: '' };
          }
          const zone = zoneEntry.zone;
          return {
            zone: index + 1,
            name: zoneEntry.name,
            time,
            percentage: totalTime > 0 ? (time / totalTime) * 100 : 0,
            bpmRange: `${zone.min}-${zone.max} bpm`,
          };
        })
        .filter((d) => d.time > 0),
      totalTime,
    };
  };

  const { data, totalTime } = calculateZoneDistribution();

  if (totalTime === 0) {
    return (
      <div className="text-center py-8 space-y-2">
        <p className="text-sm text-endurix-black/50 dark:text-muted-foreground">
          {t('noHrData')}
        </p>
        <p className="text-[10px] uppercase tracking-widest text-endurix-black/35 dark:text-muted-foreground" style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>
          No lap or split heart-rate samples were available.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between px-2">
        <h3
          className="text-base uppercase tracking-widest font-bold text-endurix-black dark:text-foreground"
          style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
        >
          {t('hrZonesTitle')}
        </h3>
        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground" style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>
          {data.map((d) => (
            <div key={d.zone} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2"
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
                startAngle={90}
                endAngle={-270}
                minAngle={4}
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
