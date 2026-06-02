'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { TrainingType } from '@/interfaces/training';
import { BLOCK_COLORS } from './constants';
import { calculateTotals } from './SessionSummary';
import { AthleteProfile, WorkoutBlock } from './types';
import { VAM_ZONES } from '@/features/profiles/constants/vam';

interface WorkoutInsightsPanelProps {
    blocks: WorkoutBlock[];
    athleteProfile?: AthleteProfile | null;
    trainingType?: TrainingType;
}

interface StepRow {
    id: string;
    label: string;
    type: WorkoutBlock['type'];
    durationLabel: string;
    durationSeconds: number;
    reps: number;
    targetLabel: string;
    intensityLabel: string;
}

const FALLBACK_SPEED_KMH = 15;

function toEstimatedSeconds(block: WorkoutBlock, athleteProfile?: AthleteProfile | null): number {
    if (block.duration.type === 'time') {
        return block.duration.value;
    }

    const distMeters = block.duration.unit === 'km'
        ? block.duration.value * 1000
        : block.duration.value;

    let intensityFactor = (block.intensity || 50) / 100;

    if (block.target.type === 'vam_zone') {
        const zoneNum = Number(block.target.min);
        const zone = VAM_ZONES.find((item) => item.zone === zoneNum);
        if (zone) {
            intensityFactor = ((zone.min + zone.max) / 2) / 100;
        }
    } else if (block.target.type === 'lthr') {
        const minTarget = Number(block.target.min);
        const maxTarget = Number(block.target.max);
        if (!Number.isNaN(minTarget) && !Number.isNaN(maxTarget)) {
            intensityFactor = ((minTarget + maxTarget) / 2) / 100;
        }
    }

    let vamKmh = FALLBACK_SPEED_KMH;
    if (athleteProfile?.vam) {
        const parts = athleteProfile.vam.split(':').map(Number);
        if (parts.length === 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
            const secsPerKm = parts[0] * 60 + parts[1];
            if (secsPerKm > 0) {
                vamKmh = 3600 / secsPerKm;
            }
        } else {
            const direct = Number(athleteProfile.vam);
            if (Number.isFinite(direct) && direct > 0) {
                vamKmh = direct;
            }
        }
    }

    const speedMs = (vamKmh * intensityFactor) / 3.6;
    if (speedMs <= 0) {
        return 0;
    }

    return Math.round(distMeters / speedMs);
}

function formatClock(totalSeconds: number): string {
    const seconds = Math.max(0, Math.round(totalSeconds));
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    return `${m}:${s.toString().padStart(2, '0')}`;
}

