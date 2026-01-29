'use client';

import { WorkoutBlock, WorkoutTotals } from './types';
import { useMemo } from 'react';

interface EstimatedTotalsProps {
    blocks: WorkoutBlock[];
}

function calculateTotals(blocks: WorkoutBlock[]): WorkoutTotals {
    let totalDistance = 0;
    let totalDuration = 0;
    let totalTSS = 0;

    blocks.forEach(block => {
        const multiplier = block.group?.reps || 1;

        // Distance
        if (block.duration.type === 'distance') {
            totalDistance += (block.duration.value / 1000) * multiplier;
        }

        // Duration
        totalDuration += block.duration.value * multiplier;

        // TSS calculation (simplified)
        // TSS = (duration in hours) × intensity factor^2 × 100
        const durationHours = (block.duration.value / 3600) * multiplier;
        const intensityFactor = (block.intensity || 50) / 100;
        totalTSS += durationHours * Math.pow(intensityFactor, 2) * 100;
    });

    return {
        distance: totalDistance,
        duration: totalDuration,
        tss: Math.round(totalTSS)
    };
}

function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function EstimatedTotals({ blocks }: EstimatedTotalsProps) {
    const totals = useMemo(() => calculateTotals(blocks), [blocks]);

    return (
        <div className="bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
                Estimated Totals
            </h3>

            <div className="grid grid-cols-3 gap-6">
                <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Distance</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {totals.distance.toFixed(2)} <span className="text-lg text-gray-500 dark:text-gray-400">km</span>
                    </div>
                </div>

                <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Duration</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {formatDuration(totals.duration)}
                    </div>
                </div>

                <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">TSS</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {totals.tss}
                    </div>
                </div>
            </div>
        </div>
    );
}
