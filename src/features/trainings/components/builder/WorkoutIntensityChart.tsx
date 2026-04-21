'use client';

import { WorkoutBlock } from './types';
import { useMemo, useRef, useEffect } from 'react';
import * as echarts from 'echarts';
import { BLOCK_COLORS } from './constants';
import { useTranslations } from 'next-intl';

interface WorkoutIntensityChartProps {
    blocks: WorkoutBlock[];
    selectedId?: string | null;
    onBlockClick?: (blockId: string) => void;
}

export function WorkoutIntensityChart({ blocks, selectedId, onBlockClick }: WorkoutIntensityChartProps) {
    const chartRef = useRef<HTMLDivElement>(null);
    const chartInstance = useRef<echarts.ECharts | null>(null);
    const t = useTranslations('builder');

    // Determine if we should use distance or time as primary metric
    const useDistance = useMemo(() => {
        if (blocks.length === 0) return false;
        return blocks.every(b => b.duration.type === 'distance');
    }, [blocks]);

    const chartData = useMemo(() => {
        const data: any[] = [];
        let totalX = 0;

        // Flatten blocks (expand repeat groups)
        const flatBlocks: (WorkoutBlock & { xStart: number; width: number })[] = [];
        
        let i = 0;
        while (i < blocks.length) {
            const block = blocks[i];
            const multiplier = block.group?.reps || 1;

            if (block.group) {
                const groupId = block.group.id;
                const groupBlocks = blocks.filter(b => b.group?.id === groupId);
                
                for (let rep = 0; rep < multiplier; rep++) {
                    groupBlocks.forEach(gb => {
                        let width = 0;
                        if (useDistance) {
                            width = gb.duration.type === 'distance' ? gb.duration.value / 1000 : (gb.duration.value / 60) / 5; // Est 5 min/km
                        } else {
                            width = gb.duration.type === 'time' ? gb.duration.value / 60 : (gb.duration.value / 1000) * 5; // Est 5 min/km
                        }
                        
                        flatBlocks.push({ ...gb, xStart: totalX, width });
                        totalX += width;
                    });
                }
                i += groupBlocks.length;
            } else {
                let width = 0;
                if (useDistance) {
                    width = block.duration.type === 'distance' ? block.duration.value / 1000 : (block.duration.value / 60) / 5;
                } else {
                    width = block.duration.type === 'time' ? block.duration.value / 60 : (block.duration.value / 1000) * 5;
                }
                
                flatBlocks.push({ ...block, xStart: totalX, width });
                totalX += width;
                i++;
            }
        }

        return flatBlocks;
    }, [blocks, useDistance]);

    useEffect(() => {
        if (!chartRef.current || blocks.length === 0) return;

        if (!chartInstance.current) {
            chartInstance.current = echarts.init(chartRef.current);
            chartInstance.current.on('click', (params: any) => {
                if (params.data && onBlockClick) {
                    onBlockClick(params.data.id);
                }
            });
        }

        const option: echarts.EChartsOption = {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'item',
                formatter: (params: any) => {
                    const b = params.data;
                    const durationLabel = t('duration');
                    const intensityLabel = t('intensity');
                    return `<strong>${b.stepName || t(`labels.${b.type}`)}</strong><br/>
                            ${durationLabel}: ${b.duration.value} ${b.duration.type === 'time' ? 'sec' : 'm'}<br/>
                            ${intensityLabel}: ${b.intensity || 50}%`;
                }
            },
            grid: {
                left: 10,
                right: 10,
                top: 20,
                bottom: 20,
                containLabel: false
            },
            xAxis: {
                type: 'value',
                show: false,
                max: Math.max(...chartData.map(d => d.xStart + d.width), 1) // default to min 1 width
            },
            yAxis: {
                type: 'value',
                show: false,
                min: 0,
                max: 100
            },
            series: [
                {
                    type: 'custom',
                    renderItem: (params: any, api: any) => {
                        const index = params.dataIndex;
                        const item = chartData[index];
                        
                        const intensity = item.intensity || 50;
                        const y0 = api.coord([item.xStart, 0])[1]; // base line
                        const y1 = api.coord([item.xStart, intensity])[1]; // target intensity
                        const startX = api.coord([item.xStart, 0])[0];
                        const endX = api.coord([item.xStart + item.width, 0])[0];

                        const isSelected = item.id === selectedId;

                        return {
                            type: 'rect',
                            shape: {
                                x: startX,
                                y: y1,
                                width: Math.max(endX - startX - 1, 1), // small gap, min 1px
                                height: y0 - y1
                            },
                            style: {
                                fill: BLOCK_COLORS[item.type],
                                stroke: isSelected ? '#fff' : 'transparent',
                                lineWidth: 2,
                                opacity: isSelected ? 1 : 0.8
                            }
                        };
                    },
                    data: chartData
                }
            ]
        };

        chartInstance.current.setOption(option);

        const handleResize = () => chartInstance.current?.resize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [chartData, selectedId, onBlockClick, t]);

    if (blocks.length === 0) {
        return (
            <div className="h-40 flex items-center justify-center text-muted-foreground bg-gray-50 dark:bg-slate-800 rounded-lg border border-dashed border-gray-300 dark:border-slate-700">
                {t('emptyProfile')}
            </div>
        );
    }

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-xs font-bold text-[#8b9bb4] uppercase tracking-[0.1em]">{t('projectedProfile')}</h3>
                <div className="flex gap-4">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: BLOCK_COLORS.interval }} />
                        <span className="text-[10px] font-semibold text-[#2b3437] dark:text-[#f8f9fa]">{t('intensity')}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: BLOCK_COLORS.recovery }} />
                        <span className="text-[10px] font-semibold text-[#8b9bb4]">{t('heartRate')}</span>
                    </div>
                </div>
            </div>
            <div ref={chartRef} className="w-full h-56" />
            <div className="flex justify-between border-t border-[#f1f4f6] dark:border-white/5 pt-2 mt-2 px-1 text-[10px] font-semibold text-[#8b9bb4] tracking-widest">
                <span>0:00</span>
                <span>15:00</span>
                <span>30:00</span>
                <span>45:00</span>
                <span>1:00:00</span>
            </div>
        </div>
    );
}
