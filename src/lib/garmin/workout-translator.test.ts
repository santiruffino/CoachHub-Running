import { describe, expect, it } from 'vitest';
import { TrainingType } from '@/interfaces/training';
import type { WorkoutBlock } from '@/features/trainings/components/builder/types';
import { translateWorkout } from './workout-translator';
import type { GarminExecutableStep, GarminRepeatGroup } from './types';
import type { GarminAthleteProfile } from './zone-resolver';

const profile: GarminAthleteProfile = {
    vam: '4:30',
    lthr: 170,
    maxHR: 190,
    restHR: 50,
    ftp: 250,
};

let blockSeq = 0;
function block(partial: Partial<WorkoutBlock>): WorkoutBlock {
    blockSeq += 1;
    return {
        id: `b${blockSeq}`,
        type: 'interval',
        duration: { type: 'time', value: 300 },
        target: { type: 'rpe_target', min: 5, max: 5 },
        ...partial,
    } as WorkoutBlock;
}

const isRepeat = (s: unknown): s is GarminRepeatGroup =>
    (s as { type?: string }).type === 'RepeatGroupDTO';
const isExec = (s: unknown): s is GarminExecutableStep =>
    (s as { type?: string }).type === 'ExecutableStepDTO';

describe('translateWorkout — basics', () => {
    it('maps sport type from the training type', () => {
        expect(translateWorkout({ name: 'W', type: TrainingType.RUNNING, blocks: [] }).sportType.sportTypeKey).toBe('running');
        expect(translateWorkout({ name: 'W', type: TrainingType.CYCLING, blocks: [] }).sportType.sportTypeKey).toBe('cycling');
        expect(translateWorkout({ name: 'W', type: TrainingType.STRENGTH, blocks: [] }).sportType.sportTypeKey).toBe('strength_training');
        expect(translateWorkout({ name: 'W', type: TrainingType.OTHER, blocks: [] }).sportType.sportTypeKey).toBe('other');
    });

    it('wraps steps in a single segment with sequential stepOrder', () => {
        const workout = translateWorkout({
            name: 'Easy run',
            type: TrainingType.RUNNING,
            blocks: [
                block({ type: 'warmup', duration: { type: 'distance', value: 1500 } }),
                block({ type: 'interval', duration: { type: 'time', value: 600 } }),
                block({ type: 'cooldown', duration: { type: 'distance', value: 1000 } }),
            ],
            profile,
        });

        expect(workout.workoutSegments).toHaveLength(1);
        const steps = workout.workoutSegments[0].workoutSteps;
        expect(steps.map((s) => s.stepOrder)).toEqual([1, 2, 3]);
        expect((steps[0] as GarminExecutableStep).stepType.stepTypeKey).toBe('warmup');
        expect((steps[2] as GarminExecutableStep).stepType.stepTypeKey).toBe('cooldown');
    });

    it('sets distance end condition in metres and time in seconds', () => {
        const steps = translateWorkout({
            name: 'W',
            type: TrainingType.RUNNING,
            blocks: [
                block({ duration: { type: 'distance', value: 2000 } }),
                block({ duration: { type: 'time', value: 450 } }),
            ],
            profile,
        }).workoutSegments[0].workoutSteps as GarminExecutableStep[];

        expect(steps[0].endCondition.conditionTypeKey).toBe('distance');
        expect(steps[0].endConditionValue).toBe(2000);
        expect(steps[1].endCondition.conditionTypeKey).toBe('time');
        expect(steps[1].endConditionValue).toBe(450);
    });

    it('uses lap.button end condition with a null value', () => {
        const step = translateWorkout({
            name: 'W',
            type: TrainingType.RUNNING,
            blocks: [block({ endOnLapButton: true })],
            profile,
        }).workoutSegments[0].workoutSteps[0] as GarminExecutableStep;

        expect(step.endCondition.conditionTypeKey).toBe('lap.button');
        expect(step.endConditionValue).toBeNull();
    });
});

