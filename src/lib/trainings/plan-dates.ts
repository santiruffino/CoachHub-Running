/**
 * Pure date helpers for materializing plans onto the calendar.
 *
 * Plan items are positioned by (week_index, day_of_week) where day_of_week is
 * 0 = Monday ... 6 = Sunday, matching CALENDAR_WEEK_START ({ weekStartsOn: 1 }).
 *
 * All arithmetic is done in UTC on the date part only, then serialized as a
 * midnight-UTC ISO string. The calendar renders by slicing the date portion
 * (`scheduled_date.split('T')[0]`), so the stored day is stable regardless of
 * server timezone.
 */

function partsFromDateString(dateStr: string): { y: number; m: number; d: number } {
    // Accept 'yyyy-MM-dd' or full ISO — only the date part matters.
    const [datePart] = dateStr.split('T');
    const [y, m, d] = datePart.split('-').map((n) => parseInt(n, 10));
    return { y, m, d };
}

function toIsoMidnightUtc(date: Date): string {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}T00:00:00.000Z`;
}

/** Monday (00:00 UTC) of the week containing the given date. */
export function mondayOf(dateStr: string): Date {
    const { y, m, d } = partsFromDateString(dateStr);
    const date = new Date(Date.UTC(y, m - 1, d));
    // getUTCDay: 0 = Sunday ... 6 = Saturday. Days since Monday = (day + 6) % 7.
    const daysSinceMonday = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - daysSinceMonday);
    return date;
}

/**
 * ISO datetime (midnight UTC) for a plan item, given the plan's start date.
 * The start date is normalized to the Monday of its week, then offset by
 * `weekIndex` weeks and `dayOfWeek` days (0 = Monday).
 */
export function planItemDate(startDateStr: string, weekIndex: number, dayOfWeek: number): string {
    const monday = mondayOf(startDateStr);
    monday.setUTCDate(monday.getUTCDate() + weekIndex * 7 + dayOfWeek);
    return toIsoMidnightUtc(monday);
}

/** Shift a date by a whole number of days, preserving the midnight-UTC ISO shape. */
export function shiftDateByDays(dateStr: string, days: number): string {
    const { y, m, d } = partsFromDateString(dateStr);
    const date = new Date(Date.UTC(y, m - 1, d));
    date.setUTCDate(date.getUTCDate() + days);
    return toIsoMidnightUtc(date);
}

/** Whole-day difference (b - a), using date parts only. */
export function dayDiff(aStr: string, bStr: string): number {
    const a = partsFromDateString(aStr);
    const b = partsFromDateString(bStr);
    const aUtc = Date.UTC(a.y, a.m - 1, a.d);
    const bUtc = Date.UTC(b.y, b.m - 1, b.d);
    return Math.round((bUtc - aUtc) / (24 * 60 * 60 * 1000));
}
