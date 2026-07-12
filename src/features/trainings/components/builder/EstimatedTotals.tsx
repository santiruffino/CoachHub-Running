'use client';

import { AthleteProfile, WorkoutBlock } from './types';
import { TrainingType } from '@/interfaces/training';
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { calculateTotals } from './SessionSummary';

interface EstimatedTotalsProps {
    blocks: WorkoutBlock[];
    athleteProfile?: AthleteProfile | null;
    trainingType?: TrainingType;
}

export function EstimatedTotals({ blocks, athleteProfile, trainingType = TrainingType.RUNNING }: EstimatedTotalsProps) {
    // Shared estimator: infers duration from distance blocks using the athlete's
    // VAM/pace, so distance-only workouts no longer show 0 min.
    const totals = useMemo(
        () => calculateTotals(blocks, athleteProfile, trainingType),
        [blocks, athleteProfile, trainingType]
    );
    const t = useTranslations('builder');

    const formatDurationParts = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return { hours, minutes };
    };

    const { hours, minutes } = formatDurationParts(totals.duration);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Duration */}
            <div className="bg-endurix-paper dark:bg-card border border-endurix-black/10 dark:border-border p-6 relative overflow-hidden flex flex-col justify-between h-40">
                <div
                    className="text-[10px] font-bold text-endurix-black/50 dark:text-muted-foreground uppercase tracking-widest mb-4"
                    style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                >
                    {t('totalDuration')}
                </div>
                <div className="flex items-baseline gap-1 mt-auto mb-7">
                    {hours > 0 ? (
                        <>
                            <span className="text-5xl font-extrabold text-endurix-black dark:text-foreground tracking-tight" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>{hours}</span>
                            <span
                                className="text-sm font-bold text-endurix-black/50 dark:text-muted-foreground mr-2"
                                style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                            >{t('units.h')}</span>
                            <span className="text-5xl font-extrabold text-endurix-black dark:text-foreground tracking-tight" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>{minutes.toString().padStart(2, '0')}</span>
                            <span
                                className="text-sm font-bold text-endurix-black/50 dark:text-muted-foreground"
                                style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                            >{t('units.min')}</span>
                        </>
                    ) : (
                        <>
                            <span className="text-5xl font-extrabold text-endurix-black dark:text-foreground tracking-tight" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>{minutes}</span>
                            <span
                                className="text-sm font-bold text-endurix-black/50 dark:text-muted-foreground"
                                style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                            >{t('units.min')}</span>
                        </>
                    )}
                </div>

                {/* Visual Bar */}
                <div className="absolute bottom-6 left-6 right-6 h-1 bg-endurix-black/15 dark:bg-border overflow-hidden">
                    <div className="h-full bg-endurix-orange" style={{ width: '60%' }} />
                </div>
            </div>

            {/* Estimated TSS */}
            <div className="bg-endurix-paper dark:bg-card border border-endurix-black/10 dark:border-border p-6 relative overflow-hidden flex flex-col justify-between h-40">
                <div
                    className="text-[10px] font-bold text-endurix-black/50 dark:text-muted-foreground uppercase tracking-widest mb-4"
                    style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                >
                    {t('estimatedTss')}
                </div>
                <div className="flex items-baseline gap-2 mt-auto mb-7">
                    <span className="text-5xl font-extrabold text-endurix-black dark:text-foreground tracking-tight" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>{totals.tss}</span>
                    <span
                        className="text-sm font-bold text-endurix-black/50 dark:text-muted-foreground"
                        style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                    >{t('score')}</span>
                </div>

                {/* Visual Bar */}
                <div className="absolute bottom-6 left-6 right-6 h-1 bg-endurix-black/15 dark:bg-border overflow-hidden">
                    <div className="h-full bg-endurix-black dark:bg-foreground" style={{ width: '75%' }} />
                </div>
            </div>

            {/* Distance Est */}
            <div className="bg-endurix-paper dark:bg-card border border-endurix-black/10 dark:border-border p-6 relative overflow-hidden flex flex-col justify-between h-40">
                <div
                    className="text-[10px] font-bold text-endurix-black/50 dark:text-muted-foreground uppercase tracking-widest mb-4"
                    style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                >
                    {t('distanceEst')}
                </div>
                <div className="flex items-baseline gap-2 mt-auto mb-7">
                    <span className="text-5xl font-extrabold text-endurix-black dark:text-foreground tracking-tight" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>{(totals.distance > 0 ? totals.distance : 0).toFixed(1)}</span>
                    <span
                        className="text-sm font-bold text-endurix-black/50 dark:text-muted-foreground"
                        style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                    >{t('units.km')}</span>
                </div>

                {/* Visual Bar */}
                <div className="absolute bottom-6 left-6 right-6 h-1 bg-endurix-black/15 dark:bg-border overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: '40%' }} />
                </div>
            </div>
        </div>
    );
}
