'use client';

import { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/axios';

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
    grade_smooth?: { data: number[] };
    heartrate?: { data: number[] };
    cadence?: { data: number[] };
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

export function ActivityChart({ activityId, laps, hrZones, isRunning }: ActivityChartProps) {
    const [streams, setStreams] = useState<StreamData | null>(null);
    const [loading, setLoading] = useState(true);
    const [resolution, setResolution] = useState<Resolution>('medium');
    const [xAxisType, setXAxisType] = useState<XAxisType>('time');
    const [showLaps, setShowLaps] = useState(false);

    // Track which series are selected in the legend
    const [legendSelected, setLegendSelected] = useState<Record<string, boolean>>({
        'Pace': true,
        'Heart Rate': true,
        'Cadence': true,
        'Elevation': true,
        'Grade': true,
    });

    useEffect(() => {
        const fetchStreams = async () => {
            try {
                setLoading(true);
                const response = await api.get(`/v2/activities/${activityId}/streams`);
                setStreams(response.data);

                // Debug: Log velocity data stats
                if (response.data?.velocity_smooth?.data) {
                    const velocities = response.data.velocity_smooth.data;
                    const validVelocities = velocities.filter((v: number) => v > 0);
                    console.log('📊 Velocity data stats:', {
                        count: velocities.length,
                        min: Math.min(...validVelocities).toFixed(2) + ' m/s',
                        max: Math.max(...validVelocities).toFixed(2) + ' m/s',
                        avg: (validVelocities.reduce((a: number, b: number) => a + b, 0) / validVelocities.length).toFixed(2) + ' m/s',
                        sample: velocities.slice(0, 5).map((v: number) => v.toFixed(2))
                    });
                }
            } catch (error) {
                console.error('Failed to fetch streams:', error);
                setStreams(null);
            } finally {
                setLoading(false);
            }
        };

        fetchStreams();
    }, [activityId]);

    // Downsample data based on resolution
    const downsampleData = (data: any[], resolution: Resolution): any[] => {
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
        if (mps === 0 || mps < 0) return 0;

        // Convert m/s to min/km
        // velocity in m/s -> seconds per km = 1000 / velocity
        // seconds per km -> minutes per km = (1000 / velocity) / 60
        const paceMinPerKm = (1000 / mps) / 60;

        // Validate realistic pace range (2:00 to 20:00 min/km)
        // Anything outside this is likely bad data
        if (paceMinPerKm < 2 || paceMinPerKm > 20) {
            console.warn(`Unusual pace detected: ${paceMinPerKm.toFixed(2)} min/km from velocity ${mps.toFixed(2)} m/s`);
        }

        return paceMinPerKm;
    };

    // Format pace as mm:ss string
    const formatPace = (paceMinutes: number): string => {
        if (paceMinutes === 0 || paceMinutes < 0) return '0:00';
        if (paceMinutes > 20) return '20:00+'; // Cap display for very slow paces

        const mins = Math.floor(paceMinutes);
        const secs = Math.round((paceMinutes - mins) * 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Prepare chart data
    const chartData = useMemo(() => {
        if (!streams || !streams.time) {
            if (!laps || laps.length === 0) return { xAxisData: [], series: {} };

            // Fallback to laps
            return {
                xAxisData: laps.map(l => `Lap ${l.lap_index}`),
                series: {
                    pace: laps.map(l => metersPerSecondToPace(l.average_speed)),
                    heartRate: laps.map(l => l.average_heartrate || null),
                    cadence: laps.map(l => l.average_cadence || null),
                    elevation: laps.map(l => l.total_elevation_gain || null),
                    grade: laps.map(() => null),
                }
            };
        }

        const timeData = streams.time.data;

        // Build full dataset
        const fullData = timeData.map((time, index) => {
            const velocity = streams.velocity_smooth?.data[index] || 0;
            const distance = streams.distance?.data[index] || 0;

            const xLabel = xAxisType === 'time' ? formatTime(time) : formatDistance(distance);

            return {
                xLabel,
                pace: metersPerSecondToPace(velocity),
                heartRate: streams.heartrate?.data[index] || null,
                cadence: streams.cadence?.data[index] || null,
                elevation: streams.altitude?.data[index] || null,
                grade: streams.grade_smooth?.data[index] || null,
            };
        });

        const sampledData = downsampleData(fullData, resolution);

        return {
            xAxisData: sampledData.map(d => d.xLabel),
            series: {
                pace: sampledData.map(d => d.pace),
                heartRate: sampledData.map(d => d.heartRate),
                cadence: sampledData.map(d => d.cadence),
                elevation: sampledData.map(d => d.elevation),
                grade: sampledData.map(d => d.grade),
            }
        };
    }, [streams, laps, xAxisType, resolution]);

    // Build ECharts option
    const option = useMemo(() => {
        const yAxisArray: any[] = [];
        const seriesArray: any[] = [];
        let yAxisIndex = 0;

        // Check what data is available
        const hasHeartRateData = chartData.series.heartRate?.some((v: any) => v !== null);
        const hasCadenceData = chartData.series.cadence?.some((v: any) => v !== null);
        const hasElevationData = chartData.series.elevation?.some((v: any) => v !== null);
        const hasGradeData = chartData.series.grade?.some((v: any) => v !== null);

        // Pace axis (left, inverted) - Always shown
        // Calculate pace range from data
        const validPaces = (chartData.series.pace || []).filter((p: number) => p > 0 && p < 20);
        const minPace = validPaces.length > 0 ? Math.min(...validPaces) : 3;
        const maxPace = validPaces.length > 0 ? Math.max(...validPaces) : 8;

        // Add some padding to min/max
        const paceMin = Math.max(2, Math.floor(minPace - 0.5));
        const paceMax = Math.min(20, Math.ceil(maxPace + 0.5));

        yAxisArray.push({
            type: 'value',
            name: 'Pace',
            position: 'left',
            inverse: true,
            min: paceMin,
            max: paceMax,
            interval: 1, // 1 minute intervals
            show: legendSelected['Pace'] !== false, // Hide axis if metric is deselected
            axisLabel: {
                formatter: (value: number) => formatPace(value),
                color: '#06B6D4',
            },
            axisLine: { lineStyle: { color: '#06B6D4' } },
            splitLine: { show: false },
        });

        const paceSeries: any = {
            name: 'Pace',
            type: 'line',
            yAxisIndex: yAxisIndex,
            data: chartData.series.pace,
            smooth: true,
            lineStyle: { color: '#06B6D4', width: 2 },
            itemStyle: { color: '#06B6D4' },
            showSymbol: false,
        };

        seriesArray.push(paceSeries);
        yAxisIndex++;

        // Add lap markAreas as a separate invisible series if showLaps is enabled
        // This ensures laps are visible regardless of which metrics are selected
        if (showLaps && laps && laps.length > 0 && streams?.time && chartData.xAxisData.length > 0) {
            const lapMarkAreas: any[] = [];
            let cumulativeTime = 0;
            const timeData = streams.time.data;

            laps.forEach((lap, lapIdx) => {
                const lapStartTime = cumulativeTime;
                const lapEndTime = cumulativeTime + lap.elapsed_time;

                // Find the first and last data point indices in this lap
                let startIdx = -1; // Use -1 as sentinel to indicate not found yet
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

                // Only add markArea if we have valid indices (startIdx was found)
                if (startIdx >= 0 && startIdx < chartData.xAxisData.length && endIdx > startIdx) {
                    // Alternating colors with better contrast
                    const color = lapIdx % 2 === 0 ? 'rgba(100, 116, 139, 0.15)' : 'rgba(148, 163, 184, 0.15)';

                    lapMarkAreas.push([
                        { xAxis: chartData.xAxisData[startIdx], itemStyle: { color } },
                        { xAxis: chartData.xAxisData[Math.min(endIdx, chartData.xAxisData.length - 1)] }
                    ]);
                }

                cumulativeTime = lapEndTime;
            });

            if (lapMarkAreas.length > 0) {
                // Create an invisible series just for the lap markAreas
                seriesArray.push({
                    name: 'Lap Boundaries',
                    type: 'line',
                    yAxisIndex: 0, // Use the pace axis
                    data: [], // No actual data, just markAreas
                    lineStyle: { opacity: 0 }, // Invisible line
                    itemStyle: { opacity: 0 },
                    showSymbol: false,
                    silent: true, // Don't respond to mouse events
                    legendHoverLink: false, // Don't highlight on legend hover
                    animation: false,
                    markArea: {
                        silent: true,
                        data: lapMarkAreas,
                        label: { show: false }
                    }
                });
            }
        }

        // Heart Rate axis (right) with HR zones
        if (hasHeartRateData) {
            const hrYAxis: any = {
                type: 'value',
                name: 'Heart Rate',
                position: 'right',
                show: legendSelected['Heart Rate'] !== false,
                axisLabel: {
                    formatter: '{value} bpm',
                    color: '#A855F7',
                },
                axisLine: { lineStyle: { color: '#A855F7' } },
                splitLine: { show: false },
            };

            const hrSeries: any = {
                name: 'Heart Rate',
                type: 'line',
                yAxisIndex: yAxisIndex,
                data: chartData.series.heartRate,
                smooth: true,
                lineStyle: { color: '#A855F7', width: 2 },
                itemStyle: { color: '#A855F7' },
                showSymbol: false,
            };

            // Add HR zone backgrounds
            if (hrZones && hrZones.length > 0) {
                const zoneColors = [
                    'rgba(156, 163, 175, 0.1)',  // Z1 Gray
                    'rgba(59, 130, 246, 0.1)',   // Z2 Blue
                    'rgba(34, 197, 94, 0.1)',    // Z3 Green
                    'rgba(234, 179, 8, 0.1)',    // Z4 Yellow
                    'rgba(239, 68, 68, 0.1)',    // Z5 Red
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

        // Cadence (left offset)
        if (hasCadenceData) {
            yAxisArray.push({
                type: 'value',
                name: 'Cadence',
                position: 'left',
                offset: 60,
                show: legendSelected['Cadence'] !== false,
                axisLabel: {
                    formatter: '{value} spm',
                    color: '#F97316',
                },
                axisLine: { lineStyle: { color: '#F97316' } },
                splitLine: { show: false },
            });

            seriesArray.push({
                name: 'Cadence',
                type: 'line',
                yAxisIndex: yAxisIndex,
                data: chartData.series.cadence,
                smooth: true,
                lineStyle: { color: '#F97316', width: 2 },
                itemStyle: { color: '#F97316' },
                showSymbol: false,
            });
            yAxisIndex++;
        }

        // Elevation/Altitude axis (right, offset)
        if (hasElevationData) {
            yAxisArray.push({
                type: 'value',
                name: 'Elevation',
                position: 'right',
                offset: hasHeartRateData ? 60 : 0,
                show: legendSelected['Elevation'] !== false,
                axisLabel: {
                    formatter: '{value} m',
                    color: '#22C55E',
                },
                axisLine: { lineStyle: { color: '#22C55E' } },
                splitLine: { show: false },
            });

            seriesArray.push({
                name: 'Elevation',
                type: 'line',
                yAxisIndex: yAxisIndex,
                data: chartData.series.elevation,
                smooth: true,
                areaStyle: { color: 'rgba(34, 197, 94, 0.2)' },
                lineStyle: { color: '#22C55E', width: 1 },
                itemStyle: { color: '#22C55E' },
                showSymbol: false,
            });
            yAxisIndex++;
        }

        // Grade (right, offset)
        if (hasGradeData) {
            yAxisArray.push({
                type: 'value',
                name: 'Grade',
                position: 'right',
                offset: (hasHeartRateData ? 60 : 0) + (hasElevationData ? 60 : 0),
                show: legendSelected['Grade'] !== false,
                axisLabel: {
                    formatter: '{value}%',
                    color: '#EAB308',
                },
                axisLine: { lineStyle: { color: '#EAB308' } },
                splitLine: { show: false },
            });

            seriesArray.push({
                name: 'Grade',
                type: 'line',
                yAxisIndex: yAxisIndex,
                data: chartData.series.grade,
                smooth: true,
                lineStyle: { color: '#EAB308', width: 2 },
                itemStyle: { color: '#EAB308' },
                showSymbol: false,
            });
        }

        // Calculate grid margins
        const leftMargin = hasCadenceData ? 100 : 60;
        const rightMargin = 60 + (hasHeartRateData ? 60 : 0) + (hasElevationData ? 60 : 0) + (hasGradeData ? 60 : 0);

        return {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross',
                    label: { backgroundColor: '#6a7985' }
                },
                formatter: (params: any) => {
                    let tooltipText = `<strong>${params[0].axisValue}</strong><br/>`;
                    params.forEach((param: any) => {
                        // Skip the invisible Lap Boundaries series
                        if (param.seriesName === 'Lap Boundaries') return;

                        if (param.seriesName === 'Pace' && param.value) {
                            tooltipText += `${param.marker} ${param.seriesName}: ${formatPace(param.value)}<br/>`;
                        } else if (param.value !== null && param.value !== undefined) {
                            tooltipText += `${param.marker} ${param.seriesName}: ${param.value.toFixed(1)}<br/>`;
                        }
                    });
                    return tooltipText;
                }
            },
            legend: {
                data: seriesArray.map(s => s.name).filter(name => name !== 'Lap Boundaries'),
                top: 0,
                textStyle: { color: '#9CA3AF' },
            },
            grid: {
                left: leftMargin,
                right: rightMargin,
                bottom: 50,
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
    }, [chartData, hrZones, xAxisType, showLaps, laps, streams, legendSelected]);

    // Event handler for legend selection changes
    const onChartEvents = {
        legendselectchanged: (params: any) => {
            setLegendSelected(params.selected);
        }
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="py-12">
                    <p className="text-center text-muted-foreground">Loading activity data...</p>
                </CardContent>
            </Card>
        );
    }

    if (!chartData.xAxisData.length) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between flex-wrap gap-4">
                    <CardTitle className="flex items-center gap-2">
                        <span>📊</span>
                        Activity Dynamics
                    </CardTitle>

                    {/* Controls */}
                    <div className="flex flex-wrap gap-3 items-center">
                        {/* X-Axis Selector */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">X-Axis:</span>
                            <Select value={xAxisType} onValueChange={(value: XAxisType) => setXAxisType(value)}>
                                <SelectTrigger className="w-[120px] h-8">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="time">Time</SelectItem>
                                    <SelectItem value="distance">Distance</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Resolution Selector */}
                        {streams && (
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">Detail:</span>
                                <Select value={resolution} onValueChange={(value: Resolution) => setResolution(value)}>
                                    <SelectTrigger className="w-[120px] h-8">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Show Laps Toggle */}
                        {laps && laps.length > 0 && (
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">Laps:</span>
                                <Select value={showLaps ? "show" : "hide"} onValueChange={(value) => setShowLaps(value === "show")}>
                                    <SelectTrigger className="w-[100px] h-8">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="hide">Hide</SelectItem>
                                        <SelectItem value="show">Show</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
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
