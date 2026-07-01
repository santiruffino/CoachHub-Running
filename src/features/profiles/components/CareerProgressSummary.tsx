'use client';
import { appLogger } from '@/lib/app-logger';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { athletesService, CareerStatsResponse } from '@/features/users/services/athletes.service';

interface CareerProgressSummaryProps {
    athleteId: string;
}

function formatKm(meters: number): string {
    return (meters / 1000).toFixed(0);
}

export function CareerProgressSummary({ athleteId }: CareerProgressSummaryProps) {
    const t = useTranslations('profile.careerProgress');
    const [data, setData] = useState<CareerStatsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!athleteId) return;
        let cancelled = false;

        const load = async () => {
            try {
                setLoading(true);
                setError(false);
                const res = await athletesService.getCareerStats(athleteId);
                if (!cancelled) setData(res.data);
            } catch (err) {
                appLogger.error('Failed to fetch career stats:', err);
                if (!cancelled) setError(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        void load();
        return () => {
            cancelled = true;
        };
    }, [athleteId]);

    if (loading) {
        return (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, idx) => (
                    <div
                        key={idx}
                        className="h-[88px] animate-pulse rounded-2xl border border-endurix-black/10 dark:border-border bg-white/50 dark:bg-white/5"
                    />
                ))}
            </div>
        );
    }

    if (error || !data?.careerStats) {
        return (
            <div className="rounded-2xl border border-dashed border-endurix-black/10 dark:border-border bg-white/50 dark:bg-white/5 p-4">
                <p className="text-sm font-medium text-endurix-black dark:text-foreground">
                    {t('unavailable')}
                </p>
            </div>
        );
    }

    const { ytd } = data.careerStats;

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-endurix-black/10 dark:border-border bg-white/80 dark:bg-card px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                        {t('ytdDistance')}
                    </p>
                    <p className="mt-1 text-2xl font-bold text-endurix-black dark:text-foreground tabular-nums">
                        {formatKm(ytd.distance)} <span className="text-sm font-medium text-muted-foreground">{t('units.km')}</span>
                    </p>
                </div>
                <div className="rounded-2xl border border-endurix-black/10 dark:border-border bg-white/80 dark:bg-card px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                        {t('ytdElevation')}
                    </p>
                    <p className="mt-1 text-2xl font-bold text-endurix-black dark:text-foreground tabular-nums">
                        {Math.round(ytd.elevationGain)} <span className="text-sm font-medium text-muted-foreground">{t('units.m')}</span>
                    </p>
                </div>
                <div className="rounded-2xl border border-endurix-black/10 dark:border-border bg-white/80 dark:bg-card px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                        {t('ytdRuns')}
                    </p>
                    <p className="mt-1 text-2xl font-bold text-endurix-black dark:text-foreground tabular-nums">
                        {ytd.count}
                    </p>
                </div>
            </div>
            {data.stale && (
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{t('staleNotice')}</p>
            )}
        </div>
    );
}
