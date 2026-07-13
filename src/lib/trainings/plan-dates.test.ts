import { describe, it, expect } from 'vitest';
import { mondayOf, planItemDate, shiftDateByDays, dayDiff } from './plan-dates';

describe('plan-dates', () => {
    describe('mondayOf', () => {
        it('returns the same day when given a Monday', () => {
            // 2026-07-13 is a Monday
            expect(mondayOf('2026-07-13').toISOString()).toBe('2026-07-13T00:00:00.000Z');
        });

        it('snaps back to Monday from mid-week', () => {
            // 2026-07-16 is a Thursday
            expect(mondayOf('2026-07-16').toISOString()).toBe('2026-07-13T00:00:00.000Z');
        });

        it('snaps Sunday back to the preceding Monday (week starts Monday)', () => {
            // 2026-07-19 is a Sunday
            expect(mondayOf('2026-07-19').toISOString()).toBe('2026-07-13T00:00:00.000Z');
        });

        it('accepts a full ISO datetime', () => {
            expect(mondayOf('2026-07-16T09:30:00.000Z').toISOString()).toBe('2026-07-13T00:00:00.000Z');
        });
    });

    describe('planItemDate', () => {
        it('week 0 / Monday maps to the start Monday', () => {
            expect(planItemDate('2026-07-13', 0, 0)).toBe('2026-07-13T00:00:00.000Z');
        });

        it('week 0 / Sunday maps to the following Sunday', () => {
            expect(planItemDate('2026-07-13', 0, 6)).toBe('2026-07-19T00:00:00.000Z');
        });

        it('week 1 / Wednesday maps 9 days out', () => {
            // Monday + 7 + 2 = 2026-07-22 (Wednesday)
            expect(planItemDate('2026-07-13', 1, 2)).toBe('2026-07-22T00:00:00.000Z');
        });

        it('normalizes a non-Monday start to its week Monday first', () => {
            // Start given as Thursday still anchors to Monday 2026-07-13
            expect(planItemDate('2026-07-16', 2, 0)).toBe('2026-07-27T00:00:00.000Z');
        });

        it('crosses month boundaries correctly', () => {
            // Monday 2026-07-27 + 1 week + Friday(4) = 2026-08-07
            expect(planItemDate('2026-07-27', 1, 4)).toBe('2026-08-07T00:00:00.000Z');
        });
    });

    describe('shiftDateByDays', () => {
        it('shifts forward by 7 days', () => {
            expect(shiftDateByDays('2026-07-13', 7)).toBe('2026-07-20T00:00:00.000Z');
        });

        it('shifts across a month boundary', () => {
            expect(shiftDateByDays('2026-07-30T00:00:00.000Z', 3)).toBe('2026-08-02T00:00:00.000Z');
        });
    });

    describe('dayDiff', () => {
        it('computes whole-day offset within a week', () => {
            expect(dayDiff('2026-07-13', '2026-07-16')).toBe(3);
        });

        it('ignores the time component', () => {
            expect(dayDiff('2026-07-13T00:00:00.000Z', '2026-07-20T05:00:00.000Z')).toBe(7);
        });
    });
});
