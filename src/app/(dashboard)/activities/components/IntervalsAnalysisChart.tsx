'use client';

import React from 'react';
import { Bar, CartesianGrid, Cell, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, } from 'recharts';
import { Lap } from '@/interfaces/activity';
import { useTranslations } from 'next-intl';
import { MatchedLap } from '@/features/trainings/utils/workoutMatcher';
import { Badge } from '@/components/ui/badge';

const BLOCK_COLORS = {
  warmup: '#3b82f6',    // Blue 500
  active: '#f97316',    // Orange 500
  recovery: '#22c55e',  // Green 500
  rest: '#94a3b8',      // Slate 400
  cooldown: '#a855f7',  // Purple 500
  other: '#94a3b8',     // Slate 400
};

interface IntervalsAnalysisChartProps {
  laps: Lap[];
  isRunning: boolean;
  lapOverrides?: Record<string, string>;
  matchedLaps?: MatchedLap[];
}

interface ChartDataPoint {
  name: string;
  hr: number;
  pace: number;
  cadence: number;
  type: keyof typeof BLOCK_COLORS;
  label: string;
  rawLap: Lap;
}

interface TooltipEntry {
  value?: number | string;
  name?: string;
  dataKey?: string | number;
  color?: string;
  payload?: ChartDataPoint;
}

interface TooltipContentProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}

interface IntervalsTooltipLabels {
  avgPace: string;
  avgSpeed: string;
  avgHr: string;
  cadence: string;
}

interface IntervalsTooltipProps extends TooltipContentProps {
  isRunning: boolean;
  labels: IntervalsTooltipLabels;
  formatPace: (decimalMin: number) => string;
}

const toFiniteNumber = (value: unknown): number | null => {
  const numericValue = typeof value === 'number' || typeof value === 'string'
    ? Number(value)
    : Number.NaN;
  return Number.isFinite(numericValue) ? numericValue : null;
};

