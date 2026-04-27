'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Group } from '@/interfaces/group';
import { groupsService } from '@/features/groups/services/groups.service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Users, Timer, Calendar, ChevronRight, Edit2, UserPlus, Check, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { isGroupActive } from '@/features/groups/utils/groupUtils';

export default function GroupsPage() {
    const t = useTranslations('groups');
    const [activeGroups, setActiveGroups] = useState<Group[]>([]);
    const [finishedGroups, setFinishedGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');

    const fetchGroups = async () => {
        try {
            const res = await groupsService.findAll();
            const active = res.data.filter(isGroupActive);
            const finished = res.data.filter(g => g.group_type === 'RACE' && g.race_date && !isGroupActive(g));
            
            // Wait, actually the logic requested is: "the group should remain active for a month after the race day".
            // So finishedGroups should be those that were active but are now truly expired (> 1 month).
            // Let's refine: 
            // - Active: REGULAR + RACE (future or < 1 month past)
            // - Finished: RACE (> 1 month past)

            const now = new Date();
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(now.getMonth() - 1);

            const activeList = res.data.filter(isGroupActive);
            const archivedList = res.data.filter(g => g.group_type === 'RACE' && g.race_date && !isGroupActive(g));

            setActiveGroups(activeList);
            setFinishedGroups(archivedList);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGroups();
    }, []);

    const handleStartEdit = (e: React.MouseEvent, group: Group) => {
        e.preventDefault();
        e.stopPropagation();
        setEditingGroupId(group.id);
        setEditingName(group.name);
    };

    const handleCancelEdit = (e?: React.MouseEvent | React.KeyboardEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        setEditingGroupId(null);
        setEditingName('');
    };

    const handleSaveName = async (e: React.MouseEvent, groupId: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (!editingName.trim()) return;

        try {
            await groupsService.update(groupId, { name: editingName.trim() });
            setActiveGroups(prev => prev.map(g => g.id === groupId ? { ...g, name: editingName.trim() } : g));
            setFinishedGroups(prev => prev.map(g => g.id === groupId ? { ...g, name: editingName.trim() } : g));
            setEditingGroupId(null);
            setEditingName('');
        } catch (error) {
            console.error('Error updating group name:', error);
        }
    };

    const renderGroupCard = (group: Group, isArchived: boolean = false) => (
        <Link key={group.id} href={`/groups/${group.id}`} className={`block group ${isArchived ? 'opacity-70 grayscale-[0.3]' : ''}`}>
            <Card className={`h-full hover:border-primary/50 transition-all duration-300 ${isArchived ? 'bg-muted/20' : ''}`}>
                <CardContent className="p-5 h-full flex flex-col">
                    <div className="flex items-start justify-between mb-6">
                        {editingGroupId === group.id ? (
                            <div className="flex items-center gap-2 w-full pr-4" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                                <Input
                                    value={editingName}
                                    onChange={(e) => setEditingName(e.target.value)}
                                    className="h-8 py-0"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveName(e as any, group.id);
                                        if (e.key === 'Escape') handleCancelEdit(e as any);
                                    }}
                                />
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 shrink-0 text-primary"
                                    onClick={(e) => handleSaveName(e, group.id)}
                                >
                                    <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 shrink-0 text-muted-foreground"
                                    onClick={handleCancelEdit}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ) : (
                            <>
                                <h3 className="text-xl font-semibold text-foreground leading-tight group-hover:text-primary transition-colors pr-4">
                                    {group.name}
                                </h3>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => handleStartEdit(e, group)}
                                >
                                    <Edit2 className="h-4 w-4" />
                                </Button>
                            </>
                        )}
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
                                <span className={`font-medium px-2 py-0.5 rounded text-xs ${isArchived ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
                                    {isArchived ? t('finished') || 'Finalizado' : t('racePrep')}
                                </span>
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
    );

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8 sm:space-y-10">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-foreground">
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
                <div className="space-y-12">
                    {/* Active Groups Section */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold font-display tracking-tight flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500" />
                            {t('activeGroups') || 'Grupos Activos'}
                        </h2>
                        <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {activeGroups.map((group) => renderGroupCard(group))}

                            <Link href="/groups/new" className="block h-full group">
                                <Card className="h-full hover:border-primary/50 transition-all duration-300 border-dashed bg-muted/30 cursor-pointer flex flex-col items-center justify-center text-center p-6 min-h-[250px]">
                                    <div className="w-12 h-12 bg-muted flex items-center justify-center rounded-full mb-4 text-muted-foreground group-hover:text-primary group-hover:scale-105 transition-all duration-300">
                                        <UserPlus className="h-6 w-6" />
                                    </div>
                                    <h3 className="text-lg font-bold font-display tracking-tight text-foreground mb-1">{t('emptyCardTitle')}</h3>                                    <p className="text-sm text-muted-foreground max-w-[200px] leading-relaxed">{t('emptyCardDesc')}</p>
                                </Card>
                            </Link>
                        </div>
                    </div>

                    {/* Finished Groups Section */}
                    {finishedGroups.length > 0 && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold flex items-center gap-2 text-muted-foreground">
                                <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                                {t('finishedGroups') || 'Grupos Históricos'}
                            </h2>
                            <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                {finishedGroups.map((group) => renderGroupCard(group, true))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
