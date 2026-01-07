'use client';

import { WorkoutBlock } from './types';
import { useMemo } from 'react';

interface WorkoutChartProps {
    blocks: WorkoutBlock[];
}

export function WorkoutChart({ blocks }: WorkoutChartProps) {
    const data = useMemo(() => {
        let totalDuration = 0;
        const processedBlocks = blocks.map(block => {
            // Normalize duration for visualization
            // Assume 5:00 min/km (300s / km) for distance based blocks to estimate time
            let estimatedSeconds = 0;
            if (block.duration.type === 'time') {
                estimatedSeconds = block.duration.value;
            } else {
                estimatedSeconds = (block.duration.value / 1000) * 300;
            }

            totalDuration += estimatedSeconds;

            return {
                ...block,
                estimatedSeconds
            };
        });

        return { processedBlocks, totalDuration };
    }, [blocks]);

    if (data.totalDuration === 0) return null;

    return (
        <div>
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Workout Structure
            </h4>
            <div className="h-12 w-full flex rounded-md overflow-hidden bg-gray-100">
                {data.processedBlocks.map((block, index) => {
                    const widthPercentage = (block.estimatedSeconds / data.totalDuration) * 100;

                    let bgColor = 'bg-gray-300';
                    if (block.type === 'warmup') bgColor = 'bg-gray-400';
                    if (block.type === 'interval') bgColor = 'bg-brand-primary';
                    if (block.type === 'recovery') bgColor = 'bg-green-500';
                    if (block.type === 'cooldown') bgColor = 'bg-blue-400';

                    return (
                        <div
                            key={block.id}
                            className={`${bgColor} h-full border-r border-white/20 last:border-r-0 transition-all relative group`}
                            style={{ width: `${widthPercentage}%` }}
                        >
                            <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                                {block.type} • {block.duration.value} {block.duration.type === 'distance' ? 'm' : 's'}
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>0:00</span>
                <span>
                    ~
                    {Math.floor(data.totalDuration / 3600).toString().padStart(2, '0')}:
                    {Math.floor((data.totalDuration % 3600) / 60).toString().padStart(2, '0')}
                </span>
            </div>
        </div>
    );
}