function IntervalsTooltip({
                            active,
                            payload,
                            label,
                            isRunning,
                            labels,
                            formatPace,
                          }: IntervalsTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const point = payload[0]?.payload;
  if (!point) {
    return null;
  }

  const color = BLOCK_COLORS[point.type] || BLOCK_COLORS.other;

  return (
    <div className="bg-card border border-border p-3">
      <div className="flex items-center justify-between gap-4 mb-2">
        <p className="text-[10px] font-bold text-endurix-black/50 dark:text-muted-foreground uppercase tracking-widest"
           style={{fontFamily: 'var(--font-ibm-plex-mono, monospace)'}}>{label}</p>
        <Badge
          variant="outline"
          className="text-[10px] h-5 px-1.5 font-bold uppercase tracking-tight"
          style={{
            backgroundColor: `${color}20`,
            color,
            borderColor: `${color}40`,
          }}
        >
          {point.label}
        </Badge>
      </div>
      <div className="space-y-1">
        {payload.map((entry, index) => {
          const numericValue = toFiniteNumber(entry.value);
          let renderedValue: string | number = numericValue ?? 0;
          let unit = '';
          let entryLabel = entry.name || '';

          if (entry.dataKey === 'pace') {
            if (isRunning) {
              renderedValue = formatPace(numericValue ?? 0);
              unit = '/km';
              entryLabel = labels.avgPace;
            } else {
              renderedValue = (numericValue ?? 0).toFixed(1);
              unit = ' km/h';
              entryLabel = labels.avgSpeed;
            }
          } else if (entry.dataKey === 'hr') {
            unit = ' bpm';
            entryLabel = labels.avgHr;
          } else if (entry.dataKey === 'cadence') {
            unit = ' spm';
            entryLabel = labels.cadence;
          }

          return (
            <div key={index} className="flex items-center gap-4 justify-between">
              <span
                className="text-[10px] text-endurix-black/60 dark:text-muted-foreground uppercase tracking-wider"
                style={{
                  fontFamily: 'var(--font-ibm-plex-mono, monospace)',
                  color: entry.dataKey === 'hr' ? undefined : entry.color,
                }}
              >
                {entryLabel}
              </span>
              <span className="text-xs font-bold text-endurix-black dark:text-foreground"
                    style={{fontFamily: 'var(--font-ibm-plex-mono, monospace)'}}>
                {renderedValue}
                {unit}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function IntervalsAnalysisChart({
                                         laps,
                                         isRunning,
                                         lapOverrides = {},
                                         matchedLaps = []
                                       }: IntervalsAnalysisChartProps) {
  const t = useTranslations('activities.detail');
  const [activeLapIndex, setActiveLapIndex] = React.useState<number | null>(null);
  const [showHr, setShowHr] = React.useState(true);
  const [showCadence, setShowCadence] = React.useState(false);

  if (!laps || laps.length === 0) return null;


  // Conversion helpers
  const metersPerSecondToPaceDecimal = (mps: number): number => {
    if (mps <= 0.5) return 0; // Avoid infinite/meaningless pace at stop or very slow walk
    return (1000 / mps) / 60; // min/km as decimal
  };

  const metersPerSecondToKmh = (mps: number): number => {
    return mps * 3.6;
  };

  const formatPace = (decimalMin: number): string => {
    if (decimalMin === 0) return '--:--';
    const mins = Math.floor(decimalMin);
    const secs = Math.round((decimalMin - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const paceAxisDomain = [
    (dataMin: number) => Math.max(0, (dataMin || 0) - 0.25),
    (dataMax: number) => (dataMax || 0) + 0.25,
  ] as const;

  const tooltipLabels: IntervalsTooltipLabels = {
    avgPace: t('metrics.avgPace') || 'Ritmo',
    avgSpeed: t('metrics.avgSpeed') || 'Velocidad',
    avgHr: t('table.avgHr') || 'Pulso',
    cadence: t('table.cadence') || 'Cadencia',
  };

  const overrideLabels: Record<string, string> = {
    warmup: t('workout.warmup') || 'Calentamiento',
    active: t('workout.active') || 'Activo',
    rest: t('workout.rest') || 'Descanso',
    recovery: t('workout.recovery') || 'Recuperación',
    cooldown: t('workout.cooldown') || 'Enfriamiento',
  };


  const chartData: ChartDataPoint[] = laps.map((lap, index) => {
    // If lap_index starts at 0, we display as 1-based
    const displayIndex = lap.lap_index === 0 || (laps[0]?.lap_index === 0) ? lap.lap_index + 1 : lap.lap_index;

    const overrideType = lapOverrides[lap.lap_index.toString()];
    const matchedLap = matchedLaps.find(m => m.lapIndex === index);
    const effectiveType = (overrideType || matchedLap?.stepType || 'other') as keyof typeof BLOCK_COLORS;

    const fallbackLabel = `${t('table.lap') || 'Vuelta'} ${displayIndex}`;
    const label = overrideType ? overrideLabels[overrideType] : (matchedLap ? matchedLap.stepLabel : fallbackLabel);

    return {
      name: `L${displayIndex}`,
      hr: lap.average_heartrate || 0,
      pace: isRunning ? metersPerSecondToPaceDecimal(lap.average_speed) : metersPerSecondToKmh(lap.average_speed),
      cadence: lap.average_cadence || 0,
      type: effectiveType,
      label,
      rawLap: lap,
    };
  });

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between px-2 gap-4 flex-wrap">
        <h3
          className="text-base uppercase tracking-widest font-bold text-endurix-black dark:text-foreground"
          style={{fontFamily: 'var(--font-exo-2, sans-serif)'}}
        >
          {t('charts.intervalsAnalysis')}
        </h3>
        <div
          className="flex items-center gap-2 flex-wrap text-[10px] font-bold uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground"
          style={{fontFamily: 'var(--font-ibm-plex-mono, monospace)'}}>
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/15 px-3 py-1.5 text-orange-700 dark:text-orange-300">
              <span className="w-2 h-2 rounded-full bg-orange-500"/>
              {t('table.avgPace')}
          </span>
          <button
            type="button"
            onClick={() => setShowHr((current) => !current)}
            aria-pressed={showHr}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-all ${showHr
              ? 'border-destructive/30 bg-destructive/15 text-destructive'
              : 'border-dashed border-destructive/25 bg-transparent text-destructive/60 hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive/60 dark:hover:text-destructive'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-destructive"/>
            {t('table.avgHr')}{!showHr ? ' +' : ' ×'}
          </button>

          <button
            type="button"
            onClick={() => setShowCadence((current) => !current)}
            aria-pressed={showCadence}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-all ${showCadence
              ? 'border-cyan-500/30 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300'
              : 'border-dashed border-cyan-500/25 bg-transparent text-cyan-600/70 hover:border-cyan-500/40 hover:bg-cyan-500/10 hover:text-cyan-700 dark:text-cyan-400/70 dark:hover:text-cyan-300'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${showCadence ? 'bg-cyan-400' : 'bg-cyan-400/50'}`}/>
            {t('table.cadence')}{!showCadence ? ' +' : ' ×'}
          </button>
        </div>
      </div>

      <div className="h-100 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            onMouseMove={(state) => {
              if (state?.isTooltipActive && typeof state.activeTooltipIndex === 'number') {
                setActiveLapIndex(state.activeTooltipIndex);
              }
            }}
            onMouseLeave={() => setActiveLapIndex(null)}
            margin={{
              top: 20,
              right: 20,
              bottom: 20,
              left: 0,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.1)"/>
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: '500'}}
              dy={10}
            />
            {/* Heart rate axis */}
            <YAxis
              yAxisId="left"
              axisLine={false}
              tickLine={false}
              tick={{fill: 'hsl(var(--muted-foreground))', fontSize: '10px'}}
              domain={[0, 'auto']}
              width={35}
              label={{
                value: 'bpm',
                angle: -90,
                position: 'insideLeft',
                fill: 'hsl(var(--muted-foreground))',
                style: {textAnchor: 'middle', fontSize: 10, fontWeight: 600}
              }}
            />

            {/* Cadence axis */}
            <YAxis
              yAxisId="cadence"
              hide
              domain={[
                (dataMin: number) => Math.max(0, Math.floor((dataMin || 0) - 5)),
                (dataMax: number) => Math.ceil((dataMax || 0) + 5),
              ]}
            />

            {/* Pace axis */}
            <YAxis
              yAxisId="right"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{fill: 'gray', fontSize: '10px'}}
              domain={paceAxisDomain}
              width={45}
              tickFormatter={(val) => isRunning ? formatPace(val) : `${val}`}
              label={{
                value: isRunning ? 'min/km' : 'km/h',
                angle: 90,
                position: 'insideRight',
                fill: 'gray',
                style: {textAnchor: 'middle', fontSize: 10, fontWeight: 600}
              }}
            />

            <Tooltip
              content={
                <IntervalsTooltip
                  isRunning={isRunning}
                  labels={tooltipLabels}
                  formatPace={formatPace}
                />
              }
            />

            <Bar
              yAxisId="right"
              dataKey="pace"
              name={t('table.avgPace') || 'Ritmo'}
              barSize={34}
              radius={[6, 6, 0, 0]}
              fillOpacity={0.55}
              fill={BLOCK_COLORS.other}
              label={(props) => {
                const {x, y, width, index, value} = props;
                const numericValue = toFiniteNumber(value);
                if (
                  index !== activeLapIndex ||
                  numericValue === null ||
                  numericValue === 0 ||
                  typeof x !== 'number' ||
                  typeof y !== 'number' ||
                  typeof width !== 'number'
                ) {
                  return null;
                }

                return (
                  <text
                    x={x + width / 2}
                    y={y - 18}
                    fill="#94a3b8"
                    textAnchor="middle"
                    fontSize={10}
                    fontWeight={700}
                  >
                    {isRunning ? `${formatPace(numericValue)} /km` : `${numericValue.toFixed(1)} km/h`}
                  </text>
                );
              }}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={BLOCK_COLORS[entry.type as keyof typeof BLOCK_COLORS] || BLOCK_COLORS.other}
                  className="transition-all duration-300 hover:opacity-100"
                />
              ))}
            </Bar>

            {showCadence && (
              <Bar
                yAxisId="cadence"
                dataKey="cadence"
                name={t('table.cadence') || 'Cadencia'}
                barSize={10}
                radius={[4, 4, 0, 0]}
                fill="#22d3ee"
                fillOpacity={0.95}
                label={(props) => {
                  const {x, y, width, index, value} = props;
                  const numericValue = toFiniteNumber(value);
                  if (
                    index !== activeLapIndex ||
                    numericValue === null ||
                    numericValue === 0 ||
                    typeof x !== 'number' ||
                    typeof y !== 'number' ||
                    typeof width !== 'number'
                  ) {
                    return null;
                  }

                  return (
                    <text
                      x={x + width / 2}
                      y={y - 6}
                      fill="#22d3ee"
                      textAnchor="middle"
                      fontSize={10}
                      fontWeight={700}
                    >
                      {Math.round(numericValue)} spm
                    </text>
                  );
                }}
              />
            )}

            {/* Heart rate line */}
            {showHr && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="hr"
                name={t('table.avgHr') || 'Pulso'}
                stroke="#EF4444FF"
                strokeWidth={4}
                dot={{r: 5, fill: '#EF4444FF', strokeWidth: 2, stroke: '#EF4444FF'}}
                activeDot={{r: 7, strokeWidth: 0}}
                connectNulls
                label={(props) => {
                  const {x, y, index, value} = props;
                  const numericValue = toFiniteNumber(value);
                  if (
                    index !== activeLapIndex ||
                    numericValue === null ||
                    numericValue === 0 ||
                    typeof x !== 'number' ||
                    typeof y !== 'number'
                  ) {
                    return null;
                  }

                  return (
                    <text
                      x={x}
                      y={y - 12}
                      fill="#94a3b8"
                      textAnchor="middle"
                      fontSize={10}
                      fontWeight={700}
                    >
                      {Math.round(numericValue)} bpm
                    </text>
                  );
                }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
