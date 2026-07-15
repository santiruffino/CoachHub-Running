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
    target?: {
        type: string;
        min: number | string;
        max: number | string;
    };
    rpe?: number;
    /** Visual bar height (0-100) for the workout graph. NOT an RPE value. */
    intensity?: number;
    group?: {
        id: string;
        reps: number;
    };
}

/**
 * Derive the RPE (1-10) to display for a step.
 *
 * Precedence: explicit `block.rpe`, then an `rpe_target` objective (stored in
 * target.min/max). We never fall back to `block.intensity` — that's the graph
 * bar height (0-100), not an effort level.
 *
 * Keep in sync with frontend/src/features/trainings/utils/workoutMatcher.ts.
 */
function deriveStepRpe(block: RawBlock): number | undefined {
    if (typeof block.rpe === 'number' && block.rpe > 0) {
        return block.rpe;
    }

    if (block.target?.type === 'rpe_target') {
        const min = typeof block.target.min === 'string' ? parseFloat(block.target.min) : block.target.min;
        const max = typeof block.target.max === 'string' ? parseFloat(block.target.max) : block.target.max;
        const values = [min, max].filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));
        if (values.length > 0) {
            const avg = values.reduce((a, b) => a + b, 0) / values.length;
            return Math.max(1, Math.min(10, Math.round(avg)));
        }
    }

    return undefined;
}

interface RawLap {
    distance?: number;
    elapsed_time?: number;
    moving_time?: number;
}