export function WorkoutInsightsPanel({
    blocks,
    athleteProfile,
    trainingType = TrainingType.RUNNING
}: WorkoutInsightsPanelProps) {
    const t = useTranslations('builder');

    const totals = useMemo(
        () => calculateTotals(blocks, athleteProfile, trainingType),
        [blocks, athleteProfile, trainingType]
    );

    const rows = useMemo<StepRow[]>(() => {
        const list: StepRow[] = [];
        let index = 0;

        while (index < blocks.length) {
            const block = blocks[index];

            if (block.group) {
                const groupId = block.group.id;
                const reps = block.group.reps || 1;
                let cursor = index;

                while (cursor < blocks.length && blocks[cursor].group?.id === groupId) {
                    const step = blocks[cursor];
                    const durationSeconds = toEstimatedSeconds(step, athleteProfile);
                    const durationLabel = step.duration.type === 'distance'
                        ? `~${formatClock(durationSeconds)} (${step.duration.value}${step.duration.unit || 'm'})`
                        : formatClock(durationSeconds);

                    list.push({
                        id: step.id,
                        label: step.stepName || t(`labels.${step.type}`),
                        type: step.type,
                        durationLabel,
                        durationSeconds,
                        reps,
                        targetLabel:
                            step.target.type === 'lthr'
                                ? `${step.target.min}-${step.target.max}% LTHR`
                                : step.target.type === 'vam_zone'
                                    ? `${t('zone')} ${step.target.min}`
                                    : step.target.type === 'hr_reserve'
                                        ? `${step.target.min}-${step.target.max}% ${t('hrReserveShort')}`
                                        : step.target.type === 'ftp_percent'
                                            ? `${step.target.min}-${step.target.max}% FTP`
                                            : step.target.type === 'power_zone'
                                                ? `${t('powerZone')} ${step.target.min}`
                                                : `${t('rpeShort')} ${step.target.min}-${step.target.max}`,
                        intensityLabel: step.intensity ? `${step.intensity}%` : '—'
                    });

                    cursor += 1;
                }

                index = cursor;
                continue;
            }

            const durationSeconds = toEstimatedSeconds(block, athleteProfile);
            const durationLabel = block.duration.type === 'distance'
                ? `~${formatClock(durationSeconds)} (${block.duration.value}${block.duration.unit || 'm'})`
                : formatClock(durationSeconds);

            list.push({
                id: block.id,
                label: block.stepName || t(`labels.${block.type}`),
                type: block.type,
                durationLabel,
                durationSeconds,
                reps: 1,
                targetLabel:
                    block.target.type === 'lthr'
                        ? `${block.target.min}-${block.target.max}% LTHR`
                        : block.target.type === 'vam_zone'
                            ? `${t('zone')} ${block.target.min}`
                            : block.target.type === 'hr_reserve'
                                ? `${block.target.min}-${block.target.max}% ${t('hrReserveShort')}`
                                : block.target.type === 'ftp_percent'
                                    ? `${block.target.min}-${block.target.max}% FTP`
                                    : block.target.type === 'power_zone'
                                        ? `${t('powerZone')} ${block.target.min}`
                                        : `${t('rpeShort')} ${block.target.min}-${block.target.max}`,
                intensityLabel: block.intensity ? `${block.intensity}%` : '—'
            });

            index += 1;
        }

        return list;
    }, [blocks, athleteProfile, t]);

    const durationByType = useMemo(() => {
        const data = new Map<WorkoutBlock['type'], number>();
        rows.forEach((row) => {
            const current = data.get(row.type) || 0;
            data.set(row.type, current + row.durationSeconds * row.reps);
        });
        return Array.from(data.entries())
            .map(([type, seconds]) => ({ type, seconds }))
            .sort((a, b) => b.seconds - a.seconds);
    }, [rows]);

    const totalSeconds = Math.max(
        durationByType.reduce((sum, item) => sum + item.seconds, 0),
        1
    );

    if (blocks.length === 0) {
        return null;
    }

    return (
        <div className="space-y-6">
            <section className="bg-endurix-paper dark:bg-[#131b23] border border-endurix-black/10 dark:border-white/10 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-[10px] font-bold text-endurix-black/50 dark:text-muted-foreground uppercase tracking-widest" style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>
                        {t('workoutVisualization')}
                    </h3>
                    <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-endurix-black dark:text-foreground" style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>
                        <span>{t('total')}: {formatClock(totals.duration)}</span>
                        <span>{t('estTssShort')}: {totals.tss}</span>
                        <span>{t('steps')}: {rows.length}</span>
                    </div>
                </div>

                <p className="mt-1 text-sm text-endurix-black/50 dark:text-muted-foreground">{t('stepDurationBlocks')}</p>

                <div className="mt-5 flex h-20 overflow-hidden bg-white/70 dark:bg-[#1a232c]">
                    {durationByType.map((item) => {
                        const width = Math.max((item.seconds / totalSeconds) * 100, 10);
                        return (
                            <div
                                key={item.type}
                                className="relative flex items-end justify-center pb-2"
                                style={{
                                    width: `${width}%`,
                                    backgroundColor: BLOCK_COLORS[item.type]
                                }}
                            >
                                <span className="text-xs font-bold text-endurix-black uppercase tracking-wide" style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>
                                    {Math.round(item.seconds / 60)}m
                                </span>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2 text-[10px] font-bold uppercase tracking-widest text-endurix-black/60 dark:text-muted-foreground" style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>
                    {durationByType.map((item) => (
                        <div key={item.type} className="flex items-center gap-2">
                            <span className="h-2 w-2" style={{ backgroundColor: BLOCK_COLORS[item.type] }} />
                            <span>{t(`labels.${item.type}`)}</span>
                        </div>
                    ))}
                </div>
            </section>

            <section className="bg-endurix-paper dark:bg-[#131b23] border border-endurix-black/10 dark:border-white/10 p-6">
                <h3 className="text-[10px] font-bold text-endurix-black/50 dark:text-muted-foreground uppercase tracking-widest mb-4" style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>
                    {t('zoneDistribution')}
                </h3>

                <div className="space-y-3">
                    {durationByType.map((item) => {
                        const width = (item.seconds / totalSeconds) * 100;
                        return (
                            <div key={item.type} className="grid grid-cols-[140px_1fr_72px] items-center gap-3">
                                <span className="text-sm font-semibold text-endurix-black dark:text-foreground">
                                    {t(`labels.${item.type}`)}
                                </span>
                                <div className="h-1.5 bg-white/70 dark:bg-[#1a232c] overflow-hidden">
                                    <div
                                        className="h-full"
                                        style={{ width: `${Math.max(width, 4)}%`, backgroundColor: BLOCK_COLORS[item.type] }}
                                    />
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground text-right" style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>
                                    {Math.round(width)}%
                                </span>
                            </div>
                        );
                    })}
                </div>
            </section>

            <section className="bg-endurix-paper dark:bg-[#131b23] border border-endurix-black/10 dark:border-white/10 p-6 overflow-x-auto">
                <h3 className="text-[10px] font-bold text-endurix-black/50 dark:text-muted-foreground uppercase tracking-widest mb-4" style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>
                    {t('stepSummaryTitle')}
                </h3>

                <table className="w-full min-w-[720px] text-sm">
                    <thead>
                        <tr className="text-left text-endurix-black/40 dark:text-muted-foreground uppercase tracking-widest text-[10px] border-b border-endurix-black/10 dark:border-white/10" style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>
                            <th className="pb-3 font-bold">{t('stage')}</th>
                            <th className="pb-3 font-bold">{t('duration')}</th>
                            <th className="pb-3 font-bold">{t('target')}</th>
                            <th className="pb-3 font-bold">{t('repetitions')}</th>
                            <th className="pb-3 font-bold">{t('intensity')}</th>
                        </tr>
                    </thead>
                    <tbody className="text-endurix-black dark:text-foreground">
                        {rows.map((row) => (
                            <tr key={row.id} className="align-top border-b border-endurix-black/8 dark:border-white/5">
                                <td className="py-2 font-semibold">{row.label}</td>
                                <td className="py-2 font-medium">{row.durationLabel}</td>
                                <td className="py-2 text-endurix-black/50 dark:text-muted-foreground">{row.targetLabel}</td>
                                <td className="py-2">{row.reps}x</td>
                                <td className="py-2">{row.intensityLabel}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
        </div>
    );
}
