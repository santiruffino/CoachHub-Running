'use client';

import { WorkoutBlock } from './types';
import { X } from 'lucide-react';

interface WorkoutSummaryProps {
    blocks: WorkoutBlock[];
    workoutRPE?: number;
    onClose: () => void;
}

export function WorkoutSummary({ blocks, workoutRPE, onClose }: WorkoutSummaryProps) {
    const generateDescription = () => {
        if (blocks.length === 0) return "No workout steps defined.";

        const parts: string[] = [];
        let i = 0;

        while (i < blocks.length) {
            const block = blocks[i];

            if (block.group) {
                const groupId = block.group.id;
                const groupBlocks: WorkoutBlock[] = [];

                let j = i;
                while (j < blocks.length && blocks[j].group?.id === groupId) {
                    groupBlocks.push(blocks[j]);
                    j++;
                }

                const reps = block.group.reps;
                const stepDescriptions = groupBlocks.map(b => {
                    const duration = formatDuration(b);
                    const name = b.stepName || b.type;
                    const intensity = b.intensity ? ` at ${b.intensity}% intensity` : '';
                    return `${duration} ${name}${intensity}`;
                }).join(', ');

                parts.push(`${reps}× (${stepDescriptions})`);
                i = j;
            } else {
                const duration = formatDuration(block);
                const name = block.stepName || block.type;
                const intensity = block.intensity ? ` at ${block.intensity}% intensity` : '';
                parts.push(`${duration} ${name}${intensity}`);
                i++;
            }
        }

        return parts.join(', ') + '.';
    };

    const formatDuration = (block: WorkoutBlock) => {
        if (block.duration.type === 'distance') {
            const value = block.duration.unit === 'km' ? block.duration.value / 1000 : block.duration.value;
            const unit = block.duration.unit || 'm';
            return `${value}${unit}`;
        } else {
            const val = Number(block.duration.value);
            const m = Math.floor(val / 60);
            return `${m} min`;
        }
    };

    const calculateTotals = () => {
        let totalDistance = 0; // in meters
        let totalTime = 0; // in seconds
        let totalIntensity = 0;
        let stepCount = 0;

        blocks.forEach(block => {
            const multiplier = block.group?.reps || 1;

            if (block.duration.type === 'distance') {
                totalDistance += block.duration.value * multiplier;
                // Estimate time based on 5:00 min/km pace
                totalTime += (block.duration.value / 1000) * 300 * multiplier;
            } else {
                totalTime += block.duration.value * multiplier;
            }

            if (block.intensity) {
                totalIntensity += block.intensity;
                stepCount++;
            }
        });

        const avgIntensity = stepCount > 0 ? Math.round(totalIntensity / stepCount) : 0;

        return {
            distance: (totalDistance / 1000).toFixed(2),
            time: Math.ceil(totalTime / 60),
            avgIntensity
        };
    };

    const totals = calculateTotals();

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Workout Summary
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 space-y-5 overflow-y-auto max-h-[calc(80vh-140px)]">
                    {/* Statistics */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                {totals.distance} km
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Total Distance
                            </div>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                {totals.time} min
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Estimated Time
                            </div>
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                                {totals.avgIntensity}%
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Avg Intensity
                            </div>
                        </div>
                    </div>

                    {/* Expected RPE (if set) */}
                    {workoutRPE !== undefined && (
                        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Expected RPE
                            </div>
                            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                                {workoutRPE}/10
                            </div>
                        </div>
                    )}

                    {/* Description */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
                            Workout Description
                        </h3>
                        <p className="text-gray-800 dark:text-gray-200 leading-relaxed bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                            {generateDescription()}
                        </p>
                    </div>

                    {/* Step Count */}
                    <div className="text-sm text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-4">
                        Total steps: <span className="font-semibold">{blocks.length}</span>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 bg-brand-primary hover:bg-brand-primary-dark text-white font-medium rounded-lg transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
