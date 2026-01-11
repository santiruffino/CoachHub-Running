'use client';

import { WorkoutBlock } from './types';
import { useMemo } from 'react';

interface WorkoutChartProps {
    blocks: WorkoutBlock[];
    selectedId?: string | null;
    onBlockClick?: (blockId: string) => void;
}

export function WorkoutChart({ blocks, selectedId, onBlockClick }: WorkoutChartProps) {
    const data = useMemo(() => {
        let totalDuration = 0;
        const visualBlocks: Array<{
            block: WorkoutBlock;
            estimatedSeconds: number;
            originalId: string;
        }> = [];

        let i = 0;
        while (i < blocks.length) {
            const block = blocks[i];

            // Calculate estimated seconds for this block
            let estimatedSeconds = 0;
            if (block.duration.type === 'time') {
                estimatedSeconds = block.duration.value;
            } else {
                estimatedSeconds = (block.duration.value / 1000) * 300;
            }

            if (block.group) {
                // This block is part of a group - expand it for visualization
                const groupId = block.group.id;
                const groupReps = block.group.reps;

                // Find all blocks in this group pattern
                const groupBlocks: WorkoutBlock[] = [];
                let j = i;
                while (j < blocks.length && blocks[j].group?.id === groupId) {
                    groupBlocks.push(blocks[j]);
                    j++;
                }

                // Repeat the pattern for each rep
                for (let rep = 0; rep < groupReps; rep++) {
                    groupBlocks.forEach(gb => {
                        let gbSeconds = 0;
                        if (gb.duration.type === 'time') {
                            gbSeconds = gb.duration.value;
                        } else {
                            gbSeconds = (gb.duration.value / 1000) * 300;
                        }

                        totalDuration += gbSeconds;
                        visualBlocks.push({
                            block: gb,
                            estimatedSeconds: gbSeconds,
                            originalId: gb.id
                        });
                    });
                }

                i = j; // Skip past all grouped blocks
            } else {
                // Regular non-grouped block
                totalDuration += estimatedSeconds;
                visualBlocks.push({
                    block,
                    estimatedSeconds,
                    originalId: block.id
                });
                i++;
            }
        }

        return { visualBlocks, totalDuration };
    }, [blocks]);

    if (data.totalDuration === 0) {
        return (
            <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
                No blocks added yet. Start building your workout!
            </div>
        );
    }

    // Generate time markers (0:00, quarter intervals)
    const generateTimeMarkers = () => {
        const markers = [0];
        const totalMinutes = Math.ceil(data.totalDuration / 60);
        const interval = Math.max(Math.ceil(totalMinutes / 4), 1);

        for (let i = interval; i <= totalMinutes; i += interval) {
            markers.push(i * 60);
        }

        return markers;
    };

    const timeMarkers = generateTimeMarkers();

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="h-full flex flex-col">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Visual Workout
            </h4>

            <div className="flex-1 flex">
                {/* Y-axis labels */}
                <div className="flex flex-col justify-between text-xs text-gray-500 dark:text-gray-400 pr-3 py-2">
                    <span>100%</span>
                    <span>80%</span>
                    <span>60%</span>
                </div>

                {/* Chart area */}
                <div className="flex-1 flex flex-col">
                    {/* Main chart */}
                    <div className="relative flex-1 flex rounded-md overflow-hidden bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                        {data.visualBlocks.map((item, index) => {
                            const { block, estimatedSeconds, originalId } = item;
                            const widthPercentage = (estimatedSeconds / data.totalDuration) * 100;

                            // Determine height based on intensity (if available)
                            const heightPercentage = block.intensity ? block.intensity : 50;

                            let bgColor = 'bg-gray-400';
                            let hoverColor = 'hover:bg-gray-500';
                            let selectedRing = '';

                            if (block.type === 'warmup') {
                                bgColor = 'bg-green-500';
                                hoverColor = 'hover:bg-green-600';
                            }
                            if (block.type === 'interval') {
                                bgColor = 'bg-blue-500';
                                hoverColor = 'hover:bg-blue-600';
                            }
                            if (block.type === 'recovery') {
                                bgColor = 'bg-blue-200 dark:bg-blue-300';
                                hoverColor = 'hover:bg-blue-300 dark:hover:bg-blue-400';
                            }
                            if (block.type === 'cooldown') {
                                bgColor = 'bg-green-400';
                                hoverColor = 'hover:bg-green-500';
                            }

                            if (selectedId === originalId) {
                                selectedRing = 'ring-2 ring-inset ring-white dark:ring-gray-900';
                            }

                            return (
                                <div
                                    key={`${originalId}-${index}`}
                                    onClick={() => onBlockClick?.(originalId)}
                                    className={`${bgColor} ${hoverColor} ${selectedRing} cursor-pointer transition-all relative self-end border-r-2 border-white/40 dark:border-gray-800/60 last:border-r-0`}
                                    style={{
                                        width: `${widthPercentage}%`,
                                        height: `${heightPercentage}%`,
                                        minHeight: '20%'
                                    }}
                                    title={`${block.stepName || block.type} - ${block.duration.value} ${block.duration.type === 'distance' ? 'm' : 's'}`}
                                >
                                    {/* Step name label (if width permits) */}
                                    {widthPercentage > 5 && block.stepName && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-xs font-medium text-white drop-shadow px-1 text-center leading-tight">
                                                {block.stepName}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Time markers */}
                    <div className="relative h-6 mt-1">
                        {timeMarkers.map((seconds, idx) => {
                            const position = (seconds / data.totalDuration) * 100;
                            return (
                                <div
                                    key={idx}
                                    className="absolute text-xs text-gray-600 dark:text-gray-400 -translate-x-1/2"
                                    style={{ left: `${position}%` }}
                                >
                                    {formatTime(seconds)}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
