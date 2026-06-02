'use client';
import { appLogger } from '@/lib/app-logger';


import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { groupsService } from '@/features/groups/services/groups.service';
import { racesService } from '@/features/races/services/races.service';
import { Race } from '@/interfaces/race';
import { Loader2, ArrowLeft, Trophy } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function CreateGroupPage() {
    const t = useTranslations('groups');
    const tCommon = useTranslations('common');
    const tForm = useTranslations('groups.createForm');
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [raceLibrary, setRaceLibrary] = useState<Race[]>([]);
    
    // Group State
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [group_type, setGroupType] = useState<'REGULAR' | 'RACE'>('REGULAR');
    
    // Race Link State
    const [raceSelectionMode, setRaceSelectionMode] = useState<'EXISTING' | 'NEW'>('EXISTING');
    const [selectedRaceId, setSelectedRaceId] = useState<string>('');
    
    // New Race State (if mode is NEW)
    const [race_name, setRaceName] = useState('');
    const [race_date, setRaceDate] = useState('');
    const [race_distance, setRaceDistance] = useState('');
    const [race_location, setRaceLocation] = useState('');

    useEffect(() => {
        const fetchRaces = async () => {
            try {
                const res = await racesService.findAll();
                setRaceLibrary(res.data);
            } catch (e) {
                appLogger.error('Failed to fetch races', e);
            }
        };
        fetchRaces();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            let finalRaceId = selectedRaceId;

            // 1. If mode is NEW, create the race first
            if (group_type === 'RACE' && raceSelectionMode === 'NEW') {
                const raceRes = await racesService.create({
                    name: race_name,
                    date: race_date,
                    distance: race_distance,
                    location: race_location,
                });
                finalRaceId = raceRes.data.id;
            }

            // 2. Create the group linked to the race
            await groupsService.create({
                name,
                description,
                group_type,
                race_id: group_type === 'RACE' ? finalRaceId : undefined,
                // Legacy fields (optional, keeping for compatibility if backend still uses them)
                race_name: group_type === 'RACE' ? (raceSelectionMode === 'NEW' ? race_name : raceLibrary.find(r => r.id === finalRaceId)?.name) : undefined,
                race_date: group_type === 'RACE' ? (raceSelectionMode === 'NEW' ? race_date : raceLibrary.find(r => r.id === finalRaceId)?.date || undefined) : undefined,
            });

            router.push('/groups');
            router.refresh();
        } catch (error) {
            appLogger.error('Failed to create group', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8 lg:pt-0">
            <div className="flex items-center gap-4 mb-8">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1
                        className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-endurix-black dark:text-foreground"
                        style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                    >{t('createGroup')}</h1>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground mt-1" style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}>{tForm('subtitle')}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="bg-endurix-paper dark:bg-card border border-endurix-black/10 dark:border-border p-6 sm:p-8 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label
                                htmlFor="name"
                                className="text-[10px] font-bold uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground"
                                style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                            >{tForm('groupNameLabel')}</Label>
                            <Input
                                id="name"
                                placeholder={tForm('groupNamePlaceholder')}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="bg-endurix-paper dark:bg-card border-endurix-black/15 dark:border-border h-12 focus-visible:ring-1 focus-visible:ring-endurix-orange/40"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label
                                htmlFor="description"
                                className="text-[10px] font-bold uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground"
                                style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                            >{tForm('descriptionLabel')}</Label>
                            <Textarea
                                id="description"
                                placeholder={tForm('descriptionPlaceholder')}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="bg-endurix-paper dark:bg-card border-endurix-black/15 dark:border-border focus-visible:ring-1 focus-visible:ring-endurix-orange/40 min-h-[100px]"
                            />
                        </div>

                        <div className="flex items-center space-x-2 pt-4 border-t border-endurix-black/10 dark:border-border">
                            <Switch
                                id="is-race-group"
                                checked={group_type === 'RACE'}
                                onCheckedChange={(checked) => setGroupType(checked ? 'RACE' : 'REGULAR')}
                            />
                            <Label
                                htmlFor="is-race-group"
                                className="text-[10px] font-bold uppercase tracking-widest text-endurix-black dark:text-foreground cursor-pointer"
                                style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                            >
                                {t('detail.isRaceGroup')}
                            </Label>
                        </div>
                    </div>

                    {group_type === 'RACE' && (
                        <div className="space-y-6 pt-6 mt-6 border-t border-endurix-black/10 dark:border-border animate-in fade-in slide-in-from-top-2">
                            <div className="flex p-1 bg-endurix-black/8 dark:bg-white/8">
                                <Button
                                    type="button"
                                    variant={raceSelectionMode === 'EXISTING' ? 'default' : 'ghost'}
                                    className="flex-1 text-xs font-bold uppercase tracking-widest"
                                    style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                                    onClick={() => setRaceSelectionMode('EXISTING')}
                                >
                                    {t('detail.selectExistingRace')}
                                </Button>
                                <Button
                                    type="button"
                                    variant={raceSelectionMode === 'NEW' ? 'default' : 'ghost'}
                                    className="flex-1 text-xs font-bold uppercase tracking-widest"
                                    style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                                    onClick={() => setRaceSelectionMode('NEW')}
                                >
                                    {t('detail.createNewRace')}
                                </Button>
                            </div>

                            {raceSelectionMode === 'EXISTING' ? (
                                <div className="space-y-2">
                                    <Label
                                        className="text-[10px] font-bold uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground"
                                        style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                                    >{t('detail.pickFromLibrary')}</Label>
                                    <div className="relative">
                                        <Trophy className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-endurix-orange" />
                                        <select
                                            className="flex h-12 w-full border border-endurix-black/15 dark:border-border bg-endurix-paper dark:bg-card pl-11 pr-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-endurix-orange/40 appearance-none cursor-pointer"
                                            value={selectedRaceId}
                                        onChange={(e) => setSelectedRaceId(e.target.value)}
                                        required={group_type === 'RACE' && raceSelectionMode === 'EXISTING'}
                                    >
                                            <option value="">{tForm('selectRacePlaceholder')}</option>
                                            {raceLibrary.map(race => (
                                                <option key={race.id} value={race.id}>
                                                    {race.name} ({new Date(race.date || '').toLocaleDateString()})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    {raceLibrary.length === 0 && (
                                        <p
                                            className="text-[10px] uppercase tracking-widest text-endurix-orange mt-2"
                                            style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                                        >{tForm('emptyRaceLibrary')}</p>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1">
                                    <div className="space-y-2 col-span-1 md:col-span-2">
                                        <Label
                                            className="text-[10px] font-bold uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground"
                                            style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                                        >{t('detail.raceName')}</Label>
                                        <Input
                                            placeholder={tForm('raceNamePlaceholder')}
                                            value={race_name}
                                            onChange={(e) => setRaceName(e.target.value)}
                                            required={group_type === 'RACE' && raceSelectionMode === 'NEW'}
                                            className="bg-endurix-paper dark:bg-card border-endurix-black/15 dark:border-border h-11"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label
                                            className="text-[10px] font-bold uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground"
                                            style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                                        >{t('detail.raceDate')}</Label>
                                        <Input
                                            type="date"
                                            value={race_date}
                                            onChange={(e) => setRaceDate(e.target.value)}
                                            required={group_type === 'RACE' && raceSelectionMode === 'NEW'}
                                            className="bg-endurix-paper dark:bg-card border-endurix-black/15 dark:border-border h-11"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label
                                            className="text-[10px] font-bold uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground"
                                            style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                                        >{t('detail.raceDistance')}</Label>
                                        <Input
                                            placeholder={tForm('raceDistancePlaceholder')}
                                            value={race_distance}
                                            onChange={(e) => setRaceDistance(e.target.value)}
                                            className="bg-endurix-paper dark:bg-card border-endurix-black/15 dark:border-border h-11"
                                        />
                                    </div>
                                    <div className="space-y-2 col-span-1 md:col-span-2">
                                        <Label
                                            className="text-[10px] font-bold uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground"
                                            style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                                        >{tForm('locationLabel')}</Label>
                                        <Input
                                            placeholder={tForm('locationPlaceholder')}
                                            value={race_location}
                                            onChange={(e) => setRaceLocation(e.target.value)}
                                            className="bg-endurix-paper dark:bg-card border-endurix-black/15 dark:border-border h-11"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-4">
                    <Button variant="ghost" type="button" onClick={() => router.back()} disabled={loading} className="font-bold uppercase tracking-widest text-xs">
                        {tCommon('cancel')}
                    </Button>
                    <Button type="submit" disabled={loading} variant="orange" className="px-8 font-bold uppercase tracking-widest text-xs">
                        {loading ? (
                            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {tForm('creating')} </>
                        ) : (
                            tForm('createGroup')
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
