'use client';
import { appLogger } from '@/lib/app-logger';

import { useState } from 'react';
import { WorkoutBuilder } from '@/features/trainings/components/builder/WorkoutBuilder';
import { WorkoutBlock } from '@/features/trainings/components/builder/types';
import { Training, TrainingType } from '@/interfaces/training';
import { Button } from '@/components/ui/button';
import { trainingsService } from '@/features/trainings/services/trainings.service';
import { useRouter } from 'next/navigation';
import { Slider } from '@/components/ui/slider';
import { AlertDialog, useAlertDialog } from '@/components/ui/AlertDialog';
import { useTranslations } from 'next-intl';
import { useApiError } from '@/hooks/useApiError';

interface WorkoutBuilderViewProps {
    initialWorkout: Training | null;
    athleteId: string | null;
}

export function WorkoutBuilderView({ initialWorkout, athleteId }: WorkoutBuilderViewProps) {
    const router = useRouter();
    const { translateError } = useApiError();
    const [blocks, setBlocks] = useState<WorkoutBlock[]>(initialWorkout?.blocks || []);
    const [workoutTitle, setWorkoutTitle] = useState(initialWorkout?.title || '');
    const [workoutDescription, setWorkoutDescription] = useState(initialWorkout?.description || '');
    const [expectedRpe, setExpectedRpe] = useState<number>(initialWorkout?.expectedRpe || 5);
    const [activityType, setActivityType] = useState<TrainingType>(initialWorkout?.type || TrainingType.RUNNING);
    const [saving, setSaving] = useState(false);
    const { alertState, showAlert, closeAlert } = useAlertDialog();
    const t = useTranslations('builder');

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

            if (initialWorkout?.id) {
                await trainingsService.update(initialWorkout.id, payload);
            } else {
                await trainingsService.create(payload);
            }

            showAlert('success', t('saveSuccess'));
            setTimeout(() => router.push('/trainings'), 1500);
        } catch (error) {
            appLogger.error('Failed to save workout:', error);
            showAlert('error', translateError(error));
        } finally {
            setSaving(false);
        }
    };

    const rightSidebarContent = (
        <div className="flex flex-col h-full">
            {/* Header + Form Fields */}
            <div className="p-8 pb-4 flex-1 overflow-y-auto">
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

            {/* Action Buttons — pinned to the bottom of the sidebar */}
            <div className="flex-none border-t border-border/30 dark:border-white/5 bg-[#2b3437] p-6 space-y-3">
                <div className="mb-3">
                    <p className="text-sm font-bold font-display text-white">{t('readyToPublish')}</p>
                    <p className="text-xs text-white/50 mt-0.5">{t('publishDescription')}</p>
                </div>
                <Button
                    onClick={handleSave}
                    disabled={saving || !workoutTitle.trim() || blocks.length === 0}
                    className="w-full bg-endurix-orange hover:bg-brand-primary-dark text-white uppercase tracking-wider text-xs font-semibold py-5 rounded shadow-lg transition-colors"
                >
                    {saving ? t('saving') : t('finalizeWorkout')}
                </Button>
                <Button
                    variant="outline"
                    className="w-full border-white/20 text-white bg-transparent hover:bg-white/10 hover:text-white uppercase tracking-wider text-xs font-semibold py-5"
                    onClick={() => router.push('/trainings')}
                >
                    {t('cancelExit')}
                </Button>
            </div>
        </div>
    );

    return (
        <div className="h-[calc(100vh-theme(spacing.16))] w-[calc(100%+2rem)] md:w-[calc(100%+4rem)] overflow-hidden -mx-4 md:-mx-8 -my-4 md:-my-8 bg-background dark:bg-background font-inter flex relative">
            {/* Main builder area — occupies all remaining space on the left */}
            <div className="flex-1 overflow-hidden relative">
                <WorkoutBuilder
                    initialBlocks={blocks}
                    onChange={setBlocks}
                    athleteId={athleteId || undefined}
                    trainingType={activityType}
                />
            </div>

            {/* Right sidebar — metadata + actions */}
            <div className="w-[320px] lg:w-[380px] flex-shrink-0 bg-card dark:bg-muted border-l border-border dark:border-white/5 overflow-hidden z-10 flex flex-col">
                {rightSidebarContent}
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
