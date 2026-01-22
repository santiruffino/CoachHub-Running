'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

interface Split {
    distance: number;
    elapsed_time: number;
    elevation_difference: number;
    moving_time: number;
    split: number;
    average_speed: number;
    average_heartrate?: number;
    pace_zone?: number;
}

interface PaceZonesChartProps {
    laps?: Lap[];
    splits?: Split[];
    isRunning: boolean;
}

// Standard pace zones for running (min/km)
const PACE_ZONES = [
    { name: 'Z1 - Recovery', min: 360, max: 420 }, // 6:00-7:00 min/km
    { name: 'Z2 - Easy', min: 300, max: 360 }, // 5:00-6:00 min/km
    { name: 'Z3 - Tempo', min: 240, max: 300 }, // 4:00-5:00 min/km
    { name: 'Z4 - Threshold', min: 210, max: 240 }, // 3:30-4:00 min/km
    { name: 'Z5 - Anaerobic', min: 0, max: 210 }, // <3:30 min/km
];

export function PaceZonesChart({ laps, splits, isRunning }: PaceZonesChartProps) {
    if (!isRunning) {
        return null; // Only show for running activities
    }

    // Convert m/s to seconds per km
    const metersPerSecondToPace = (mps: number): number => {
        if (mps === 0) return 999;
        return 1000 / (mps * 60); // seconds per km
    };

    const formatPaceTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Calculate time in each pace zone
    const calculatePaceDistribution = (): Array<{ zone: number; time: number; percentage: number }> => {
        const zoneDistribution = new Array(PACE_ZONES.length).fill(0);
        let totalTime = 0;

        const dataSource = laps || splits || [];

        dataSource.forEach((item: any) => {
            const pace = metersPerSecondToPace(item.average_speed);
            const time = item.moving_time || item.elapsed_time;

            if (!time) return;

            totalTime += time;

            // Determine which zone this pace falls into
            for (let i = 0; i < PACE_ZONES.length; i++) {
                const zone = PACE_ZONES[i];
                // Pace zones work in reverse (lower seconds = faster = higher zone)
                if (pace >= zone.max && (i === PACE_ZONES.length - 1 || pace < PACE_ZONES[i].min)) {
                    zoneDistribution[i] += time;
                    break;
                }
            }
        });

        // Convert to percentage and format
        return zoneDistribution.map((time, index) => ({
            zone: index + 1,
            time,
            percentage: totalTime > 0 ? (time / totalTime) * 100 : 0,
        })).reverse(); // Reverse to show fastest first
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const distribution = calculatePaceDistribution();
    const totalTime = distribution.reduce((sum, d) => sum + d.time, 0);

    const zoneColors = [
        'bg-red-500', // Z5 - Anaerobic
        'bg-orange-500', // Z4 - Threshold
        'bg-yellow-500', // Z3 - Tempo
        'bg-green-500', // Z2 - Easy
        'bg-blue-500', // Z1 - Recovery
    ];

    const reversedZones = [...PACE_ZONES].reverse();
    const reversedNames = [...PACE_ZONES].map(z => z.name).reverse();

    return (
        <Card>
            <CardHeader>
                <CardTitle>Pace Zones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {distribution.map((item, index) => {
                    if (item.time === 0) return null;

                    const zone = reversedZones[index];

                    return (
                        <div key={index} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium">{reversedNames[index]}</span>
                                <div className="flex items-center gap-3">
                                    <span className="text-muted-foreground">
                                        {formatTime(item.time)} ({item.percentage.toFixed(1)}%)
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {formatPaceTime(zone.max)} - {formatPaceTime(zone.min)} min/km
                                    </span>
                                </div>
                            </div>
                            <div className="relative h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className={`absolute top-0 left-0 h-full ${zoneColors[index]} transition-all duration-500`}
                                    style={{ width: `${item.percentage}%` }}
                                />
                            </div>
                        </div>
                    );
                })}

                {totalTime === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                        No pace data available for this activity.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
