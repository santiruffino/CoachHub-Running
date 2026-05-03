'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ComposedChart, Bar, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslations } from 'next-intl';
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
    average_heartrate_max?: number;
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

interface ActivityDynamicsChartProps {
    activityId: string;
    laps?: Lap[];
}

type Resolution = 'low' | 'medium' | 'high';
type XAxisType = 'time' | 'distance' | 'lap';

interface ChartDataPoint {
    index?: number;
    xValue: string;
    xLabel: string;
    lapIndex?: number;
    lapPointIndex?: number;
    time?: number;
    distance?: number;
    pace: number;
    paceDisplay: string;
    heartRate: number | null;
    cadence: number | null;
    elevation: number | null;
    grade: number | null;
}

interface LapTickPayload {
    value?: string;
}

interface LapTickProps {
    x?: number;
    y?: number;
    payload?: LapTickPayload;
    t: (key: string) => string;
}

interface TooltipEntry {
    payload?: ChartDataPoint;
}

interface TooltipProps {
    active?: boolean;
    payload?: TooltipEntry[];
}

/**
 * Moving average filter to smooth "peaky" data
 */
const movingAverage = (data: number[], windowSize: number): number[] => {
    if (!data || data.length === 0) return [];
    const result: number[] = [];
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
        result.push(count > 0 ? sum / count : 0);
    }
    return result;
};

/**
 * Largest-Triangle-Three-Buckets (LTTB) algorithm
 * Downsamples data while preserving visual shape/peaks
 */
const lttbDownsample = <T extends Record<string, unknown>>(data: T[], threshold: number, yKey: keyof T): T[] => {
    const dataLength = data.length;
    if (threshold >= dataLength || threshold <= 0) return data;

    const sampled: T[] = [];
    let sampledIndex = 0;

    // Bucket size. Leave room for start and end data points
    const bucketSize = (dataLength - 2) / (threshold - 2);

    let a = 0;
    let maxAreaPoint: T | undefined;
    let maxArea: number;
    let area: number;
    let nextA: number = 0;

    sampled[sampledIndex++] = data[a];

    for (let i = 0; i < threshold - 2; i++) {
        // Calculate point average for next bucket (containing c)
        let avgX = 0;
        let avgY = 0;
        let avgRangeStart = Math.floor((i + 1) * bucketSize) + 1;
        let avgRangeEnd = Math.floor((i + 2) * bucketSize) + 1;
        avgRangeEnd = avgRangeEnd < dataLength ? avgRangeEnd : dataLength;

        const avgRangeLength = avgRangeEnd - avgRangeStart;

        for (; avgRangeStart < avgRangeEnd; avgRangeStart++) {
            avgX += avgRangeStart; 
            avgY += (Number(data[avgRangeStart][yKey]) || 0);
        }
        avgX /= avgRangeLength;
        avgY /= avgRangeLength;

        // Get the range for this bucket
        let rangeOffs = Math.floor(i * bucketSize) + 1;
        const rangeTo = Math.floor((i + 1) * bucketSize) + 1;

        const pointAx = a;
        const pointAy = (Number(data[a][yKey]) || 0);

        maxArea = area = -1;

        for (; rangeOffs < rangeTo; rangeOffs++) {
            // Calculate triangle area over three buckets
            area = Math.abs((pointAx - avgX) * ((Number(data[rangeOffs][yKey]) || 0) - pointAy) -
                (pointAx - rangeOffs) * (avgY - pointAy)
            ) * 0.5;
            if (area > maxArea) {
                maxArea = area;
                maxAreaPoint = data[rangeOffs];
                nextA = rangeOffs;
            }
        }

        if (maxAreaPoint) {
            sampled[sampledIndex++] = maxAreaPoint;
        }
        a = nextA;
    }

    sampled[sampledIndex++] = data[dataLength - 1]; // Always add last point
    return sampled;
};

