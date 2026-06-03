'use client';

import { useTranslations } from 'next-intl';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

const FONT_MONO = { fontFamily: 'var(--font-ibm-plex-mono, monospace)' } as const;
const BRAND_ORANGE = '#FF6800';

type Status = 'good' | 'moderate' | 'low';

interface PerformanceTrendChartProps {
  data: { week: string; value: number }[];
  showTitle?: boolean;
  className?: string;
  target?: number;
  showStats?: boolean;
  statLabelsNamespace?: string;
}

function resolveStatus(avg: number, target: number): Status {
  if (avg >= target) return 'good';
    if (avg >= target - 20) return 'moderate';
    return 'low';
}

function resolveDotColor(value: number, target: number): string {
  if (value >= target) return '#10b981';
  if (value >= target - 20) return BRAND_ORANGE;
  return '#ef4444';
}

function resolveStatusClasses(status: Status): string {
    if (status === 'good') return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
    if (status === 'moderate') return 'bg-amber-500/10 text-amber-700 dark:text-amber-300';
    return 'bg-red-500/10 text-red-700 dark:text-red-300';
}

export function PerformanceTrendChart({
  data,
  showTitle = false,
  className,
  target = 80,
  showStats = true,
  statLabelsNamespace = 'athletes.detail.complianceStats',
}: PerformanceTrendChartProps) {
  const t = useTranslations('dashboard.performanceTrend');
  const tStats = useTranslations(statLabelsNamespace);

  const validData = data.filter((d) => typeof d.value === 'number');
  const hasData = validData.length > 0;

  const average = hasData
    ? Math.round(validData.reduce((acc, d) => acc + d.value, 0) / validData.length)
    : 0;

  const lastValue = validData[validData.length - 1]?.value ?? 0;
  const prevValue = validData.length >= 2 ? validData[validData.length - 2]?.value : undefined;
  const delta = prevValue !== undefined ? lastValue - prevValue : null;
  const trendDirection: 'up' | 'down' | 'stable' =
    delta === null ? 'stable' : delta > 0 ? 'up' : delta < 0 ? 'down' : 'stable';
  const status = resolveStatus(average, target);

  const trendColorClass =
    trendDirection === 'up'
      ? 'text-emerald-600 dark:text-emerald-400'
      : trendDirection === 'down'
        ? 'text-red-600 dark:text-red-400'
        : 'text-foreground';

  return (
    <div className={cn('p-1', className)}>
      {showTitle && (
        <h4 className="mb-6 flex items-center gap-2 text-lg font-semibold text-foreground">
          <span>📈</span>
          {t('title')}
        </h4>
      )}

      {showStats && hasData && (
        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className="bg-endurix-black/5 dark:bg-white/5 p-4 flex flex-col gap-1.5">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              {tStats('average')}
            </span>
            <span
              className="text-2xl font-bold text-foreground leading-none"
              style={FONT_MONO}
            >
              {average}%
            </span>
          </div>

          <div className="bg-endurix-black/5 dark:bg-white/5 p-4 flex flex-col gap-1.5">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              {tStats('trend')}
            </span>
            <div className="flex items-center gap-1.5">
              {trendDirection === 'up' && <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
              {trendDirection === 'down' && <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />}
              {trendDirection === 'stable' && <Minus className="h-4 w-4 text-muted-foreground" />}
              <span
                className={cn('text-2xl font-bold leading-none', trendColorClass)}
                style={FONT_MONO}
              >
                {delta !== null ? `${delta > 0 ? '+' : ''}${Math.round(delta)}%` : '—'}
              </span>
            </div>
          </div>

          <div className="bg-endurix-black/5 dark:bg-white/5 p-4 flex flex-col gap-1.5">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              {tStats('status')}
            </span>
            <span
              className={cn(
                'self-start px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                resolveStatusClasses(status),
              )}
            >
              {tStats(`statusLabel.${status}`)}
            </span>
          </div>
        </div>
      )}

      <div className="h-64 w-full sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <defs>
              <linearGradient id="performanceAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={BRAND_ORANGE} stopOpacity={0.28} />
                <stop offset="100%" stopColor={BRAND_ORANGE} stopOpacity={0} />
              </linearGradient>
            </defs>
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
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              formatter={(value) => [`${Number(value ?? 0)}%`, t('title')]}
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '12px',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
            />
            <ReferenceLine
              y={target}
              stroke={BRAND_ORANGE}
              strokeDasharray="4 4"
              strokeOpacity={0.55}
              label={{
                value: `${target}%`,
                position: 'right',
                fill: BRAND_ORANGE,
                fontSize: 10,
                fontWeight: 700,
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="none"
              fill="url(#performanceAreaGradient)"
              isAnimationActive
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--foreground))"
              strokeWidth={2.25}
              dot={(props) => {
                const { cx, cy, payload } = props as { cx: number; cy: number; payload: { value: number } };
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={resolveDotColor(payload.value, target)}
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                  />
                );
              }}
              activeDot={{ r: 6, fill: 'hsl(var(--foreground))' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
