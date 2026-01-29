'use client';

import { WorkoutBlock } from './types';
import { useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';

interface WorkoutProfileChartProps {
    blocks: WorkoutBlock[];
}

export function WorkoutProfileChart({ blocks }: WorkoutProfileChartProps) {
    const chartRef = useRef<HTMLDivElement>(null);
    const chartInstance = useRef<echarts.ECharts | null>(null);

    // Prepare chart data
    const chartData = useMemo(() => {
        const data: { value: number; itemStyle: { color: string } }[] = [];
        const processedGroups = new Set<string>();

        blocks.forEach(block => {
            const intensity = block.intensity || 50;
            const color = intensity >= 70 ? '#3B82F6' : '#10B981'; // Blue for high intensity, green for low

            // Handle repeat groups
            if (block.group) {
                if (!processedGroups.has(block.group.id)) {
                    processedGroups.add(block.group.id);
                    const groupBlocks = blocks.filter(b => b.group?.id === block.group?.id);
                    for (let i = 0; i < block.group.reps; i++) {
                        groupBlocks.forEach(b => {
                            data.push({
                                value: b.intensity || 50,
                                itemStyle: { color: (b.intensity || 50) >= 70 ? '#3B82F6' : '#10B981' }
                            });
                        });
                    }
                }
            } else {
                data.push({
                    value: intensity,
                    itemStyle: { color }
                });
            }
        });

        return data;
    }, [blocks]);

    useEffect(() => {
        if (!chartRef.current) return;

        // Check if dark mode
        const isDark = document.documentElement.classList.contains('dark');

        // Initialize chart
        if (!chartInstance.current) {
            chartInstance.current = echarts.init(chartRef.current);
        }

        const option: echarts.EChartsOption = {
            backgroundColor: 'transparent',
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                top: '10%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: chartData.map((_, i) => ''),
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: { show: false }
            },
            yAxis: {
                type: 'value',
                show: false,
                max: 100
            },
            series: [
                {
                    type: 'bar',
                    data: chartData,
                    barWidth: '80%',
                    itemStyle: {
                        borderRadius: [4, 4, 0, 0]
                    }
                }
            ],
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'shadow'
                },
                formatter: (params: any) => {
                    const data = params[0];
                    return `Intensity: ${data.value}%`;
                }
            }
        };

        chartInstance.current.setOption(option);

        // Handle resize
        const handleResize = () => {
            chartInstance.current?.resize();
        };
        window.addEventListener('resize', handleResize);

        // Handle theme changes
        const observer = new MutationObserver(() => {
            if (chartInstance.current) {
                chartInstance.current.dispose();
                chartInstance.current = echarts.init(chartRef.current!);
                chartInstance.current.setOption(option);
            }
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        });

        return () => {
            window.removeEventListener('resize', handleResize);
            observer.disconnect();
        };
    }, [chartData]);

    return (
        <div className="bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 h-full">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Workout Profile
                </h3>
                <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-[#3B82F6]" />
                        <span className="text-gray-600 dark:text-gray-400">Intensity</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-[#10B981]" />
                        <span className="text-gray-600 dark:text-gray-400">Recovery</span>
                    </div>
                </div>
            </div>
            <div ref={chartRef} className="w-full h-32" />
        </div>
    );
}
