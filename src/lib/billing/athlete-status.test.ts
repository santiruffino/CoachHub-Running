import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { deriveBillingStatus, getBillingActiveAthleteIds } from './athlete-status';

describe('deriveBillingStatus', () => {
  it('returns paused_manual when manually paused, regardless of activity', () => {
    expect(deriveBillingStatus(true, true)).toBe('paused_manual');
    expect(deriveBillingStatus(true, false)).toBe('paused_manual');
  });

  it('returns active when not manually paused and there is recent activity', () => {
    expect(deriveBillingStatus(false, true)).toBe('active');
  });

  it('returns paused_auto when not manually paused and no recent activity', () => {
    expect(deriveBillingStatus(false, false)).toBe('paused_auto');
    expect(deriveBillingStatus(null, false)).toBe('paused_auto');
    expect(deriveBillingStatus(undefined, false)).toBe('paused_auto');
  });
});

/**
 * Minimal stub of the Supabase query builder used by getBillingActiveAthleteIds.
 * Each terminal `.gte()` resolves to the rows configured per table.
 */
function makeSupabaseStub(rowsByTable: Record<string, unknown[]>): SupabaseClient {
  return {
    from(table: string) {
      const rows = rowsByTable[table] || [];
      const builder = {
        select: () => builder,
        in: () => builder,
        gte: () => Promise.resolve({ data: rows, error: null }),
      };
      return builder;
    },
  } as unknown as SupabaseClient;
}

describe('getBillingActiveAthleteIds', () => {
  const now = new Date('2026-07-14T12:00:00.000Z');

  it('returns an empty set for no athletes without querying', async () => {
    const supabase = makeSupabaseStub({});
    const result = await getBillingActiveAthleteIds(supabase, [], now);
    expect(result.size).toBe(0);
  });

  it('marks athletes with a recent activity as active', async () => {
    const supabase = makeSupabaseStub({
      activities: [{ user_id: 'a1' }],
      training_assignments: [],
    });
    const result = await getBillingActiveAthleteIds(supabase, ['a1', 'a2'], now);
    expect(result.has('a1')).toBe(true);
    expect(result.has('a2')).toBe(false);
  });

  it('marks athletes with a completed assignment in the window as active', async () => {
    const supabase = makeSupabaseStub({
      activities: [],
      training_assignments: [{ user_id: 'a2', completed: true, scheduled_date: '2026-07-01' }],
    });
    const result = await getBillingActiveAthleteIds(supabase, ['a1', 'a2'], now);
    expect(result.has('a2')).toBe(true);
  });

  it('marks athletes with a future pending assignment as active', async () => {
    const supabase = makeSupabaseStub({
      activities: [],
      training_assignments: [{ user_id: 'a3', completed: false, scheduled_date: '2026-08-20' }],
    });
    const result = await getBillingActiveAthleteIds(supabase, ['a3'], now);
    expect(result.has('a3')).toBe(true);
  });

  it('does not mark athletes with only a past uncompleted assignment', async () => {
    const supabase = makeSupabaseStub({
      activities: [],
      training_assignments: [{ user_id: 'a4', completed: false, scheduled_date: '2026-07-05' }],
    });
    const result = await getBillingActiveAthleteIds(supabase, ['a4'], now);
    expect(result.has('a4')).toBe(false);
  });
});
