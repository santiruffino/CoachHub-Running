import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * SAN-161 — Billing status for athletes.
 *
 * Three mutually exclusive states, resolved in this order:
 *  - `paused_manual`: an admin explicitly paused the athlete (`is_paused_manual`).
 *  - `active`: the athlete shows real recent activity (see rule below) and is
 *    therefore commercially active / billable.
 *  - `paused_auto`: no manual pause, but no recent activity either — the system
 *    deduces the athlete is not currently training, so they don't count for billing.
 *
 * Only `active` athletes count for billing.
 */
export type AthleteBillingStatus = 'active' | 'paused_manual' | 'paused_auto';

/** Look-back window (days) used to decide whether an athlete is commercially active. */
export const BILLING_ACTIVITY_WINDOW_DAYS = 30;

/**
 * Pure derivation of the billing status given the manual flag and whether the
 * athlete has a recent-activity signal within the look-back window.
 */
export function deriveBillingStatus(
  isPausedManual: boolean | null | undefined,
  hasRecentActivity: boolean,
): AthleteBillingStatus {
  if (isPausedManual) return 'paused_manual';
  return hasRecentActivity ? 'active' : 'paused_auto';
}

function windowStartDate(now: Date): Date {
  const start = new Date(now);
  start.setDate(start.getDate() - BILLING_ACTIVITY_WINDOW_DAYS);
  start.setHours(0, 0, 0, 0);
  return start;
}

function toDateStr(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

/**
 * Returns the subset of `athleteIds` that have a real recent-activity signal,
 * meaning at least one of, within the last {@link BILLING_ACTIVITY_WINDOW_DAYS} days:
 *  - a registered activity,
 *  - a completed training assignment,
 * or, at any point from now on:
 *  - a future (not-yet-completed) training assignment still on the calendar.
 *
 * Signals intentionally excluded (per SAN-161): having a coach, group membership,
 * recent logins or an active plan alone.
 */
export async function getBillingActiveAthleteIds(
  supabase: SupabaseClient,
  athleteIds: string[],
  now: Date = new Date(),
): Promise<Set<string>> {
  const active = new Set<string>();
  if (athleteIds.length === 0) return active;

  const windowStart = windowStartDate(now);
  const windowStartIso = windowStart.toISOString();
  const windowStartDateStr = toDateStr(windowStart);
  const todayStr = toDateStr(now);

  const [activitiesRes, assignmentsRes] = await Promise.all([
    // Signal 1: a registered activity in the window.
    supabase
      .from('activities')
      .select('user_id')
      .in('user_id', athleteIds)
      .gte('start_date', windowStartIso),
    // Signals 2 & 3: assignments scheduled from the window start onward, so this
    // covers both recently-completed sessions and any future planned session.
    supabase
      .from('training_assignments')
      .select('user_id, completed, scheduled_date')
      .in('user_id', athleteIds)
      .gte('scheduled_date', windowStartDateStr),
  ]);

  for (const row of activitiesRes.data || []) {
    active.add(row.user_id);
  }

  for (const row of assignmentsRes.data || []) {
    if (active.has(row.user_id)) continue;
    const scheduledDate = String(row.scheduled_date).split('T')[0];
    // Completed within the window, or a still-pending session scheduled for today/future.
    if (row.completed || scheduledDate >= todayStr) {
      active.add(row.user_id);
    }
  }

  return active;
}
