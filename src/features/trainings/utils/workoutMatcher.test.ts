import { describe, expect, it } from 'vitest';
import { deriveStepRpe, flattenWorkout, type RawBlock } from './workoutMatcher';

describe('deriveStepRpe', () => {
    it('uses the explicit rpe slider value when set', () => {
        expect(deriveStepRpe({ type: 'interval', duration: { type: 'time', value: 600 }, rpe: 7 })).toBe(7);
    });

    it('derives RPE from an rpe_target objective (min/max as strings)', () => {
        const block: RawBlock = {
            type: 'interval',
            duration: { type: 'time', value: 3600 },
            target: { type: 'rpe_target', min: '2', max: '2' },
        };
        expect(deriveStepRpe(block)).toBe(2);
    });

    it('averages the rpe_target range', () => {
        const block: RawBlock = {
            type: 'interval',
            duration: { type: 'time', value: 600 },
            target: { type: 'rpe_target', min: 8, max: 9 },
        };
        expect(deriveStepRpe(block)).toBe(9); // round(8.5)
    });

    it('never derives RPE from the visual intensity bar height', () => {
        // Regression: an easy run defaults to intensity 85 (bar height, not effort).
        // Previously this surfaced as "RPE 9" (Math.round(85 / 10)).
        const block: RawBlock = {
            type: 'interval',
            duration: { type: 'time', value: 3600 },
            intensity: 85,
        };
        expect(deriveStepRpe(block)).toBeUndefined();
    });

    it('ignores non-rpe targets (e.g. HR / VAM zones)', () => {
        const block: RawBlock = {
            type: 'interval',
            duration: { type: 'distance', value: 1000 },
            target: { type: 'vam_zone', min: 4, max: 4 },
            intensity: 85,
        };
        expect(deriveStepRpe(block)).toBeUndefined();
    });
});

describe('flattenWorkout — RPE labelling', () => {
    it('labels a 1h easy run with its rpe_target, not the bar height', () => {
        // The exact reported case: "una hora de easy run (RPE 2)" showing as RPE 9.
        const blocks: RawBlock[] = [
            {
                type: 'interval',
                stepName: 'Easy run',
                duration: { type: 'time', value: 3600 },
                target: { type: 'rpe_target', min: '2', max: '2' },
                intensity: 85,
            },
        ];

        const steps = flattenWorkout(blocks);
        expect(steps).toHaveLength(1);
        expect(steps[0].intensity).toBe(2);
    });

    it('carries the rpe_target through repeat groups', () => {
        const blocks: RawBlock[] = [
            {
                type: 'interval',
                duration: { type: 'distance', value: 400 },
                target: { type: 'rpe_target', min: 9, max: 9 },
                intensity: 90,
                group: { id: 'g1', reps: 3 },
            },
        ];

        const steps = flattenWorkout(blocks);
        expect(steps).toHaveLength(3);
        expect(steps.map(s => s.intensity)).toEqual([9, 9, 9]);
    });
});
