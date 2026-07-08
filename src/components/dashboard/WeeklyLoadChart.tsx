'use client';

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export type WeeklyLoadChartPoint = {
  weekLabel: string;
  km: number;
  minutes: number;
  tss: number;
};

interface WeeklyLoadChartProps {
  data: WeeklyLoadChartPoint[];
}

export function WeeklyLoadChart({ data }: WeeklyLoadChartProps) {
  return (
    <div className="h-64 w-full sm:h-72 px-2">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 10, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.35} />
          <XAxis
            dataKey="weekLabel"
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            width={38}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            width={38}
          />
          <Tooltip
            formatter={(value, name) => [Number(value ?? 0).toFixed(0), String(name ?? '')]}
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 0,
              fontFamily: 'var(--font-ibm-plex-mono, monospace)',
              fontSize: 12,
            }}
            labelStyle={{
              color: 'hsl(var(--foreground))',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
            itemStyle={{ color: 'hsl(var(--foreground))' }}
          />
          <Bar yAxisId="left" dataKey="km" name="KM" fill="#f59e0b" barSize={18} />
          <Line yAxisId="right" type="monotone" dataKey="minutes" name="MIN" stroke="#06b6d4" strokeWidth={2.25} dot={false} />
          <Line yAxisId="right" type="monotone" dataKey="tss" name="TSS" stroke="#f43f5e" strokeWidth={2.25} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
