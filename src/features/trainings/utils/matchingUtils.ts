import { WorkoutMatch, MatchQuality } from '../types';

/**
 * Calculate match score color class
 */
export function getMatchScoreColor(score: number): string {
    if (score >= 85) return 'text-green-600 dark:text-green-400';
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
}

/**
 * Get match score background color class
 */
export function getMatchScoreBgColor(score: number): string {
    if (score >= 85) return 'bg-green-100 dark:bg-green-900/30';
    if (score >= 70) return 'bg-yellow-100 dark:bg-yellow-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
}

/**
 * Get match category label in Spanish
 */
export function getMatchCategory(score: number): string {
    if (score >= 85) return 'Excelente';
    if (score >= 70) return 'Bueno';
    if (score >= 50) return 'Regular';
    return 'Bajo';
}

/**
 * Format percentage difference with sign and color
 */
export function formatDifference(diff: number): string {
    const sign = diff >= 0 ? '+' : '';
    return `${sign}${diff.toFixed(1)}%`;
}

/**
 * Get difference color (green if close to 0, red if far)
 */
export function getDifferenceColor(diff: number): string {
    const absDiff = Math.abs(diff);
    if (absDiff <= 5) return 'text-green-600 dark:text-green-400';
    if (absDiff <= 15) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
}

/**
 * Format distance in meters to km
 */
export function formatDistance(meters: number): string {
    return `${(meters / 1000).toFixed(2)} km`;
}

/**
 * Format duration in seconds to readable string
 */
export function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m ${secs}s`;
}
