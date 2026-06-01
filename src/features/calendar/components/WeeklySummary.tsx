'use client';

import { Clock, MapPin, Mountain } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useTranslations } from 'next-intl';

interface WeeklySummaryProps {
    summary: {
        distance: { planned: number; completed: number }; // km
        duration: { planned: number; completed: number }; // min
        elevation: { completed: number }; // m
    };
}

export function WeeklySummary({ summary }: WeeklySummaryProps) {
    const t = useTranslations('calendar.weeklySummary');
    const tUnits = useTranslations('common.units');

    return (
        <Card className="p-4 border-endurix-black/10 dark:border-border bg-endurix-paper dark:bg-card">
            <h3
                className="text-sm font-bold text-endurix-black dark:text-foreground mb-4 uppercase tracking-widest"
                style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
            >
                {t('title')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-4">
                {/* Distance */}
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <MapPin className="w-4 h-4" />
                        <span className="text-xs font-medium uppercase tracking-wider" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>{t('distance')}</span>
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between items-baseline">
                            <span className="text-xs text-muted-foreground">{t('planned')}</span>
                            <span
                                className="text-sm font-semibold text-endurix-black dark:text-foreground tabular-nums"
                                style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                            >
                                {summary.distance.planned} {tUnits('km')}
                            </span>
                        </div>
                        <div className="flex justify-between items-baseline">
                            <span className="text-xs text-muted-foreground">{t('actual')}</span>
                            <span
                                className={summary.distance.completed >= summary.distance.planned ? "text-sm font-bold text-emerald-600 dark:text-emerald-500 tabular-nums" : "text-sm font-bold text-endurix-orange tabular-nums"}
                                style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                            >
                                {summary.distance.completed.toFixed(1)} {tUnits('km')}
                            </span>
                        </div>
                        <div className="h-1.5 w-full bg-endurix-black/10 dark:bg-border mt-1">
                            <div
                                className="h-full bg-endurix-orange"
                                style={{ width: `${Math.min((summary.distance.completed / (summary.distance.planned || 1)) * 100, 100)}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Duration */}
                <div className="flex flex-col gap-1 md:border-l border-endurix-black/10 dark:border-border md:pl-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs font-medium uppercase tracking-wider" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>{t('time')}</span>
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between items-baseline">
                            <span className="text-xs text-muted-foreground">{t('planned')}</span>
                            <span
                                className="text-sm font-semibold text-endurix-black dark:text-foreground tabular-nums"
                                style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                            >
                                {Math.round(summary.duration.planned / 60)}{tUnits('h')}
                            </span>
                        </div>
                        <div className="flex justify-between items-baseline">
                            <span className="text-xs text-muted-foreground">{t('actual')}</span>
                            <span
                                className={summary.duration.completed >= summary.duration.planned ? "text-sm font-bold text-emerald-600 dark:text-emerald-500 tabular-nums" : "text-sm font-bold text-endurix-orange tabular-nums"}
                                style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                            >
                                {(summary.duration.completed / 60).toFixed(1)}{tUnits('h')}
                            </span>
                        </div>
                        <div className="h-1.5 w-full bg-endurix-black/10 dark:bg-border mt-1">
                            <div
                                className="h-full bg-endurix-black"
                                style={{ width: `${Math.min((summary.duration.completed / (summary.duration.planned || 1)) * 100, 100)}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Elevation */}
                <div className="flex flex-col gap-1 md:border-l border-endurix-black/10 dark:border-border md:pl-4 justify-center">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Mountain className="w-4 h-4" />
                        <span className="text-xs font-medium uppercase tracking-wider" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>{t('elevation')}</span>
                    </div>
                    <div>
                        <span
                            className="text-2xl font-bold text-endurix-black dark:text-foreground tabular-nums"
                            style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                        >
                            {Math.round(summary.elevation.completed)}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">{tUnits('m')}</span>
                    </div>
                    <span
                        className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider"
                        style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                    >
                        {t('cumulativeTotal')}
                    </span>
                </div>
            </div>
        </Card>
    );
}
