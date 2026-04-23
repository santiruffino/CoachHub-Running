'use client';

import { useEffect, useState } from 'react';
import { groupsService } from '@/features/groups/services/groups.service';
import { Group } from '@/features/groups/types';
import { isRaceRelevant } from '@/features/groups/utils/groupUtils';
import { useTranslations } from 'next-intl';
import { Trophy, Calendar, MapPin, ChevronRight, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export function NextRaces() {
    const t = useTranslations();
    const [races, setRaces] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRaces = async () => {
            try {
                const res = await groupsService.findAll();
                const filteredRaces = res.data
                    .filter(isRaceRelevant)
                    .sort((a, b) => new Date(a.race_date!).getTime() - new Date(b.race_date!).getTime());
                setRaces(filteredRaces);
            } catch (error) {
                console.error('Failed to fetch next races', error);
            } finally {
                setLoading(false);
            }
        };

        fetchRaces();
    }, []);

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

    if (races.length === 0) {
        return (
            <div className="bg-muted p-6 rounded-2xl">
                <h2 className="text-base font-semibold text-foreground mb-6">{t("dashboard.alerts.nextRaces")}</h2>
                <p className="text-sm text-muted-foreground">{t("dashboard.alerts.noNextRaces")}</p>
            </div>
        );
    }

    const now = new Date();

    return (
        <div className="bg-muted p-6 rounded-2xl">
            <h2 className="text-base font-semibold text-foreground mb-6">{t("dashboard.alerts.nextRaces")}</h2>
            <div className="space-y-4">
                {races.map((race) => {
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
                                            {isPast && (
                                                <span className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                    FINALIZADA
                                                </span>
                                            )}
                                            {!isPast && race.race_distance && (
                                                <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                                                    <MapPin className="h-3 w-3" />
                                                    <span>{race.race_distance}</span>
                                                </div>
                                            )}
                                            {!isPast && race.race_priority && (
                                                <div className="flex items-center">
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                                        race.race_priority === 'A' ? 'bg-red-500/10 text-red-500' :
                                                        race.race_priority === 'B' ? 'bg-orange-500/10 text-orange-500' :
                                                        'bg-blue-500/10 text-blue-500'
                                                    }`}>
                                                        PRIO {race.race_priority}
                                                    </span>
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
