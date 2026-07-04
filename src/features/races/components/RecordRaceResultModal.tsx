'use client';
import { appLogger } from '@/lib/app-logger';


import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { racesService } from '../services/races.service';
import { AthleteRace } from '../types';
import { formatSecondsToHhMmSs, parseDurationInput } from '@/lib/time/duration';

interface RecordRaceResultModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  race: AthleteRace | null;
  onSuccess: () => void;
}

export function RecordRaceResultModal({ open, onOpenChange, race, onSuccess }: RecordRaceResultModalProps) {
  const t = useTranslations('races');
  const [loading, setLoading] = useState(false);
  const [timeError, setTimeError] = useState('');
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
      setTimeError('');
    }
  }, [open, race]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!race) return;

    const parsedResult = parseDurationInput(formData.result_time);
    if (parsedResult === null || parsedResult <= 0) {
      setTimeError(t('athlete.invalidTimeFormat'));
      return;
    }

    setLoading(true);
    try {
      await racesService.updateAthleteRace(race.athlete_id, race.id, {
        ...formData,
        result_time: formatSecondsToHhMmSs(parsedResult),
        status: 'COMPLETED'
      });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      appLogger.error('Error updating race result:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!race) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle
            className="text-2xl font-bold uppercase tracking-tight"
            style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
          >
            {t('recordResult')}
          </DialogTitle>
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
              variant="boxed"
              value={formData.result_time}
              onChange={(e) => {
                setFormData({ ...formData, result_time: e.target.value });
                if (timeError) setTimeError('');
              }}
              onBlur={() => {
                const parsed = parseDurationInput(formData.result_time);
                if (parsed === null || parsed <= 0) {
                  setTimeError(t('athlete.invalidTimeFormat'));
                  return;
                }

                setFormData((prev) => ({
                  ...prev,
                  result_time: formatSecondsToHhMmSs(parsed),
                }));
                setTimeError('');
              }}
              placeholder={t('athlete.resultTimePlaceholder')}
              className="h-12"
              style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
              required
            />
            {timeError && <p className="text-xs font-medium text-destructive">{timeError}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase opacity-70">
              {t('assign.notesLabel')}
            </Label>
            <Textarea
              variant="boxed"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder={t('assign.notesPlaceholder')}
              className="resize-none"
              rows={4}
            />
          </div>

          <DialogFooter className="pt-4 gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="font-semibold text-xs uppercase tracking-wider">
              {t('dialog.cancel')}
            </Button>
            <Button type="submit" variant="orange" disabled={loading} className="px-8 font-bold text-xs uppercase tracking-wider">
              {loading ? t('dialog.saving') : t('dialog.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
