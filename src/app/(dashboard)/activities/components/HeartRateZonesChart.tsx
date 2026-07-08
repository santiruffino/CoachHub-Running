'use client';

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

type HeartRateDataItem = Pick<Lap, 'average_heartrate' | 'moving_time' | 'elapsed_time'>;

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

    const calculateZoneDistribution = (): Array<{ zone: number; time: number; percentage: number }> => {
        const zoneDistribution = new Array(zones.length).fill(0);
        let totalTime = 0;

        const dataSource: HeartRateDataItem[] = laps ?? splits ?? [];

        dataSource.forEach((item) => {
            const hr = item.average_heartrate;
            const time = item.moving_time || item.elapsed_time;

            if (!hr || !time) return;

            totalTime += time;

            for (let i = 0; i < zones.length; i++) {
                const zone = zones[i];
                if (i === zones.length - 1) {
                    if (hr >= zone.min) {
                        zoneDistribution[i] += time;
                        break;
                    }
                } else {
                    if (hr >= zone.min && hr < zone.max) {
                        zoneDistribution[i] += time;
                        break;
                    }
                }
            }
        });

        return zoneDistribution.map((time, index) => ({
            zone: index + 1,
            time,
            percentage: totalTime > 0 ? (time / totalTime) * 100 : 0,
        }));
    };

    const distribution = calculateZoneDistribution();
    const totalTime = distribution.reduce((sum, d) => sum + d.time, 0);

    const zoneColors = [
        'bg-gray-400',
        'bg-green-500',
        'bg-yellow-500',
        'bg-orange-500',
        'bg-destructive',
    ];

    if (totalTime === 0) {
        return (
            <p className="text-sm text-endurix-black/50 dark:text-muted-foreground text-center py-8">
                {t('noHrData')}
            </p>
        );
    }

    return (
        <div className="space-y-3">
            {distribution.map((item, index) => {
                if (item.time === 0) return null;

                return (
                    <div key={index} className="flex items-center gap-4">
                        <div className="w-[120px] sm:w-[180px] shrink-0">
                            <span
                                className="text-[10px] font-bold text-endurix-black/50 dark:text-muted-foreground tracking-widest uppercase"
                                style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                            >
                                {actualZoneNames[index]}
                            </span>
                            <p
                                className="text-[9px] text-endurix-black/40 dark:text-muted-foreground mt-0.5"
                                style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                            >
                                ({zones[index].min}-{zones[index].max} bpm)
                            </p>
                        </div>
                        <div className="flex-1 h-1.5 bg-endurix-black/15 dark:bg-border relative">
                            <div
                                className={`absolute inset-y-0 left-0 ${zoneColors[index]} transition-all duration-500`}
                                style={{ width: `${item.percentage}%` }}
                            />
                        </div>
                        <span
                            className="text-[10px] font-bold text-endurix-black dark:text-foreground w-12 text-right"
                            style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                        >
                            {item.percentage.toFixed(0)}%
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
