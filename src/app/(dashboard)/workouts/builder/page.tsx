'use client';

import { useState, Suspense, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { WorkoutBuilder } from '@/features/trainings/components/builder/WorkoutBuilder';
import { WorkoutBlock } from '@/features/trainings/components/builder/types';
import { TrainingType } from '@/interfaces/training';
import { Button } from '@/components/ui/button';
import { trainingsService } from '@/features/trainings/services/trainings.service';
import { useRouter } from 'next/navigation';
import { Slider } from '@/components/ui/slider';
import { AlertDialog, useAlertDialog } from '@/components/ui/AlertDialog';
import { useTranslations } from 'next-intl';

function WorkoutBuilderContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const athleteId = searchParams.get('athleteId');
    const workoutId = searchParams.get('id');
    const [blocks, setBlocks] = useState<WorkoutBlock[]>([]);
    const [workoutTitle, setWorkoutTitle] = useState('');
    const [workoutDescription, setWorkoutDescription] = useState('');
    const [expectedRpe, setExpectedRpe] = useState<number>(5);
    const [activityType, setActivityType] = useState<TrainingType>(TrainingType.RUNNING);
    const [loading, setLoading] = useState(!!workoutId);
    const [saving, setSaving] = useState(false);
    const { alertState, showAlert, closeAlert } = useAlertDialog();
    const t = useTranslations('builder');
    const tCommon = useTranslations('common');

    const loadWorkout = useCallback(async (id: string) => {
        try {
            setLoading(true);
            const res = await trainingsService.findOne(id);
            const workout = res.data;
            setWorkoutTitle(workout.title);
            setWorkoutDescription(workout.description || '');
            setExpectedRpe(workout.expectedRpe || 5);
            setActivityType(workout.type || TrainingType.RUNNING);
            setBlocks(workout.blocks || []);
        } catch (error) {
            console.error('Failed to load workout:', error);
            showAlert('error', t('loadError'));
        } finally {
            setLoading(false);
        }
    }, [showAlert, t]);

    useEffect(() => {
        if (workoutId) {
            loadWorkout(workoutId);
        }
    }, [workoutId, loadWorkout]);

    const handleSave = async () => {
        if (!workoutTitle.trim()) {
            showAlert('warning', t('enterTitleWarning'));
            return;
        }

        if (blocks.length === 0) {
            showAlert('warning', t('addBlockWarning'));
            return;
        }

        try {
            setSaving(true);
            const payload = {
                title: workoutTitle,
                type: activityType,
                description: workoutDescription,
                blocks: blocks,
                isTemplate: true,
                expectedRpe: expectedRpe
            };

            if (workoutId) {
                await trainingsService.update(workoutId, payload);
            } else {
                await trainingsService.create(payload);
            }

            showAlert('success', t('saveSuccess'));
            setTimeout(() => router.push('/workouts/library'), 1500);
        } catch (error) {
            console.error('Failed to save workout:', error);
            showAlert('error', t('saveError'));
        } finally {
            setSaving(false);
        }
    };

    const leftSidebarContent = (
        <div className="p-8 pb-4">
            <h3 className="text-[10px] font-semibold text-muted-foreground tracking-[0.05em] uppercase mb-2">
                {t('editorPhase')}
            </h3>
            <h2 className="text-xl font-bold font-display text-foreground mb-8">
                {t('coreDetails')}
            </h2>

            <div className="space-y-6">
                <div>
                    <label className="text-[10px] font-semibold text-muted-foreground tracking-[0.05em] uppercase mb-1 block">
                        {t('workoutTitleLabel')}
                    </label>
                    <input
                        type="text"
                        value={workoutTitle}
                        onChange={(e) => setWorkoutTitle(e.target.value)}
                        placeholder={t('workoutTitlePlaceholder')}
                        className="w-full bg-transparent border-0 border-b border-border/30 px-0 py-2 text-foreground focus:ring-0 focus:border-primary placeholder-muted-foreground/50 transition-colors"
                    />
                </div>

                <div>
                    <label className="text-[10px] font-semibold text-muted-foreground tracking-[0.05em] uppercase mb-1 block">
                        {t('activityTypeLabel')}
                    </label>
                    <select 
                        value={activityType}
                        onChange={(e) => setActivityType(e.target.value as TrainingType)}
                        className="w-full bg-transparent border-0 border-b border-border/30 px-0 py-2 text-foreground focus:ring-0 focus:border-primary outline-none"
                    >
                        <option value="RUNNING">{t('trainingTypes.RUNNING')}</option>
                        <option value="CYCLING">{t('trainingTypes.CYCLING')}</option>
                        <option value="SWIMMING">{t('trainingTypes.SWIMMING')}</option>
                        <option value="STRENGTH">{t('trainingTypes.STRENGTH')}</option>
                    </select>
                </div>

                <div>
                    <label className="text-[10px] font-semibold text-muted-foreground tracking-[0.05em] uppercase mb-1 block">
                        {t('coachNotesLabel')}
                    </label>
                     <input
                        type="text"
                        value={workoutDescription}
                        onChange={(e) => setWorkoutDescription(e.target.value)}
                        placeholder={t('coachNotesPlaceholder')}
                        className="w-full bg-transparent border-0 border-b border-border/30 px-0 py-2 text-foreground focus:ring-0 focus:border-primary placeholder-muted-foreground/50 transition-colors"
                    />
                </div>

                 <div>
                    <label className="text-[10px] font-semibold text-muted-foreground tracking-[0.05em] uppercase mb-2 block flex items-between">
                        {t('expectedRpeLabel')}
                        <span className="ml-auto text-primary">{expectedRpe}/10</span>
                    </label>
                    <Slider
                        value={[expectedRpe]}
                        min={1}
                        max={10}
                        step={1}
                        onValueChange={(val) => setExpectedRpe(val[0])}
                        className="my-4"
                    />
                </div>
            </div>
        </div>
    );

    if (loading) {
        return <div className="flex-1 flex items-center justify-center">{tCommon('loading')}</div>;
    }

    const footerContent = (
        <div className="w-full flex items-center justify-between mx-auto px-8 max-w-7xl">
            <div className="flex flex-col text-white">
                 <span className="text-lg font-bold font-display">{t('readyToPublish')}</span>
                 <span className="text-xs text-white/60">{t('publishDescription')}</span>
            </div>
            <div className="flex items-center gap-4">
                <Button variant="outline" className="border-white/20 text-white bg-transparent hover:bg-white/10 hover:text-white uppercase tracking-wider text-xs font-semibold px-6 py-6" onClick={() => router.push('/workouts/library')}>
                    {t('cancelExit')}
                </Button>
                <Button 
                    onClick={handleSave}
                    disabled={saving || !workoutTitle.trim() || blocks.length === 0}
                    className="bg-white text-[#2b3437] hover:bg-gray-100 uppercase tracking-wider text-xs font-semibold px-8 py-6 rounded shadow-lg transition-colors"
                >
                    {saving ? t('saving') : t('finalizeWorkout')}
                </Button>
            </div>
        </div>
    );

    return (
        <div className="h-[calc(100vh-theme(spacing.16))] w-[calc(100%+2rem)] md:w-[calc(100%+4rem)] overflow-hidden -mx-4 md:-mx-8 -my-4 md:-my-8 bg-background dark:bg-background font-inter flex relative">
            <div className="w-[320px] lg:w-[380px] flex-shrink-0 bg-card dark:bg-muted border-r border-border dark:border-white/5 overflow-y-auto z-10">
                {leftSidebarContent}
            </div>
            <div className="flex-1 overflow-hidden relative">
                <WorkoutBuilder
                    initialBlocks={blocks}
                    onChange={setBlocks}
                    athleteId={athleteId || undefined}
                    footerContent={footerContent}
                />
            </div>

            <AlertDialog
                open={alertState.open}
                onClose={closeAlert}
                type={alertState.type}
                title={alertState.title}
                message={alertState.message}
                confirmText={alertState.confirmText}
            />
        </div>
    );
}

export default function WorkoutBuilderPage() {
    const t = useTranslations('common');
    return (
        <Suspense fallback={<div className="p-8">{t('loading')}</div>}>
            <WorkoutBuilderContent />
        </Suspense>
    );
}
