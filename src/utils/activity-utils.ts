/**
 * Normalizes activity types from various sources (e.g., Strava) to internal constants.
 * @param activityType The activity type to normalize
 * @returns The normalized internal activity type constant
 */
export const normalizeActivityType = (activityType: string): string => {
    const typeMap: Record<string, string> = {
        'Run': 'RUNNING',
        'WeightTraining': 'STRENGTH',
        'Workout': 'STRENGTH',
        'Ride': 'CYCLING',
        'VirtualRide': 'CYCLING',
        'Swim': 'SWIMMING',
    };
    return typeMap[activityType] || 'OTHER';
};
