'use client';

import React from 'react';

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, Pencil, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Lap } from '@/interfaces/activity';
import { MatchedLap } from '@/features/trainings/utils/workoutMatcher';
import { LapFilterBadges } from '@/app/(dashboard)/activities/components/LapFilterBadges';
import type { LapFilter } from '@/app/(dashboard)/activities/components/LapFilterBadges';

interface LapsTableProps {
    laps: Lap[];
    matchedLaps: MatchedLap[];
    lapFilter: LapFilter;
    onLapFilterChange: (value: LapFilter) => void;
    isAthlete: boolean;
    lapOverrides: Record<string, string>;
    onOverrideStepType: (lapIndex: number, newStepType: string) => void;
    onBulkOverrideStepType?: (lapIndices: number[], newStepType: string) => void;
    formatTime: (seconds: number) => string;
    formatPace: (metersPerSecond: number) => string;
    getHRZoneColor: (hr: number) => string;
    t: ReturnType<typeof useTranslations>;
}

export function LapsTable({
    laps,
    matchedLaps,
    lapFilter,
    onLapFilterChange,
    isAthlete,
    lapOverrides,
    onOverrideStepType,
    onBulkOverrideStepType,
    formatTime,
    formatPace,
    getHRZoneColor,
    t,
}: LapsTableProps) {
    const [selectedLapIndices, setSelectedLapIndices] = React.useState<number[]>([]);
    const [isBulkEditMode, setIsBulkEditMode] = React.useState(false);

    const stepTypeColors: Record<string, string> = {
        warmup: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        active: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
        recovery: 'bg-green-500/10 text-green-500 border-green-500/20',
        rest: 'bg-gray-400/10 text-muted-foreground border-gray-400/20',
        cooldown: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
        other: 'bg-gray-500/10 text-muted-foreground border-gray-500/20',
    };

    const overrideLabels: Record<string, string> = {
        warmup: t('lapFilters.warmup'),
        active: t('lapFilters.active'),
        rest: t('workout.rest'),
        recovery: t('lapFilters.recovery'),
        cooldown: t('lapFilters.cooldown'),
    };

    const visibleLaps = laps.map((lap, idx) => ({ lap, idx }))
        .filter(({ idx }) => {
            if (lapFilter === 'all') return true;
            const lap = laps[idx];
            const matchedLap = matchedLaps.find(m => m.lapIndex === idx);
            const overrideType = lap ? lapOverrides[lap.lap_index] : undefined;
            const effectiveType = overrideType || matchedLap?.stepType || 'other';
            return effectiveType === lapFilter;
        });

    const visibleLapIndices = visibleLaps.map(({ lap }) => lap.lap_index);

    const allVisibleSelected = visibleLapIndices.length > 0 && visibleLapIndices.every(index => selectedLapIndices.includes(index));

    const toggleSelectedLap = (lapIndex: number) => {
        setSelectedLapIndices(prev => (
            prev.includes(lapIndex)
                ? prev.filter(index => index !== lapIndex)
                : [...prev, lapIndex]
        ));
    };

    const toggleSelectAllVisible = () => {
        setSelectedLapIndices(prev => {
            if (allVisibleSelected) {
                return prev.filter(index => !visibleLapIndices.includes(index));
            }

            const merged = new Set([...prev, ...visibleLapIndices]);
            return Array.from(merged);
        });
    };

    const applyBulkOverride = (stepType: string) => {
        if (!onBulkOverrideStepType || selectedLapIndices.length === 0) return;
        onBulkOverrideStepType(selectedLapIndices, stepType);
        setSelectedLapIndices([]);
    };

    const handleRowClick = (lapIndex: number, event: React.MouseEvent) => {
        if (!isBulkEditMode || !onBulkOverrideStepType) return;

        const target = event.target as HTMLElement;
        if (target.closest('button, input, [role="button"], a, [aria-haspopup="menu"], [data-radix-popper-content-wrapper]')) {
            return;
        }

        toggleSelectedLap(lapIndex);
    };

    const toggleBulkEditMode = () => {
        setIsBulkEditMode(prev => {
            const next = !prev;
            if (!next) setSelectedLapIndices([]);
            return next;
        });
    };

    return (
        <div className="overflow-x-auto">
            <div className="mb-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <LapFilterBadges value={lapFilter} onChange={onLapFilterChange} t={t} className="mb-0" />
                    {!isAthlete && onBulkOverrideStepType && (
                        <Button
                            type="button"
                            variant={isBulkEditMode ? 'default' : 'outline'}
                            size="sm"
                            className="gap-1.5 text-[10px] uppercase tracking-widest font-bold"
                            onClick={toggleBulkEditMode}
                            style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                        >
                            <Pencil className="w-3.5 h-3.5" />
                            {t('common.edit')}
                        </Button>
                    )}
                </div>

                {!isAthlete && onBulkOverrideStepType && isBulkEditMode && (
                    <div className="sticky top-2 z-20 mt-3 border border-endurix-black/15 dark:border-border bg-endurix-paper dark:bg-muted p-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-[10px] font-bold uppercase tracking-widest"
                                onClick={toggleSelectAllVisible}
                                style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                            >
                                {allVisibleSelected ? (t('common.clear') || 'Limpiar') : (t('common.selectAll') || 'Seleccionar todo')}
                            </Button>
                            <span className="text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground" style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>{t('common.selected', { count: selectedLapIndices.length })}</span>
                            {Object.entries(overrideLabels).map(([key, label]) => (
                                <Button
                                    key={`bulk-override-${key}`}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 text-[10px] font-bold uppercase tracking-widest"
                                    onClick={() => applyBulkOverride(key)}
                                    disabled={selectedLapIndices.length === 0}
                                    style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                                >
                                    {label}
                                </Button>
                            ))}
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-[10px] font-bold uppercase tracking-widest ml-auto"
                                onClick={toggleBulkEditMode}
                                style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                            >
                                <X className="w-3.5 h-3.5 mr-1" />
                                {t('common.close')}
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <Table className="w-full">
                <TableHeader>
                    <TableRow className="border-b border-endurix-black/12 dark:border-border hover:bg-transparent">
                        {!isAthlete && onBulkOverrideStepType && isBulkEditMode && (
                            <TableHead className="w-10 pl-0">
                                <input
                                    type="checkbox"
                                    checked={allVisibleSelected}
                                    onChange={toggleSelectAllVisible}
                                    aria-label={t('common.selectVisibleLaps')}
                                />
                            </TableHead>
                        )}
                        <TableHead
                            className="text-[10px] font-bold text-endurix-black/50 dark:text-muted-foreground tracking-widest uppercase h-auto pb-4 pl-0"
                            style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                        >{t('table.lap')}</TableHead>
                        <TableHead
                            className="text-[10px] font-bold text-endurix-black/50 dark:text-muted-foreground tracking-widest uppercase h-auto pb-4"
                            style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                        >{t('table.time')}</TableHead>
                        <TableHead
                            className="text-[10px] font-bold text-endurix-black/50 dark:text-muted-foreground tracking-widest uppercase h-auto pb-4"
                            style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                        >{t('table.distance')}</TableHead>
                        <TableHead
                            className="text-[10px] font-bold text-endurix-black/50 dark:text-muted-foreground tracking-widest uppercase h-auto pb-4"
                            style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                        >{t('table.avgPace')}</TableHead>
                        {!!laps[0]?.average_heartrate && (
                            <TableHead
                                className="text-[10px] font-bold text-endurix-black/50 dark:text-muted-foreground tracking-widest uppercase h-auto pb-4"
                                style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                            >{t('table.avgHr')}</TableHead>
                        )}
                        {!!laps[0]?.average_cadence && (
                            <TableHead
                                className="text-[10px] font-bold text-endurix-black/50 dark:text-muted-foreground tracking-widest uppercase h-auto pb-4"
                                style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                            >{t('table.cadence')}</TableHead>
                        )}
                        <TableHead
                            className="text-[10px] font-bold text-endurix-black/50 dark:text-muted-foreground tracking-widest uppercase h-auto pb-4"
                            style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                        >{t('table.elevGain')}</TableHead>
                        <TableHead className="text-[10px] font-bold text-endurix-black/50 dark:text-muted-foreground tracking-widest uppercase h-auto pb-4 text-right pr-0"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {visibleLaps
                        .map(({ lap, idx }) => {
                            const matchedLap = matchedLaps.find(m => m.lapIndex === idx);

                            const overrideType = lapOverrides[lap.lap_index];
                            const effectiveType = overrideType || matchedLap?.stepType || 'other';
                            const displayLabel = overrideType
                                ? overrideLabels[overrideType]
                                : (matchedLap ? matchedLap.stepLabel : t('lapFilters.unmatched'));
                            const displayColorClass = stepTypeColors[effectiveType] || stepTypeColors.other;

                            const badgeEl = (
                                <Badge
                                    variant="outline"
                                    className={`${displayColorClass} border transition-opacity flex items-center gap-1 w-fit ml-auto`}
                                >
                                    {displayLabel}
                                    {!isAthlete && <ChevronDown className="w-3 h-3 opacity-50" />}
                                </Badge>
                            );

                            return (
                                <TableRow
                                    key={lap.id}
                                    onClick={(event) => handleRowClick(lap.lap_index, event)}
                                    className={(!isAthlete && onBulkOverrideStepType && isBulkEditMode) ? 'cursor-pointer' : ''}
                                >
                                    {!isAthlete && onBulkOverrideStepType && isBulkEditMode && (
                                        <TableCell className="pl-0">
                                            <input
                                                type="checkbox"
                                                checked={selectedLapIndices.includes(lap.lap_index)}
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={() => toggleSelectedLap(lap.lap_index)}
                                                aria-label={`Select lap ${lap.lap_index}`}
                                            />
                                        </TableCell>
                                    )}
                                    <TableCell className="font-medium">
                                        {lap.lap_index === 0 || (laps[0]?.lap_index === 0) ? lap.lap_index + 1 : lap.lap_index}
                                    </TableCell>
                                    <TableCell>{formatTime(lap.moving_time)}</TableCell>
                                    <TableCell>{(lap.distance / 1000).toFixed(2)} {t('metrics.units.km')}</TableCell>
                                    <TableCell>{formatPace(lap.average_speed)}</TableCell>
                                    {!!laps[0]?.average_heartrate && (
                                        <TableCell>
                                            {lap.average_heartrate ? (
                                                <span className={`px-2 py-1 rounded font-medium ${getHRZoneColor(lap.average_heartrate)}`}>
                                                    {lap.average_heartrate.toFixed(0)} {t('metrics.units.bpm')}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                    )}
                                    {!!laps[0]?.average_cadence && (
                                        <TableCell>
                                            {lap.average_cadence ? (
                                                <span>{lap.average_cadence.toFixed(0)} {t('metrics.units.spm')}</span>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                    )}
                                    <TableCell>{lap.total_elevation_gain.toFixed(1)} {t('metrics.units.m')}</TableCell>
                                    <TableCell className="text-right pr-0">
                                        {!isAthlete ? (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild className="cursor-pointer hover:opacity-80">
                                                    {badgeEl}
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-[170px]">
                                                    {Object.entries(overrideLabels).map(([key, label]) => (
                                                        <DropdownMenuItem key={key} onClick={() => onOverrideStepType(lap.lap_index, key)}>
                                                            <div className={`w-2 h-2 rounded-full mr-2 ${stepTypeColors[key].split(' ')[0]}`} />
                                                            {label}
                                                        </DropdownMenuItem>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        ) : (
                                            badgeEl
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                </TableBody>
            </Table>
        </div>
    );
}
