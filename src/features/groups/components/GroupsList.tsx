'use client';
import { appLogger } from '@/lib/app-logger';

import { useState } from 'react';
import Link from 'next/link';
import { Group } from '@/interfaces/group';
import { groupsService } from '@/features/groups/services/groups.service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/PageHeader';
import { Input } from '@/components/ui/input';
import { Plus, Users, Timer, Calendar, ChevronRight, Edit2, UserPlus, Check, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { isGroupActive } from '@/features/groups/utils/groupUtils';

interface GroupsListProps {
    initialGroups: Group[];
}

export function GroupsList({ initialGroups }: GroupsListProps) {
    const t = useTranslations('groups');
    const [groups, setGroups] = useState<Group[]>(initialGroups);
    const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');

    const activeGroups = groups.filter(isGroupActive);
    const finishedGroups = groups.filter(g => g.group_type === 'RACE' && g.race_date && !isGroupActive(g));

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
            setGroups(prev => prev.map(g => g.id === groupId ? { ...g, name: editingName.trim() } : g));
            setEditingGroupId(null);
            setEditingName('');
        } catch (error) {
            appLogger.error('Error updating group name:', error);
        }
    };

    const renderGroupCard = (group: Group, isArchived: boolean = false) => (
        <Link key={group.id} href={`/groups/${group.id}`} className={`block group ${isArchived ? 'opacity-70 grayscale-[0.3]' : ''}`}>
            <Card className={`h-full hover:border-endurix-orange/50 transition-colors ${isArchived ? 'bg-endurix-black/5 dark:bg-white/5' : ''}`}>
                <CardContent className="p-5 h-full flex flex-col">
                    <div className="flex items-start justify-between mb-6">
                        {editingGroupId === group.id ? (
                            <div className="flex items-center gap-2 w-full pr-4" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                                <Input
                                    variant="boxed"
                                    value={editingName}
                                    onChange={(e) => setEditingName(e.target.value)}
                                    className="h-8 py-0"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            void handleSaveName(e as unknown as React.MouseEvent, group.id);
                                        }
                                        if (e.key === 'Escape') {
                                            handleCancelEdit(e);
                                        }
                                    }}
                                />
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 shrink-0 text-endurix-orange"
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
                                <h3
                                    className="text-xl font-medium text-endurix-black dark:text-foreground leading-tight group-hover:text-endurix-orange transition-colors pr-4 uppercase"
                                    style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                                >
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
                            <span className="font-medium text-endurix-black dark:text-foreground tabular-nums">{t('athletesCount', { count: group._count?.length || 0 })}</span>
                        </div>

                        <div className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Timer className="h-4 w-4" />
                                <span>{t('phase')}</span>
                            </div>
                            {group.group_type === 'RACE' ? (
                                <span className={`font-medium px-2 py-0.5 text-[10px] uppercase tracking-wider ${isArchived ? 'bg-endurix-black/10 text-muted-foreground' : 'bg-endurix-orange/10 text-endurix-orange border border-endurix-orange/30'}`}
                                    style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                                    {isArchived ? t('finished') || 'Finalizado' : t('racePrep')}
                                </span>
                            ) : (
                                <span className="font-medium bg-endurix-black/8 text-muted-foreground px-2 py-0.5 text-[10px] uppercase tracking-wider"
                                    style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                                    {t('base')}
                                </span>
                            )}
                        </div>

                        {group.group_type === 'RACE' && group.race_date && (
                            <div className="flex justify-between items-center text-sm">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Calendar className="h-4 w-4" />
                                    {group.race_priority === 'A' ? <span>{t('targetRace')}</span> : <span>{t('event')}</span>}
                                </div>
                                <span className="font-medium text-endurix-black dark:text-foreground">
                                    {new Date(group.race_date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    {group.race_distance ? ` (${group.race_distance})` : ''}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-endurix-black/10 dark:border-border">
                        <div className="flex items-center text-endurix-orange font-medium text-sm uppercase tracking-widest text-[10px]">
                            <span>{t('viewDetails')}</span>
                            <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );

    return (
        <div className="space-y-8 sm:space-y-10">
            <PageHeader
                className="mb-0"
                title={t('title')}
                action={
                    <Button variant="orange" size="sm" className="sm:size-default uppercase tracking-widest" asChild>
                        <Link href="/groups/new">
                            <Plus className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">{t('createGroup')}</span>
                        </Link>
                    </Button>
                }
            />

            <div className="space-y-12">
                {/* Active Groups Section */}
                <div className="space-y-4">
                    <h2
                        className="text-lg font-bold text-endurix-black dark:text-foreground tracking-tight flex items-center gap-2 uppercase"
                        style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                    >
                        <span className="w-2 h-2 bg-emerald-500" />
                        {t('activeGroups') || 'Grupos Activos'}
                    </h2>
                    <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {activeGroups.map((group) => renderGroupCard(group))}

                        <Link href="/groups/new" className="block h-full group">
                            <Card className="h-full hover:border-endurix-orange/50 transition-colors border-dashed bg-endurix-black/5 dark:bg-white/5 cursor-pointer flex flex-col items-center justify-center text-center p-6 min-h-[250px]">
                                <div className="w-12 h-12 bg-endurix-black/8 dark:bg-white/10 flex items-center justify-center mb-4 text-muted-foreground group-hover:text-endurix-orange group-hover:scale-105 transition-all duration-300">
                                    <UserPlus className="h-6 w-6" />
                                </div>
                                <h3
                                    className="text-lg font-bold text-endurix-black dark:text-foreground tracking-tight mb-1 uppercase"
                                    style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                                >
                                    {t('emptyCardTitle')}
                                </h3>
                                <p className="text-sm text-muted-foreground max-w-[200px] leading-relaxed">{t('emptyCardDesc')}</p>
                            </Card>
                        </Link>
                    </div>
                </div>

                {/* Finished Groups Section */}
                {finishedGroups.length > 0 && (
                    <div className="space-y-4">
                        <h2
                            className="text-lg font-medium flex items-center gap-2 text-muted-foreground uppercase"
                            style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                        >
                            <span className="w-2 h-2 bg-muted-foreground/40" />
                            {t('finishedGroups') || 'Grupos Históricos'}
                        </h2>
                        <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {finishedGroups.map((group) => renderGroupCard(group, true))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
