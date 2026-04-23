'use client';

import { useEffect, useState } from 'react';
import { groupsService } from '@/features/groups/services/groups.service';
import { Group } from '@/features/groups/types';
import { AthleteRace } from '@/features/races/types';
import { isRaceRelevant } from '@/features/groups/utils/groupUtils';
import { useTranslations } from 'next-intl';
import { Trophy, Calendar, MapPin, ChevronRight, CheckCircle2, Clock, Award } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { differenceInDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { RecordRaceResultModal } from '@/features/races/components/RecordRaceResultModal';

interface NextRacesProps {
    athleteRaces?: AthleteRace[];
    onSuccess?: () => void;
}

export function NextRaces({ athleteRaces = [], onSuccess }: NextRacesProps) {
    const t = useTranslations();
    const [groupRaces, setGroupRaces] = useState<Group[]>([]);
    const [loading, setLoading] = useState(athleteRaces.length === 0);
    const [selectedRace, setSelectedRace] = useState<AthleteRace | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const fetchGroupRaces = async () => {
            if (athleteRaces.length > 0) {
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
                console.error('Failed to fetch next races', error);
            } finally {
                setLoading(false);
            }
        };

        fetchGroupRaces();
    }, [athleteRaces]);

    if (loading) {
        return (
            <div className="bg-muted p-6 rounded-2xl animate-pulse">
                <div className="h-6 w-32 bg-border rounded mb-6"></div>
                <div className="space-y-4">
                    <div className="h-16 bg-border rounded-xl"></div>
                    <div className="h-16 bg-border rounded-xl"></div>
                </div>
            </div>
        );
    }

    const now = new Date();
    
    // Process personal races
    const sortedAthleteRaces = [...athleteRaces].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const hasRaces = sortedAthleteRaces.length > 0 || groupRaces.length > 0;

    if (!hasRaces) {
        return (
            <div className="bg-muted p-6 rounded-2xl">
                <h2 className="text-base font-semibold text-foreground mb-6">{t("dashboard.alerts.nextRaces")}</h2>
                <p className="text-sm text-muted-foreground">{t("dashboard.alerts.noNextRaces")}</p>
            </div>
        );
    }

    return (
        <div className="bg-muted p-6 rounded-2xl">
            <h2 className="text-base font-semibold text-foreground mb-6">{t("dashboard.alerts.nextRaces")}</h2>
            <div className="space-y-4">
                {/* Personal Athlete Races */}
                {sortedAthleteRaces.map((race) => {
                    const raceDate = new Date(race.date);
                    const isPast = raceDate < now;
                    const daysRemaining = differenceInDays(raceDate, now);
                    const name = race.name_override || race.race?.name || t('races.athlete.defaultRaceName');

                    return (
                        <div key={race.id} className={cn(
                            "p-4 rounded-xl transition-all border",
                            isPast 
                            ? 'bg-background/30 border-border/30' 
                            : 'bg-background/50 border-border/50 hover:border-violet-500/30'
                        )}>
                            <div className="flex items-start gap-3">
                                <div className={cn(
                                    "mt-1 p-2 rounded-lg",
                                    isPast 
                                    ? 'bg-muted text-muted-foreground' 
                                    : 'bg-violet-100 text-violet-600'
                                )}>
                                    {isPast ? <CheckCircle2 className="h-4 w-4" /> : <Trophy className="h-4 w-4" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className={cn(
                                            "text-sm font-semibold truncate",
                                            isPast ? 'text-muted-foreground' : 'text-foreground'
                                        )}>
                                            {name}
                                        </h3>
                                        {!isPast && race.priority === 'A' && daysRemaining <= 30 && (
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded animate-pulse">
                                                <Clock className="h-3 w-3" />
                                                {t('races.athlete.countdown', { days: daysRemaining })}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                                        <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                                            <Calendar className="h-3 w-3" />
                                            <span>
                                                {format(raceDate, 'd MMM', { locale: es })}
                                            </span>
                                        </div>
                                        
                                        {!isPast && (
                                            <div className="flex items-center">
                                                <span className={cn(
                                                    "text-[10px] font-bold px-1.5 py-0.5 rounded",
                                                    race.priority === 'A' ? 'bg-red-500/10 text-red-500' :
                                                    race.priority === 'B' ? 'bg-orange-500/10 text-orange-500' :
                                                    'bg-blue-500/10 text-blue-500'
                                                )}>
                                                    PRIO {race.priority}
                                                </span>
                                            </div>
                                        )}

                                        {isPast && race.status === 'PLANNED' && (
                                            <Button 
                                                variant="link" 
                                                size="sm" 
                                                className="h-auto p-0 text-[11px] text-primary font-bold uppercase"
                                                onClick={() => {
                                                    setSelectedRace(race);
                                                    setIsModalOpen(true);
                                                }}
                                            >
                                                {t('races.recordResult')}
                                            </Button>
                                        )}

                                        {isPast && race.status === 'COMPLETED' && race.result_time && (
                                            <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-bold">
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

                {/* Group Races (only if no personal races or if needed as extra) */}
                {athleteRaces.length === 0 && groupRaces.map((race) => {
                    const isPast = new Date(race.race_date!) < now;
                    return (
                        <Link key={race.id} href={`/groups/${race.id}`} className="block">
                            <div className={`p-4 rounded-xl transition-all group border ${
                                isPast 
                                ? 'bg-background/30 border-border/30 grayscale-[0.5]' 
                                : 'bg-background/50 border-border/50 hover:bg-background hover:border-primary/30'
                            }`}>
                                <div className="flex items-start gap-3">
                                    <div className={`mt-1 p-2 rounded-lg transition-colors ${
                                        isPast 
                                        ? 'bg-muted text-muted-foreground' 
                                        : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground'
                                    }`}>
                                        {isPast ? <CheckCircle2 className="h-4 w-4" /> : <Trophy className="h-4 w-4" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className={`text-sm font-semibold truncate transition-colors ${
                                                isPast ? 'text-muted-foreground' : 'text-foreground group-hover:text-primary'
                                            }`}>
                                                {race.race_name || race.name}
                                            </h3>
                                            <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                                        </div>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                                            <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                                                <Calendar className="h-3 w-3" />
                                                <span>
                                                    {new Date(race.race_date!).toLocaleDateString('es-ES', { 
                                                        day: 'numeric', 
                                                        month: 'short' 
                                                    })}
                                                </span>
                                            </div>
                                            {!isPast && race.race_distance && (
                                                <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
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
            </div>
        </div>
    );
}
