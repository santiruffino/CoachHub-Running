import { WorkoutBlock } from '../components/builder/types';

/**
 * Calculate the estimated duration of a workout in seconds based on its blocks
 * @param blocks - Array of workout blocks
 * @returns Total estimated duration in seconds
 */
export function calculateWorkoutDuration(blocks: WorkoutBlock[]): number {
    if (!blocks || blocks.length === 0) return 0;

    let totalDuration = 0;

    // Group blocks by repeat groups
    const processedGroupIds = new Set<string>();

    blocks.forEach(block => {
        // Skip if this block's group has already been processed
        if (block.group?.id && processedGroupIds.has(block.group.id)) {
            return;
        }

        // If block is part of a repeat group
        if (block.group?.id) {
            processedGroupIds.add(block.group.id);

            // Find all blocks in this group
            const groupBlocks = blocks.filter(b => b.group?.id === block.group?.id);
            const reps = block.group.reps || 1;

            // Calculate single iteration duration
            const iterationDuration = groupBlocks.reduce((sum, b) => sum + getBlockDuration(b), 0);

            // Multiply by repetitions
            totalDuration += iterationDuration * reps;
        } else {
            // Regular block without group
            totalDuration += getBlockDuration(block);
        }
    });

    return totalDuration;
}

/**
 * Get the duration of a single block in seconds
 * @param block - Workout block
 * @returns Duration in seconds
 */
function getBlockDuration(block: WorkoutBlock): number {
    if (block.duration.type === 'time') {
        return block.duration.value; // Already in seconds
    } else if (block.duration.type === 'distance') {
        // Estimate time based on distance
        // Assume average pace of 5:00 min/km for estimation
        const distanceKm = block.duration.value / 1000;
        const averagePaceSeconds = 5 * 60; // 5 minutes per km in seconds
        return distanceKm * averagePaceSeconds;
    }

    return 0;
}

/**
 * Format duration in seconds to a human-readable string
 * @param seconds - Duration in seconds
 * @returns Formatted string like "45 min" or "1h 30min"
 */
export function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;

    const minutes = Math.round(seconds / 60);

    if (minutes < 60) {
        return `${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (remainingMinutes === 0) {
        return `${hours}h`;
    }

    return `${hours}h ${remainingMinutes}min`;
}
