'use client';

import { WorkoutBlock, BlockType } from './types';
import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTranslations } from 'next-intl';

interface WorkoutChartProps {
    blocks: WorkoutBlock[];
    selectedId?: string | null;
    onBlockClick?: (blockId: string) => void;
}

interface TooltipParam {
    name: string;
    value: number;
}

interface ChartClickEvent {
    dataIndex: number;
}

// Color coding based on block type
const BLOCK_COLORS: Record<BlockType, string> = {
    warmup: '#22C55E',    // Green
    interval: '#3B82F6',  // Blue  
    recovery: '#F97316',  // Orange
    cooldown: '#06B6D4',  // Cyan
    rest: '#94A3B8'       // Slate
};

export function WorkoutChart({ blocks, selectedId, onBlockClick }: WorkoutChartProps) {
    const t = useTranslations('builder');

    const chartData = useMemo(() => {
        const labels: string[] = [];
        const durations: number[] = [];
        const colors: string[] = [];
        const blockIds: string[] = [];
        const processedBlocks = new Set<string>();

        // Process blocks including repeat groups
        blocks.forEach(block => {
            if (processedBlocks.has(block.id)) return;

            if (block.group) {
                const groupId = block.group.id;
                const groupBlocks = blocks.filter(b => b.group?.id === groupId);
                groupBlocks.forEach(b => processedBlocks.add(b.id));
                const groupReps = block.group.reps || 1;

                // Add each rep as a separate bar
                for (let rep = 0; rep < groupReps; rep++) {
                    groupBlocks.forEach(gb => {
                        let gbDuration = 0;
                        if (gb.duration.type === 'time') {
                            gbDuration = gb.duration.value / 60;
                        } else {
                            gbDuration = (gb.duration.value / 1000) * 5;
                        }

                        labels.push(gb.stepName || t(`labels.${gb.type}`));
                        durations.push(gbDuration);
                        colors.push(BLOCK_COLORS[gb.type]);
                        blockIds.push(gb.id);
                    });
                }
            } else {
                processedBlocks.add(block.id);
                // Calculate estimated duration in minutes
                let durationMinutes = 0;
                if (block.duration.type === 'time') {
                    durationMinutes = block.duration.value / 60;
                } else {
                    // Estimate: 5 min/km pace
                    durationMinutes = (block.duration.value / 1000) * 5;
                }

                labels.push(block.stepName || t(`labels.${block.type}`));
                durations.push(durationMinutes);
                colors.push(BLOCK_COLORS[block.type]);
                blockIds.push(block.id);
            }
        });

        return { labels, durations, colors, blockIds };
    }, [blocks, t]);

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
                formatter: (params: TooltipParam[]) => {
                    const param = params[0];
                    return `<strong>${param.name}</strong><br/>${t('duration')}: ${param.value.toFixed(1)} ${t('units.min')}`;
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
                name: t('durationMin'),
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
    }, [chartData, selectedId, t]);

    const onChartEvents = {
        click: (params: ChartClickEvent) => {
            const blockId = chartData.blockIds[params.dataIndex];
            if (blockId && onBlockClick) {
                onBlockClick(blockId);
            }
        }
    };

    if (!option) {
        return (
            <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
                {t('startBuildingWorkout')}
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
