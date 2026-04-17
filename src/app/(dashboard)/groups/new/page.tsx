'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import api from '@/lib/axios';
import { groupsService } from '@/features/groups/services/groups.service';
import { CreateGroupDto } from '@/features/groups/types';
import Link from 'next/link';

interface Athlete {
    id: string;
    name: string;
    email: string;
}

export default function CreateGroupPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Form fields
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [group_type, setGroupType] = useState<'REGULAR' | 'RACE'>('REGULAR');
    const [race_name, setRaceName] = useState('');
    const [race_date, setRaceDate] = useState('');
    const [race_distance, setRaceDistance] = useState('');
    const [race_priority, setRacePriority] = useState<'A' | 'B' | 'C'>('A');

    // Athlete selection
    const [athletes, setAthletes] = useState<Athlete[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAthletes, setSelectedAthletes] = useState<Set<string>>(new Set());
    const [loadingAthletes, setLoadingAthletes] = useState(true);

    useEffect(() => {
        const fetchAthletes = async () => {
            try {
                const res = await api.get('/v2/users/athletes');
                const list = res.data.map((a: any) => ({
                    id: a.id,
                    name: a.name || a.email.split('@')[0],
                    email: a.email,
                }));
                // Sort alphabetically
                list.sort((a: Athlete, b: Athlete) => a.name.localeCompare(b.name));
                setAthletes(list);
            } catch (err) {
                console.error("Failed to fetch athletes", err);
            } finally {
                setLoadingAthletes(false);
            }
        };
        fetchAthletes();
    }, []);

    const filteredAthletes = athletes.filter(a => 
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        a.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const toggleAthlete = (id: string, checked: boolean) => {
        const newSet = new Set(selectedAthletes);
        if (checked) {
            newSet.add(id);
        } else {
            newSet.delete(id);
        }
        setSelectedAthletes(newSet);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const groupData: CreateGroupDto = {
                name,
                description,
                group_type,
            };

            if (groupData.group_type === 'RACE') {
                groupData.race_name = race_name;
                groupData.race_date = race_date;
                groupData.race_distance = race_distance;
                groupData.race_priority = race_priority as any;
            }

            // 1. Create Group
            const res = await groupsService.create(groupData);
            const newGroup = res.data;

            // 2. Add Selected Athletes
            if (selectedAthletes.size > 0) {
                const membersPromises = Array.from(selectedAthletes).map(athleteId => 
                    groupsService.addMember(newGroup.id, athleteId).catch(err => {
                        console.error(`Failed to add member ${athleteId}`, err);
                    })
                );
                await Promise.all(membersPromises);
            }

            router.push(`/groups/${newGroup.id}`);
        } catch (err) {
            setError('Error al crear el grupo o agregar atletas. Por favor intenta nuevamente.');
            setLoading(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 lg:pt-0 max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold">Crear Nuevo Grupo</h1>
                    <p className="text-muted-foreground text-sm mt-1">Configura el grupo y asigna atletas.</p>
                </div>
                <Button variant="outline" asChild>
                    <Link href="/groups">Cancelar</Link>
                </Button>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Top Row: Group Data */}
                <Card>
                    <CardHeader>
                        <CardTitle>Información del Grupo</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2 col-span-1 md:col-span-2">
                                <Label>Nombre del Grupo <span className="text-red-500">*</span></Label>
                                <Input 
                                    required 
                                    value={name} 
                                    onChange={(e) => setName(e.target.value)} 
                                    placeholder="Ej. Target Maratón PBP 2026" 
                                />
                            </div>
                            
                            <div className="space-y-2 col-span-1 md:col-span-2">
                                <Label>Descripción</Label>
                                <Textarea 
                                    value={description} 
                                    onChange={(e) => setDescription(e.target.value)} 
                                    placeholder="Detalles sobre el grupo (opcional)" 
                                />
                            </div>

                            <div className="space-y-2 md:col-span-1">
                                <Label>Fase de Entrenamiento</Label>
                                <select 
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    value={group_type}
                                    onChange={(e) => setGroupType(e.target.value as any)}
                                >
                                    <option value="REGULAR">Base / Regular</option>
                                    <option value="RACE">Preparación Carrera</option>
                                </select>
                            </div>
                        </div>

                        {group_type === 'RACE' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 mt-2 border-t">
                                <div className="space-y-2 col-span-1 md:col-span-2">
                                    <Label>Nombre de la Carrera</Label>
                                    <Input 
                                        placeholder="Ej. Maratón de Buenos Aires" 
                                        value={race_name} 
                                        onChange={(e) => setRaceName(e.target.value)} 
                                        required={group_type === 'RACE'}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Fecha de Carrera</Label>
                                    <Input 
                                        type="date" 
                                        value={race_date} 
                                        onChange={(e) => setRaceDate(e.target.value)} 
                                        required={group_type === 'RACE'}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Distancia</Label>
                                        <Input 
                                            placeholder="Ej. 42k" 
                                            value={race_distance} 
                                            onChange={(e) => setRaceDistance(e.target.value)} 
                                            required={group_type === 'RACE'}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Prioridad</Label>
                                        <select 
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                            value={race_priority}
                                            onChange={(e) => setRacePriority(e.target.value as any)}
                                        >
                                            <option value="A">A</option>
                                            <option value="B">B</option>
                                            <option value="C">C</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Bottom Row: Athlete List */}
                <Card>
                    <CardHeader className="pb-4 border-b">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <CardTitle>Atletas</CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Selecciona los atletas que pertenecerán a este grupo ({selectedAthletes.size} seleccionados).
                                </p>
                            </div>
                            <div className="relative max-w-sm w-full sm:w-auto flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar atleta..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 h-9"
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loadingAthletes ? (
                            <div className="flex justify-center items-center h-48 text-muted-foreground">
                                <Loader2 className="h-6 w-6 animate-spin mr-2" /> Cargando atletas...
                            </div>
                        ) : filteredAthletes.length === 0 ? (
                            <div className="flex justify-center items-center h-48 text-muted-foreground">
                                No se encontraron atletas.
                            </div>
                        ) : (
                            <div className="max-h-[400px] overflow-y-auto w-full">
                                <ul className="divide-y divide-border">
                                    {filteredAthletes.map(athlete => {
                                        const isSelected = selectedAthletes.has(athlete.id);
                                        return (
                                            <li 
                                                key={athlete.id} 
                                                className={`flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors ${isSelected ? 'bg-primary/5' : ''}`}
                                                onClick={() => toggleAthlete(athlete.id, !isSelected)}
                                            >
                                                <div className="flex items-center space-x-4">
                                                    <Avatar className="h-10 w-10">
                                                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                                            {athlete.name.charAt(0).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-sm truncate">{athlete.name}</p>
                                                        <p className="text-xs text-muted-foreground truncate">{athlete.email}</p>
                                                    </div>
                                                </div>
                                                <Switch 
                                                    checked={isSelected}
                                                    onCheckedChange={(val) => toggleAthlete(athlete.id, val)}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="flex justify-end pt-4 pb-8">
                    <Button type="submit" size="lg" disabled={loading} className="w-full sm:w-auto px-8">
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
