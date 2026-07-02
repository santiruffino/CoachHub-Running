/**
 * Garmin Connect workout DTO types.
 *
 * These mirror the JSON shape accepted by Garmin Connect's internal
 * `/workout-service/workout` endpoint (the same payload the `garmin-connect`
 * npm client sends). Garmin has no public schema; the IDs below are the
 * well-known values used by the web client. They are centralised here so a
 * single place needs updating if Garmin changes them.
 *
 * NOTE: this is an UNOFFICIAL integration — see src/lib/garmin/README or the
 * project plan for the ToS/risk context.
 */

export interface GarminKeyedType {
    // Garmin sends both an id and a stable string key; the client tolerates
    // either but we always populate both to match the web payload exactly.
    [k: string]: number | string;
}

export type GarminSportKey =
    | 'running'
    | 'cycling'
    | 'swimming'
    | 'strength_training'
    | 'other';

export interface GarminSportType {
    sportTypeId: number;
    sportTypeKey: GarminSportKey;
}

export interface GarminStepType {
    stepTypeId: number;
    stepTypeKey: 'warmup' | 'cooldown' | 'interval' | 'recovery' | 'rest' | 'repeat' | 'other';
}

export interface GarminEndCondition {
    conditionTypeId: number;
    conditionTypeKey: 'lap.button' | 'time' | 'distance' | 'iterations';
}

export interface GarminTargetType {
    workoutTargetTypeId: number;
    workoutTargetTypeKey:
        | 'no.target'
        | 'power.zone'
        | 'cadence.zone'
        | 'heart.rate.zone'
        | 'speed.zone'
        | 'pace.zone';
}

export interface GarminExecutableStep {
    type: 'ExecutableStepDTO';
    stepOrder: number;
    stepType: GarminStepType;
    endCondition: GarminEndCondition;
    /** meters for distance, seconds for time, null for lap.button */
    endConditionValue: number | null;
    targetType: GarminTargetType;
    /** low bound (bpm / m·s⁻¹ / watts) or null when no.target */
    targetValueOne: number | null;
    /** high bound (bpm / m·s⁻¹ / watts) or null when no.target */
    targetValueTwo: number | null;
    description?: string | null;
    stepName?: string | null;
}

export interface GarminRepeatGroup {
    type: 'RepeatGroupDTO';
    stepOrder: number;
    stepType: GarminStepType; // repeat
    numberOfIterations: number;
    smartRepeat: false;
    endCondition: GarminEndCondition; // iterations
    endConditionValue: number; // iteration count
    workoutSteps: GarminExecutableStep[];
}

export type GarminWorkoutStep = GarminExecutableStep | GarminRepeatGroup;

export interface GarminWorkoutSegment {
    segmentOrder: number;
    sportType: GarminSportType;
    workoutSteps: GarminWorkoutStep[];
}

export interface GarminWorkout {
    workoutName: string;
    description?: string | null;
    sportType: GarminSportType;
    workoutSegments: GarminWorkoutSegment[];
}

/* ------------------------------------------------------------------ *
 * Well-known Garmin enum values
 * ------------------------------------------------------------------ */

export const GARMIN_SPORT_TYPES: Record<GarminSportKey, GarminSportType> = {
    running: { sportTypeId: 1, sportTypeKey: 'running' },
    cycling: { sportTypeId: 2, sportTypeKey: 'cycling' },
    other: { sportTypeId: 3, sportTypeKey: 'other' },
    swimming: { sportTypeId: 4, sportTypeKey: 'swimming' },
    strength_training: { sportTypeId: 5, sportTypeKey: 'strength_training' },
};

export const GARMIN_STEP_TYPES: Record<GarminStepType['stepTypeKey'], GarminStepType> = {
    warmup: { stepTypeId: 1, stepTypeKey: 'warmup' },
    cooldown: { stepTypeId: 2, stepTypeKey: 'cooldown' },
    interval: { stepTypeId: 3, stepTypeKey: 'interval' },
    recovery: { stepTypeId: 4, stepTypeKey: 'recovery' },
    rest: { stepTypeId: 5, stepTypeKey: 'rest' },
    repeat: { stepTypeId: 6, stepTypeKey: 'repeat' },
    other: { stepTypeId: 7, stepTypeKey: 'other' },
};

export const GARMIN_END_CONDITIONS: Record<GarminEndCondition['conditionTypeKey'], GarminEndCondition> = {
    'lap.button': { conditionTypeId: 1, conditionTypeKey: 'lap.button' },
    time: { conditionTypeId: 2, conditionTypeKey: 'time' },
    distance: { conditionTypeId: 3, conditionTypeKey: 'distance' },
    iterations: { conditionTypeId: 7, conditionTypeKey: 'iterations' },
};

export const GARMIN_TARGET_TYPES: Record<GarminTargetType['workoutTargetTypeKey'], GarminTargetType> = {
    'no.target': { workoutTargetTypeId: 1, workoutTargetTypeKey: 'no.target' },
    'power.zone': { workoutTargetTypeId: 2, workoutTargetTypeKey: 'power.zone' },
    'cadence.zone': { workoutTargetTypeId: 3, workoutTargetTypeKey: 'cadence.zone' },
    'heart.rate.zone': { workoutTargetTypeId: 4, workoutTargetTypeKey: 'heart.rate.zone' },
    'speed.zone': { workoutTargetTypeId: 5, workoutTargetTypeKey: 'speed.zone' },
    'pace.zone': { workoutTargetTypeId: 6, workoutTargetTypeKey: 'pace.zone' },
};
