'use client';

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Lap } from '@/interfaces/activity';
import { MatchedLap } from '@/features/trainings/utils/workoutMatcher';

type LapFilter = 'all' | 'warmup' | 'active' | 'recovery' | 'cooldown';

interface LapsTableProps {
    laps: Lap[];
    matchedLaps: MatchedLap[];
    lapFilter: LapFilter;
    isAthlete: boolean;
    lapOverrides: Record<string, string>;
    onOverrideStepType: (lapIndex: number, newStepType: string) => void;
    formatTime: (seconds: number) => string;
    formatPace: (metersPerSecond: number) => string;
    getHRZoneColor: (hr: number) => string;
    t: (key: string) => string;
}

export function LapsTable({
    laps,
    matchedLaps,
    lapFilter,
    isAthlete,
    lapOverrides,
    onOverrideStepType,
    formatTime,
    formatPace,
    getHRZoneColor,
    t,
}: LapsTableProps) {
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

    return (
        <div className="overflow-x-auto">
            <Table className="w-full">
                <TableHeader>
                    <TableRow className="border-b border-muted hover:bg-transparent">
                        <TableHead className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase h-auto pb-4 pl-0">{t('table.lap')}</TableHead>
                        <TableHead className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase h-auto pb-4">{t('table.time')}</TableHead>
                        <TableHead className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase h-auto pb-4">{t('table.distance')}</TableHead>
                        <TableHead className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase h-auto pb-4">{t('table.avgPace')}</TableHead>
                        {!!laps[0]?.average_heartrate && (
                            <TableHead className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase h-auto pb-4">{t('table.avgHr')}</TableHead>
                        )}
                        {!!laps[0]?.average_cadence && (
                            <TableHead className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase h-auto pb-4">{t('table.cadence')}</TableHead>
                        )}
                        <TableHead className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase h-auto pb-4">{t('table.elevGain')}</TableHead>
                        <TableHead className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase h-auto pb-4 text-right pr-0"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {laps.map((lap, idx) => ({ lap, idx }))
                        .filter(({ idx }) => {
                            if (lapFilter === 'all') return true;
                            const matchedLap = matchedLaps.find(m => m.lapIndex === idx);
                            return matchedLap?.stepType === lapFilter;
                        })
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
                                    className={`${displayColorClass} border transition-opacity`}
                                >
                                    {displayLabel}
                                </Badge>
                            );

                            return (
                                <TableRow key={lap.id}>
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
