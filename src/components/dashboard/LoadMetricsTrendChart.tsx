'use client';

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

type LoadPoint = {
  date: string;
  ctl: number;
  atl: number;
  tsb: number;
};

interface LoadMetricsTrendChartProps {
  data: LoadPoint[];
}

export function LoadMetricsTrendChart({ data }: LoadMetricsTrendChartProps) {
  return (
    <div className="h-64 w-full sm:h-72 px-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 10, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.35} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            width={38}
          />
          <Tooltip
            formatter={(value: number | undefined, name: string | undefined) => [Number(value ?? 0).toFixed(1), name ?? '']}
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
            itemStyle={{
              color: 'hsl(var(--foreground))',
            }}
          />
          <Line type="monotone" dataKey="ctl" name="CTL" stroke="#f59e0b" strokeWidth={2.25} dot={false} />
          <Line type="monotone" dataKey="atl" name="ATL" stroke="#f43f5e" strokeWidth={2.25} dot={false} />
          <Line type="monotone" dataKey="tsb" name="TSB" stroke="#06b6d4" strokeWidth={2.25} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
