'use client';

import { WorkoutBlock, BlockType } from './types';
import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

interface WorkoutChartProps {
    blocks: WorkoutBlock[];
    selectedId?: string | null;
    onBlockClick?: (blockId: string) => void;
}

// Color coding based on block type
const BLOCK_COLORS: Record<BlockType, string> = {
    warmup: '#22C55E',    // Green
    interval: '#3B82F6',  // Blue  
    recovery: '#F97316',  // Orange
    cooldown: '#06B6D4',  // Cyan
};

export function WorkoutChart({ blocks, selectedId, onBlockClick }: WorkoutChartProps) {
    const chartData = useMemo(() => {
        const labels: string[] = [];
        const durations: number[] = [];
        const colors: string[] = [];
        const blockIds: string[] = [];

        // Process blocks including repeat groups
        let i = 0;
        while (i < blocks.length) {
            const block = blocks[i];

            // Calculate estimated duration in minutes
            let durationMinutes = 0;
            if (block.duration.type === 'time') {
                durationMinutes = block.duration.value / 60;
            } else {
                // Estimate: 5 min/km pace
                durationMinutes = (block.duration.value / 1000) * 5;
            }

            if (block.group) {
                // This block is part of a group - collect all blocks in group
                const groupId = block.group.id;
                const groupReps = block.group.reps;
                const groupBlocks: WorkoutBlock[] = [];

                let j = i;
                while (j < blocks.length && blocks[j].group?.id === groupId) {
                    groupBlocks.push(blocks[j]);
                    j++;
                }

                // Add each rep as a separate bar
                for (let rep = 0; rep < groupReps; rep++) {
                    groupBlocks.forEach(gb => {
                        let gbDuration = 0;
                        if (gb.duration.type === 'time') {
                            gbDuration = gb.duration.value / 60;
                        } else {
                            gbDuration = (gb.duration.value / 1000) * 5;
                        }

                        labels.push(gb.stepName || gb.type);
                        durations.push(gbDuration);
                        colors.push(BLOCK_COLORS[gb.type]);
                        blockIds.push(gb.id);
                    });
                }

                i = j;
            } else {
                // Regular non-grouped block
                labels.push(block.stepName || block.type);
                durations.push(durationMinutes);
                colors.push(BLOCK_COLORS[block.type]);
                blockIds.push(block.id);
                i++;
            }
        }

        return { labels, durations, colors, blockIds };
    }, [blocks]);

    const option = useMemo(() => {
        if (chartData.durations.length === 0) {
            return null;
        }

        return {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'shadow'
                },
                formatter: (params: any) => {
                    const param = params[0];
                    return `<strong>${param.name}</strong><br/>Duration: ${param.value.toFixed(1)} min`;
                }
            },
            grid: {
                left: 20,
                right: 20,
                top: 20,
                bottom: 30,
                containLabel: false
            },
            xAxis: {
                type: 'category',
                data: chartData.labels,
                axisLabel: {
                    show: false  // Hide x-axis labels for cleaner look
                },
                axisTick: {
                    show: false
                },
                axisLine: {
                    show: false
                }
            },
            yAxis: {
                type: 'value',
                name: 'Duration (min)',
                nameTextStyle: {
                    color: '#9CA3AF',
                    fontSize: 11
                },
                axisLabel: {
                    color: '#9CA3AF',
                    fontSize: 10
                },
                splitLine: {
                    lineStyle: {
                        color: '#374151',
                        opacity: 0.3
                    }
                }
            },
            series: [
                {
                    type: 'bar',
                    data: chartData.durations.map((duration, index) => ({
                        value: duration,
                        itemStyle: {
                            color: chartData.colors[index],
                            borderRadius: [4, 4, 0, 0],
                            opacity: selectedId === chartData.blockIds[index] ? 1 : 0.8,
                            borderColor: selectedId === chartData.blockIds[index] ? '#fff' : 'transparent',
                            borderWidth: selectedId === chartData.blockIds[index] ? 2 : 0
                        }
                    })),
                    barWidth: '60%',
                    emphasis: {
                        itemStyle: {
                            opacity: 1,
                            shadowBlur: 10,
                            shadowColor: 'rgba(0, 0, 0, 0.3)'
                        }
                    }
                }
            ]
        };
    }, [chartData, selectedId]);

    const onChartEvents = {
        click: (params: any) => {
            const blockId = chartData.blockIds[params.dataIndex];
            if (blockId && onBlockClick) {
                onBlockClick(blockId);
            }
        }
    };

    if (!option) {
        return (
            <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
                No blocks added yet. Start building your workout!
            </div>
        );
    }

    return (
        <div className="h-full">
            <ReactECharts
                option={option}
                onEvents={onChartEvents}
                style={{ height: '100%', width: '100%' }}
                opts={{ renderer: 'canvas' }}
            />
        </div>
    );
}
