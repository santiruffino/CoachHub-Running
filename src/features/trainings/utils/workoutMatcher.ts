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

    function processBlock(block: any, repeatContext?: { current: number; total: number }) {
        if (!block) return;

        // Handle repeat block
        if (block.type === 'repeat' && block.repetitions) {
            const repetitions = block.repetitions;
            for (let i = 0; i < repetitions; i++) {
                block.steps?.forEach((step: any) => {
                    processStep(step, { current: i + 1, total: repetitions });
                });
            }
        } else if (block.steps) {
            // Regular block with steps
            block.steps.forEach((step: any) => {
                processStep(step, repeatContext);
            });
        }
    }

    function processStep(step: any, repeatContext?: { current: number; total: number }) {
        if (!step) return;

        // Determine step type
        let stepType: FlatStep['stepType'] = 'other';
        if (step.name?.toLowerCase().includes('warmup') || step.name?.toLowerCase().includes('warm up')) {
            stepType = 'warmup';
        } else if (step.name?.toLowerCase().includes('cooldown') || step.name?.toLowerCase().includes('cool down')) {
            stepType = 'cooldown';
        } else if (step.name?.toLowerCase().includes('recovery') || step.name?.toLowerCase().includes('rest')) {
            stepType = 'recovery';
        } else if (step.target_type === 'duration' || step.target_type === 'distance') {
            stepType = 'active';
        }

        // Convert target value to standard units
        let targetValue = step.target_value || 0;
        if (step.target_type === 'distance') {
            // Assume target_value is in meters
            targetValue = step.target_value;
        } else if (step.target_type === 'duration') {
            // Assume target_value is in seconds
            targetValue = step.target_value;
        }

        flatSteps.push({
            stepIndex: stepIndex++,
            name: step.name || `Step ${stepIndex}`,
            target_type: step.target_type,
            target_value: targetValue,
            intensity: step.target_rpe || step.target_hr_zone,
            stepType,
            repeatIndex: repeatContext?.current,
            totalRepeats: repeatContext?.total,
        });
    }

    // Process all blocks
    blocks.forEach(block => processBlock(block));

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
