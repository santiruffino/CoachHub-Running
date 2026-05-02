'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { racesService } from '../services/races.service';
import { Race, AssignRaceDTO, RacePriority } from '../types';

interface AssignRaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  athleteId: string;
  onSuccess: () => void;
}

export function AssignRaceModal({ open, onOpenChange, athleteId, onSuccess }: AssignRaceModalProps) {
  const t = useTranslations('races.assign');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'template' | 'custom'>('template');
  const [searchTerm, setSearchTerm] = useState('');
  const [templates, setTemplates] = useState<Race[]>([]);
  const [formData, setFormData] = useState<Partial<AssignRaceDTO>>({
    race_id: '',
    name_override: '',
    date: '',
    priority: 'C' as RacePriority,
    target_time: '',
    notes: '',
  });

  useEffect(() => {
    if (open) {
      racesService.findAll().then(res => setTemplates(res.data));
    } else {
      setMode('template');
      setSearchTerm('');
      setFormData({
        race_id: '',
        name_override: '',
        date: '',
        priority: 'C' as RacePriority,
        target_time: '',
        notes: '',
      });
    }
  }, [open]);

  const filteredTemplates = templates.filter((template) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;

    const haystack = `${template.name} ${template.location || ''} ${template.distance || ''}`.toLowerCase();
    return haystack.includes(q);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.date) return;
    if (mode === 'template' && !formData.race_id) return;
    if (mode === 'custom' && !formData.name_override?.trim()) return;

    setLoading(true);
    try {
      const payload: AssignRaceDTO = {
        athlete_id: athleteId,
        date: formData.date,
        priority: (formData.priority || 'C') as RacePriority,
        target_time: formData.target_time || undefined,
        notes: formData.notes || undefined,
        ...(mode === 'template'
          ? { race_id: formData.race_id }
          : { name_override: formData.name_override?.trim() }),
      };

      await racesService.assignToUser(athleteId, payload);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error assigning race:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] border-none bg-white dark:bg-[#1a232c] shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-manrope text-2xl font-bold">{t('title')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
            <Button
              type="button"
              variant={mode === 'template' ? 'default' : 'ghost'}
              className="h-9"
              onClick={() => setMode('template')}
            >
              {t('useExisting')}
            </Button>
            <Button
              type="button"
              variant={mode === 'custom' ? 'default' : 'ghost'}
              className="h-9"
              onClick={() => setMode('custom')}
            >
              {t('createNew')}
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase opacity-70">
              {mode === 'template' ? t('selectTemplate') : t('raceNameLabel')}
            </Label>
            {mode === 'template' ? (
              <>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={t('searchPlaceholder')}
                    className="bg-surface-container-low dark:bg-[#131b23] border-none h-11 pl-10 focus:ring-1 focus:ring-primary/20"
                  />
                </div>

                <Select
                  value={formData.race_id}
                  onValueChange={(value) => setFormData({ ...formData, race_id: value })}
                >
                  <SelectTrigger className="bg-surface-container-low dark:bg-[#131b23] border-none h-12 focus:ring-1 focus:ring-primary/20">
                    <SelectValue placeholder={t('selectTemplatePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredTemplates.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">{t('noResults')}</div>
                    ) : (
                      filteredTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} {template.distance ? `(${template.distance})` : ''}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </>
            ) : (
              <Input
                value={formData.name_override}
                onChange={(e) => setFormData({ ...formData, name_override: e.target.value })}
                placeholder={t('raceNamePlaceholder')}
                className="bg-surface-container-low dark:bg-[#131b23] border-none h-12 focus:ring-1 focus:ring-primary/20"
                required
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase opacity-70">
                {t('dateLabel')}
              </Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="bg-surface-container-low dark:bg-[#131b23] border-none h-12 focus:ring-1 focus:ring-primary/20"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase opacity-70">
                {t('priorityLabel')}
              </Label>
              <Select 
                value={formData.priority} 
                onValueChange={(value: RacePriority) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger className="bg-surface-container-low dark:bg-[#131b23] border-none h-12 focus:ring-1 focus:ring-primary/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">{t('priorityA')}</SelectItem>
                  <SelectItem value="B">{t('priorityB')}</SelectItem>
                  <SelectItem value="C">{t('priorityC')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase opacity-70">
              {t('targetTimeLabel')}
            </Label>
            <Input
              value={formData.target_time}
              onChange={(e) => setFormData({ ...formData, target_time: e.target.value })}
              placeholder={t('targetTimePlaceholder')}
              className="bg-surface-container-low dark:bg-[#131b23] border-none h-12 focus:ring-1 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase opacity-70">
              {t('notesLabel')}
            </Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder={t('notesPlaceholder')}
              className="bg-surface-container-low dark:bg-[#131b23] border-none resize-none focus:ring-1 focus:ring-primary/20"
              rows={4}
            />
          </div>

          <DialogFooter className="pt-4 gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="font-semibold text-xs uppercase tracking-wider">
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              disabled={
                loading ||
                !formData.date ||
                (mode === 'template' && !formData.race_id) ||
                (mode === 'custom' && !formData.name_override?.trim())
              }
              className="px-8 font-bold text-xs uppercase tracking-wider"
            >
              {loading ? t('assigning') : t('submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
