'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ComposedChart, Bar, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Button } from '@/components/ui/button';
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

interface ActivityDynamicsChartProps {
    activityId: string;
    laps?: Lap[];
    isRunning: boolean;
}

type Resolution = 'low' | 'medium' | 'high';
type XAxisType = 'time' | 'distance' | 'lap';

// Custom X-axis tick for lap view
const CustomLapTick = (props: any) => {
    const { x, y, payload } = props;

    // Extract lap number from xValue (format: "L1.5" -> "L1")
    const match = payload.value?.match(/^L(\d+)/);
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
                Lap {lapNum}
            </text>
        </g>
    );
};

export function ActivityDynamicsChart({ activityId, laps, isRunning }: ActivityDynamicsChartProps) {
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
    const prepareChartData = () => {
        if (!streams || !streams.time) {
            // Fallback to laps data
            if (!laps || laps.length === 0) return [];

            return laps.map((lap) => {
                const paceMinutes = metersPerSecondToPace(lap.average_speed);
                return {
                    xValue: `L${lap.lap_index}`,
                    xLabel: `Lap ${lap.lap_index}`,
                    pace: paceMinutes > 0 ? 10 - paceMinutes : 0,
                    paceDisplay: formatPaceString(paceMinutes),
                    heartRate: lap.average_heartrate || null,
                    cadence: lap.average_cadence || null,
                    elevation: lap.total_elevation_gain || null,
                    grade: null,
                };
            });
        }

        // Use streams data
        const timeData = streams.time.data;

        // Create full dataset
        const fullData = timeData.map((time, index) => {
            const velocity = streams.velocity_smooth?.data[index] || 0;
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
                    let pointsBeforeLap = 0;

                    for (let i = 0; i < laps.length; i++) {
                        const lapEndTime = cumulativeTime + laps[i].elapsed_time;
                        if (time <= lapEndTime) {
                            lapIndex = laps[i].lap_index;
                            // Calculate position within this lap
                            const pointsInPreviousLaps = timeData.filter((t, idx) => idx < index && t <= cumulativeTime).length;
                            lapPointIndex = index - pointsInPreviousLaps;
                            xValue = `L${lapIndex}.${lapPointIndex}`;
                            xLabel = `Lap ${lapIndex}`;
                            break;
                        }
                        cumulativeTime = lapEndTime;
                    }
                    // If not found, assign to last lap
                    if (!lapIndex && laps.length > 0) {
                        lapIndex = laps[laps.length - 1].lap_index;
                        xValue = `L${lapIndex}.${index}`;
                        xLabel = `Lap ${lapIndex}`;
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
                pace: paceMinutes > 0 ? 10 - paceMinutes : 0,
                paceDisplay: formatPaceString(paceMinutes),
                heartRate: streams.heartrate?.data[index] || null,
                cadence: streams.cadence?.data[index] || null,
                elevation: streams.altitude?.data[index] || null,
                grade: streams.grade_smooth?.data[index] || null,
            };
        });

        return downsampleData(fullData, resolution);
    };

    const chartData = prepareChartData();

    // Custom tooltip
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-gray-900 border border-gray-700 p-3 rounded-lg shadow-lg">
                    <p className="font-semibold text-white mb-2">{data.xLabel}</p>
                    {data.time !== undefined && (
                        <p className="text-xs text-gray-400">Time: {formatTime(data.time)}</p>
                    )}
                    {data.distance !== undefined && (
                        <p className="text-xs text-gray-400">Distance: {formatDistance(data.distance)}</p>
                    )}
                    {visibleMetrics.pace && data.paceDisplay && (
                        <p className="text-sm text-cyan-400">Pace: {data.paceDisplay} min/km</p>
                    )}
                    {visibleMetrics.heartRate && data.heartRate && (
                        <p className="text-sm text-purple-400">HR: {data.heartRate.toFixed(0)} bpm</p>
                    )}
                    {visibleMetrics.cadence && data.cadence && (
                        <p className="text-sm text-orange-400">Cadence: {data.cadence.toFixed(0)} spm</p>
                    )}
                    {visibleMetrics.elevation && data.elevation && (
                        <p className="text-sm text-green-400">Elevation: {data.elevation.toFixed(0)} m</p>
                    )}
                    {visibleMetrics.grade && data.grade && (
                        <p className="text-sm text-yellow-400">Grade: {data.grade.toFixed(1)}%</p>
                    )}
                </div>
            );
        }
        return null;
    };

    const hasHeartRate = streams?.heartrate || laps?.some(lap => lap.average_heartrate);
    const hasCadence = streams?.cadence || laps?.some(lap => lap.average_cadence);
    const hasElevation = streams?.altitude || laps?.some(lap => lap.total_elevation_gain);
    const hasGrade = !!streams?.grade_smooth;

    const toggleMetric = (metric: keyof typeof visibleMetrics) => {
        setVisibleMetrics(prev => ({ ...prev, [metric]: !prev[metric] }));
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

    if (chartData.length === 0) {
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
                                    {laps && laps.length > 0 && <SelectItem value="lap">Lap</SelectItem>}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Resolution Selector - only show if using streams */}
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
                    </div>
                </div>

                {/* Metric toggles */}
                <div className="flex gap-2 flex-wrap mt-3">
                    <Button
                        variant={visibleMetrics.pace ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleMetric('pace')}
                        className={visibleMetrics.pace ? "bg-cyan-500 hover:bg-cyan-600" : ""}
                    >
                        Pace
                    </Button>
                    {hasHeartRate && (
                        <Button
                            variant={visibleMetrics.heartRate ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleMetric('heartRate')}
                            className={visibleMetrics.heartRate ? "bg-purple-500 hover:bg-purple-600" : ""}
                        >
                            Heart Rate
                        </Button>
                    )}
                    {hasCadence && (
                        <Button
                            variant={visibleMetrics.cadence ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleMetric('cadence')}
                            className={visibleMetrics.cadence ? "bg-orange-500 hover:bg-orange-600" : ""}
                        >
                            Cadence
                        </Button>
                    )}
                    {hasElevation && (
                        <Button
                            variant={visibleMetrics.elevation ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleMetric('elevation')}
                            className={visibleMetrics.elevation ? "bg-green-500 hover:bg-green-600" : ""}
                        >
                            Elevation
                        </Button>
                    )}
                    {hasGrade && (
                        <Button
                            variant={visibleMetrics.grade ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleMetric('grade')}
                            className={visibleMetrics.grade ? "bg-yellow-500 hover:bg-yellow-600 text-gray-900" : ""}
                        >
                            Grade
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart
                        data={chartData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                        <XAxis
                            dataKey="xValue"
                            stroke="#9CA3AF"
                            style={{ fontSize: '11px' }}
                            interval={xAxisType === 'lap' ? 'preserveEnd' : 'preserveStartEnd'}
                            tick={xAxisType === 'lap' ? <CustomLapTick /> : undefined}
                        />

                        {/* Left Y-axis for pace/cadence/grade */}
                        <YAxis
                            yAxisId="left"
                            stroke="#9CA3AF"
                            style={{ fontSize: '12px' }}
                            hide
                        />

                        {/* Right Y-axis for heart rate */}
                        {hasHeartRate && visibleMetrics.heartRate && (
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                stroke="#A855F7"
                                style={{ fontSize: '12px' }}
                                label={{ value: 'HR', angle: 90, position: 'insideRight', fill: '#A855F7' }}
                            />
                        )}

                        <Tooltip content={<CustomTooltip />} />

                        {/* Pace bars */}
                        {visibleMetrics.pace && (
                            <Bar
                                yAxisId="left"
                                dataKey="pace"
                                name="Pace"
                                fill="#06B6D4"
                                radius={[4, 4, 0, 0]}
                                opacity={0.8}
                            />
                        )}

                        {/* Cadence bars */}
                        {visibleMetrics.cadence && hasCadence && (
                            <Bar
                                yAxisId="left"
                                dataKey="cadence"
                                name="Cadence"
                                fill="#F97316"
                                radius={[4, 4, 0, 0]}
                                opacity={0.8}
                            />
                        )}

                        {/* Grade bars */}
                        {visibleMetrics.grade && hasGrade && (
                            <Bar
                                yAxisId="left"
                                dataKey="grade"
                                name="Grade"
                                fill="#EAB308"
                                radius={[4, 4, 0, 0]}
                                opacity={0.8}
                            />
                        )}

                        {/* Elevation area */}
                        {visibleMetrics.elevation && hasElevation && (
                            <Area
                                yAxisId="left"
                                type="monotone"
                                dataKey="elevation"
                                name="Elevation"
                                stroke="#22C55E"
                                fill="#22C55E"
                                fillOpacity={0.3}
                                strokeWidth={2}
                            />
                        )}

                        {/* Heart Rate line */}
                        {visibleMetrics.heartRate && hasHeartRate && (
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="heartRate"
                                name="Heart Rate"
                                stroke="#A855F7"
                                strokeWidth={3}
                                dot={false}
                                strokeDasharray="5 5"
                            />
                        )}
                    </ComposedChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
