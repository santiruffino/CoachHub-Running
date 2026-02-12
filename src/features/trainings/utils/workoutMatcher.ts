/**
 * Workout-to-Activity Lap Matching Utility
 * Automatically matches recorded activity laps to planned workout steps
 */

export interface FlatStep {
    stepIndex: number;
    name: string;
    target_type: 'distance' | 'duration' | 'reps';
    target_value: number; // meters for distance, seconds for duration
    intensity?: number; // RPE or HR zone
    stepType: 'warmup' | 'active' | 'recovery' | 'cooldown' | 'other';
    repeatIndex?: number; // e.g., 3 (for "3/6")
    totalRepeats?: number; // e.g., 6
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

/**
 * Flatten a workout structure into a sequential list of steps
 */
export function flattenWorkout(blocks: any[]): FlatStep[] {
    const flatSteps: FlatStep[] = [];
    let stepIndex = 0;
    // Process all blocks
    console.log('flattenWorkout input blocks:', JSON.stringify(blocks, null, 2));

    // Group blocks by group.id to handle repeats
    // Iterating linearly. If we encounter a block with a group.id, we need to check if we've already processed this group?
    // Actually, the blocks are stored flat in sequence.
    // If we see a block with a group ID:
    // 1. Identify all consecutive blocks with the same group ID.
    // 2. These form a "repeat block".
    // 3. Process this sequence of blocks N times (where N = group.reps).
    // 4. Skip the original blocks in the main loop to avoid double counting.

    let i = 0;
    while (i < blocks.length) {
        const block = blocks[i];

        if (block.group?.id) {
            // Start of a repeat group
            const groupId = block.group.id;
            const reps = block.group.reps;

            // Find all blocks in this group
            // Assuming they are contiguous in the array
            const groupBlocks = [];
            let j = i;
            while (j < blocks.length && blocks[j].group?.id === groupId) {
                groupBlocks.push(blocks[j]);
                j++;
            }

            // Process the group N times
            for (let r = 0; r < reps; r++) {
                groupBlocks.forEach(groupBlock => {
                    // Create a pseudo-step object that matches what processStep expects
                    // Or call a adapted version of processStep
                    // Since the flat block structure IS the step structure, we can map it directly.

                    const stepName = groupBlock.stepName || groupBlock.type;
                    const stepType = groupBlock.type; // 'interval' | 'recovery' | 'warmup' | 'cooldown'

                    // Determine flat step type
                    let flatStepType: FlatStep['stepType'] = 'other';
                    if (stepType === 'warmup') flatStepType = 'warmup';
                    else if (stepType === 'cooldown') flatStepType = 'cooldown';
                    else if (stepType === 'recovery') flatStepType = 'recovery';
                    else if (stepType === 'interval') flatStepType = 'active';

                    flatSteps.push({
                        stepIndex: stepIndex++,
                        name: stepName,
                        target_type: groupBlock.duration.type === 'distance' ? 'distance' : 'duration', // 'distance' | 'time' -> 'distance' | 'duration'
                        target_value: groupBlock.duration.value,
                        intensity: groupBlock.rpe || groupBlock.intensity,
                        stepType: flatStepType,
                        repeatIndex: r + 1,
                        totalRepeats: reps,
                    });
                });
            }

            // Advance outer loop past the group
            i = j;
        } else {
            // Regular single block
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
                // No repeat context
            });

            i++;
        }
    }

    console.log('flattenWorkout output steps:', flatSteps.length);

    return flatSteps;
}

/**
 * Calculate variance between actual and planned values
 */
function calculateVariance(actual: number, planned: number): number {
    if (planned === 0) return 0;
    return ((actual - planned) / planned) * 100;
}

/**
 * Check if a lap matches a step within tolerance
 */
function isMatch(
    lapValue: number,
    stepValue: number,
    targetType: 'distance' | 'duration',
    stepType: FlatStep['stepType']
): { matches: boolean; variance: number; confidence: number } {
    // Tolerance based on step type
    const tolerance = stepType === 'warmup' || stepType === 'cooldown' ? 0.2 : 0.1; // 20% or 10%

    const variance = calculateVariance(lapValue, stepValue);
    const absVariance = Math.abs(variance);
    const matches = absVariance <= tolerance * 100;

    // Calculate confidence (100% at 0% variance, decreases linearly to 0% at tolerance)
    const confidence = matches ? Math.max(0, 100 - (absVariance / tolerance)) : 0;

    return { matches, variance, confidence };
}

/**
 * Generate a human-readable label for a step
 */
function generateStepLabel(step: FlatStep): string {
    const { name, stepType, repeatIndex, totalRepeats, intensity } = step;

    let label = name;

    // Add repeat context
    if (repeatIndex && totalRepeats) {
        if (stepType === 'active') {
            label = `Interval ${repeatIndex}/${totalRepeats}`;
        } else if (stepType === 'recovery') {
            label = `Recovery ${repeatIndex}/${totalRepeats}`;
        }
    } else {
        // Use step type as label if name is generic
        if (name.toLowerCase().startsWith('step')) {
            label = stepType.charAt(0).toUpperCase() + stepType.slice(1);
        }
    }

    // Add intensity
    if (intensity) {
        label += ` @ RPE ${intensity}`;
    }

    return label;
}

/**
 * Match activity laps to workout steps
 */
export function matchLapsToWorkout(
    laps: any[],
    flatSteps: FlatStep[]
): MatchedLap[] {
    const matchedLaps: MatchedLap[] = [];
    let currentStepIndex = 0;

    for (let i = 0; i < laps.length; i++) {
        const lap = laps[i];

        // If we've matched all steps, mark remaining laps as unmatched
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

        // Determine which metric to compare
        let lapValue: number;
        let stepValue: number;
        let targetType: 'distance' | 'duration';

        if (step.target_type === 'distance') {
            lapValue = lap.distance || 0; // in meters
            stepValue = step.target_value;
            targetType = 'distance';
        } else if (step.target_type === 'duration') {
            lapValue = lap.elapsed_time || lap.moving_time || 0; // in seconds
            stepValue = step.target_value;
            targetType = 'duration';
        } else {
            // Unsupported target type
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

        const { matches, variance, confidence } = isMatch(lapValue, stepValue, targetType, step.stepType);

        if (matches) {
            // Match found
            matchedLaps.push({
                lapIndex: i,
                stepIndex: currentStepIndex,
                stepLabel: generateStepLabel(step),
                stepType: step.stepType,
                confidence: Math.round(confidence),
                variance: Math.round(variance * 10) / 10,
                matched: true,
            });
            currentStepIndex++; // Move to next step
        } else {
            // No match - mark as unmatched but continue
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

    return matchedLaps;
}
