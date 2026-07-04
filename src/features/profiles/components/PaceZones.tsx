'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { VAM_ZONES, calculateTargetPace, formatSecondsToPace, parsePaceToSeconds } from '@/features/profiles/constants/vam';

interface PaceZonesProps {
    vam: string | null | undefined;
}

const ZONE_COLORS = [
    'bg-blue-400',
    'bg-emerald-400',
    'bg-yellow-400',
    'bg-orange-400',
    'bg-destructive',
];

const ZONE_PERCENTAGES = [5, 18, 40, 25, 12];

export function PaceZones({ vam }: PaceZonesProps) {
    const t = useTranslations();

    const vamSeconds = vam ? parsePaceToSeconds(vam) : 0;

    if (!vam || vamSeconds === 0) {
        return (
            <p className="text-sm text-muted-foreground">
                {t('dashboard.fitness.paceZonesEmpty')}{' '}
                <Link
                    href="/profile"
                    className="text-endurix-orange underline underline-offset-2 hover:opacity-80"
                >
                    {t('dashboard.fitness.paceZonesEmptyLink')}
                </Link>
            </p>
        );
    }

    return (
        <div className="space-y-3">
            {VAM_ZONES.map((zone, index) => {
                const minPace = calculateTargetPace(vam, zone.max);
                const maxPace = calculateTargetPace(vam, zone.min);
                const color = ZONE_COLORS[index] ?? 'bg-muted-foreground';
                const percentage = ZONE_PERCENTAGES[index] ?? 0;

                return (
                    <div key={zone.zone} className="flex items-center gap-3">
                        <div className={`w-2 h-2 shrink-0 ${color}`} />
                        <span
                            className="text-xs font-medium text-muted-foreground w-36 shrink-0 uppercase tracking-wider"
                            style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                        >
                            Z{zone.zone} — {zone.name}
                        </span>
                        <span
                            className="text-xs font-semibold text-endurix-black dark:text-foreground w-20 text-right tabular-nums"
                            style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                        >
                            {maxPace}–{minPace}
                            <span className="text-[10px] text-muted-foreground ml-0.5">/km</span>
                        </span>
                        <div className="flex-1 h-1.5 bg-endurix-black/10 dark:bg-border">
                            <div
                                className={`h-full ${color} transition-all duration-500`}
                                style={{ width: `${percentage}%` }}
                            />
                        </div>
                    </div>
                );
            })}
            <p
                className="pt-2 text-[10px] text-muted-foreground tracking-widest uppercase"
                style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
            >
                {t('dashboard.fitness.paceZonesVamLabel')}{' '}
                <span className="text-endurix-black dark:text-foreground font-semibold">
                    {formatSecondsToPace(vamSeconds)}
                </span>{' '}
                {t('dashboard.fitness.paceZonesVamUnit')}
            </p>
        </div>
    );
}
