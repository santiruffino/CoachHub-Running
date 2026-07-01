import { addDays, format, startOfWeek, subWeeks } from 'date-fns';
import { ActivityLoadRow, LoadProfileInput, estimateLoadFromActivity } from './load';

export type WeeklyLoadRow = ActivityLoadRow & { distance?: number | null };

export type WeeklyLoadPoint = {
  weekStart: string;
  km: number;
  minutes: number;
  tss: number;
  hasHrData: boolean;
};

export function buildWeeklyLoadSeries(
  rows: WeeklyLoadRow[],
  options: {
    weeks: number;
    profile?: LoadProfileInput;
    now?: Date;
  }
): WeeklyLoadPoint[] {
  const now = options.now || new Date();
  const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const oldestWeekStart = subWeeks(currentWeekStart, options.weeks - 1);

  const buckets = new Map<string, { km: number; minutes: number; tss: number; hasHrData: boolean }>();
  for (let i = 0; i < options.weeks; i++) {
    const key = format(addDays(oldestWeekStart, i * 7), 'yyyy-MM-dd');
    buckets.set(key, { km: 0, minutes: 0, tss: 0, hasHrData: false });
  }

  for (const row of rows) {
    const activityDate = new Date(row.start_date);
    if (activityDate < oldestWeekStart) continue;

    const weekKey = format(startOfWeek(activityDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const bucket = buckets.get(weekKey);
    if (!bucket) continue;

    bucket.km += Math.max(0, row.distance || 0) / 1000;
    bucket.minutes += Math.max(0, row.duration || 0) / 60;
    bucket.tss += estimateLoadFromActivity(row, options.profile);
    if (
      typeof row.avg_hr === 'number' &&
      Number.isFinite(row.avg_hr) &&
      options.profile?.lthr
    ) {
      bucket.hasHrData = true;
    }
  }

  return Array.from(buckets.entries()).map(([weekStart, bucket]) => ({
    weekStart,
    km: Math.round(bucket.km * 10) / 10,
    minutes: Math.round(bucket.minutes),
    tss: Math.round(bucket.tss),
    hasHrData: bucket.hasHrData,
  }));
}
