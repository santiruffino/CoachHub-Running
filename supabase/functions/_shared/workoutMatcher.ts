/**
 * Workout-to-Activity Lap Matching Utility (Shared Backend Version)
 * Ported from frontend/src/features/trainings/utils/workoutMatcher.ts
 */

export interface FlatStep {
    stepIndex: number;
    name: string;
    target_type: 'distance' | 'duration' | 'reps';
    target_value: number; // meters for distance, seconds for duration
    intensity?: number; // RPE or HR zone
    stepType: 'warmup' | 'active' | 'recovery' | 'cooldown' | 'other';
    repeatIndex?: number;
    totalRepeats?: number;
}

export function calculateWorkoutTotals(flatSteps: FlatStep[]): { distance: number; duration: number } {
    let totalDistance = 0;
    let totalDuration = 0;

    for (const step of flatSteps) {
        if (step.target_type === 'distance') {
            totalDistance += step.target_value;
        } else if (step.target_type === 'duration') {
            totalDuration += step.target_value;
        }
    }

    return { distance: totalDistance, duration: totalDuration };
}

export interface MatchedLap {
    lapIndex: number;
    stepIndex: number | null;
    stepLabel: string;
    stepType: string;
    confidence: number; // 0-100
    variance: number; // percentage difference
    matched: boolean;
}

interface RawBlock {
    type: string;
    stepName?: string;
    duration: {
        type: 'distance' | 'time';
        value: number;
    };
    rpe?: number;
    intensity?: number;
    group?: {
        id: string;
        reps: number;
    };
}

interface RawLap {
    distance?: number;
    elapsed_time?: number;
    moving_time?: number;
}

/**
 * Flatten a workout structure into a sequential list of steps
 */
export function flattenWorkout(blocks: RawBlock[]): FlatStep[] {
    const flatSteps: FlatStep[] = [];
    let stepIndex = 0;

    let i = 0;
    while (i < blocks.length) {
        const block = blocks[i];

        if (block.group?.id) {
            const groupId = block.group.id;
            const reps = block.group.reps;

            const groupBlocks: RawBlock[] = [];
            let j = i;
            while (j < blocks.length && blocks[j].group?.id === groupId) {
                groupBlocks.push(blocks[j]);
                j++;
            }

            for (let r = 0; r < reps; r++) {
                groupBlocks.forEach(groupBlock => {
                    const stepName = groupBlock.stepName || groupBlock.type;
                    const stepType = groupBlock.type;

                    let flatStepType: FlatStep['stepType'] = 'other';
                    if (stepType === 'warmup') flatStepType = 'warmup';
                    else if (stepType === 'cooldown') flatStepType = 'cooldown';
                    else if (stepType === 'recovery') flatStepType = 'recovery';
                    else if (stepType === 'interval') flatStepType = 'active';

                    flatSteps.push({
                        stepIndex: stepIndex++,
                        name: stepName,
                        target_type: groupBlock.duration.type === 'distance' ? 'distance' : 'duration',
                        target_value: groupBlock.duration.value,
                        intensity: groupBlock.rpe || groupBlock.intensity,
                        stepType: flatStepType,
                        repeatIndex: r + 1,
                        totalRepeats: reps,
                    });
                });
            }
            i = j;
        } else {
            const stepName = block.stepName || block.type;
            const stepType = block.type;

            let flatStepType: FlatStep['stepType'] = 'other';
            if (stepType === 'warmup') flatStepType = 'warmup';
            else if (stepType === 'cooldown') flatStepType = 'cooldown';
            else if (stepType === 'recovery') flatStepType = 'recovery';
            else if (stepType === 'interval') flatStepType = 'active';

            flatSteps.push({
                stepIndex: stepIndex++,
                name: stepName,
                target_type: block.duration.type === 'distance' ? 'distance' : 'duration',
                target_value: block.duration.value,
                intensity: block.rpe || block.intensity,
                stepType: flatStepType,
            });
            i++;
        }
    }
    return flatSteps;
}

function calculateVariance(actual: number, planned: number): number {
    if (planned === 0) return 0;
    return ((actual - planned) / planned) * 100;
}

function isMatch(
    lapValue: number,
    stepValue: number,
    targetType: 'distance' | 'duration',
    stepType: FlatStep['stepType'],
    thresholdPercentage?: number
): { matches: boolean; variance: number; confidence: number } {
    // Default threshold from env or 10% for active, 20% for warmup/cooldown
    const baseThreshold = thresholdPercentage ? thresholdPercentage / 100 : 0.1;
    const tolerance = stepType === 'warmup' || stepType === 'cooldown' ? baseThreshold * 2 : baseThreshold;

    const variance = calculateVariance(lapValue, stepValue);
    const absVariance = Math.abs(variance);
    const matches = absVariance <= tolerance * 100;

    const confidence = matches ? Math.max(0, 100 - (absVariance / (tolerance * 100) * 100)) : 0;

    return { matches, variance, confidence };
}