describe('translateWorkout — target resolution', () => {
    const targetKey = (b: Partial<WorkoutBlock>) =>
        (translateWorkout({ name: 'W', type: TrainingType.RUNNING, blocks: [block(b)], profile })
            .workoutSegments[0].workoutSteps[0] as GarminExecutableStep);

    it('lthr → heart.rate.zone in bpm', () => {
        const s = targetKey({ target: { type: 'lthr', min: 85, max: 95 } });
        expect(s.targetType.workoutTargetTypeKey).toBe('heart.rate.zone');
        expect(s.targetValueOne).toBe(Math.round(170 * 0.85));
        expect(s.targetValueTwo).toBe(Math.round(170 * 0.95));
    });

    it('hr_reserve → heart.rate.zone via Karvonen', () => {
        const s = targetKey({ target: { type: 'hr_reserve', min: 70, max: 80 } });
        const reserve = 190 - 50;
        expect(s.targetType.workoutTargetTypeKey).toBe('heart.rate.zone');
        expect(s.targetValueOne).toBe(Math.round(50 + 0.7 * reserve));
        expect(s.targetValueTwo).toBe(Math.round(50 + 0.8 * reserve));
    });

    it('vam_zone → pace.zone with low speed < high speed in m/s', () => {
        const s = targetKey({ target: { type: 'vam_zone', min: 2, max: 2 } });
        expect(s.targetType.workoutTargetTypeKey).toBe('pace.zone');
        expect(s.targetValueOne).toBeGreaterThan(0);
        expect(s.targetValueTwo).toBeGreaterThan(s.targetValueOne!);
    });

    it('power_zone → power.zone in watts', () => {
        const s = targetKey({ target: { type: 'power_zone', min: 4, max: 4 } });
        expect(s.targetType.workoutTargetTypeKey).toBe('power.zone');
        // zone 4 = 91-105% FTP(250) => 228-263W
        expect(s.targetValueOne).toBe(Math.round(250 * 0.91));
        expect(s.targetValueTwo).toBe(Math.round(250 * 1.05));
    });

    it('ftp_percent → power.zone in watts', () => {
        const s = targetKey({ target: { type: 'ftp_percent', min: 90, max: 100 } });
        expect(s.targetType.workoutTargetTypeKey).toBe('power.zone');
        expect(s.targetValueOne).toBe(225);
        expect(s.targetValueTwo).toBe(250);
    });

    it('rpe_target → no.target with an RPE note in the description', () => {
        const s = targetKey({ target: { type: 'rpe_target', min: 6, max: 8 }, notes: 'stay smooth' });
        expect(s.targetType.workoutTargetTypeKey).toBe('no.target');
        expect(s.targetValueOne).toBeNull();
        expect(s.description).toContain('RPE 6-8');
        expect(s.description).toContain('stay smooth');
    });

    it('degrades to no.target when the athlete profile lacks the needed data', () => {
        const s = translateWorkout({
            name: 'W',
            type: TrainingType.RUNNING,
            blocks: [block({ target: { type: 'lthr', min: 85, max: 95 } })],
            profile: null,
        }).workoutSegments[0].workoutSteps[0] as GarminExecutableStep;
        expect(s.targetType.workoutTargetTypeKey).toBe('no.target');
    });
});

describe('translateWorkout — repeats', () => {
    it('emits a RepeatGroupDTO for a grouped block set', () => {
        const steps = translateWorkout({
            name: 'Intervals',
            type: TrainingType.RUNNING,
            blocks: [
                block({ type: 'warmup', duration: { type: 'distance', value: 1000 } }),
                block({ type: 'interval', duration: { type: 'time', value: 180 }, group: { id: 'g1', reps: 4 } }),
                block({ type: 'recovery', duration: { type: 'time', value: 90 }, group: { id: 'g1', reps: 4 } }),
                block({ type: 'cooldown', duration: { type: 'distance', value: 1000 } }),
            ],
            profile,
        }).workoutSegments[0].workoutSteps;

        const repeat = steps.find(isRepeat);
        expect(repeat).toBeDefined();
        expect(repeat!.numberOfIterations).toBe(4);
        expect(repeat!.endCondition.conditionTypeKey).toBe('iterations');
        expect(repeat!.workoutSteps).toHaveLength(2);
        // Surrounding warmup/cooldown remain as executable steps.
        expect(steps.filter(isExec)).toHaveLength(2);
    });

    it('honours skipLastRest by emitting reps-1 iterations plus a trailing pass without the rest', () => {
        const steps = translateWorkout({
            name: 'Intervals',
            type: TrainingType.RUNNING,
            blocks: [
                block({ type: 'interval', duration: { type: 'time', value: 180 }, group: { id: 'g1', reps: 4, skipLastRest: true } }),
                block({ type: 'recovery', duration: { type: 'time', value: 90 }, group: { id: 'g1', reps: 4, skipLastRest: true } }),
            ],
            profile,
        }).workoutSegments[0].workoutSteps;

        const repeat = steps.find(isRepeat);
        expect(repeat!.numberOfIterations).toBe(3);
        expect(repeat!.workoutSteps).toHaveLength(2);

        // One trailing interval (the final rep without its recovery).
        const trailing = steps.filter(isExec);
        expect(trailing).toHaveLength(1);
        expect(trailing[0].stepType.stepTypeKey).toBe('interval');
    });

    it('skipLastRest with a single rep drops the trailing rest and emits no repeat', () => {
        const steps = translateWorkout({
            name: 'W',
            type: TrainingType.RUNNING,
            blocks: [
                block({ type: 'interval', duration: { type: 'time', value: 180 }, group: { id: 'g1', reps: 1, skipLastRest: true } }),
                block({ type: 'recovery', duration: { type: 'time', value: 90 }, group: { id: 'g1', reps: 1, skipLastRest: true } }),
            ],
            profile,
        }).workoutSegments[0].workoutSteps;

        expect(steps.find(isRepeat)).toBeUndefined();
        expect(steps.filter(isExec)).toHaveLength(1);
        expect((steps[0] as GarminExecutableStep).stepType.stepTypeKey).toBe('interval');
    });
});
