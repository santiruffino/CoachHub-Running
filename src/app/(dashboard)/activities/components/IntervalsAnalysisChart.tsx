'use client';

import React from 'react';
import {
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
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

export function IntervalsAnalysisChart({ 
  laps, 
  isRunning, 
  lapOverrides = {}, 
  matchedLaps = [] 
}: IntervalsAnalysisChartProps) {
  const t = useTranslations('activities.detail');

  if (!laps || laps.length === 0) return null;

  // Helper to get color for a lap
  const getLapColor = (index: number) => {
    const overrideType = lapOverrides[index.toString()];
    const matchedLap = matchedLaps.find(m => m.lapIndex === index);
    const effectiveType = overrideType || matchedLap?.stepType || 'other';
    
    return BLOCK_COLORS[effectiveType as keyof typeof BLOCK_COLORS] || BLOCK_COLORS.other;
  };

  // Conversion helpers
  const metersPerSecondToPaceDecimal = (mps: number): number | null => {
    if (mps <= 0.5) return null; // Avoid infinite/meaningless pace at stop or very slow walk
    return (1000 / mps) / 60; // min/km as decimal
  };

  const metersPerSecondToKmh = (mps: number): number => {
    return mps * 3.6;
  };

  const formatPace = (decimalMin: number | null): string => {
    if (decimalMin === null || decimalMin === 0) return '--:--';
    const mins = Math.floor(decimalMin);
    const secs = Math.round((decimalMin - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const chartData = laps.map((lap, index) => {
    // If lap_index starts at 0, we display as 1-based
    const displayIndex = lap.lap_index === 0 || (laps[0]?.lap_index === 0) ? lap.lap_index + 1 : lap.lap_index;
    
    const overrideType = lapOverrides[lap.lap_index];
    const matchedLap = matchedLaps.find(m => m.lapIndex === index);
    const effectiveType = overrideType || matchedLap?.stepType || 'other';
    
    const overrideLabels: Record<string, string> = {
        warmup: 'Warm up',
        active: 'Active',
        rest: 'Rest',
        recovery: 'Recovery',
        cooldown: 'Cool Down'
    };
    const label = overrideType ? overrideLabels[overrideType] : (matchedLap ? matchedLap.stepLabel : `Lap ${displayIndex}`);

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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const type = data.type as keyof typeof BLOCK_COLORS;
      const color = BLOCK_COLORS[type] || BLOCK_COLORS.other;

      return (
        <div className="bg-card border border-border p-4 rounded-xl shadow-xl">
          <div className="flex items-center justify-between gap-4 mb-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{label}</p>
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-bold uppercase tracking-tight" style={{ 
              backgroundColor: `${color}20`,
              color: color,
              borderColor: `${color}40`
            }}>
              {data.label}
            </Badge>
          </div>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => {
              let value = entry.value;
              let unit = '';
              let entryLabel = entry.name;

              if (entry.dataKey === 'pace') {
                if (isRunning) {
                  value = formatPace(entry.value);
                  unit = '/km';
                  entryLabel = t('metrics.avgPace') || 'Ritmo';
                } else {
                  value = entry.value ? entry.value.toFixed(1) : '0.0';
                  unit = ' km/h';
                  entryLabel = t('metrics.avgSpeed') || 'Velocidad';
                }
              } else if (entry.dataKey === 'hr') {
                unit = ' bpm';
                entryLabel = t('table.avgHr') || 'Pulso';
              } else if (entry.dataKey === 'cadence') {
                unit = ' spm';
                entryLabel = t('table.cadence') || 'Cadencia';
              }

              return (
                <div key={index} className="flex items-center gap-4 justify-between">
                  <span className="text-sm font-medium" style={{ color: entry.dataKey === 'hr' ? undefined : entry.color }}>
                    {entryLabel}:
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {value}{unit}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-lg font-semibold font-display tracking-tight text-foreground">
          {t('charts.intervalsAnalysis') || 'Análisis de Intervalos'}
        </h3>
        <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-tighter text-muted-foreground">
           <div className="flex items-center gap-1.5">
              <span>{t('table.avgHr') || 'HR'}</span>
           </div>
           <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm bg-orange-500" />
              <span>{t('table.avgPace') || 'Pace'}</span>
           </div>
           <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm bg-blue-400" />
              <span>{t('table.cadence') || 'Cadence'}</span>
           </div>
        </div>
      </div>
      
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{
              top: 20,
              right: 20,
              bottom: 20,
              left: 0,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.1)" />
            <XAxis 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: 500 }}
              dy={10}
            />
            {/* HR/Cadence Axis - Now visible to explain bar height */}
            <YAxis 
              yId="left"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 500 }}
              domain={['dataMin - 10', 'auto']}
              width={35}
              label={{ 
                value: 'bpm', 
                angle: -90, 
                position: 'insideLeft', 
                style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' } 
              }}
            />
            {/* Pace Axis - Now visible to explain line height */}
            <YAxis 
              yId="right"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#f97316', fontSize: 10, fontWeight: 500 }}
              domain={['auto', 'auto']}
              width={45}
              tickFormatter={(val) => isRunning ? formatPace(val) : `${val.toFixed(0)}`}
              label={{ 
                value: isRunning ? 'min/km' : 'km/h', 
                angle: 90, 
                position: 'insideRight', 
                style: { textAnchor: 'middle', fill: '#f97316', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' } 
              }}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            {/* Area for Cadence - Subtle background */}
            <Area
              yId="left"
              type="monotone"
              dataKey="cadence"
              name="Cadencia"
              fill="hsl(var(--primary) / 0.05)"
              stroke="hsl(var(--primary) / 0.2)"
              strokeWidth={1}
              connectNulls
            />

            {/* Bar for Heart Rate */}
            <Bar 
              yId="left" 
              dataKey="hr" 
              name="Pulso" 
              barSize={32} 
              radius={[6, 6, 0, 0]}
              fillOpacity={0.6}
              fill={BLOCK_COLORS.other}
            >
                {chartData.map((entry, index) => (
                    <Cell 
                        key={`cell-${index}`} 
                        fill={BLOCK_COLORS[entry.type as keyof typeof BLOCK_COLORS] || BLOCK_COLORS.other}
                        className="transition-all duration-300 hover:opacity-100"
                    />
                ))}
            </Bar>

            {/* Line for Pace */}
            <Line
              yId="right"
              type="monotone"
              dataKey="pace"
              name="Ritmo"
              stroke="#f97316" // orange-500
              strokeWidth={4}
              dot={{ r: 5, fill: '#f97316', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 7, strokeWidth: 0 }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
