import { addDays, differenceInCalendarDays, format, startOfDay, subDays } from 'date-fns';

export type ActivityLoadRow = {
  start_date: string;
  load_score?: number | null;
  suffer_score?: number | null;
  duration?: number | null;
  avg_hr?: number | null;
  max_hr?: number | null;
};

export type LoadProfileInput = {
  lthr?: number | null;
  restHR?: number | null;
  maxHR?: number | null;
};

export type LoadRiskThresholds = {
  loadRiskHighAcwr: number;
  loadRiskModerateAcwr: number;
  loadRiskLowStimulusAcwr: number;
  loadRiskHighTsb: number;
  loadRiskModerateTsb: number;
  loadRiskLowStimulusTsb: number;
};

const DEFAULT_LOAD_RISK_THRESHOLDS: LoadRiskThresholds = {
  loadRiskHighAcwr: 1.5,
  loadRiskModerateAcwr: 1.3,
  loadRiskLowStimulusAcwr: 0.8,
  loadRiskHighTsb: -30,
  loadRiskModerateTsb: -15,
  loadRiskLowStimulusTsb: 25,
};

export type DailyLoadPoint = {
  date: string;
  load: number;
  ctl: number;
  atl: number;
  tsb: number;
  acwr: number;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function estimateLoadFromActivity(row: ActivityLoadRow, profile?: LoadProfileInput): number {
  if (isFiniteNumber(row.load_score)) {
    return Math.max(0, row.load_score);
  }

  if (isFiniteNumber(row.suffer_score)) {
    return Math.max(0, row.suffer_score);
  }

  const durationHours = Math.max(0, row.duration || 0) / 3600;
  if (durationHours <= 0) return 0;

  const avgHr = row.avg_hr;
  const lthr = profile?.lthr;
  const restHr = profile?.restHR;
  const maxHr = profile?.maxHR;

  if (isFiniteNumber(avgHr) && isFiniteNumber(lthr) && lthr > 0) {
    const intensityFactor = Math.min(1.5, Math.max(0.5, avgHr / lthr));
    return durationHours * Math.pow(intensityFactor, 2) * 100;
  }

  if (
    isFiniteNumber(avgHr) &&
    isFiniteNumber(restHr) &&
    isFiniteNumber(maxHr) &&
    maxHr > restHr
  ) {
    const hrReserve = Math.min(1, Math.max(0, (avgHr - restHr) / (maxHr - restHr)));
    return durationHours * (55 + hrReserve * 85);
  }

  return durationHours * 45;
}

export function buildDailyLoadSeries(
  rows: ActivityLoadRow[],
  options: {
    rangeDays: 7 | 30 | 90;
    profile?: LoadProfileInput;
    now?: Date;
    warmupDays?: number;
  }
): {
  series: DailyLoadPoint[];
  current: DailyLoadPoint;
  avg7d: number;
  todayLoad: number;
  historyDaysAvailable: number;
  historySpanDays: number;
  warmupDays: number;
  lookbackDays: number;
} {
  const today = startOfDay(options.now || new Date());
  const warmupDays = options.warmupDays ?? 42;
  const lookbackDays = options.rangeDays + warmupDays;
  const startDate = subDays(today, lookbackDays - 1);

  const dailyLoads = new Map<string, number>();
  for (const row of rows) {
    const day = format(startOfDay(new Date(row.start_date)), 'yyyy-MM-dd');
    const previous = dailyLoads.get(day) || 0;
    dailyLoads.set(day, previous + estimateLoadFromActivity(row, options.profile));
  }

  const ctlTau = 42;
  const atlTau = 7;
  const ctlAlpha = 2 / (ctlTau + 1);
  const atlAlpha = 2 / (atlTau + 1);

  let ctl = 0;
  let atl = 0;
  const fullSeries: DailyLoadPoint[] = [];

  for (let day = startDate; day <= today; day = addDays(day, 1)) {
    const key = format(day, 'yyyy-MM-dd');
    const load = dailyLoads.get(key) || 0;
    ctl = ctl + ctlAlpha * (load - ctl);
    atl = atl + atlAlpha * (load - atl);
    const tsb = ctl - atl;
    const acwr = ctl > 0.001 ? atl / ctl : 0;
    fullSeries.push({ date: key, load, ctl, atl, tsb, acwr });
  }

  const series = fullSeries.slice(-options.rangeDays);
  const current = series[series.length - 1] || { date: format(today, 'yyyy-MM-dd'), load: 0, ctl: 0, atl: 0, tsb: 0, acwr: 0 };

  const avg7d = fullSeries.slice(-7).reduce((acc, point) => acc + point.load, 0) / 7;
  const todayLoad = current.load;

  const daysWithData = new Set(
    rows.map((row) => format(startOfDay(new Date(row.start_date)), 'yyyy-MM-dd'))
  );

  const oldestActivityDate = rows.length > 0
    ? rows.reduce((oldest, row) => {
      const day = startOfDay(new Date(row.start_date));
      if (!oldest || day < oldest) return day;
      return oldest;
    }, null as Date | null)
    : null;

  const historySpanDays = oldestActivityDate ? differenceInCalendarDays(today, oldestActivityDate) + 1 : 0;

  return {
    series,
    current,
    avg7d,
    todayLoad,
    historyDaysAvailable: daysWithData.size,
    historySpanDays,
    warmupDays,
    lookbackDays,
  };
}

export function classifyLoadRisk(
  acwr: number,
  tsb: number,
  thresholds: LoadRiskThresholds = DEFAULT_LOAD_RISK_THRESHOLDS
): 'insufficientData' | 'high' | 'moderate' | 'balanced' | 'lowStimulus' {
  if (acwr === 0 && Math.abs(tsb) < 0.001) return 'insufficientData';
  if (acwr > thresholds.loadRiskHighAcwr || tsb < thresholds.loadRiskHighTsb) return 'high';
  if (acwr > thresholds.loadRiskModerateAcwr || tsb < thresholds.loadRiskModerateTsb) return 'moderate';
  if (acwr < thresholds.loadRiskLowStimulusAcwr || tsb > thresholds.loadRiskLowStimulusTsb) return 'lowStimulus';
  return 'balanced';
}
