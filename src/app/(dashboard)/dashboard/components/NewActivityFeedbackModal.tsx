'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTranslations } from 'next-intl';

import api from '@/lib/axios';
import { Activity } from '@/interfaces/activity';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface NewActivityFeedbackModalProps {
    open: boolean;
    activity: Activity | null;
    onOpenChange: (open: boolean) => void;
    onSubmitted: () => void;
}

interface FeedbackFormState {
    rpe: number;
    sensations: number;
    comments: string;
}

const DEFAULT_VALUES: FeedbackFormState = {
    rpe: 5,
    sensations: 5,
    comments: '',
};

export function NewActivityFeedbackModal({
    open,
    activity,
    onOpenChange,
    onSubmitted,
}: NewActivityFeedbackModalProps) {
    const t = useTranslations('dashboard.athleteFeedbackModal');
    const [form, setForm] = useState<FeedbackFormState>(DEFAULT_VALUES);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) {
            setForm(DEFAULT_VALUES);
        }
    }, [open, activity?.id]);

    const getScaleLabel = (value: number) => {
        if (value <= 2) return t('scale.veryLow');
        if (value <= 4) return t('scale.low');
        if (value <= 6) return t('scale.medium');
        if (value <= 8) return t('scale.high');
        return t('scale.veryHigh');
    };

    const handleSubmit = async () => {
        if (!activity) return;

        try {
            setSaving(true);
            await api.post(`/v2/activities/${activity.id}/feedback`, {
                rpe: form.rpe,
                sensations: form.sensations,
                comments: form.comments.trim() || null,
            });

            onSubmitted();
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to save quick activity feedback:', error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[560px] border-none bg-surface p-0 overflow-hidden shadow-[0_20px_40px_rgba(43,52,55,0.08)] dark:bg-[#0a0f14]">
                <DialogHeader className="space-y-2 bg-surface-container-low px-6 pb-6 pt-7 text-left dark:bg-[#131b23]">
                    <DialogTitle className="font-display text-2xl font-bold tracking-tight text-foreground">
                        {t('title')}
                    </DialogTitle>
                    <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
                        {t('description')}
                    </DialogDescription>
                    {activity && (
                        <p className="pt-3 text-xs font-semibold uppercase tracking-[0.1em] text-primary/90">
                            {activity.title} • {format(new Date(activity.start_date), 'd MMM yyyy', { locale: es })}
                        </p>
                    )}
                </DialogHeader>

                <div className="space-y-7 bg-background px-6 pb-6 pt-6 dark:bg-[#0a0f14]">
                    <div className="space-y-3">
                        <Label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            {t('rpeLabel')}
                        </Label>
                        <div className="space-y-3 rounded-2xl bg-surface-container-low px-4 py-4 dark:bg-[#131b23]">
                            <div className="flex items-center gap-4">
                                <Slider
                                    min={1}
                                    max={10}
                                    step={1}
                                    value={[form.rpe]}
                                    onValueChange={(value) => setForm((prev) => ({ ...prev, rpe: value[0] }))}
                                />
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-xl font-display font-medium text-foreground dark:bg-[#1a232c] dark:border dark:border-white/5">
                                    {form.rpe}
                                </div>
                            </div>
                            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">{getScaleLabel(form.rpe)}</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            {t('sensationsLabel')}
                        </Label>
                        <div className="space-y-3 rounded-2xl bg-surface-container-low px-4 py-4 dark:bg-[#131b23]">
                            <div className="flex items-center gap-4">
                                <Slider
                                    min={1}
                                    max={10}
                                    step={1}
                                    value={[form.sensations]}
                                    onValueChange={(value) => setForm((prev) => ({ ...prev, sensations: value[0] }))}
                                />
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-xl font-display font-medium text-foreground dark:bg-[#1a232c] dark:border dark:border-white/5">
                                    {form.sensations}
                                </div>
                            </div>
                            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">{getScaleLabel(form.sensations)}</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label htmlFor="quick-feedback-comments" className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            {t('commentsLabel')}
                        </Label>
                        <Textarea
                            id="quick-feedback-comments"
                            rows={3}
                            value={form.comments}
                            onChange={(event) => setForm((prev) => ({ ...prev, comments: event.target.value }))}
                            placeholder={t('commentsPlaceholder')}
                            className="resize-none rounded-xl border-none bg-surface-container-low px-4 py-3 text-sm text-foreground focus-visible:ring-1 focus-visible:ring-primary/30 dark:bg-[#131b23]"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                        <Button
                            type="button"
                            variant="ghost"
                            className="text-xs font-semibold uppercase tracking-[0.08em]"
                            onClick={() => onOpenChange(false)}
                        >
                            {t('later')}
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSubmit}
                            disabled={saving || !activity}
                            className="bg-[linear-gradient(135deg,#4e6073,#425467)] text-primary-foreground hover:opacity-95"
                        >
                            {saving ? t('saving') : t('submit')}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
