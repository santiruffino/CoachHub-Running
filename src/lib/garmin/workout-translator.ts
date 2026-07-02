/**
 * Translates an Endurix structured workout (`WorkoutBlock[]`, as stored in
 * `trainings.blocks` / `training_assignments.workout_snapshot.blocks`) into the
 * Garmin Connect workout DTO accepted by `/workout-service/workout`.
 *
 * Pure and side-effect free so it is fully unit-testable without any network or
 * Garmin session. Intensity targets are resolved against the athlete's profile
 * via zone-resolver.ts.
 */

import { TrainingType } from '@/interfaces/training';
import type { BlockType, WorkoutBlock } from '@/features/trainings/components/builder/types';
import {
    GARMIN_END_CONDITIONS,
    GARMIN_SPORT_TYPES,
    GARMIN_STEP_TYPES,
    GARMIN_TARGET_TYPES,
    type GarminExecutableStep,
    type GarminSportType,
    type GarminWorkout,
    type GarminWorkoutStep,
} from './types';
import { resolveTarget, type GarminAthleteProfile } from './zone-resolver';

export interface TranslateWorkoutInput {
    name: string;
    description?: string | null;
    type: TrainingType | string;
    blocks: WorkoutBlock[];
    profile?: GarminAthleteProfile | null;
}

function sportTypeFor(type: TranslateWorkoutInput['type']): GarminSportType {
    switch (type) {
        case TrainingType.RUNNING:
            return GARMIN_SPORT_TYPES.running;
        case TrainingType.CYCLING:
            return GARMIN_SPORT_TYPES.cycling;
        case TrainingType.SWIMMING:
            return GARMIN_SPORT_TYPES.swimming;
        case TrainingType.STRENGTH:
            return GARMIN_SPORT_TYPES.strength_training;
        default:
            return GARMIN_SPORT_TYPES.other;
    }
}

function stepTypeFor(type: BlockType) {
    return GARMIN_STEP_TYPES[type] ?? GARMIN_STEP_TYPES.interval;
}

function isRestLike(block: WorkoutBlock): boolean {
    return block.type === 'rest' || block.type === 'recovery';
}

/** Build a single executable step from a block (stepOrder assigned by caller). */
function buildExecutableStep(block: WorkoutBlock, profile: GarminAthleteProfile | null | undefined, stepOrder: number): GarminExecutableStep {
    // End condition: lap button, distance (m) or time (s).
    let endCondition = GARMIN_END_CONDITIONS.time;
    let endConditionValue: number | null = block.duration?.value ?? null;

    if (block.endOnLapButton) {
        endCondition = GARMIN_END_CONDITIONS['lap.button'];
        endConditionValue = null;
    } else if (block.duration?.type === 'distance') {
        endCondition = GARMIN_END_CONDITIONS.distance; // value is metres
    } else {
        endCondition = GARMIN_END_CONDITIONS.time; // value is seconds
    }

    const resolved = resolveTarget(block.target, profile, block.rpe);

    let targetType = GARMIN_TARGET_TYPES['no.target'];
    let targetValueOne: number | null = null;
    let targetValueTwo: number | null = null;
    let targetNote: string | undefined;

    switch (resolved.kind) {
        case 'heart_rate':
            targetType = GARMIN_TARGET_TYPES['heart.rate.zone'];
            targetValueOne = resolved.lowBpm;
            targetValueTwo = resolved.highBpm;
            break;
        case 'pace':
            targetType = GARMIN_TARGET_TYPES['pace.zone'];
            targetValueOne = resolved.lowSpeedMs;
            targetValueTwo = resolved.highSpeedMs;
            break;
        case 'power':
            targetType = GARMIN_TARGET_TYPES['power.zone'];
            targetValueOne = resolved.lowWatts;
            targetValueTwo = resolved.highWatts;
            break;
        case 'none':
            targetNote = resolved.note;
            break;
    }

    const description = [block.notes, targetNote].filter(Boolean).join(' — ') || null;

    return {
        type: 'ExecutableStepDTO',
        stepOrder,
        stepType: stepTypeFor(block.type),
        endCondition,
        endConditionValue,
        targetType,
        targetValueOne,
        targetValueTwo,
        description,
        stepName: block.stepName ?? null,
    };
}

/**
 * Convert an Endurix workout into a Garmin workout DTO.
 *
 * Repeat groups (`block.group`) are emitted as Garmin RepeatGroupDTOs. When
 * `skipLastRest` is set and the group ends on a rest/recovery step, the final
 * repetition's trailing rest is dropped by emitting `reps - 1` iterations plus
 * one trailing pass without the rest — the faithful expansion Garmin can't
 * express natively.
 */
export function translateWorkout(input: TranslateWorkoutInput): GarminWorkout {
    const { blocks, profile } = input;
    const sportType = sportTypeFor(input.type);
    const steps: GarminWorkoutStep[] = [];

    let order = 0;
    const nextOrder = () => (order += 1);
    const processedGroups = new Set<string>();

    const pushExecutable = (block: WorkoutBlock) => {
        steps.push(buildExecutableStep(block, profile, nextOrder()));
    };

    for (const block of blocks) {
        const groupId = block.group?.id;

        if (groupId) {
            if (processedGroups.has(groupId)) continue;
            processedGroups.add(groupId);

            const groupBlocks = blocks.filter((b) => b.group?.id === groupId);
            const reps = Math.max(1, block.group?.reps ?? 1);
            const skipLastRest = Boolean(block.group?.skipLastRest);
            const lastIsRest = groupBlocks.length > 0 && isRestLike(groupBlocks[groupBlocks.length - 1]);

            if (skipLastRest && lastIsRest) {
                const withoutTrailingRest = groupBlocks.slice(0, -1);
                if (reps <= 1) {
                    // Single pass, no trailing rest.
                    withoutTrailingRest.forEach(pushExecutable);
                } else {
                    // reps-1 full iterations, then a final pass without the rest.
                    const repeatOrder = nextOrder();
                    const childSteps = groupBlocks.map((b) => buildExecutableStep(b, profile, nextOrder()));
                    steps.push({
                        type: 'RepeatGroupDTO',
                        stepOrder: repeatOrder,
                        stepType: GARMIN_STEP_TYPES.repeat,
                        numberOfIterations: reps - 1,
                        smartRepeat: false,
                        endCondition: GARMIN_END_CONDITIONS.iterations,
                        endConditionValue: reps - 1,
                        workoutSteps: childSteps,
                    });
                    withoutTrailingRest.forEach(pushExecutable);
                }
            } else if (reps <= 1) {
                groupBlocks.forEach(pushExecutable);
            } else {
                const repeatOrder = nextOrder();
                const childSteps = groupBlocks.map((b) => buildExecutableStep(b, profile, nextOrder()));
                steps.push({
                    type: 'RepeatGroupDTO',
                    stepOrder: repeatOrder,
                    stepType: GARMIN_STEP_TYPES.repeat,
                    numberOfIterations: reps,
                    smartRepeat: false,
                    endCondition: GARMIN_END_CONDITIONS.iterations,
                    endConditionValue: reps,
                    workoutSteps: childSteps,
                });
            }
        } else {
            pushExecutable(block);
        }
    }

    return {
        workoutName: input.name,
        description: input.description ?? null,
        sportType,
        workoutSegments: [
            {
                segmentOrder: 1,
                sportType,
                workoutSteps: steps,
            },
        ],
    };
}
