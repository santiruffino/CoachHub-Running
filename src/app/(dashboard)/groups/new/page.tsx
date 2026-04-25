'use client';

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
import { Loader2, ArrowLeft, Trophy, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function CreateGroupPage() {
    const t = useTranslations('groups');
    const tCommon = useTranslations('common');
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
    const [race_priority, setRacePriority] = useState<'A' | 'B' | 'C'>('A');
    const [race_location, setRaceLocation] = useState('');

    useEffect(() => {
        const fetchRaces = async () => {
            try {
                const res = await racesService.findAll();
                setRaceLibrary(res.data);
            } catch (e) {
                console.error('Failed to fetch races', e);
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
            console.error('Failed to create group', error);
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
                    <h1 className="text-2xl font-bold font-manrope">{t('createGroup')}</h1>
                    <p className="text-sm text-muted-foreground">Configura un nuevo equipo de entrenamiento.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="bg-card border border-border/40 rounded-[2rem] p-6 sm:p-8 shadow-sm space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-xs font-bold tracking-widest uppercase opacity-70">Nombre del Grupo</Label>
                            <Input 
                                id="name"
                                placeholder="Ej. Team Maratón 2025" 
                                value={name} 
                                onChange={(e) => setName(e.target.value)} 
                                required 
                                className="bg-muted/30 border-none h-12 rounded-xl focus-visible:ring-1 focus-visible:ring-primary/20"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description" className="text-xs font-bold tracking-widest uppercase opacity-70">Descripción</Label>
                            <Textarea 
                                id="description"
                                placeholder="Opcional: detalles del grupo, objetivos, etc." 
                                value={description} 
                                onChange={(e) => setDescription(e.target.value)} 
                                className="bg-muted/30 border-none rounded-xl focus-visible:ring-1 focus-visible:ring-primary/20 min-h-[100px]"
                            />
                        </div>

                        <div className="flex items-center space-x-2 pt-4 border-t border-border/40">
                            <Switch 
                                id="is-race-group"
                                checked={group_type === 'RACE'}
                                onCheckedChange={(checked) => setGroupType(checked ? 'RACE' : 'REGULAR')}
                            />
                            <Label htmlFor="is-race-group" className="font-semibold cursor-pointer">
                                {t('detail.isRaceGroup')}
                            </Label>
                        </div>
                    </div>

                    {group_type === 'RACE' && (
                        <div className="space-y-6 pt-6 mt-6 border-t border-border/40 animate-in fade-in slide-in-from-top-2">
                            <div className="flex p-1 bg-muted/30 rounded-xl">
                                <Button 
                                    type="button"
                                    variant={raceSelectionMode === 'EXISTING' ? 'secondary' : 'ghost'}
                                    className="flex-1 rounded-lg text-xs font-bold uppercase tracking-wider"
                                    onClick={() => setRaceSelectionMode('EXISTING')}
                                >
                                    {t('detail.selectExistingRace')}
                                </Button>
                                <Button 
                                    type="button"
                                    variant={raceSelectionMode === 'NEW' ? 'secondary' : 'ghost'}
                                    className="flex-1 rounded-lg text-xs font-bold uppercase tracking-wider"
                                    onClick={() => setRaceSelectionMode('NEW')}
                                >
                                    {t('detail.createNewRace')}
                                </Button>
                            </div>

                            {raceSelectionMode === 'EXISTING' ? (
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold tracking-widest uppercase opacity-70">{t('detail.pickFromLibrary')}</Label>
                                    <div className="relative">
                                        <Trophy className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                                        <select 
                                            className="flex h-12 w-full rounded-xl border-none bg-muted/30 pl-11 pr-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/20 appearance-none cursor-pointer"
                                            value={selectedRaceId}
                                            onChange={(e) => setSelectedRaceId(e.target.value)}
                                            required={group_type === 'RACE' && raceSelectionMode === 'EXISTING'}
                                        >
                                            <option value="">Selecciona una carrera...</option>
                                            {raceLibrary.map(race => (
                                                <option key={race.id} value={race.id}>
                                                    {race.name} ({new Date(race.date || '').toLocaleDateString()})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    {raceLibrary.length === 0 && (
                                        <p className="text-xs text-orange-500 mt-2">No hay carreras en la biblioteca. Crea una nueva.</p>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1">
                                    <div className="space-y-2 col-span-1 md:col-span-2">
                                        <Label className="text-xs font-bold tracking-widest uppercase opacity-70">{t('detail.raceName')}</Label>
                                        <Input 
                                            placeholder="Ej. Maratón de Buenos Aires" 
                                            value={race_name} 
                                            onChange={(e) => setRaceName(e.target.value)} 
                                            required={group_type === 'RACE' && raceSelectionMode === 'NEW'}
                                            className="bg-muted/30 border-none h-11 rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold tracking-widest uppercase opacity-70">{t('detail.raceDate')}</Label>
                                        <Input 
                                            type="date" 
                                            value={race_date} 
                                            onChange={(e) => setRaceDate(e.target.value)} 
                                            required={group_type === 'RACE' && raceSelectionMode === 'NEW'}
                                            className="bg-muted/30 border-none h-11 rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold tracking-widest uppercase opacity-70">{t('detail.raceDistance')}</Label>
                                        <Input 
                                            placeholder="Ej. 42k" 
                                            value={race_distance} 
                                            onChange={(e) => setRaceDistance(e.target.value)} 
                                            className="bg-muted/30 border-none h-11 rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-2 col-span-1 md:col-span-2">
                                        <Label className="text-xs font-bold tracking-widest uppercase opacity-70">Ubicación</Label>
                                        <Input 
                                            placeholder="Ej. Buenos Aires, Argentina" 
                                            value={race_location} 
                                            onChange={(e) => setRaceLocation(e.target.value)} 
                                            className="bg-muted/30 border-none h-11 rounded-xl"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-4">
                    <Button variant="ghost" type="button" onClick={() => router.back()} disabled={loading} className="rounded-xl font-bold uppercase tracking-wider text-xs">
                        {tCommon('cancel')}
                    </Button>
                    <Button type="submit" disabled={loading} className="rounded-xl px-8 font-bold uppercase tracking-wider text-xs shadow-lg shadow-primary/20">
                        {loading ? (
                            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creando... </>
                        ) : (
                            'Crear Grupo'
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
