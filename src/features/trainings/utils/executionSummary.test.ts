import { describe, expect, it } from 'vitest';
import { computeExecutionSummary } from './executionSummary';
import type { Lap, BestEffort } from '@/interfaces/activity';
import type { MatchedLap, FlatStep } from './workoutMatcher';

function lap(partial: Partial<Lap> & { lap_index: number; distance: number; moving_time: number }): Lap {
    const speed = partial.average_speed ?? (partial.distance / partial.moving_time);
    return {
        id: partial.lap_index,
        name: `Lap ${partial.lap_index}`,
        elapsed_time: partial.elapsed_time ?? partial.moving_time,
        max_speed: speed,
        total_elevation_gain: 0,
        ...partial,
        average_speed: speed,
    };
}

function activeMatch(lapIndex: number, stepIndex: number): MatchedLap {
    return { lapIndex, stepIndex, stepLabel: `Interval ${stepIndex}`, stepType: 'active', confidence: 100, variance: 0, matched: true };
}

function activeStep(stepIndex: number): FlatStep {
    return { stepIndex, name: `Interval ${stepIndex}`, target_type: 'distance', target_value: 1000, stepType: 'active' };
}

describe('computeExecutionSummary — split', () => {
    it('detects a negative split when the second half is faster', () => {
        const laps = [
            lap({ lap_index: 0, distance: 1000, moving_time: 300 }),
            lap({ lap_index: 1, distance: 1000, moving_time: 300 }),
            lap({ lap_index: 2, distance: 1000, moving_time: 270 }),
            lap({ lap_index: 3, distance: 1000, moving_time: 270 }),
        ];
        const { split } = computeExecutionSummary({ laps });
        expect(split?.type).toBe('negative');
        expect(split?.deltaSeconds).toBe(-30);
    });

    it('detects a positive split and emits a constructive tip (never a red)', () => {
        const laps = [
            lap({ lap_index: 0, distance: 1000, moving_time: 260 }),
            lap({ lap_index: 1, distance: 1000, moving_time: 260 }),
            lap({ lap_index: 2, distance: 1000, moving_time: 300 }),
            lap({ lap_index: 3, distance: 1000, moving_time: 300 }),
        ];
        const summary = computeExecutionSummary({ laps });
        expect(summary.split?.type).toBe('positive');
        const tip = summary.highlights.find(h => h.key === 'positiveSplitTip');
        expect(tip?.tone).toBe('tip');
        // No highlight should ever carry a negative tone.
        expect(summary.highlights.every(h => h.tone !== 'celebrate' || h.key.startsWith('newPr'))).toBe(true);
    });

    it('ignores warmup/cooldown laps when computing the split', () => {
        const laps = [
            lap({ lap_index: 0, distance: 1000, moving_time: 360 }), // slow warmup
            lap({ lap_index: 1, distance: 1000, moving_time: 290 }),
            lap({ lap_index: 2, distance: 1000, moving_time: 290 }),
            lap({ lap_index: 3, distance: 1000, moving_time: 400 }), // slow cooldown
        ];
        const matchedLaps: MatchedLap[] = [
            { lapIndex: 0, stepIndex: 0, stepLabel: 'Warmup', stepType: 'warmup', confidence: 100, variance: 0, matched: true },
            activeMatch(1, 1),
            activeMatch(2, 2),
            { lapIndex: 3, stepIndex: 3, stepLabel: 'Cooldown', stepType: 'cooldown', confidence: 100, variance: 0, matched: true },
        ];
        const { split } = computeExecutionSummary({ laps, matchedLaps });
        // Only laps 1 & 2 count → even split, warmup/cooldown excluded.
        expect(split?.type).toBe('even');
    });
});

describe('computeExecutionSummary — consistency', () => {
    it('rates near-identical reps as highly consistent', () => {
        const laps = [
            lap({ lap_index: 0, distance: 400, moving_time: 90 }),
            lap({ lap_index: 1, distance: 400, moving_time: 91 }),
            lap({ lap_index: 2, distance: 400, moving_time: 90 }),
            lap({ lap_index: 3, distance: 400, moving_time: 91 }),
        ];
        const matchedLaps = [activeMatch(0, 0), activeMatch(1, 1), activeMatch(2, 2), activeMatch(3, 3)];
        const { consistency } = computeExecutionSummary({ laps, matchedLaps });
        expect(consistency?.level).toBe('high');
        expect(consistency?.sampleSize).toBe(4);
        expect(consistency!.score).toBeGreaterThan(90);
    });

    it('does not compute consistency without matched active reps', () => {
        const laps = [
            lap({ lap_index: 0, distance: 1000, moving_time: 300 }),
            lap({ lap_index: 1, distance: 1000, moving_time: 320 }),
        ];
        const { consistency } = computeExecutionSummary({ laps });
        expect(consistency).toBeUndefined();
    });
});

describe('computeExecutionSummary — reps', () => {
    it('reports completed vs planned reps and celebrates completion', () => {
        const laps = [
            lap({ lap_index: 0, distance: 1000, moving_time: 240 }),
            lap({ lap_index: 1, distance: 1000, moving_time: 242 }),
            lap({ lap_index: 2, distance: 1000, moving_time: 241 }),
        ];
        const matchedLaps = [activeMatch(0, 0), activeMatch(1, 1), activeMatch(2, 2)];
        const flatSteps = [activeStep(0), activeStep(1), activeStep(2)];
        const { reps, highlights } = computeExecutionSummary({ laps, matchedLaps, flatSteps });
        expect(reps).toEqual({ done: 3, planned: 3 });
        expect(highlights.some(h => h.key === 'allRepsDone')).toBe(true);
    });
});

describe('computeExecutionSummary — personal records', () => {
    it('celebrates an all-time PR', () => {
        const bestEfforts: BestEffort[] = [
            { name: '1k', elapsed_time: 200, moving_time: 200, distance: 1000, pr_rank: 1 },
            { name: '5k', elapsed_time: 1200, moving_time: 1200, distance: 5000, pr_rank: null },
        ];
        const summary = computeExecutionSummary({ bestEfforts });
        expect(summary.personalRecords).toHaveLength(1);
        const pr = summary.highlights.find(h => h.key === 'newPr');
        expect(pr?.tone).toBe('celebrate');
        expect(pr?.params?.distance).toBe('1k');
    });

    it('uses easy-session flavor when the PR came in a soft run', () => {
        const bestEfforts: BestEffort[] = [
            { name: '1k', elapsed_time: 200, moving_time: 200, distance: 1000, pr_rank: 1 },
        ];
        const summary = computeExecutionSummary({ bestEfforts, sessionType: 'RECOVERY' });
        expect(summary.highlights.some(h => h.key === 'newPrEasy')).toBe(true);
    });
});

describe('computeExecutionSummary — empty / degenerate input', () => {
    it('returns no content and no highlights for empty input without throwing', () => {
        const summary = computeExecutionSummary({});
        expect(summary.hasContent).toBe(false);
        expect(summary.highlights).toEqual([]);
        expect(summary.personalRecords).toEqual([]);
    });
});