interface ContinuousEffortSegment {
    startLapIndex: number;
    endLapIndex: number;
    distance: number;
    duration: number;
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
                        intensity: deriveStepRpe(groupBlock),
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
                intensity: deriveStepRpe(block),
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

function getStepTolerance(stepType: FlatStep['stepType'], thresholdPercentage?: number): number {
    const baseThreshold = thresholdPercentage ? thresholdPercentage / 100 : 0.1;
    return stepType === 'warmup' || stepType === 'cooldown' ? baseThreshold * 2 : baseThreshold;
}

function getLapValueByTargetType(lap: RawLap, targetType: 'distance' | 'duration'): number {
    if (targetType === 'distance') {
        return lap.distance || 0;
    }

    return lap.elapsed_time || lap.moving_time || 0;
}

function getContinuousEffortDuration(lap: RawLap): number {
    return lap.moving_time || lap.elapsed_time || 0;
}

function isContinuousEffortBreak(currentLap: RawLap): boolean {
    const currentDistance = currentLap.distance || 0;
    const elapsedTime = currentLap.elapsed_time || 0;
    const movingTime = currentLap.moving_time || 0;
    const currentDuration = movingTime || elapsedTime;
    const stationaryTime = Math.max(0, elapsedTime - movingTime);
    const stationaryRatio = elapsedTime > 0 ? stationaryTime / elapsedTime : 0;

    return (
        currentDistance <= 0 ||
        currentDuration <= 0 ||
        stationaryTime >= 60 ||
        (stationaryTime >= 20 && stationaryRatio >= 0.2)
    );
}

function buildContinuousEffortSegments(laps: RawLap[]): ContinuousEffortSegment[] {
    if (laps.length === 0) return [];

    const segments: ContinuousEffortSegment[] = [];
    let segmentStart = 0;

    for (let i = 1; i < laps.length; i++) {
        if (isContinuousEffortBreak(laps[i])) {
            const segmentLaps = laps.slice(segmentStart, i);
            segments.push({
                startLapIndex: segmentStart,
                endLapIndex: i - 1,
                distance: segmentLaps.reduce((sum, lap) => sum + (lap.distance || 0), 0),
                duration: segmentLaps.reduce((sum, lap) => sum + getContinuousEffortDuration(lap), 0),
            });
            segmentStart = i;
        }
    }

    const finalSegment = laps.slice(segmentStart);
    if (finalSegment.length > 0) {
        segments.push({
            startLapIndex: segmentStart,
            endLapIndex: laps.length - 1,
            distance: finalSegment.reduce((sum, lap) => sum + (lap.distance || 0), 0),
            duration: finalSegment.reduce((sum, lap) => sum + getContinuousEffortDuration(lap), 0),
        });
    }

    return segments;
}

function matchContinuousEffortSegments(segments: ContinuousEffortSegment[], flatSteps: FlatStep[]): MatchedLap[] {
    const matchedLaps: MatchedLap[] = [];
    let currentStepIndex = 0;

    let segmentIndex = 0;
    while (segmentIndex < segments.length) {
        const segment = segments[segmentIndex];

        if (currentStepIndex >= flatSteps.length) {
            for (let lapIndex = segment.startLapIndex; lapIndex <= segment.endLapIndex; lapIndex++) {
                matchedLaps.push({
                    lapIndex,
                    stepIndex: null,
                    stepLabel: 'Extra',
                    stepType: 'other',
                    confidence: 0,
                    variance: 0,
                    matched: false,
                });
            }
            segmentIndex++;
            continue;
        }

        const step = flatSteps[currentStepIndex];
        let segmentValue: number;
        let stepValue: number;
        let targetType: 'distance' | 'duration';

        if (step.target_type === 'distance') {
            segmentValue = segment.distance;
            stepValue = step.target_value;
            targetType = 'distance';
        } else if (step.target_type === 'duration') {
            segmentValue = segment.duration;
            stepValue = step.target_value;
            targetType = 'duration';
        } else {
            for (let lapIndex = segment.startLapIndex; lapIndex <= segment.endLapIndex; lapIndex++) {
                matchedLaps.push({
                    lapIndex,
                    stepIndex: null,
                    stepLabel: 'Unmatched',
                    stepType: 'other',
                    confidence: 0,
                    variance: 0,
                    matched: false,
                });
            }
            segmentIndex++;
            continue;
        }

        const { matches, variance, confidence } = isMatch(segmentValue, stepValue, targetType, step.stepType, thresholdPercentage);

        if (matches) {
            for (let lapIndex = segment.startLapIndex; lapIndex <= segment.endLapIndex; lapIndex++) {
                matchedLaps.push({
                    lapIndex,
                    stepIndex: currentStepIndex,
                    stepLabel: generateStepLabel(step),
                    stepType: step.stepType,
                    confidence: Math.round(confidence),
                    variance: Math.round(variance * 10) / 10,
                    matched: true,
                });
            }
            currentStepIndex++;
            segmentIndex++;
            continue;
        }

        const tolerance = getStepTolerance(step.stepType, thresholdPercentage);
        const maxAllowedValue = stepValue * (1 + tolerance);
        let cumulativeValue = 0;
        let cumulativeEndIndex = -1;
        let cumulativeVariance = 0;
        let cumulativeConfidence = 0;

        for (let j = segmentIndex; j < segments.length; j++) {
            cumulativeValue += targetType === 'distance' ? segments[j].distance : segments[j].duration;

            const cumulativeMatch = isMatch(cumulativeValue, stepValue, targetType, step.stepType, thresholdPercentage);

            if (cumulativeMatch.matches) {
                cumulativeEndIndex = j;
                cumulativeVariance = cumulativeMatch.variance;
                cumulativeConfidence = cumulativeMatch.confidence;
                break;
            }

            if (cumulativeValue > maxAllowedValue) {
                break;
            }
        }

        if (cumulativeEndIndex >= segmentIndex) {
            for (let j = segmentIndex; j <= cumulativeEndIndex; j++) {
                for (let lapIndex = segments[j].startLapIndex; lapIndex <= segments[j].endLapIndex; lapIndex++) {
                    matchedLaps.push({
                        lapIndex,
                        stepIndex: currentStepIndex,
                        stepLabel: generateStepLabel(step),
                        stepType: step.stepType,
                        confidence: Math.round(cumulativeConfidence),
                        variance: Math.round(cumulativeVariance * 10) / 10,
                        matched: true,
                    });
                }
            }

            currentStepIndex++;
            segmentIndex = cumulativeEndIndex + 1;
            continue;
        }

        let foundMatch = false;
        const maxLookAhead = 3;

        for (let lookAhead = 1; lookAhead <= maxLookAhead && currentStepIndex + lookAhead < flatSteps.length; lookAhead++) {
            const nextStep = flatSteps[currentStepIndex + lookAhead];
            const nextSegmentValue = nextStep.target_type === 'distance' ? segment.distance : segment.duration;
            const nextTargetType = nextStep.target_type === 'distance' ? 'distance' : 'duration';
            const lookAheadResult = isMatch(nextSegmentValue, nextStep.target_value, nextTargetType, nextStep.stepType, thresholdPercentage);

            if (lookAheadResult.matches) {
                for (let lapIndex = segment.startLapIndex; lapIndex <= segment.endLapIndex; lapIndex++) {
                    matchedLaps.push({
                        lapIndex,
                        stepIndex: currentStepIndex + lookAhead,
                        stepLabel: generateStepLabel(nextStep),
                        stepType: nextStep.stepType,
                        confidence: Math.round(lookAheadResult.confidence),
                        variance: Math.round(lookAheadResult.variance * 10) / 10,
                        matched: true,
                    });
                }
                currentStepIndex += lookAhead + 1;
                foundMatch = true;
                break;
            }
        }

        if (!foundMatch) {
            for (let lapIndex = segment.startLapIndex; lapIndex <= segment.endLapIndex; lapIndex++) {
                matchedLaps.push({
                    lapIndex,
                    stepIndex: null,
                    stepLabel: 'Unmatched',
                    stepType: 'other',
                    confidence: 0,
                    variance: Math.round(variance * 10) / 10,
                    matched: false,
                });
            }
        }

        segmentIndex++;
    }

    return matchedLaps;
}

function isMatch(
    lapValue: number,
    stepValue: number,
    targetType: 'distance' | 'duration',
    stepType: FlatStep['stepType'],
    thresholdPercentage?: number
): { matches: boolean; variance: number; confidence: number } {
    const tolerance = getStepTolerance(stepType, thresholdPercentage);

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

    let i = 0;
    while (i < laps.length) {
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
            i++;
            continue;
        }

        const step = flatSteps[currentStepIndex];
        let lapValue: number;
        let stepValue: number;
        let targetType: 'distance' | 'duration';

        if (step.target_type === 'distance') {
            lapValue = getLapValueByTargetType(lap, 'distance');
            stepValue = step.target_value;
            targetType = 'distance';
        } else if (step.target_type === 'duration') {
            lapValue = getLapValueByTargetType(lap, 'duration');
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
            i++;
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
            i++;
        } else {
            const tolerance = getStepTolerance(step.stepType, thresholdPercentage);
            const maxAllowedValue = stepValue * (1 + tolerance);
            let cumulativeValue = 0;
            let cumulativeEndIndex = -1;
            let cumulativeVariance = 0;
            let cumulativeConfidence = 0;

            for (let j = i; j < laps.length; j++) {
                cumulativeValue += getLapValueByTargetType(laps[j], targetType);

                const cumulativeMatch = isMatch(cumulativeValue, stepValue, targetType, step.stepType, thresholdPercentage);

                if (cumulativeMatch.matches) {
                    cumulativeEndIndex = j;
                    cumulativeVariance = cumulativeMatch.variance;
                    cumulativeConfidence = cumulativeMatch.confidence;
                    break;
                }

                if (cumulativeValue > maxAllowedValue) {
                    break;
                }
            }

            if (cumulativeEndIndex >= i) {
                for (let lapIndex = i; lapIndex <= cumulativeEndIndex; lapIndex++) {
                    matchedLaps.push({
                        lapIndex,
                        stepIndex: currentStepIndex,
                        stepLabel: generateStepLabel(step),
                        stepType: step.stepType,
                        confidence: Math.round(cumulativeConfidence),
                        variance: Math.round(cumulativeVariance * 10) / 10,
                        matched: true,
                    });
                }

                currentStepIndex++;
                i = cumulativeEndIndex + 1;
                continue;
            }

            let foundMatch = false;
            const maxLookAhead = 3;

            for (let lookAhead = 1; lookAhead <= maxLookAhead && currentStepIndex + lookAhead < flatSteps.length; lookAhead++) {
                const nextStep = flatSteps[currentStepIndex + lookAhead];
                let nextLapValue: number;
                let nextStepValue: number;
                let nextTargetType: 'distance' | 'duration';

                if (nextStep.target_type === 'distance') {
                    nextLapValue = getLapValueByTargetType(lap, 'distance');
                    nextStepValue = nextStep.target_value;
                    nextTargetType = 'distance';
                } else if (nextStep.target_type === 'duration') {
                    nextLapValue = getLapValueByTargetType(lap, 'duration');
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

            i++;
        }
    }
    if (matchedLaps.some(ml => ml.matched) || laps.length === 0 || flatSteps.length === 0) {
        return matchedLaps;
    }

    const segments = buildContinuousEffortSegments(laps);
    if (segments.length === 0 || segments.length === laps.length) {
        return matchedLaps;
    }

    return matchContinuousEffortSegments(segments, flatSteps);
}
