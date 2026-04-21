'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Group } from '@/features/groups/types';
import { groupsService } from '@/features/groups/services/groups.service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Users, Timer, Calendar, ChevronRight, Edit2, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function GroupsPage() {
    const t = useTranslations('groups');
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchGroups = async () => {
        try {
            const res = await groupsService.findAll();
            setGroups(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGroups();
    }, []);

    return (
        <div className="p-4 sm:p-6 lg:p-8 lg:pt-0 space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold">
                        {t('title')}
                    </h1>
                </div>
                <Button size="sm" className="sm:size-default" asChild>
                    <Link href="/groups/new">
                        <Plus className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">{t('createGroup')}</span>
                    </Link>
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64 text-muted-foreground">{t('loadingGroups')}</div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {groups.map((group) => (
                        <Link key={group.id} href={`/groups/${group.id}`} className="block group">
                            <Card className="h-full hover:border-primary/50 transition-all duration-300">
                                <CardContent className="p-5 h-full flex flex-col">
                                    <div className="flex items-start justify-between mb-6">
                                        <h3 className="text-xl font-semibold text-foreground leading-tight group-hover:text-primary transition-colors pr-4">{group.name}</h3>
                                        <span className="text-sm text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity"><Edit2 className="h-4 w-4" /></span>
                                    </div>

                                    <div className="space-y-3 flex-grow">
                                        <div className="flex justify-between items-center text-sm">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Users className="h-4 w-4" />
                                                <span>{t('athletes')}</span>
                                            </div>
                                            <span className="font-medium text-foreground">{t('athletesCount', { count: group._count?.length || 0 })}</span>
                                        </div>

                                        <div className="flex justify-between items-center text-sm">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Timer className="h-4 w-4" />
                                                <span>{t('phase')}</span>
                                            </div>
                                            {group.group_type === 'RACE' ? (
                                                <span className="font-medium bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">{t('racePrep')}</span>
                                            ) : (
                                                <span className="font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded text-xs">{t('base')}</span>
                                            )}
                                        </div>

                                        {group.group_type === 'RACE' && group.race_date && (
                                            <div className="flex justify-between items-center text-sm">
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <Calendar className="h-4 w-4" />
                                                    {group.race_priority === 'A' ? <span>{t('targetRace')}</span> : <span>{t('event')}</span>}
                                                </div>
                                                <span className="font-medium text-foreground">
                                                    {new Date(group.race_date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    {group.race_distance ? ` (${group.race_distance})` : ''}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-6 pt-4 border-t">
                                        <div className="flex items-center text-primary font-medium text-sm">
                                            <span>{t('viewDetails')}</span>
                                            <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}

                    <Link href="/groups/new" className="block h-full group">
                        <Card className="h-full hover:border-primary/50 transition-all duration-300 border-dashed bg-muted/30 cursor-pointer flex flex-col items-center justify-center text-center p-6 min-h-[250px]">
                            <div className="w-12 h-12 bg-muted flex items-center justify-center rounded-full mb-4 text-muted-foreground group-hover:text-primary group-hover:scale-105 transition-all duration-300">
                                <UserPlus className="h-6 w-6" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground mb-1">{t('emptyCardTitle')}</h3>
                            <p className="text-sm text-muted-foreground max-w-[200px] leading-relaxed">{t('emptyCardDesc')}</p>
                        </Card>
                    </Link>
                </div>
            )}
        </div>
    );
}
