'use client';

import { WorkoutBlock, AthleteProfile } from './types';
import { useMemo, useRef, useEffect, useCallback } from 'react';
import * as echarts from 'echarts';
import { BLOCK_COLORS } from './constants';
import { VAM_ZONES } from '@/features/profiles/constants/vam';
import { useTranslations } from 'next-intl';

interface WorkoutIntensityChartProps {
    blocks: WorkoutBlock[];
    selectedId?: string | null;
    onBlockClick?: (blockId: string) => void;
    athleteProfile?: AthleteProfile | null;
}

interface IntensityChartItem {
    name: string;
    value: [number, number, number, string, WorkoutBlock['type'], number, WorkoutBlock['duration']['type']];
    item: WorkoutBlock;
}

export function WorkoutIntensityChart({ blocks, selectedId, onBlockClick, athleteProfile }: WorkoutIntensityChartProps) {
    const chartRef = useRef<HTMLDivElement>(null);
    const chartInstance = useRef<echarts.ECharts | null>(null);
    const t = useTranslations('builder');

    // Remove the old useDistance memo, we will always use estimated time
    const getBlockEstimatedSeconds = useCallback((block: WorkoutBlock): number => {
        if (block.duration.type === 'time') return block.duration.value;

        let intensityFactor = (block.intensity || 50) / 100;

        if (block.target?.type === 'vam_zone') {
            const zoneNum = Number(block.target.min);
            const zone = VAM_ZONES.find(z => z.zone === zoneNum);
            if (zone) intensityFactor = ((zone.min + zone.max) / 2) / 100;
        } else if (block.target?.type === 'lthr') {
            const minTarget = Number(block.target.min);
            const maxTarget = Number(block.target.max);
            if (!isNaN(minTarget) && !isNaN(maxTarget)) {
                intensityFactor = ((minTarget + maxTarget) / 2) / 100;
            }
        }

        const distMeters = block.duration.unit === 'km' ? block.duration.value * 1000 : block.duration.value;
        let vamKmh = 15; // default fallback
        
        if (athleteProfile?.vam) {
            const parts = athleteProfile.vam.split(':').map(Number);
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                const secsPerKm = parts[0] * 60 + parts[1];
                if (secsPerKm > 0) vamKmh = 3600 / secsPerKm;
            } else if (!isNaN(Number(athleteProfile.vam))) {
                vamKmh = Number(athleteProfile.vam);
            }
        }

        const speedKmH = vamKmh * intensityFactor;
        const speedMs = speedKmH / 3.6;
        
        if (speedMs > 0) return Math.round(distMeters / speedMs);
        return 0;
    }, [athleteProfile]);

    const chartData = useMemo<IntensityChartItem[]>(() => {
        let totalX = 0;
        const flatData: IntensityChartItem[] = [];
        const processedBlocks = new Set<string>();

        blocks.forEach(block => {
            if (processedBlocks.has(block.id)) return;

            if (block.group) {
                const groupId = block.group.id;
                const groupBlocks = blocks.filter(b => b.group?.id === groupId);
                groupBlocks.forEach(b => processedBlocks.add(b.id));
                const multiplier = block.group.reps || 1;

                for (let rep = 0; rep < multiplier; rep++) {
                    groupBlocks.forEach(gb => {
                        const width = getBlockEstimatedSeconds(gb) / 60; // in minutes
                        
                        flatData.push({
                            name: gb.stepName || t(`labels.${gb.type}`),
                            value: [totalX, gb.intensity || 50, width, gb.id, gb.type, gb.duration.value, gb.duration.type],
                            item: gb
                        });
                        totalX += width;
                    });
                }
            } else {
                processedBlocks.add(block.id);
                const width = getBlockEstimatedSeconds(block) / 60; // in minutes
                
                flatData.push({
                    name: block.stepName || t(`labels.${block.type}`),
                    value: [totalX, block.intensity || 50, width, block.id, block.type, block.duration.value, block.duration.type],
                    item: block
                });
                totalX += width;
            }
        });

        return flatData;
    }, [blocks, t, getBlockEstimatedSeconds]);

    useEffect(() => {
        if (!chartRef.current || blocks.length === 0) return;

        // Clean up previous instance if it exists to avoid stale references
        if (chartInstance.current) {
            chartInstance.current.dispose();
        }

        chartInstance.current = echarts.init(chartRef.current);
        
        chartInstance.current.on('click', (params) => {
            if (!onBlockClick || typeof params.data !== 'object' || params.data === null || !('value' in params.data)) {
                return;
            }

            const value = (params.data as { value?: unknown }).value;
            if (Array.isArray(value) && typeof value[3] === 'string') {
                onBlockClick(value[3]);
            }
        });

        const maxX = Math.max(...chartData.map(d => Number(d.value[0]) + Number(d.value[2])), 1);

        const option: echarts.EChartsOption = {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'item',
                formatter: (params) => {
                    if (typeof params !== 'object' || params === null || !('data' in params)) {
                        return '';
                    }

                    const data = (params as { data?: { value?: unknown; name?: unknown } }).data;
                    if (!data || !Array.isArray(data.value) || data.value.length < 7 || typeof data.name !== 'string') {
                        return '';
                    }

                    const val = data.value as [number, number, number, string, WorkoutBlock['type'], number, WorkoutBlock['duration']['type']];
                    const durationVal = val[5];
                    const durationType = val[6];
                    const intensity = val[1];
                    const name = data.name;
                    
                    return `<strong>${name}</strong><br/>
                            ${t('duration')}: ${durationVal} ${durationType === 'time' ? t('units.min') : t('units.km')}<br/>
                            ${t('intensity')}: ${intensity}%`;
                }
            },
            grid: {
                left: 0,
                right: 0,
                top: 10,
                bottom: 0,
                containLabel: false
            },
            xAxis: {
                type: 'value',
                show: false,
                min: 0,
                max: maxX
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
                    renderItem: (params, api) => {
                        const xStart = Number(api.value(0));
                        const intensity = Number(api.value(1));
                        const width = Number(api.value(2));
                        const blockId = String(api.value(3));
                        const type = String(api.value(4));
                        
                        const start = api.coord([xStart, 0]);
                        const end = api.coord([xStart + width, intensity]);
                        const sizeResult = api.size ? api.size([width, 0]) : width;
                        const sizedWidth = Array.isArray(sizeResult) ? Number(sizeResult[0]) : Number(sizeResult);
                        
                        const isSelected = blockId === selectedId;

                        return {
                            type: 'rect',
                            shape: {
                                x: start[0],
                                y: end[1],
                                width: Math.max(sizedWidth - 1, 1),
                                height: start[1] - end[1]
                            },
                            style: {
                                fill: BLOCK_COLORS[type as keyof typeof BLOCK_COLORS] || '#e2e8f0',
                                stroke: isSelected ? '#fff' : 'transparent',
                                lineWidth: 2,
                                opacity: isSelected ? 1 : 0.8
                            }
                        };
                    },
                    data: chartData,
                    clip: true
                }
            ]
        };

        chartInstance.current.setOption(option);

        const handleResize = () => chartInstance.current?.resize();
        window.addEventListener('resize', handleResize);
        
        return () => {
            window.removeEventListener('resize', handleResize);
            chartInstance.current?.dispose();
            chartInstance.current = null;
        };
    }, [chartData, selectedId, onBlockClick, t, blocks.length]);

    // Calculate time labels based on max duration
    const totalMinutes = useMemo(() => {
        if (chartData.length === 0) return 0;
        const lastItem = chartData[chartData.length - 1];
        return Number(lastItem.value[0]) + Number(lastItem.value[2]);
    }, [chartData]);
    
    const timeLabels = useMemo(() => {
        if (totalMinutes === 0) return ['0:00'];
        const labels = ['0:00'];
        const intervals = 4;
        for (let i = 1; i <= intervals; i++) {
            const mins = (totalMinutes / intervals) * i;
            const h = Math.floor(mins / 60);
            const m = Math.floor(mins % 60);
            labels.push(h > 0 ? `${h}:${m.toString().padStart(2, '0')}:00` : `${m}:00`);
        }
        return labels;
    }, [totalMinutes]);

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
                        <span className="text-[10px] font-semibold text-[#8b9bb4]">{t('recovery')}</span>
                    </div>
                </div>
            </div>
            <div ref={chartRef} className="w-full h-56" />
            <div className="flex justify-between border-t border-[#f1f4f6] dark:border-white/5 pt-2 mt-2 px-1 text-[10px] font-semibold text-[#8b9bb4] tracking-widest">
                {timeLabels.map((label, i) => (
                    <span key={i}>{label}</span>
                ))}
            </div>
        </div>
    );
}
