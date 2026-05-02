'use client';

import { useTranslations } from 'next-intl';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';

interface PerformanceTrendChartProps {
  data: { week: string; value: number }[];
  showTitle?: boolean;
  className?: string;
}

export function PerformanceTrendChart({ data, showTitle = false, className }: PerformanceTrendChartProps) {
  const t = useTranslations('dashboard.performanceTrend');

  return (
    <div className={cn('rounded-2xl border border-border/50 bg-muted/20 p-5 sm:p-6', className)}>
      {showTitle && (
        <h4 className="mb-6 flex items-center gap-2 text-lg font-semibold text-foreground">
          <span>📈</span>
          {t('title')}
        </h4>
      )}

      <div className="h-64 w-full sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.35} />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              width={34}
            />
            <Tooltip
              formatter={(value: number) => [`${value}%`, t('title')]}
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '12px',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--foreground))"
              strokeWidth={2.25}
              dot={{ r: 4, fill: 'hsl(var(--foreground))', strokeWidth: 0 }}
              activeDot={{ r: 6, fill: 'hsl(var(--foreground))' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