// Custom X-axis tick for lap view
const CustomLapTick = (props: LapTickProps) => {
    const { x, y, payload, t } = props;

    if (typeof x !== 'number' || typeof y !== 'number' || !payload?.value) {
        return null;
    }

    // Extract lap number from xValue (format: "L1.5" -> "L1")
    const match = payload.value.match(/^L(\d+)/);
    if (!match) return null;

    const lapNum = match[1];
    const isFirstPointInLap = payload.value.endsWith('.0') || !payload.value.includes('.');

    // Only show label for first point in lap to avoid clutter
    if (!isFirstPointInLap) return null;

    return (
        <g transform={`translate(${x},${y})`}>
            <text
                x={0}
                y={0}
                dy={16}
                textAnchor="middle"
                fill="#9CA3AF"
                fontSize="11px"
            >
                {t('laps')} {lapNum}
            </text>
        </g>
    );
};

export function ActivityDynamicsChart({ activityId, laps }: ActivityDynamicsChartProps) {
    const t = useTranslations('activities.detail.dynamics');
    const tDetail = useTranslations('activities.detail');
    const [streams, setStreams] = useState<StreamData | null>(null);
    const [loading, setLoading] = useState(true);
    const [resolution, setResolution] = useState<Resolution>('high');
    const [xAxisType, setXAxisType] = useState<XAxisType>('time');

    // Toggle state for each metric
    const [visibleMetrics, setVisibleMetrics] = useState({
        pace: true,
        heartRate: true,
        cadence: false,
        elevation: false,
        grade: false,
    });

    useEffect(() => {
        const fetchStreams = async () => {
            try {
                setLoading(true);
                const response = await api.get(`/v2/activities/${activityId}/streams`);
                setStreams(response.data);
            } catch (error) {
                console.error('Failed to fetch streams:', error);
                setStreams(null);
            } finally {
                setLoading(false);
            }
        };

        fetchStreams();
    }, [activityId]);

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

    // Convert m/s to min/km for pace
    const metersPerSecondToPace = (mps: number): number => {
        if (mps === 0) return 0;
        return 1000 / (mps * 60); // minutes per km
    };

    // Format pace as mm:ss string
    const formatPaceString = (paceMinutes: number): string => {
        if (paceMinutes === 0) return '0:00';
        const mins = Math.floor(paceMinutes);
        const secs = Math.round((paceMinutes - mins) * 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Prepare chart data from streams
    const chartData = useMemo(() => {
        if (!streams || !streams.time) {
            // Fallback to laps data
            if (!laps || laps.length === 0) return [];

            return laps.map((lap) => {
                const paceMinutes = metersPerSecondToPace(lap.average_speed);
                const displayIndex = lap.lap_index === 0 || (laps[0]?.lap_index === 0) ? lap.lap_index + 1 : lap.lap_index;
                return {
                    xValue: `L${displayIndex}`,
                    xLabel: `${t('laps')} ${displayIndex}`,
                    pace: paceMinutes > 0 ? Math.max(0, 10 - paceMinutes) : 0,
                    paceDisplay: formatPaceString(paceMinutes),
                    heartRate: lap.average_heartrate || null,
                    cadence: lap.average_cadence || null,
                    elevation: lap.total_elevation_gain || null,
                    grade: null,
                };
            });
        }

        // Apply smoothing to raw streams first (5-point moving average)
        const smoothedVelocity = movingAverage(streams.velocity_smooth?.data || [], 5);
        const smoothedHR = movingAverage(streams.heartrate?.data || [], 5);
        const smoothedCadence = movingAverage(streams.cadence?.data || [], 5);

        // Create full dataset
        const fullData = streams.time.data.map((time, index) => {
            const velocity = smoothedVelocity[index] || 0;
            const paceMinutes = metersPerSecondToPace(velocity);
            const distance = streams.distance?.data[index] || 0;

            // Determine X-axis value and lap assignment
            let xValue: string = '';
            let xLabel: string = '';
            let lapIndex: number | undefined;
            let lapPointIndex: number = 0;

            if (xAxisType === 'time') {
                xValue = formatTime(time);
                xLabel = xValue;
            } else if (xAxisType === 'distance') {
                xValue = formatDistance(distance);
                xLabel = xValue;
            } else {
                // Lap-based: find which lap this point belongs to by time
                if (laps && laps.length > 0) {
                    let cumulativeTime = 0;

                    for (let i = 0; i < laps.length; i++) {
                        const lapEndTime = cumulativeTime + laps[i].elapsed_time;
                        if (time <= lapEndTime) {
                            const rawLapIndex = laps[i].lap_index;
                            const displayIndex = rawLapIndex === 0 || (laps[0]?.lap_index === 0) ? rawLapIndex + 1 : rawLapIndex;
                            
                            // Calculate position within this lap
                            const pointsInPreviousLaps = streams.time!.data.filter((t, idx) => idx < index && t <= cumulativeTime).length;
                            lapPointIndex = index - pointsInPreviousLaps;
                            lapIndex = rawLapIndex;
                            xValue = `L${displayIndex}.${lapPointIndex}`;
                            xLabel = `${t('laps')} ${displayIndex}`;
                            break;
                        }
                        cumulativeTime = lapEndTime;
                    }
                    // If not found, assign to last lap
                    if (lapIndex === undefined && laps.length > 0) {
                        const lastLap = laps[laps.length - 1];
                        const rawLapIndex = lastLap.lap_index;
                        const displayIndex = rawLapIndex === 0 || (laps[0]?.lap_index === 0) ? rawLapIndex + 1 : rawLapIndex;
                        
                        lapIndex = rawLapIndex;
                        xValue = `L${displayIndex}.${index}`;
                        xLabel = `${t('laps')} ${displayIndex}`;
                    }
                } else {
                    xValue = formatTime(time);
                    xLabel = xValue;
                }
            }

            return {
                index,
                xValue,
                xLabel,
                lapIndex,
                lapPointIndex,
                time,
                distance,
                // Invert pace so higher = faster. Limit to 10 min/km base for the scale.
                pace: paceMinutes > 0 ? Math.max(0, 10 - paceMinutes) : 0,
                paceDisplay: formatPaceString(paceMinutes),
                heartRate: smoothedHR[index] || null,
                cadence: smoothedCadence[index] || null,
                elevation: streams.altitude?.data[index] || null,
                grade: streams.grade_smooth?.data[index] || null,
            };
        });

        // Advanced Downsampling using LTTB
        const thresholds = {
            low: 100,
            medium: 300,
            high: 600,
        };
        
        // Downsample based on pace as primary metric
        return lttbDownsample(fullData, thresholds[resolution], 'pace');
    }, [streams, resolution, xAxisType, laps, t]);

    // Custom tooltip
    const CustomTooltip = ({ active, payload }: TooltipProps) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            if (!data) return null;
            return (
                <div className="bg-gray-900 border border-gray-700 p-3 rounded-lg shadow-lg backdrop-blur-sm bg-opacity-90">
                    <p className="font-semibold text-white mb-2">{data.xLabel}</p>
                    <div className="space-y-1">
                        {data.time !== undefined && (
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('types.time')}: {formatTime(data.time)}</p>
                        )}
                        {data.distance !== undefined && (
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('types.distance')}: {formatDistance(data.distance)}</p>
                        )}
                        <div className="h-px bg-gray-700 my-2" />
                        {visibleMetrics.pace && data.paceDisplay && (
                            <div className="flex items-center justify-between gap-4">
                                <span className="text-sm text-cyan-400 font-medium">{t('metrics.pace')}</span>
                                <span className="text-sm text-cyan-300">{data.paceDisplay} {tDetail('metrics.units.perKm')}</span>
                            </div>
                        )}
                        {visibleMetrics.heartRate && data.heartRate && (
                            <div className="flex items-center justify-between gap-4">
                                <span className="text-sm text-purple-400 font-medium">{t('metrics.heartRate')}</span>
                                <span className="text-sm text-purple-300">{data.heartRate.toFixed(0)} {tDetail('metrics.units.bpm')}</span>
                            </div>
                        )}
                        {visibleMetrics.cadence && data.cadence && (
                            <div className="flex items-center justify-between gap-4">
                                <span className="text-sm text-orange-400 font-medium">{t('metrics.cadence')}</span>
                                <span className="text-sm text-orange-300">{data.cadence.toFixed(0)} {tDetail('metrics.units.spm')}</span>
                            </div>
                        )}
                        {visibleMetrics.elevation && data.elevation !== null && (
                            <div className="flex items-center justify-between gap-4">
                                <span className="text-sm text-green-400 font-medium">{t('metrics.elevation')}</span>
                                <span className="text-sm text-green-300">{data.elevation.toFixed(0)} {tDetail('metrics.units.m')}</span>
                            </div>
                        )}
                        {visibleMetrics.grade && data.grade !== null && (
                            <div className="flex items-center justify-between gap-4">
                                <span className="text-sm text-yellow-400 font-medium">{t('metrics.grade')}</span>
                                <span className="text-sm text-yellow-300">{data.grade.toFixed(1)}%</span>
                            </div>
                        )}
                    </div>
                </div>
            );
        }
        return null;
    };

    const hasHeartRate = !!(streams?.heartrate || laps?.some(lap => lap.average_heartrate));
    const hasCadence = !!(streams?.cadence || laps?.some(lap => lap.average_cadence));
    const hasElevation = !!(streams?.altitude || laps?.some(lap => lap.total_elevation_gain));
    const hasGrade = !!streams?.grade_smooth;

    const toggleMetric = (metric: keyof typeof visibleMetrics) => {
        setVisibleMetrics(prev => ({ ...prev, [metric]: !prev[metric] }));
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="py-12">
                    <p className="text-center text-muted-foreground">{t('loading')}</p>
                </CardContent>
            </Card>
        );
    }

    if (chartData.length === 0) {
        return null;
    }

    return (
        <Card className="border-gray-800 bg-gray-950/50">
            <CardHeader className="pb-2">
                <div className="flex items-start justify-between flex-wrap gap-4">
                    <CardTitle className="flex items-center gap-2 text-xl font-bold">
                        <TrendingUp className="w-5 h-5 text-cyan-500" />
                        {t('title')}
                    </CardTitle>

                    {/* Controls */}
                    <div className="flex flex-wrap gap-3 items-center">
                        {/* X-Axis Selector */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground uppercase font-semibold">{t('xAxis')}:</span>
                            <Select value={xAxisType} onValueChange={(value: XAxisType) => setXAxisType(value)}>
                                <SelectTrigger className="w-[110px] h-8 text-xs bg-gray-900 border-gray-700">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-900 border-gray-700">
                                    <SelectItem value="time">{t('types.time')}</SelectItem>
                                    <SelectItem value="distance">{t('types.distance')}</SelectItem>
                                    {laps && laps.length > 0 && <SelectItem value="lap">{t('laps')}</SelectItem>}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Resolution Selector - only show if using streams */}
                        {streams && (
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground uppercase font-semibold">{t('detail')}:</span>
                                <Select value={resolution} onValueChange={(value: Resolution) => setResolution(value)}>
                                    <SelectTrigger className="w-[100px] h-8 text-xs bg-gray-900 border-gray-700">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-900 border-gray-700">
                                        <SelectItem value="low">{t('resolutions.low')}</SelectItem>
                                        <SelectItem value="medium">{t('resolutions.medium')}</SelectItem>
                                        <SelectItem value="high">{t('resolutions.high')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                </div>

                {/* Metric toggles */}
                <div className="flex gap-2 flex-wrap mt-4">
                    <Button
                        variant={visibleMetrics.pace ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleMetric('pace')}
                        className={`text-xs h-7 ${visibleMetrics.pace ? "bg-cyan-500 hover:bg-cyan-600 text-white border-transparent" : "border-gray-700 text-gray-400"}`}
                    >
                        {t('metrics.pace')}
                    </Button>
                    {hasHeartRate && (
                        <Button
                            variant={visibleMetrics.heartRate ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleMetric('heartRate')}
                            className={`text-xs h-7 ${visibleMetrics.heartRate ? "bg-purple-500 hover:bg-purple-600 text-white border-transparent" : "border-gray-700 text-gray-400"}`}
                        >
                            {t('metrics.heartRate')}
                        </Button>
                    )}
                    {hasCadence && (
                        <Button
                            variant={visibleMetrics.cadence ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleMetric('cadence')}
                            className={`text-xs h-7 ${visibleMetrics.cadence ? "bg-orange-500 hover:bg-orange-600 text-white border-transparent" : "border-gray-700 text-gray-400"}`}
                        >
                            {t('metrics.cadence')}
                        </Button>
                    )}
                    {hasElevation && (
                        <Button
                            variant={visibleMetrics.elevation ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleMetric('elevation')}
                            className={`text-xs h-7 ${visibleMetrics.elevation ? "bg-green-500 hover:bg-green-600 text-white border-transparent" : "border-gray-700 text-gray-400"}`}
                        >
                            {t('metrics.elevation')}
                        </Button>
                    )}
                    {hasGrade && (
                        <Button
                            variant={visibleMetrics.grade ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleMetric('grade')}
                            className={`text-xs h-7 ${visibleMetrics.grade ? "bg-yellow-500 hover:bg-yellow-600 text-gray-900 border-transparent" : "border-gray-700 text-gray-400"}`}
                        >
                            {t('metrics.grade')}
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[400px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                            data={chartData}
                            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id="colorPace" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorHR" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#A855F7" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#A855F7" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorCadence" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorElevation" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} vertical={false} />
                            
                            <XAxis
                                dataKey="xValue"
                                stroke="#4B5563"
                                style={{ fontSize: '10px', fontWeight: 500 }}
                                interval={xAxisType === 'lap' ? 'preserveEnd' : 'preserveStartEnd'}
                                tick={xAxisType === 'lap' ? <CustomLapTick t={t} /> : { fill: '#9CA3AF' }}
                                axisLine={false}
                                tickLine={false}
                                dy={10}
                            />

                            {/* Left Y-axis for metrics */}
                            <YAxis
                                yAxisId="left"
                                hide
                                domain={[0, 'auto']}
                            />

                            {/* Right Y-axis for heart rate specifically */}
                            {hasHeartRate && visibleMetrics.heartRate && (
                                <YAxis
                                    yAxisId="right"
                                    orientation="right"
                                    stroke="#A855F7"
                                    style={{ fontSize: '10px' }}
                                    domain={['dataMin - 5', 'dataMax + 5']}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(val) => `${val}`}
                                />
                            )}

                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#4B5563', strokeWidth: 1, strokeDasharray: '4 4' }} />

                            {/* Pace Area - Main metric */}
                            {visibleMetrics.pace && (
                                <Area
                                    yAxisId="left"
                                    type="natural"
                                    dataKey="pace"
                                    stroke="#06B6D4"
                                    fill="url(#colorPace)"
                                    strokeWidth={2}
                                    activeDot={{ r: 4, strokeWidth: 0, fill: '#06B6D4' }}
                                    isAnimationActive={false}
                                />
                            )}

                            {/* Cadence Area */}
                            {visibleMetrics.cadence && hasCadence && (
                                <Area
                                    yAxisId="left"
                                    type="natural"
                                    dataKey="cadence"
                                    stroke="#F97316"
                                    fill="url(#colorCadence)"
                                    strokeWidth={2}
                                    activeDot={{ r: 4, strokeWidth: 0, fill: '#F97316' }}
                                    isAnimationActive={false}
                                />
                            )}

                            {/* Grade Bars (keep as bars for contrast) */}
                            {visibleMetrics.grade && hasGrade && (
                                <Bar
                                    yAxisId="left"
                                    dataKey="grade"
                                    fill="#EAB308"
                                    radius={[2, 2, 0, 0]}
                                    opacity={0.6}
                                    isAnimationActive={false}
                                />
                            )}

                            {/* Elevation area (background) */}
                            {visibleMetrics.elevation && hasElevation && (
                                <Area
                                    yAxisId="left"
                                    type="natural"
                                    dataKey="elevation"
                                    stroke="#22C55E"
                                    fill="url(#colorElevation)"
                                    strokeWidth={1}
                                    strokeOpacity={0.5}
                                    isAnimationActive={false}
                                />
                            )}

                            {/* Heart Rate area (overlay) */}
                            {visibleMetrics.heartRate && hasHeartRate && (
                                <Area
                                    yAxisId="right"
                                    type="natural"
                                    dataKey="heartRate"
                                    stroke="#A855F7"
                                    fill="url(#colorHR)"
                                    strokeWidth={2}
                                    activeDot={{ r: 4, strokeWidth: 0, fill: '#A855F7' }}
                                    isAnimationActive={false}
                                />
                            )}
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}

const TrendingUp = ({ className }: { className?: string }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className}
    >
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
        <polyline points="17 6 23 6 23 12"></polyline>
    </svg>
);
