'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'next-intl';

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

type PaceDataItem = Pick<Lap, 'average_speed' | 'moving_time' | 'elapsed_time'>;

// Standard pace zones for running (min/km)
const PACE_ZONES = [
    { key: 'z1', min: 360, max: 420 }, // 6:00-7:00 min/km
    { key: 'z2_pace', min: 300, max: 360 }, // 5:00-6:00 min/km
    { key: 'z3', min: 240, max: 300 }, // 4:00-5:00 min/km
    { key: 'z4', min: 210, max: 240 }, // 3:30-4:00 min/km
    { key: 'z5_pace', min: 0, max: 210 }, // <3:30 min/km
];

export function PaceZonesChart({ laps, splits, isRunning }: PaceZonesChartProps) {
    const t = useTranslations('activities.detail.zones');

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

        const dataSource: PaceDataItem[] = laps ?? splits ?? [];

        dataSource.forEach((item) => {
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
    const reversedNames = [...PACE_ZONES]
        .map((zone) => t(`names.${zone.key}`))
        .reverse();

    return (
        <Card className="bg-endurix-paper dark:bg-card border border-endurix-black/10 dark:border-border">
            <CardHeader className="border-b border-endurix-black/10 dark:border-border">
                <CardTitle
                    className="text-base uppercase tracking-widest font-bold text-endurix-black dark:text-foreground"
                    style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                >
                    {t('paceTitle')}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-6">
                {distribution.map((item, index) => {
                    if (item.time === 0) return null;

                    const zone = reversedZones[index];

                    return (
                        <div key={index} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                                <span
                                    className="font-bold text-[10px] uppercase tracking-widest text-endurix-black dark:text-foreground"
                                    style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                                >{reversedNames[index]}</span>
                                <div className="flex items-center gap-3">
                                    <span
                                        className="text-[10px] text-endurix-black/50 dark:text-muted-foreground uppercase tracking-widest"
                                        style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                                    >
                                        {formatTime(item.time)} ({item.percentage.toFixed(1)}%)
                                    </span>
                                    <span
                                        className="text-[10px] text-endurix-black/40 dark:text-muted-foreground uppercase tracking-widest"
                                        style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                                    >
                                        {formatPaceTime(zone.max)} - {formatPaceTime(zone.min)} min/km
                                    </span>
                                </div>
                            </div>
                            <div className="relative h-1.5 bg-endurix-black/15 dark:bg-border overflow-hidden">
                                <div
                                    className={`absolute top-0 left-0 h-full ${zoneColors[index]} transition-all duration-500`}
                                    style={{ width: `${item.percentage}%` }}
                                />
                            </div>
                        </div>
                    );
                })}

                {totalTime === 0 && (
                    <p className="text-sm text-endurix-black/50 dark:text-muted-foreground text-center py-8">
                        {t('noPaceData')}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
