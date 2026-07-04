'use client';

import { useForm } from 'react-hook-form';
import { CreateTrainingDto, TrainingType } from '../types';
import { trainingsService } from '../services/trainings.service';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export function CreateTrainingForm({ onSuccess }: { onSuccess?: () => void }) {
    const t = useTranslations('trainings');
    const { register, handleSubmit, reset } = useForm<CreateTrainingDto>();
    const [error, setError] = useState('');

    const onSubmit = async (data: CreateTrainingDto) => {
        try {
            await trainingsService.create({ ...data, blocks: [] });
            reset();
            if (onSuccess) onSuccess();
        } catch {
            setError(t('new.errorCreate'));
        }
    };

    return (
        <div className="bg-endurix-paper dark:bg-card border border-endurix-black/10 dark:border-border p-6 mb-6">
            <h3
                className="text-lg font-medium text-endurix-black dark:text-foreground mb-4 uppercase tracking-tight"
                style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
            >
                {t('new.title')}
            </h3>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="title" className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase opacity-70">{t('new.titleLabel')}</Label>
                        <Input
                            id="title"
                            variant="boxed"
                            {...register('title', { required: true })}
                            placeholder={t('new.titlePlaceholder')}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="type" className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase opacity-70">{t('new.sportTypeLabel')}</Label>
                        <select
                            id="type"
                            {...register('type')}
                            className="flex h-10 w-full border border-endurix-black/10 dark:border-border bg-white dark:bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-endurix-orange appearance-none cursor-pointer"
                        >
                            {Object.values(TrainingType).map((type) => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="description" className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase opacity-70">{t('new.descriptionLabel')}</Label>
                    <Textarea
                        id="description"
                        variant="boxed"
                        {...register('description')}
                        placeholder={t('new.descriptionPlaceholder')}
                    />
                </div>

                {error && <p className="text-destructive text-sm">{error}</p>}
                <Button type="submit" variant="orange" className="uppercase tracking-widest text-xs">
                    {t('new.save')}
                </Button>
            </form>
        </div>
    );
}
