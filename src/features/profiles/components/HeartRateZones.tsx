'use client';

import { HeartRateZones as HeartRateZonesType } from '@/interfaces/athlete';
import { useTranslations } from 'next-intl';

interface HeartRateZonesProps {
    zones: HeartRateZonesType | null | undefined;
}

const ZONE_COLORS = [
    'bg-blue-400',
    'bg-emerald-400',
    'bg-yellow-400',
    'bg-orange-400',
    'bg-destructive',
];

const ZONE_LABEL_KEYS = ['z1', 'z2', 'z3', 'z4', 'z5'] as const;

function formatZoneRange(zone: { min: number; max: number }, isLastZone: boolean) {
    const openEnded = isLastZone || zone.max <= 0 || zone.max < zone.min;

    if (openEnded) {
        return `${zone.min}+ bpm`;
    }

    return `${zone.min}–${zone.max} bpm`;
}

export function HeartRateZones({ zones }: HeartRateZonesProps) {
    const t = useTranslations('profile.hrZones');

    if (!zones || !zones.zones || zones.zones.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-endurix-black/10 dark:border-border bg-white/50 dark:bg-white/5 p-4">
                <p className="text-sm font-medium text-endurix-black dark:text-foreground">
                    {t('empty')}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                    {t('emptyHelp')}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="rounded-2xl border border-endurix-black/10 dark:border-border bg-endurix-black/5 dark:bg-white/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                            {t('title')}
                        </p>
                        <p className="mt-1 text-sm text-endurix-black dark:text-foreground">
                            {zones.custom_zones ? t('customSource') : t('standardSource')}
                        </p>
                    </div>
                    <span className="rounded-full border border-endurix-black/10 dark:border-border bg-white/70 dark:bg-card px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                        {t('zoneCount', { count: zones.zones.length })}
                    </span>
                </div>
            </div>

            <div className="space-y-2">
                {zones.zones.map((zone, index) => {
                    const color = ZONE_COLORS[index] ?? 'bg-muted-foreground';
                    const labelKey = ZONE_LABEL_KEYS[index];
                    const label = labelKey ? t(`labels.${labelKey}`) : `Z${index + 1}`;
                    const range = formatZoneRange(zone, index === zones.zones.length - 1);

                    return (
                        <div key={`${label}-${zone.min}-${zone.max}`} className="flex items-stretch gap-3 rounded-2xl border border-endurix-black/10 dark:border-border bg-white/80 dark:bg-card px-4 py-3">
                            <div className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${color}`} />
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                                            {label}
                                        </p>
                                        <p className="mt-1 text-sm font-semibold text-endurix-black dark:text-foreground tabular-nums">
                                            {range}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
