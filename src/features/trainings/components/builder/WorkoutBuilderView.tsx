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
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

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
    const [currentStep, setCurrentStep] = useState<1 | 2>(1);
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

    const canProceedToStep2 = blocks.length > 0;

    return (
        <div className="h-[calc(100vh-theme(spacing.16))] w-[calc(100%+2rem)] md:w-[calc(100%+4rem)] overflow-hidden -mx-4 md:-mx-8 -my-4 md:-my-8 bg-background dark:bg-background font-inter flex flex-col relative">
            {/* Step Indicator */}
            <div className="flex-none border-b border-border/30 dark:border-white/5 bg-card dark:bg-muted px-8 py-4">
                <div className="flex items-center justify-between max-w-4xl mx-auto">
                    <div className="flex items-center gap-8">
                        {/* Step 1 */}
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                                currentStep === 1 
                                    ? 'bg-endurix-orange text-white' 
                                    : currentStep === 2 
                                        ? 'bg-green-500 text-white' 
                                        : 'bg-muted text-muted-foreground'
                            }`}>
                                {currentStep === 2 ? <Check className="w-4 h-4" /> : '1'}
                            </div>
                            <span className={`text-sm font-medium ${currentStep === 1 ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {t('workoutBuilder')}
                            </span>
                        </div>

                        {/* Connector */}
                        <div className={`w-12 h-0.5 ${currentStep === 2 ? 'bg-green-500' : 'bg-border'}`} />

                        {/* Step 2 */}
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                                currentStep === 2 
                                    ? 'bg-endurix-orange text-white' 
                                    : 'bg-muted text-muted-foreground'
                            }`}>
                                2
                            </div>
                            <span className={`text-sm font-medium ${currentStep === 2 ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {t('reviewAndPublish')}
                            </span>
                        </div>
                    </div>

                    {/* Step Navigation */}
                    {currentStep === 2 && (
                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setCurrentStep(1)}
                                className="flex items-center gap-2"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                {t('backToBuilder')}
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden relative">
                {currentStep === 1 ? (
                    <WorkoutBuilder
                        initialBlocks={blocks}
                        onChange={setBlocks}
                        athleteId={athleteId || undefined}
                        trainingType={activityType}
                        footerContent={
                            <Button
                                onClick={() => setCurrentStep(2)}
                                disabled={!canProceedToStep2}
                                className="w-full bg-endurix-orange hover:bg-brand-primary-dark text-white uppercase tracking-wider text-xs font-semibold py-4 rounded transition-colors"
                            >
                                {t('nextStep')}
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        }
                    />
                ) : (
                    <div className="h-full overflow-y-auto bg-[#f8f9fa] dark:bg-[#0a0f14]">
                        <div className="max-w-2xl mx-auto px-8 py-12">
                            <h2 className="text-2xl font-bold font-display text-foreground mb-2">
                                {t('coreDetails')}
                            </h2>
                            <p className="text-sm text-muted-foreground mb-8">
                                {t('publishDescription')}
                            </p>

                            <div className="space-y-8">
                                <div>
                                    <label className="text-[10px] font-semibold text-muted-foreground tracking-[0.05em] uppercase mb-2 block">
                                        {t('workoutTitleLabel')}
                                    </label>
                                    <input
                                        type="text"
                                        value={workoutTitle}
                                        onChange={(e) => setWorkoutTitle(e.target.value)}
                                        placeholder={t('workoutTitlePlaceholder')}
                                        className="w-full bg-transparent border-0 border-b border-border/30 px-0 py-3 text-foreground focus:ring-0 focus:border-primary placeholder-muted-foreground/50 transition-colors text-lg"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-semibold text-muted-foreground tracking-[0.05em] uppercase mb-2 block">
                                        {t('activityTypeLabel')}
                                    </label>
                                    <select
                                        value={activityType}
                                        onChange={(e) => setActivityType(e.target.value as TrainingType)}
                                        className="w-full bg-transparent border-0 border-b border-border/30 px-0 py-3 text-foreground focus:ring-0 focus:border-primary outline-none"
                                    >
                                        <option value="RUNNING">{t('trainingTypes.RUNNING')}</option>
                                        <option value="CYCLING">{t('trainingTypes.CYCLING')}</option>
                                        <option value="SWIMMING">{t('trainingTypes.SWIMMING')}</option>
                                        <option value="STRENGTH">{t('trainingTypes.STRENGTH')}</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[10px] font-semibold text-muted-foreground tracking-[0.05em] uppercase mb-2 block">
                                        {t('coachNotesLabel')}
                                    </label>
                                    <input
                                        type="text"
                                        value={workoutDescription}
                                        onChange={(e) => setWorkoutDescription(e.target.value)}
                                        placeholder={t('coachNotesPlaceholder')}
                                        className="w-full bg-transparent border-0 border-b border-border/30 px-0 py-3 text-foreground focus:ring-0 focus:border-primary placeholder-muted-foreground/50 transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-semibold text-muted-foreground tracking-[0.05em] uppercase mb-2 block flex items-between">
                                        {t('expectedRpeLabel')}
                                        <span className="ml-auto text-primary text-lg font-bold">{expectedRpe}/10</span>
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

                            {/* Action Buttons */}
                            <div className="mt-12 pt-8 border-t border-border/30 dark:border-white/5 space-y-3">
                                <Button
                                    onClick={handleSave}
                                    disabled={saving || !workoutTitle.trim() || blocks.length === 0}
                                    className="w-full bg-endurix-orange hover:bg-brand-primary-dark text-white uppercase tracking-widest text-xs font-bold py-5 transition-colors"
                                >
                                    {saving ? t('saving') : t('finalizeWorkout')}
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => router.push('/trainings')}
                                >
                                    {t('cancelExit')}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
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
