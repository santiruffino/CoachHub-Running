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
        // Note: For estimated duration if distance is provided, we should ideally use pacing.
        // But for simplicity, we mimic the original logic. If they provide time, we add time.
        if (block.duration.type === 'time') {
            totalDuration += block.duration.value * multiplier;
        }

        // TSS calculation (simplified)
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

export function EstimatedTotals({ blocks }: EstimatedTotalsProps) {
    const totals = useMemo(() => calculateTotals(blocks), [blocks]);

    const formatDurationParts = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return { hours, minutes };
    };

    const { hours, minutes } = formatDurationParts(totals.duration);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Duration */}
            <div className="bg-white dark:bg-[#1a232c] rounded-xl p-8 shadow-[0_4px_24px_rgba(43,52,55,0.04)] relative overflow-hidden flex flex-col justify-between h-40">
                <div className="text-[10px] font-semibold text-[#8b9bb4] uppercase tracking-[0.05em] mb-4">
                    Total Duration
                </div>
                <div className="flex items-baseline gap-1 mt-auto">
                    {hours > 0 ? (
                        <>
                            <span className="text-5xl font-display font-extrabold text-[#2b3437] dark:text-[#f8f9fa] tracking-tight">{hours}</span>
                            <span className="text-sm font-semibold text-[#8b9bb4] mr-2">h</span>
                            <span className="text-5xl font-display font-extrabold text-[#2b3437] dark:text-[#f8f9fa] tracking-tight">{minutes.toString().padStart(2, '0')}</span>
                            <span className="text-sm font-semibold text-[#8b9bb4]">min</span>
                        </>
                    ) : (
                        <>
                            <span className="text-5xl font-display font-extrabold text-[#2b3437] dark:text-[#f8f9fa] tracking-tight">{minutes}</span>
                            <span className="text-sm font-semibold text-[#8b9bb4]">min</span>
                        </>
                    )}
                </div>
                
                {/* Visual Bar */}
                <div className="absolute bottom-6 left-8 right-8 h-1 bg-[#f1f4f6] dark:bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#d1e4fb] to-[#4e6073] rounded-full" style={{ width: '60%' }} />
                </div>
            </div>

            {/* Estimated TSS */}
            <div className="bg-white dark:bg-[#1a232c] rounded-xl p-8 shadow-[0_4px_24px_rgba(43,52,55,0.04)] relative overflow-hidden flex flex-col justify-between h-40">
                <div className="text-[10px] font-semibold text-[#8b9bb4] uppercase tracking-[0.05em] mb-4">
                    Estimated TSS
                </div>
                <div className="flex items-baseline gap-2 mt-auto">
                    <span className="text-5xl font-display font-extrabold text-[#2b3437] dark:text-[#f8f9fa] tracking-tight">{totals.tss}</span>
                    <span className="text-sm font-semibold text-[#8b9bb4]">score</span>
                </div>
                
                {/* Visual Bar */}
                <div className="absolute bottom-6 left-8 right-8 h-1 bg-[#f1f4f6] dark:bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#8b9bb4] to-[#2b3437] dark:to-[#f8f9fa] rounded-full" style={{ width: '75%' }} />
                </div>
            </div>

            {/* Distance Est */}
            <div className="bg-white dark:bg-[#1a232c] rounded-xl p-8 shadow-[0_4px_24px_rgba(43,52,55,0.04)] relative overflow-hidden flex flex-col justify-between h-40">
                <div className="text-[10px] font-semibold text-[#8b9bb4] uppercase tracking-[0.05em] mb-4">
                    Distance Est.
                </div>
                <div className="flex items-baseline gap-2 mt-auto">
                    <span className="text-5xl font-display font-extrabold text-[#2b3437] dark:text-[#f8f9fa] tracking-tight">{(totals.distance > 0 ? totals.distance : 0).toFixed(1)}</span>
                    <span className="text-sm font-semibold text-[#8b9bb4]">km</span>
                </div>
                
                {/* Visual Bar */}
                <div className="absolute bottom-6 left-8 right-8 h-1 bg-[#f1f4f6] dark:bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#abb3b7] to-emerald-500 rounded-full" style={{ width: '40%' }} />
                </div>
            </div>
        </div>
    );
}