function generateStepLabel(step: FlatStep): string {
    const { name, stepType, repeatIndex, totalRepeats, intensity } = step;
    let label = name;
    if (repeatIndex && totalRepeats) {
        if (stepType === 'active') label = `Interval ${repeatIndex}/${totalRepeats}`;
        else if (stepType === 'recovery') label = `Recovery ${repeatIndex}/${totalRepeats}`;
    } else if (name.toLowerCase().startsWith('step')) {
        label = stepType.charAt(0).toUpperCase() + stepType.slice(1);
    }
    if (intensity) label += ` @ RPE ${intensity}`;
    return label;
}

export function matchLapsToWorkout(
    laps: RawLap[],
    flatSteps: FlatStep[],
    thresholdPercentage?: number
): MatchedLap[] {
    const matchedLaps: MatchedLap[] = [];
    let currentStepIndex = 0;

    for (let i = 0; i < laps.length; i++) {
        const lap = laps[i];

        if (currentStepIndex >= flatSteps.length) {
            matchedLaps.push({
                lapIndex: i,
                stepIndex: null,
                stepLabel: 'Extra',
                stepType: 'other',
                confidence: 0,
                variance: 0,
                matched: false,
            });
            continue;
        }

        const step = flatSteps[currentStepIndex];
        let lapValue: number;
        let stepValue: number;
        let targetType: 'distance' | 'duration';

        if (step.target_type === 'distance') {
            lapValue = lap.distance || 0;
            stepValue = step.target_value;
            targetType = 'distance';
        } else if (step.target_type === 'duration') {
            lapValue = lap.elapsed_time || lap.moving_time || 0;
            stepValue = step.target_value;
            targetType = 'duration';
        } else {
            matchedLaps.push({
                lapIndex: i,
                stepIndex: null,
                stepLabel: 'Unmatched',
                stepType: 'other',
                confidence: 0,
                variance: 0,
                matched: false,
            });
            continue;
        }

        const { matches, variance, confidence } = isMatch(lapValue, stepValue, targetType, step.stepType, thresholdPercentage);

        if (matches) {
            matchedLaps.push({
                lapIndex: i,
                stepIndex: currentStepIndex,
                stepLabel: generateStepLabel(step),
                stepType: step.stepType,
                confidence: Math.round(confidence),
                variance: Math.round(variance * 10) / 10,
                matched: true,
            });
            currentStepIndex++;
        } else {
            let foundMatch = false;
            const maxLookAhead = 3;

            for (let lookAhead = 1; lookAhead <= maxLookAhead && currentStepIndex + lookAhead < flatSteps.length; lookAhead++) {
                const nextStep = flatSteps[currentStepIndex + lookAhead];
                let nextLapValue: number;
                let nextStepValue: number;
                let nextTargetType: 'distance' | 'duration';

                if (nextStep.target_type === 'distance') {
                    nextLapValue = lap.distance || 0;
                    nextStepValue = nextStep.target_value;
                    nextTargetType = 'distance';
                } else if (nextStep.target_type === 'duration') {
                    nextLapValue = lap.elapsed_time || lap.moving_time || 0;
                    nextStepValue = nextStep.target_value;
                    nextTargetType = 'duration';
                } else continue;

                const lookAheadResult = isMatch(nextLapValue, nextStepValue, nextTargetType, nextStep.stepType, thresholdPercentage);

                if (lookAheadResult.matches) {
                    matchedLaps.push({
                        lapIndex: i,
                        stepIndex: currentStepIndex + lookAhead,
                        stepLabel: generateStepLabel(nextStep),
                        stepType: nextStep.stepType,
                        confidence: Math.round(lookAheadResult.confidence),
                        variance: Math.round(lookAheadResult.variance * 10) / 10,
                        matched: true,
                    });
                    currentStepIndex += lookAhead + 1;
                    foundMatch = true;
                    break;
                }
            }

            if (!foundMatch) {
                matchedLaps.push({
                    lapIndex: i,
                    stepIndex: null,
                    stepLabel: 'Unmatched',
                    stepType: 'other',
                    confidence: 0,
                    variance: Math.round(variance * 10) / 10,
                    matched: false,
                });
            }
        }
    }
    return matchedLaps;
}
