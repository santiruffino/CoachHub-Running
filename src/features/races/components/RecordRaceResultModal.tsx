'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { racesService } from '../services/races.service';
import { AthleteRace } from '../types';

interface RecordRaceResultModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  race: AthleteRace | null;
  onSuccess: () => void;
}

export function RecordRaceResultModal({ open, onOpenChange, race, onSuccess }: RecordRaceResultModalProps) {
  const t = useTranslations('races');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    result_time: '',
    notes: '',
  });

  useEffect(() => {
    if (open && race) {
      setFormData({
        result_time: race.result_time || '',
        notes: race.notes || '',
      });
    }
  }, [open, race]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!race) return;

    setLoading(true);
    try {
      await racesService.updateAthleteRace(race.athlete_id, race.id, {
        ...formData,
        status: 'COMPLETED'
      });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating race result:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!race) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] border-none bg-white dark:bg-[#1a232c] shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-manrope text-2xl font-bold">{t('recordResult')}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {race.name_override || race.race?.name || t('athlete.defaultRaceName')}
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase opacity-70">
              {t('athlete.resultTime')}
            </Label>
            <Input
              value={formData.result_time}
              onChange={(e) => setFormData({ ...formData, result_time: e.target.value })}
              placeholder="HH:MM:SS"
              className="bg-surface-container-low dark:bg-[#131b23] border-none h-12 focus:ring-1 focus:ring-primary/20 font-mono"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase opacity-70">
              {t('assign.notesLabel')}
            </Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder={t('assign.notesPlaceholder')}
              className="bg-surface-container-low dark:bg-[#131b23] border-none resize-none focus:ring-1 focus:ring-primary/20"
              rows={4}
            />
          </div>

          <DialogFooter className="pt-4 gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="font-semibold text-xs uppercase tracking-wider">
              {t('dialog.cancel')}
            </Button>
            <Button type="submit" disabled={loading} className="px-8 font-bold text-xs uppercase tracking-wider">
              {loading ? t('dialog.saving') : t('dialog.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
