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

interface HeartRateZone {
    min: number;
    max: number;
}

interface HeartRateZonesChartProps {
    laps?: Lap[];
    splits?: Split[];
    zones: Array<HeartRateZone>;
    zoneNames?: string[];
}

export function HeartRateZonesChart({ laps, splits, zones, zoneNames }: HeartRateZonesChartProps) {
    const t = useTranslations('activities.detail.zones');
    
    const defaultZoneNames = [
        t('names.z1'),
        t('names.z2_hr'),
        t('names.z3'),
        t('names.z4'),
        t('names.z5_hr')
    ];

    const actualZoneNames = zoneNames || defaultZoneNames;

    // Calculate time in each zone from laps or splits
    const calculateZoneDistribution = (): Array<{ zone: number; time: number; percentage: number }> => {
        const zoneDistribution = new Array(zones.length).fill(0);
        let totalTime = 0;

        const dataSource = laps || splits || [];

        dataSource.forEach((item: any) => {
            const hr = item.average_heartrate;
            const time = item.moving_time || item.elapsed_time;

            if (!hr || !time) return;

            totalTime += time;

            // Determine which zone this heart rate falls into
            for (let i = 0; i < zones.length; i++) {
                const zone = zones[i];
                if (i === zones.length - 1) {
                    // Last zone: only check minimum
                    if (hr >= zone.min) {
                        zoneDistribution[i] += time;
                        break;
                    }
                } else {
                    // Other zones: check range
                    if (hr >= zone.min && hr < zone.max) {
                        zoneDistribution[i] += time;
                        break;
                    }
                }
            }
        });

        // Convert to percentage and format
        return zoneDistribution.map((time, index) => ({
            zone: index + 1,
            time,
            percentage: totalTime > 0 ? (time / totalTime) * 100 : 0,
        }));
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const distribution = calculateZoneDistribution();
    const totalTime = distribution.reduce((sum, d) => sum + d.time, 0);

    const zoneColors = [
        'bg-gray-400',
        'bg-blue-500',
        'bg-green-500',
        'bg-yellow-500',
        'bg-red-500',
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('hrTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {distribution.map((item, index) => {
                    if (item.time === 0) return null;

                    return (
                        <div key={index} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium">{actualZoneNames[index]}</span>
                                <div className="flex items-center gap-3">
                                    <span className="text-muted-foreground">
                                        {formatTime(item.time)} ({item.percentage.toFixed(1)}%)
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {zones[index].min}-{index === zones.length - 1 ? zones[index].max : zones[index].max} ppm
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
                        {t('noHrData')}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
