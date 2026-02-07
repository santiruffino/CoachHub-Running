/**
 * Maximum Aerobic Speed (VAM - Velocidad Aeróbica Máxima) Constants and Utilities
 * Also known as MAS (Maximum Aerobic Speed).
 * All VAM values in this file are represented as "min/km" strings (e.g., "4:30")
 */

export const VAM_LEVELS = [
    { id: 'amateur', name: 'Amateur', pace: '5:45' },
    { id: 'intermediate', name: 'Intermediate', pace: '4:30' },
    { id: 'advanced', name: 'Advanced', pace: '3:55' },
    { id: 'elite', name: 'Elite', pace: '3:15' },
];

export const VAM_DEFAULT = VAM_LEVELS[1].pace; // Intermediate: 4:30

/**
 * Parses a pace string "mm:ss" into total seconds
 */
export function parsePaceToSeconds(pace: string): number {
    if (!pace || !pace.includes(':')) return 0;
    const [mins, secs] = pace.split(':').map(Number);
    if (isNaN(mins) || isNaN(secs)) return 0;
    return mins * 60 + secs;
}

/**
 * Formats seconds into "mm:ss" pace string
 */
export function formatSecondsToPace(seconds: number): string {
    if (isNaN(seconds) || seconds <= 0 || !isFinite(seconds)) return '-:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Calculates a target pace based on a VAM pace and a percentage
 * Higher percentage = faster pace = lower seconds per km
 * Target Pace = VAM Pace / (Percentage / 100)
 */
export function calculateTargetPace(vamPace: string, percentage: number): string {
    const vamSeconds = parsePaceToSeconds(vamPace);
    if (vamSeconds === 0 || percentage <= 0) return '-:--';

    // Pace calculation: 100% = VAM, 110% = 10% faster
    // Speed = 1 / Pace
    // Target Speed = VAM Speed * (percentage / 100)
    // 1 / Target Pace = (1 / VAM Pace) * (percentage / 100)
    // Target Pace = VAM Pace / (percentage / 100)

    const targetSeconds = vamSeconds / (percentage / 100);
    return formatSecondsToPace(targetSeconds);
}

/**
 * VAM Zone definitions based on percentage of VAM
 */
export const VAM_ZONES = [
    { zone: 1, name: 'Regenerativo', min: 0, max: 70 },
    { zone: 2, name: 'Endurance', min: 70, max: 85 },
    { zone: 3, name: 'Tempo', min: 85, max: 92 },
    { zone: 4, name: 'Umbral', min: 92, max: 97 },
    { zone: 5, name: 'VO2 Max', min: 97, max: 103 },
    { zone: 6, name: 'Potencia', min: 103, max: 120 },
];
