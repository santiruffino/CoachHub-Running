'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Race, CreateRaceDTO } from '../types';
import { racesService } from '../services/races.service';

interface RaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  race?: Race | null;
  onSuccess: () => void;
}

export function RaceDialog({ open, onOpenChange, race, onSuccess }: RaceDialogProps) {
  const t = useTranslations('races.dialog');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<CreateRaceDTO>>({
    name: '',
    description: '',
    distance: '',
    location: '',
    date: '',
  });

  useEffect(() => {
    if (race) {
      setFormData({
        name: race.name,
        description: race.description || '',
        distance: race.distance || '',
        location: race.location || '',
        date: race.date || '',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        distance: '',
        location: '',
        date: '',
      });
    }
  }, [race, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (race) {
        await racesService.update(race.id, formData);
      } else {
        await racesService.create(formData);
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving race:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {race ? t('editTitle') : t('createTitle')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('nameLabel')}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('namePlaceholder')}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">{t('locationLabel')}</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder={t('locationPlaceholder')}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="distance">{t('distanceLabel')}</Label>
              <Input
                id="distance"
                value={formData.distance}
                onChange={(e) => setFormData({ ...formData, distance: e.target.value })}
                placeholder={t('distancePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">{t('dateLabel')}</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t('descriptionLabel')}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('descriptionPlaceholder')}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('saving') : t('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
