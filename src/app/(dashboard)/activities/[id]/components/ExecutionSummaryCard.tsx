'use client';

import { useTranslations } from 'next-intl';
import { Trophy, Check, Lightbulb, Repeat, Gauge, TrendingUp, TrendingDown, Minus, Medal } from 'lucide-react';
import type { ExecutionSummary } from '@/features/trainings/utils/executionSummary';

interface ExecutionSummaryCardProps {
    summary: ExecutionSummary;
    t: ReturnType<typeof useTranslations>;
}

const monoStyle = { fontFamily: 'var(--font-ibm-plex-mono, monospace)' } as const;
const displayStyle = { fontFamily: 'var(--font-exo-2, sans-serif)' } as const;

function formatPaceSec(secPerKm: number): string {
    if (!secPerKm || secPerKm <= 0) return '--';
    const minutes = Math.floor(secPerKm / 60);
    const seconds = Math.round(secPerKm % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatTimeSec(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.round(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function HighlightRow({ tone, text }: { tone: ExecutionSummary['highlights'][number]['tone']; text: string }) {
    const Icon = tone === 'celebrate' ? Trophy : tone === 'tip' ? Lightbulb : Check;
    const iconColor = tone === 'celebrate'
        ? 'text-endurix-orange'
        : tone === 'tip'
            ? 'text-endurix-black/40 dark:text-muted-foreground'
            : 'text-green-500';
    return (
        <div className="flex items-center gap-2.5">
            <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} />
            <span className="text-sm font-medium text-endurix-black dark:text-foreground leading-snug">{text}</span>
        </div>
    );
}

function Tile({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
    return (
        <div className="border border-endurix-black/10 dark:border-border p-3.5">
            <div className="flex items-center gap-1.5 mb-2">
                <span className="text-endurix-black/40 dark:text-muted-foreground">{icon}</span>
                <span className="text-[9px] font-bold text-endurix-black/50 dark:text-muted-foreground tracking-widest uppercase" style={monoStyle}>
                    {label}
                </span>
            </div>
            {children}
        </div>
    );
}

export function ExecutionSummaryCard({ summary, t }: ExecutionSummaryCardProps) {
    const { reps, consistency, split, personalRecords, highlights } = summary;

    const splitIcon = split?.type === 'negative'
        ? <TrendingDown className="h-3.5 w-3.5" />
        : split?.type === 'positive'
            ? <TrendingUp className="h-3.5 w-3.5" />
            : <Minus className="h-3.5 w-3.5" />;

    return (
        <article className="border border-endurix-black/12 dark:border-border bg-white dark:bg-card">
            <div className="px-4 py-2.5 bg-endurix-paper dark:bg-muted border-b border-endurix-black/8 dark:border-border">
                <span className="text-[9px] text-endurix-black/60 dark:text-muted-foreground tracking-widest" style={monoStyle}>
                    {t('executionSummary.title')}
                </span>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                {highlights.length > 0 && (
                    <div className="space-y-2.5">
                        {highlights.map((h, i) => (
                            <HighlightRow key={`${h.key}-${i}`} tone={h.tone} text={t(`executionSummary.highlights.${h.key}`, h.params)} />
                        ))}
                    </div>
                )}

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {reps && (
                        <Tile icon={<Repeat className="h-3 w-3" />} label={t('executionSummary.tiles.reps')}>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-bold text-endurix-black dark:text-foreground leading-none" style={displayStyle}>
                                    {reps.done}
                                </span>
                                <span className="text-sm text-endurix-black/40 dark:text-muted-foreground" style={monoStyle}>
                                    /{reps.planned}
                                </span>
                            </div>
                        </Tile>
                    )}

                    {consistency && (
                        <Tile icon={<Gauge className="h-3 w-3" />} label={t('executionSummary.tiles.consistency')}>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-bold text-endurix-black dark:text-foreground leading-none" style={displayStyle}>
                                    {consistency.score}
                                </span>
                                <span className="text-[10px] text-endurix-black/40 dark:text-muted-foreground" style={monoStyle}>/100</span>
                            </div>
                            <span className="mt-1 block text-[10px] font-medium text-endurix-black/50 dark:text-muted-foreground" style={monoStyle}>
                                {t(`executionSummary.consistency.${consistency.level}`)}
                            </span>
                        </Tile>
                    )}

                    {split && (
                        <Tile icon={splitIcon} label={t('executionSummary.tiles.split')}>
                            <span
                                className={`text-lg font-bold leading-none ${split.type === 'negative' ? 'text-green-500' : 'text-endurix-black dark:text-foreground'}`}
                                style={displayStyle}
                            >
                                {t(`executionSummary.split.${split.type}`)}
                            </span>
                            <span className="mt-1.5 block text-[10px] text-endurix-black/50 dark:text-muted-foreground" style={monoStyle}>
                                {formatPaceSec(split.firstHalfPace)} → {formatPaceSec(split.secondHalfPace)} {t('metrics.units.perKm')}
                            </span>
                        </Tile>
                    )}

                    {personalRecords.length > 0 && (
                        <Tile icon={<Medal className="h-3 w-3" />} label={t('executionSummary.tiles.records')}>
                            <div className="space-y-1">
                                {personalRecords.slice(0, 3).map((pr) => (
                                    <div key={pr.name} className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-bold text-endurix-black dark:text-foreground uppercase" style={monoStyle}>
                                            {pr.name}
                                        </span>
                                        <span className="text-[11px] text-endurix-black/60 dark:text-muted-foreground" style={monoStyle}>
                                            {formatTimeSec(pr.timeSec)}
                                            {pr.prRank === 1 && <span className="ml-1 text-endurix-orange font-bold">PR</span>}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </Tile>
                    )}
                </div>
            </div>
        </article>
    );
}
