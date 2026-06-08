'use client';
import { appLogger } from '@/lib/app-logger';


import { useEffect, useState } from 'react';
import { groupsService } from '@/features/groups/services/groups.service';
import { Group } from '@/interfaces/group';
import { AthleteRace } from '@/interfaces/race';
import { isRaceRelevant } from '@/features/groups/utils/groupUtils';
import { useTranslations, useFormatter } from 'next-intl';
import { Trophy, Calendar, MapPin, ChevronRight, CheckCircle2, Clock, Award } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { differenceInDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { RecordRaceResultModal } from '@/features/races/components/RecordRaceResultModal';
import { motion } from 'framer-motion';
import { DashboardCard, DashboardCardHeaderDots, MonospaceLabel } from '@/components/dashboard';

const FONT_MONO = { fontFamily: 'var(--font-ibm-plex-mono, monospace)' } as const;
const FONT_DISPLAY = { fontFamily: 'var(--font-exo-2, sans-serif)' } as const;

interface NextRacesProps {
    athleteRaces?: AthleteRace[];
    onSuccess?: () => void;
}

export function NextRaces({ athleteRaces, onSuccess }: NextRacesProps) {
    const t = useTranslations();
    const format = useFormatter();
    const isAthleteMode = athleteRaces !== undefined;
    const [groupRaces, setGroupRaces] = useState<Group[]>([]);
    const [loading, setLoading] = useState(!isAthleteMode);
    const [selectedRace, setSelectedRace] = useState<AthleteRace | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const fetchGroupRaces = async () => {
            if (isAthleteMode) {
                setGroupRaces([]);
                setLoading(false);
                return;
            }
            try {
                const res = await groupsService.findAll();
                const filteredRaces = res.data
                    .filter(isRaceRelevant)
                    .sort((a, b) => new Date(a.race_date!).getTime() - new Date(b.race_date!).getTime());
                setGroupRaces(filteredRaces);
            } catch (error) {
                appLogger.error('Failed to fetch next races', error);
            } finally {
                setLoading(false);
            }
        };

        fetchGroupRaces();
    }, [isAthleteMode]);

    if (loading) {
        return (
            <DashboardCard headerLabel={t('common.loading')} headerAccessory={<DashboardCardHeaderDots />}>
                <div className="space-y-3">
                    <div className="h-16 bg-endurix-black/8 dark:bg-white/8 animate-pulse" />
                    <div className="h-16 bg-endurix-black/8 dark:bg-white/8 animate-pulse" />
                </div>
            </DashboardCard>
        );
    }

    const now = new Date();

    const safeAthleteRaces = athleteRaces || [];
    const sortedAthleteRaces = [...safeAthleteRaces].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    const hasRaces = sortedAthleteRaces.length > 0 || groupRaces.length > 0;

    if (!hasRaces) {
        return (
            <DashboardCard
                headerLabel={t('common.upcoming')}
                headerAccessory={<DashboardCardHeaderDots />}
            >
                <h3
                    className="text-xl font-bold text-endurix-black dark:text-foreground uppercase tracking-tight mb-4"
                    style={FONT_DISPLAY}
                >
                    {t('dashboard.alerts.nextRaces')}
                </h3>
                <p className="text-sm text-endurix-black/50 dark:text-muted-foreground">
                    {t('dashboard.alerts.noNextRaces')}
                </p>
            </DashboardCard>
        );
    }

    return (
        <DashboardCard
            headerLabel={t('common.upcoming')}
            headerAccessory={<DashboardCardHeaderDots />}
        >
            <h3
                className="text-xl font-bold text-endurix-black dark:text-foreground uppercase tracking-tight mb-6"
                style={FONT_DISPLAY}
            >
                {t('dashboard.alerts.nextRaces')}
            </h3>
            <div className="space-y-3">
                {sortedAthleteRaces.map((race) => {
                    const raceDate = new Date(race.date);
                    const isPast = raceDate < now;
                    const daysRemaining = differenceInDays(raceDate, now);
                    const name = race.name_override || race.race?.name || t('races.athlete.defaultRaceName');

                    return (
                        <div
                            key={race.id}
                            className={cn(
                                'p-4 transition-colors border',
                                isPast
                                    ? 'bg-endurix-paper/30 dark:bg-muted/30 border-endurix-black/8 dark:border-border'
                                    : 'bg-endurix-paper/50 dark:bg-muted/50 border-endurix-black/8 dark:border-border hover:border-endurix-orange/40',
                            )}
                        >
                            <div className="flex items-start gap-3">
                                <div
                                    className={cn(
                                        'mt-0.5 p-2',
                                        isPast
                                            ? 'bg-endurix-black/8 dark:bg-white/8 text-endurix-black/40 dark:text-muted-foreground'
                                            : 'bg-endurix-orange/10 text-endurix-orange',
                                    )}
                                >
                                    {isPast ? <CheckCircle2 className="h-4 w-4" /> : <Trophy className="h-4 w-4" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1 gap-2">
                                        <h3
                                            className={cn(
                                                'text-sm font-semibold truncate',
                                                isPast
                                                    ? 'text-endurix-black/40 dark:text-muted-foreground'
                                                    : 'text-endurix-black dark:text-foreground',
                                            )}
                                        >
                                            {name}
                                        </h3>
                                        {!isPast && race.priority === 'A' && daysRemaining <= 30 && (
                                            <motion.span
                                                animate={{ opacity: [0.6, 1, 0.6], scale: [0.98, 1, 0.98] }}
                                                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                                                className="flex items-center gap-1 text-[9px] font-bold text-endurix-orange border border-endurix-orange/30 px-2 py-0.5 uppercase tracking-wider"
                                                style={FONT_MONO}
                                            >
                                                <Clock className="h-3 w-3" />
                                                {t('races.athlete.countdown', { days: daysRemaining })}
                                            </motion.span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                                        <div className="flex items-center gap-1.5 text-[12px] text-endurix-black/50 dark:text-muted-foreground">
                                            <Calendar className="h-3 w-3" />
                                            <span>{format.dateTime(raceDate, { day: 'numeric', month: 'short' })}</span>
                                        </div>

                                        {!isPast && (
                                            <span
                                                className={cn(
                                                    'text-[9px] font-bold px-1.5 py-0.5 border tracking-widest uppercase',
                                                    race.priority === 'A'
                                                        ? 'text-endurix-orange border-endurix-orange/30'
                                                        : race.priority === 'B'
                                                            ? 'text-endurix-black/70 dark:text-muted-foreground border-endurix-black/20 dark:border-border'
                                                            : 'text-endurix-black/50 dark:text-muted-foreground border-endurix-black/15 dark:border-border',
                                                )}
                                                style={FONT_MONO}
                                            >
                                                {t('races.athlete.priorityBadge', { priority: race.priority })}
                                            </span>
                                        )}

                                        {isPast && race.status === 'PLANNED' && (
                                            <Button
                                                variant="link"
                                                size="sm"
                                                className="h-auto p-0 text-[11px] text-endurix-orange font-bold uppercase"
                                                onClick={() => {
                                                    setSelectedRace(race);
                                                    setIsModalOpen(true);
                                                }}
                                            >
                                                {t('races.recordResult')}
                                            </Button>
                                        )}

                                        {isPast && race.status === 'COMPLETED' && race.result_time && (
                                            <div className="flex items-center gap-1 text-[11px] text-endurix-orange font-bold">
                                                <Award className="h-3 w-3" />
                                                {race.result_time}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                <RecordRaceResultModal
                    open={isModalOpen}
                    onOpenChange={setIsModalOpen}
                    race={selectedRace}
                    onSuccess={() => {
                        onSuccess?.();
                        setIsModalOpen(false);
                    }}
                />

                {safeAthleteRaces.length === 0 && groupRaces.map((race) => {
                    const isPast = new Date(race.race_date!) < now;
                    return (
                        <Link key={race.id} href={`/groups/${race.id}`} className="block group">
                            <div
                                className={cn(
                                    'p-4 transition-colors border',
                                    isPast
                                        ? 'bg-endurix-paper/30 dark:bg-muted/30 border-endurix-black/8 dark:border-border grayscale-[0.5]'
                                        : 'bg-endurix-paper/50 dark:bg-muted/50 border-endurix-black/8 dark:border-border hover:border-endurix-orange/40',
                                )}
                            >
                                <div className="flex items-start gap-3">
                                    <div
                                        className={cn(
                                            'mt-0.5 p-2 transition-colors',
                                            isPast
                                                ? 'bg-endurix-black/8 dark:bg-white/8 text-endurix-black/40 dark:text-muted-foreground'
                                                : 'bg-endurix-black/8 dark:bg-white/8 text-endurix-black dark:text-foreground group-hover:bg-endurix-orange group-hover:text-white',
                                        )}
                                    >
                                        {isPast ? <CheckCircle2 className="h-4 w-4" /> : <Trophy className="h-4 w-4" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1 gap-2">
                                            <h3
                                                className={cn(
                                                    'text-sm font-semibold truncate',
                                                    isPast
                                                        ? 'text-endurix-black/40 dark:text-muted-foreground'
                                                        : 'text-endurix-black dark:text-foreground group-hover:text-endurix-orange',
                                                )}
                                            >
                                                {race.race_name || race.name}
                                            </h3>
                                            <ChevronRight className="h-3 w-3 text-endurix-black/40 dark:text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                                        </div>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                                            <div className="flex items-center gap-1.5 text-[12px] text-endurix-black/50 dark:text-muted-foreground">
                                                <Calendar className="h-3 w-3" />
                                                <span>
                                                    {format.dateTime(new Date(race.race_date!), { day: 'numeric', month: 'short' })}
                                                </span>
                                            </div>
                                            {!isPast && race.race_distance && (
                                                <div className="flex items-center gap-1.5 text-[12px] text-endurix-black/50 dark:text-muted-foreground">
                                                    <MapPin className="h-3 w-3" />
                                                    <span>{race.race_distance}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    );
                })}

                {sortedAthleteRaces.length === 0 && groupRaces.length === 0 && (
                    <MonospaceLabel color="muted" className="block py-4 text-center">
                        {t('dashboard.alerts.noNextRaces')}
                    </MonospaceLabel>
                )}
            </div>
        </DashboardCard>
    );
}
