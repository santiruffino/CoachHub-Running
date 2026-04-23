'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2, Trophy } from 'lucide-react';
import { groupsService } from '../services/groups.service';
import { racesService } from '@/features/races/services/races.service';
import { Race } from '@/features/races/types';
import { Group, CreateGroupDto } from '../types';
import { useTranslations } from 'next-intl';

interface EditGroupModalProps {
  group: Group;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export function EditGroupModal({ group, isOpen, onClose, onUpdated }: EditGroupModalProps) {
  const t = useTranslations('common');
  const tGroups = useTranslations('groups');
  const [loading, setLoading] = useState(false);
  const [raceLibrary, setRaceLibrary] = useState<Race[]>([]);
  
  // Group State
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description || '');
  const [group_type, setGroupType] = useState<'REGULAR' | 'RACE'>(group.group_type || 'REGULAR');
  
  // Race Link State
  const [raceSelectionMode, setRaceSelectionMode] = useState<'EXISTING' | 'NEW'>('EXISTING');
  const [selectedRaceId, setSelectedRaceId] = useState<string>(group.race_id || '');
  
  // New Race State
  const [race_name, setRaceName] = useState(group.race_name || '');
  const [race_date, setRaceDate] = useState(group.race_date || '');
  const [race_distance, setRaceDistance] = useState(group.race_distance || '');
  const [race_priority, setRacePriority] = useState<'A' | 'B' | 'C'>(group.race_priority || 'A');
  const [race_location, setRaceLocation] = useState(group.race?.location || '');

  useEffect(() => {
    if (isOpen) {
      setName(group.name);
      setDescription(group.description || '');
      setGroupType(group.group_type || 'REGULAR');
      setSelectedRaceId(group.race_id || '');
      setRaceName(group.race_name || '');
      setRaceDate(group.race_date || '');
      setRaceDistance(group.race_distance || '');
      setRacePriority(group.race_priority || 'A');
      setRaceLocation(group.race?.location || '');
      
      const fetchRaces = async () => {
        try {
          const res = await racesService.findAll();
          setRaceLibrary(res.data);
        } catch (e) {
          console.error('Failed to fetch races', e);
        }
      };
      fetchRaces();
    }
  }, [isOpen, group]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let finalRaceId = selectedRaceId;

      if (group_type === 'RACE' && raceSelectionMode === 'NEW' && race_name) {
        const raceRes = await racesService.create({
          name: race_name,
          date: race_date,
          distance: race_distance,
          location: race_location,
        });
        finalRaceId = raceRes.data.id;
      }

      const updateData: Partial<CreateGroupDto> = {
        name,
        description,
        group_type,
        race_id: group_type === 'RACE' ? (finalRaceId || undefined) : undefined,
      };

      // Maintaining legacy fields for compatibility
      if (group_type === 'RACE') {
        if (raceSelectionMode === 'NEW') {
          updateData.race_name = race_name;
          updateData.race_date = race_date;
          updateData.race_distance = race_distance;
          updateData.race_priority = race_priority;
        } else {
          const selected = raceLibrary.find(r => r.id === finalRaceId);
          updateData.race_name = selected?.name;
          updateData.race_date = selected?.date || undefined;
          updateData.race_distance = selected?.distance || undefined;
          updateData.race_priority = race_priority;
        }
      }

      await groupsService.update(group.id, updateData);
      onUpdated();
      onClose();
    } catch (error) {
      console.error('Failed to update group', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px] rounded-[2rem] border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-manrope text-2xl font-bold">{tGroups('detail.editGroup')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase opacity-70">Nombre del Grupo</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-muted/30 border-none h-12 rounded-xl focus-visible:ring-1 focus-visible:ring-primary/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description" className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase opacity-70">Descripción</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Opcional"
                className="bg-muted/30 border-none rounded-xl focus-visible:ring-1 focus-visible:ring-primary/20 min-h-[80px]"
              />
            </div>
            <div className="flex items-center space-x-2 pt-2 border-t border-border/40">
              <Switch 
                id="edit-is-race-group"
                checked={group_type === 'RACE'}
                onCheckedChange={(checked) => setGroupType(checked ? 'RACE' : 'REGULAR')}
              />
              <Label htmlFor="edit-is-race-group" className="font-semibold cursor-pointer">
                {tGroups('detail.isRaceGroup')}
              </Label>
            </div>
          </div>

          {group_type === 'RACE' && (
            <div className="space-y-6 pt-6 mt-6 border-t border-border/40 animate-in fade-in slide-in-from-top-2">
              <div className="flex p-1 bg-muted/30 rounded-xl">
                <Button 
                  type="button"
                  variant={raceSelectionMode === 'EXISTING' ? 'secondary' : 'ghost'}
                  className="flex-1 rounded-lg text-[10px] font-bold uppercase tracking-wider h-9"
                  onClick={() => setRaceSelectionMode('EXISTING')}
                >
                  {tGroups('detail.selectExistingRace')}
                </Button>
                <Button 
                  type="button"
                  variant={raceSelectionMode === 'NEW' ? 'secondary' : 'ghost'}
                  className="flex-1 rounded-lg text-[10px] font-bold uppercase tracking-wider h-9"
                  onClick={() => setRaceSelectionMode('NEW')}
                >
                  {tGroups('detail.createNewRace')}
                </Button>
              </div>

              {raceSelectionMode === 'EXISTING' ? (
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase opacity-70">{tGroups('detail.pickFromLibrary')}</Label>
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
                          {race.name} ({race.date ? new Date(race.date).toLocaleDateString() : 'Sin fecha'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1">
                  <div className="space-y-2 col-span-1 md:col-span-2">
                    <Label className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase opacity-70">{tGroups('detail.raceName')}</Label>
                    <Input 
                      placeholder="Ej. Maratón de Buenos Aires" 
                      value={race_name} 
                      onChange={(e) => setRaceName(e.target.value)} 
                      required={group_type === 'RACE' && raceSelectionMode === 'NEW'}
                      className="bg-muted/30 border-none h-11 rounded-xl focus-visible:ring-1 focus-visible:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase opacity-70">{tGroups('detail.raceDate')}</Label>
                    <Input 
                      type="date" 
                      value={race_date} 
                      onChange={(e) => setRaceDate(e.target.value)} 
                      required={group_type === 'RACE' && raceSelectionMode === 'NEW'}
                      className="bg-muted/30 border-none h-11 rounded-xl focus-visible:ring-1 focus-visible:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase opacity-70">{tGroups('detail.raceDistance')}</Label>
                    <Input 
                      placeholder="Ej. 42k" 
                      value={race_distance} 
                      onChange={(e) => setRaceDistance(e.target.value)} 
                      className="bg-muted/30 border-none h-11 rounded-xl focus-visible:ring-1 focus-visible:ring-primary/20"
                    />
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase opacity-70">{tGroups('detail.racePriority')}</Label>
                <select
                  className="flex h-11 w-full rounded-xl border-none bg-muted/30 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/20 appearance-none cursor-pointer"
                  value={race_priority}
                  onChange={(e) => setRacePriority(e.target.value as any)}
                >
                  <option value="A">{tGroups('detail.priorityA')}</option>
                  <option value="B">{tGroups('detail.priorityB')}</option>
                  <option value="C">{tGroups('detail.priorityC')}</option>
                </select>
              </div>
            </div>
          )}

          <DialogFooter className="pt-4 gap-2">
            <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl font-bold uppercase tracking-wider text-xs">
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={loading} className="rounded-xl px-8 font-bold uppercase tracking-wider text-xs shadow-lg shadow-primary/20">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
