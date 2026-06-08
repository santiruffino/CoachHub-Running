'use client';
import { appLogger } from '@/lib/app-logger';

import { useEffect, useState } from 'react';
import { WorkoutBuilder } from '@/features/trainings/components/builder/WorkoutBuilder';
import { WorkoutBlock, AthleteProfile } from '@/features/trainings/components/builder/types';
import { Training, TrainingType } from '@/interfaces/training';
import { WorkoutInsightsPanel } from '@/features/trainings/components/builder/WorkoutInsightsPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { trainingsService } from '@/features/trainings/services/trainings.service';
import { useRouter } from 'next/navigation';
import { Slider } from '@/components/ui/slider';
import { AlertDialog, useAlertDialog } from '@/components/ui/AlertDialog';
import { useTranslations } from 'next-intl';
import { useApiError } from '@/hooks/useApiError';
import { ArrowLeft, ArrowRight, Check, Calendar } from 'lucide-react';
import api from '@/lib/axios';

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
    const [athleteProfile, setAthleteProfile] = useState<AthleteProfile | null>(null);
    const [scheduledDate, setScheduledDate] = useState<string>('');
    const { alertState, showAlert, closeAlert } = useAlertDialog();
    const t = useTranslations('builder');

    useEffect(() => {
        const fetchAthleteProfile = async () => {
            if (!athleteId) {
                setAthleteProfile(null);
                return;
            }
            try {
                const response = await api.get(`/v2/users/${athleteId}/details`);
                const ap = response.data.athleteProfile;
                if (ap) {
                    setAthleteProfile({
                        vam: ap.vam,
                        lthr: ap.lthr,
                        maxHR: ap.maxHR,
                        restHR: ap.restHR,
                        ftp: ap.ftp,
                    });
                } else {
                    setAthleteProfile(null);
                }
            } catch (error) {
                appLogger.error('Failed to fetch athlete profile:', error);
                setAthleteProfile(null);
            }
        };
        fetchAthleteProfile();
    }, [athleteId]);

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
                expectedRpe: expectedRpe,
                scheduledDate: scheduledDate || null
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
        <div className="h-[calc(100vh-theme(spacing.16))] w-full overflow-hidden bg-background dark:bg-background font-inter flex flex-col relative">
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
                        <div className="max-w-7xl mx-auto px-6 py-8">
                            <div className="flex items-center justify-between mb-8">
                                <Button
                                    variant="outline"
                                    onClick={() => setCurrentStep(1)}
                                    className="flex items-center gap-2"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    {t('backToBuilder')}
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
                                {/* Left Column - Workout Insights */}
                                <div className="space-y-6">
                                    <WorkoutInsightsPanel
                                        blocks={blocks}
                                        athleteProfile={athleteProfile}
                                        trainingType={activityType}
                                    />
                                </div>

                                {/* Right Column - Form Fields */}
                                <div className="lg:sticky lg:top-24 space-y-6">
                                    <div className="bg-card dark:bg-muted rounded-xl border border-border/30 dark:border-white/10 p-6 space-y-6">
                                        <h3 className="text-lg font-semibold font-display text-foreground">
                                            {t('workoutDetails')}
                                        </h3>

                                        <div className="space-y-6">
                                            <div>
                                                <label className="text-[10px] font-semibold text-muted-foreground tracking-[0.05em] uppercase mb-2 block">
                                                    {t('workoutTitleLabel')}
                                                </label>
                                                <Input
                                                    value={workoutTitle}
                                                    onChange={(e) => setWorkoutTitle(e.target.value)}
                                                    placeholder={t('workoutTitlePlaceholder')}
                                                    className="w-full text-lg"
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
                                                <Input
                                                    value={workoutDescription}
                                                    onChange={(e) => setWorkoutDescription(e.target.value)}
                                                    placeholder={t('coachNotesPlaceholder')}
                                                />
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-semibold text-muted-foreground tracking-[0.05em] uppercase mb-2 block flex items-center justify-between">
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

                                            <div>
                                                <label className="text-[10px] font-semibold text-muted-foreground tracking-[0.05em] uppercase mb-2 block flex items-center justify-between">
                                                    {t('scheduledDateLabel') || 'Fecha programada'}
                                                </label>
                                                <div className="relative">
                                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                                    <Input
                                                        type="date"
                                                        value={scheduledDate}
                                                        onChange={(e) => setScheduledDate(e.target.value)}
                                                        className="pl-10"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="space-y-3">
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
