'use client';
import { appLogger } from '@/lib/app-logger';


import { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/axios';
import { useTranslations } from 'next-intl';
import { Skeleton } from '@/components/ui/skeleton';

interface Lap {
    id: number;
    name: string;
    elapsed_time: number;
    moving_time: number;
    distance: number;
    average_speed: number;
    max_speed: number;
    average_heartrate?: number;
    max_heartrate?: number;
    average_cadence?: number;
    lap_index: number;
    total_elevation_gain: number;
}

interface StreamData {
    time?: { data: number[] };
    distance?: { data: number[] };
    altitude?: { data: number[] };
    heartrate?: { data: number[] };
    velocity_smooth?: { data: number[] };
}

interface HRZone {
    min: number;
    max: number;
}

interface ActivityChartProps {
    activityId: string;
    laps?: Lap[];
    hrZones?: HRZone[];
    isRunning: boolean;
}

type Resolution = 'low' | 'medium' | 'high';
type XAxisType = 'time' | 'distance';

interface ChartSamplePoint {
    xLabel: string;
    pace: number;
    heartRate: number | null;
}

interface ChartDataResult {
    xAxisData: string[];
    series: {
        pace: number[];
        heartRate: Array<number | null>;
    };
}

const EMPTY_CHART_DATA: ChartDataResult = {
    xAxisData: [],
    series: {
        pace: [],
        heartRate: [],
    },
};

interface TooltipParam {
    axisValue: string;
    seriesName: string;
    value: number | null;
    marker: string;
}

interface LegendSelectChangedEvent {
    selected: Record<string, boolean>;
}

/**
 * Moving average filter to smooth "peaky" data
 */
const movingAverage = (data: (number | null)[], windowSize: number): (number | null)[] => {
    if (!data || data.length === 0) return [];
    const result: (number | null)[] = [];
    const halfWindow = Math.floor(windowSize / 2);

    for (let i = 0; i < data.length; i++) {
        let sum = 0;
        let count = 0;
        for (let j = Math.max(0, i - halfWindow); j <= Math.min(data.length - 1, i + halfWindow); j++) {
            const val = data[j];
            if (val !== null && val !== undefined) {
                sum += val;
                count++;
            }
        }
        result.push(count > 0 ? sum / count : null);
    }
    return result;
};

export function ActivityChart({ activityId, laps, hrZones, isRunning }: ActivityChartProps) {
    const t = useTranslations('activities.detail.dynamics');
    const paceMetricName = isRunning ? t('metrics.pace') : t('metrics.pace');
    const [streams, setStreams] = useState<StreamData | null>(null);
    const [loading, setLoading] = useState(true);
    const [resolution, setResolution] = useState<Resolution>('high');
const [xAxisType, setXAxisType] = useState<XAxisType>('time');
const [showLaps, setShowLaps] = useState(false);

    // Track which series are selected in the legend
    const [legendSelected, setLegendSelected] = useState<Record<string, boolean>>({
        [paceMetricName]: true,
        [t('metrics.heartRate')]: true,
    });

    useEffect(() => {
        const fetchStreams = async () => {
            try {
                setLoading(true);
                // Call the standard Next.js API route which now proxies to the Edge Function
                const response = await api.get(`/v2/activities/${activityId}/streams`);
                setStreams(response.data);
            } catch (error) {
                appLogger.error('Failed to fetch streams:', error);
                setStreams(null);
            } finally {
                setLoading(false);
            }
        };

        if (activityId) fetchStreams();
    }, [activityId]);

    // Downsample data based on resolution
    const downsampleData = <T,>(data: T[], resolution: Resolution): T[] => {
        if (!data || data.length === 0) return [];

        const steps = {
            low: Math.floor(data.length / 50),      // ~50 points
            medium: Math.floor(data.length / 150),  // ~150 points
            high: Math.floor(data.length / 300),    // ~300 points
        };

        const step = Math.max(1, steps[resolution]);
        return data.filter((_, index) => index % step === 0);
    };

    // Format time as HH:MM:SS or MM:SS
    const formatTime = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    // Format distance in km
    const formatDistance = (meters: number): string => {
        return `${(meters / 1000).toFixed(1)}km`;
    };

    // Convert m/s to min/km for pace (returns decimal minutes)
    const metersPerSecondToPace = (mps: number): number => {
        if (mps <= 0.2) return 20; // Cap at 20 min/km for stops to avoid "infinite speed" peaks at the top
        return (1000 / mps) / 60;
    };

    // Format pace as mm:ss string
    const formatPace = (paceMinutes: number): string => {
        if (paceMinutes >= 19.9 || paceMinutes < 0) return '0:00';
        if (paceMinutes > 20) return '20:00+';

        const mins = Math.floor(paceMinutes);
        const secs = Math.round((paceMinutes - mins) * 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Prepare chart data
    const chartData = useMemo<ChartDataResult>(() => {
        if (!streams || !streams.time) {
            if (!laps || laps.length === 0) return EMPTY_CHART_DATA;

            // Fallback to laps
            const fallbackData: ChartDataResult = {
                xAxisData: laps.map(l => {
                    const displayIndex = l.lap_index === 0 || (laps[0]?.lap_index === 0) ? l.lap_index + 1 : l.lap_index;
                    return `Lap ${displayIndex}`;
                }),
                series: {
                    pace: laps.map(l => metersPerSecondToPace(l.average_speed)),
                    heartRate: laps.map(l => l.average_heartrate || null),
                }
            };

            return fallbackData;
        }

        const timeData = streams.time.data;
        
        // Apply robust smoothing to streams (15-point moving average to kill those peaks)
        const smoothedVelocity = movingAverage(streams.velocity_smooth?.data || [], 15);
        const smoothedHR = movingAverage(streams.heartrate?.data || [], 10);

        // Build full dataset
        const fullData: ChartSamplePoint[] = timeData.map((time, index) => {
            const velocity = smoothedVelocity[index] || 0;
            const distance = streams.distance?.data[index] || 0;

            const xLabel = xAxisType === 'time' ? formatTime(time) : formatDistance(distance);

            return {
                xLabel,
                pace: metersPerSecondToPace(velocity),
                heartRate: (smoothedHR[index] as number) || null,
            };
        });

        const sampledData = downsampleData(fullData, resolution);

        const sampledResult: ChartDataResult = {
            xAxisData: sampledData.map(d => d.xLabel),
            series: {
                pace: sampledData.map(d => d.pace),
                heartRate: sampledData.map(d => d.heartRate),
            }
        };
        return sampledResult;
    }, [streams, laps, xAxisType, resolution]);

    // Build ECharts option
    const option = useMemo(() => {
        const yAxisArray: Array<Record<string, unknown>> = [];
        const seriesArray: Array<Record<string, unknown>> = [];
        let yAxisIndex = 0;

        // Check what data is available
        const hasHeartRateData = chartData.series.heartRate?.some((v) => v !== null);

        // Pace axis (left, inverted) - Always shown
        const validPaces = (chartData.series.pace || []).filter((p: number) => p > 0 && p < 20);
        const minPace = validPaces.length > 0 ? Math.min(...validPaces) : 3;
        const maxPace = validPaces.length > 0 ? Math.max(...validPaces) : 8;

        const paceMin = Math.max(2, Math.floor(minPace - 0.5));
        const paceMax = Math.min(20, Math.ceil(maxPace + 0.5));

        yAxisArray.push({
            type: 'value',
            name: paceMetricName,
            position: 'left',
            inverse: true,
            min: paceMin,
            max: paceMax,
            interval: 1,
            show: legendSelected[paceMetricName],
            axisLabel: {
                formatter: (value: number) => formatPace(value),
                color: '#0647d4',
            },
            axisLine: { lineStyle: { color: '#0647d4' } },
            splitLine: { show: false },
        });

        const paceSeries: Record<string, unknown> = {
            name: paceMetricName,
            type: 'line',
            yAxisIndex: yAxisIndex,
            data: chartData.series.pace,
            smooth: true,
            lineStyle: { color: '#0647d4', width: 2.5 },
            itemStyle: { color: '#0647d4' },
            showSymbol: false,
            areaStyle: {
                color: {
                    type: 'linear',
                    x: 0, y: 0, x2: 0, y2: 1,
                    colorStops: [
                        { offset: 0, color: 'rgba(6, 182, 212, 0.2)' },
                        { offset: 1, color: 'rgba(6, 182, 212, 0)' }
                    ]
                }
            }
        };

        seriesArray.push(paceSeries);
        yAxisIndex++;

        // Add lap markAreas as a separate invisible series if showLaps is enabled
        if (showLaps && laps && laps.length > 0 && streams?.time && chartData.xAxisData.length > 0) {
            const lapMarkAreas: Array<Array<Record<string, unknown>>> = [];
            const lapMarkLines: Array<Record<string, unknown>> = [];
            let cumulativeTime = 0;
            const timeData = streams.time.data;

            laps.forEach((lap, lapIdx) => {
                const lapStartTime = cumulativeTime;
                const lapEndTime = cumulativeTime + lap.elapsed_time;

                let startIdx = -1;
                let endIdx = chartData.xAxisData.length - 1;

                for (let i = 0; i < timeData.length; i++) {
                    const currentTime = timeData[i];
                    if (currentTime >= lapStartTime && startIdx === -1) {
                        startIdx = Math.floor((i / timeData.length) * chartData.xAxisData.length);
                    }
                    if (currentTime >= lapEndTime) {
                        endIdx = Math.floor((i / timeData.length) * chartData.xAxisData.length);
                        break;
                    }
                }

                if (startIdx >= 0 && startIdx < chartData.xAxisData.length) {
                    const displayIndex = lap.lap_index === 0 || (laps[0]?.lap_index === 0) ? lap.lap_index + 1 : lap.lap_index;
                    
                    // Shadow bands
                    if (endIdx > startIdx) {
                        const color = lapIdx % 2 === 0 ? 'rgba(100, 116, 139, 0.08)' : 'rgba(148, 163, 184, 0.12)';
                        lapMarkAreas.push([
                            { 
                                xAxis: chartData.xAxisData[startIdx], 
                                itemStyle: { color },
                                label: {
                                    show: true,
                                    position: 'insideTop',
                                    formatter: `L${displayIndex}`,
                                    color: '#9CA3AF',
                                    fontSize: 10,
                                    fontWeight: 'bold',
                                    distance: 10
                                }
                            },
                            { xAxis: chartData.xAxisData[Math.min(endIdx, chartData.xAxisData.length - 1)] }
                        ]);
                    }

                    // Vertical boundary line
                    lapMarkLines.push({
                        xAxis: chartData.xAxisData[startIdx],
                        lineStyle: {
                            color: 'rgba(156, 163, 175, 0.3)',
                            type: 'dashed',
                            width: 1
                        },
                        label: { show: false }
                    });
                }

                cumulativeTime = lapEndTime;
            });

            if (lapMarkAreas.length > 0 || lapMarkLines.length > 0) {
                seriesArray.push({
                    name: t('metrics.lapBoundaries'),
                    type: 'line',
                    yAxisIndex: 0,
                    data: [],
                    lineStyle: { opacity: 0 },
                    itemStyle: { opacity: 0 },
                    showSymbol: false,
                    silent: true,
                    legendHoverLink: false,
                    animation: false,
                    markArea: {
                        silent: true,
                        data: lapMarkAreas,
                    },
                    markLine: {
                        silent: true,
                        symbol: 'none',
                        data: lapMarkLines
                    }
                });
            }
        }

        // Heart Rate axis (right) with HR zones
        if (hasHeartRateData) {
            const hrYAxis: Record<string, unknown> = {
                type: 'value',
                name: t('metrics.heartRate'),
                position: 'right',
                show: legendSelected[t('metrics.heartRate')],
                axisLabel: {
                    formatter: '{value} ppm',
                    color: '#ff4347',
                },
                axisLine: { lineStyle: { color: '#ff4347' } },
                splitLine: { show: false },
            };

            const hrSeries: Record<string, unknown> = {
                name: t('metrics.heartRate'),
                type: 'line',
                yAxisIndex: yAxisIndex,
                data: chartData.series.heartRate,
                smooth: true,
                lineStyle: { color: '#ff4347', width: 2 },
                itemStyle: { color: '#ff4347' },
                showSymbol: false,
            };

            if (hrZones && hrZones.length > 0) {
                const zoneColors = [
                    'rgba(156, 163, 175, 0.1)',
                    'rgba(59, 130, 246, 0.1)',
                    'rgba(34, 197, 94, 0.1)',
                    'rgba(234, 179, 8, 0.1)',
                    'rgba(239, 68, 68, 0.1)',
                ];

                hrSeries.markArea = {
                    silent: true,
                    data: hrZones.map((zone, index) => [
                        { yAxis: zone.min, itemStyle: { color: zoneColors[index] } },
                        { yAxis: zone.max }
                    ])
                };
            }

            yAxisArray.push(hrYAxis);
            seriesArray.push(hrSeries);
            yAxisIndex++;
        }

        const leftMargin = 60;
        const rightMargin = (hasHeartRateData && legendSelected[t('metrics.heartRate')] !== false) ? 120 : 60;

        return {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross',
                    label: { backgroundColor: '#6a7985' }
                },
                formatter: (params: TooltipParam[]) => {
                    let tooltipText = `<strong>${params[0].axisValue}</strong><br/>`;
                    params.forEach((param) => {
                        if (param.seriesName === t('metrics.lapBoundaries')) return;

                        if (param.seriesName === paceMetricName && param.value) {
                            tooltipText += `${param.marker} ${param.seriesName}: ${formatPace(param.value)}<br/>`;
                        } else if (param.value !== null && param.value !== undefined) {
                            tooltipText += `${param.marker} ${param.seriesName}: ${param.value.toFixed(1)}<br/>`;
                        }
                    });
                    return tooltipText;
                }
            },
            legend: {
                data: seriesArray.map(s => s.name).filter(name => name !== t('metrics.lapBoundaries')),
                top: 0,
                textStyle: { color: '#9CA3AF' },
            },
            dataZoom: [
                {
                    type: 'slider',
                    show: true,
                    xAxisIndex: [0],
                    start: 0,
                    end: 100,
                    bottom: 10,
                    height: 20,
                    handleIcon: 'path://M10.7,11.9v-1.3H9.3v1.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4v1.3h1.3v-1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z M13.3,24.4H6.7V23h6.6V24.4z M13.3,19.6H6.7v-1.4h6.6V19.6z',
                    handleSize: '80%',
                    handleStyle: {
                        color: '#06B6D4',
                    },
                    textStyle: {
                        color: '#9CA3AF',
                    },
                    borderColor: '#374151',
                    fillerColor: 'rgba(6, 182, 212, 0.2)',
                    dataBackground: {
                        lineStyle: {
                            color: '#374151',
                        },
                        areaStyle: {
                            color: 'rgba(6, 182, 212, 0.1)',
                        },
                    },
                },
                {
                    type: 'inside',
                    xAxisIndex: [0],
                    start: 0,
                    end: 100,
                    zoomOnMouseWheel: true,
                    moveOnMouseMove: true,
                    moveOnMouseWheel: false,
                },
            ],
            grid: {
                left: leftMargin,
                right: rightMargin,
                bottom: 80,
                top: 50,
                containLabel: false,
            },
            xAxis: {
                type: 'category',
                data: chartData.xAxisData,
                boundaryGap: false,
                axisLabel: {
                    color: '#9CA3AF',
                },
                axisLine: { lineStyle: { color: '#374151' } },
            },
            yAxis: yAxisArray,
            series: seriesArray,
        };
    }, [chartData, hrZones, showLaps, laps, streams, legendSelected, paceMetricName, t]);

    const onChartEvents = {
        legendselectchanged: (params: LegendSelectChangedEvent) => {
            setLegendSelected(params.selected);
        }
    };

    if (loading) {
        return (
            <Card className="w-full h-full bg-white dark:bg-card border border-endurix-black/10 dark:border-border flex flex-col justify-between p-6 min-h-[460px] lg:min-h-[560px]">
                <div className="flex items-center justify-between mb-4">
                    {/* Title skeleton */}
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-5 w-5" />
                        <Skeleton className="h-6 w-32" />
                    </div>
                    {/* Controls skeleton */}
                    <div className="flex gap-3">
                        <Skeleton className="h-8 w-24" />
                        <Skeleton className="h-8 w-24" />
                    </div>
                </div>
                {/* Metric toggles skeleton */}
                <div className="flex gap-2 mb-6">
                    <Skeleton className="h-7 w-16" />
                    <Skeleton className="h-7 w-24" />
                    <Skeleton className="h-7 w-20" />
                </div>
                {/* Chart area skeleton */}
                <div className="w-full flex-1 min-h-[260px] relative mt-4 overflow-hidden">
                    <svg
                        className="w-full h-full text-endurix-black/15 dark:text-white/15 animate-pulse"
                        viewBox="0 0 500 200"
                        preserveAspectRatio="none"
                    >
                        {/* Area 1 (e.g. Pace style in real chart) */}
                        <path
                            d="M 0 150 Q 50 130 100 160 T 200 110 T 300 140 T 400 90 T 500 120 L 500 200 L 0 200 Z"
                            fill="currentColor"
                            opacity="0.15"
                        />
                        <path
                            d="M 0 150 Q 50 130 100 160 T 200 110 T 300 140 T 400 90 T 500 120"
                            stroke="currentColor"
                            strokeWidth="2"
                            fill="none"
                            opacity="0.3"
                        />

                        {/* Area 2 (e.g. Heart Rate style in real chart) */}
                        <path
                            d="M 0 120 Q 80 90 160 110 T 320 80 T 500 95 L 500 200 L 0 200 Z"
                            fill="currentColor"
                            opacity="0.1"
                        />
                        <path
                            d="M 0 120 Q 80 90 160 110 T 320 80 T 500 95"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            fill="none"
                            opacity="0.25"
                        />

                        {/* Grid lines (horizontal) */}
                        <line x1="0" y1="50" x2="500" y2="50" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" opacity="0.1" />
                        <line x1="0" y1="100" x2="500" y2="100" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" opacity="0.1" />
                        <line x1="0" y1="150" x2="500" y2="150" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" opacity="0.1" />
                    </svg>
                </div>
            </Card>
        );
    }

    if (!chartData.xAxisData.length) {
        return null;
    }

    return (
        <Card className="w-full bg-white dark:bg-card border border-endurix-black/10 dark:border-border">
            <CardHeader className="border-b border-endurix-black/10 dark:border-border">
                <div className="flex items-start justify-between flex-wrap gap-4">
                    <CardTitle className="flex items-center gap-2 text-base uppercase tracking-widest" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>
                        <span>📊</span>
                        {t('title')}
                    </CardTitle>

                    <div className="flex flex-wrap gap-3 items-center">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>{t('xAxis')}:</span>
                            <Select value={xAxisType} onValueChange={(value: XAxisType) => setXAxisType(value)}>
                                <SelectTrigger className="w-[120px] h-8 border-endurix-black/15 dark:border-border">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="time">{t('types.time')}</SelectItem>
                                    <SelectItem value="distance">{t('types.distance')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {streams && (
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>{t('detail')}:</span>
                                <Select value={resolution} onValueChange={(value: Resolution) => setResolution(value)}>
                                    <SelectTrigger className="w-[120px] h-8 border-endurix-black/15 dark:border-border">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">{t('resolutions.low')}</SelectItem>
                                        <SelectItem value="medium">{t('resolutions.medium')}</SelectItem>
                                        <SelectItem value="high">{t('resolutions.high')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {laps && laps.length > 0 && (
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>{t('laps')}:</span>
                                <Select value={showLaps ? "show" : "hide"} onValueChange={(value) => setShowLaps(value === "show")}>
                                    <SelectTrigger className="w-[100px] h-8 border-endurix-black/15 dark:border-border">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="hide">{t('visibility.hide')}</SelectItem>
                                        <SelectItem value="show">{t('visibility.show')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                <ReactECharts
                    option={option}
                    onEvents={onChartEvents}
                    style={{ height: '400px', width: '100%' }}
                    opts={{ renderer: 'canvas' }}
                />
            </CardContent>
        </Card>
    );
}
