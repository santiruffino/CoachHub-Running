'use client';
import { appLogger } from '@/lib/app-logger';


import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { WorkoutBuilder } from '@/features/trainings/components/builder/WorkoutBuilder';
import { WorkoutBlock } from '@/features/trainings/components/builder/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, Calendar, CheckCircle2, Trash2 } from 'lucide-react';
import { BackButton } from '@/components/ui/BackButton';
import api from '@/lib/axios';
import { AlertDialog, useAlertDialog } from '@/components/ui/AlertDialog';
import { Slider } from '@/components/ui/slider';
import { useTranslations } from 'next-intl';

import { WorkoutAssignment } from '@/interfaces/training';

type ApiErrorShape = {
    response?: {
        data?: {
            error?: string;
        };
    };
};

const getApiErrorMessage = (error: unknown, fallback: string): string => {
    if (typeof error === 'object' && error !== null) {
        const apiError = error as ApiErrorShape;
        const responseError = apiError.response?.data?.error;
        if (typeof responseError === 'string' && responseError.length > 0) {
            return responseError;
        }
    }

    if (error instanceof Error && error.message) {
        return error.message;
    }

    return fallback;
};

export default function WorkoutDetailsPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const assignmentId = params.assignmentId as string;
    const fromGroup = searchParams.get('fromGroup') === 'true';
    const t = useTranslations('workouts.detail');

    const [assignment, setAssignment] = useState<WorkoutAssignment | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [editedBlocks, setEditedBlocks] = useState<WorkoutBlock[]>([]);
    const [editedExpectedRpe, setEditedExpectedRpe] = useState<number>(5);
    const [editedWorkoutName, setEditedWorkoutName] = useState('');
    const [editedScheduledDate, setEditedScheduledDate] = useState('');
    const [hasChanges, setHasChanges] = useState(false);
    const [error, setError] = useState('');
    const { alertState, showAlert, closeAlert } = useAlertDialog();

    const loadAssignment = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api.get<WorkoutAssignment>(`/v2/trainings/assignments/${assignmentId}`);
            setAssignment(response.data);
            setEditedBlocks(response.data.training.blocks || []);
            setEditedExpectedRpe(response.data.expectedRpe || 5);
            setEditedWorkoutName(response.data.workoutName || response.data.training.title);
            setEditedScheduledDate(response.data.scheduledDate ? response.data.scheduledDate.slice(0, 10) : '');
        } catch (error: unknown) {
            appLogger.error('Failed to fetch assignment:', error);
            setError(getApiErrorMessage(error, t('loadingError')));
        } finally {
            setLoading(false);
        }
    }, [assignmentId, t]);

    useEffect(() => {
        if (assignmentId) {
            loadAssignment();
        }
    }, [assignmentId, loadAssignment]);

    const handleBlocksChange = (blocks: WorkoutBlock[]) => {
        setEditedBlocks(blocks);
        setHasChanges(true);
    };

    const handleWorkoutNameChange = (value: string) => {
        setEditedWorkoutName(value);
        setHasChanges(true);
    };

    const handleScheduledDateChange = (value: string) => {
        setEditedScheduledDate(value);
        setHasChanges(true);
    };

    const handleSave = async (applyToGroup: boolean = false) => {
        if (!assignment || !hasChanges) return;

        const currentWorkoutName = (assignment.workoutName || assignment.training.title).trim();
        const nextWorkoutName = editedWorkoutName.trim();
        const blocksChanged = JSON.stringify(editedBlocks) !== JSON.stringify(assignment.training.blocks || []);
        const expectedRpeChanged = editedExpectedRpe !== (assignment.expectedRpe || 5);
        const scheduledDateChanged = !!editedScheduledDate && editedScheduledDate !== assignment.scheduledDate.slice(0, 10);
        const workoutNameChanged = nextWorkoutName !== currentWorkoutName;
        const hasPayloadChanges = blocksChanged || expectedRpeChanged || scheduledDateChanged || workoutNameChanged;

        if (!hasPayloadChanges) {
            setHasChanges(false);
            return;
        }

        const payload: Record<string, unknown> = { applyToGroup };

        if (blocksChanged) payload.blocks = editedBlocks;
        if (expectedRpeChanged) payload.expectedRpe = editedExpectedRpe;
        if (scheduledDateChanged) payload.scheduledDate = new Date(`${editedScheduledDate}T00:00:00`).toISOString();
        if (workoutNameChanged) payload.workoutName = nextWorkoutName;

        try {
            setSaving(true);
            setError('');

            await api.patch(`/v2/trainings/assignments/${assignmentId}`, payload);

            await loadAssignment();
            setHasChanges(false);

            showAlert('success', t('syncSuccess'));
        } catch (error: unknown) {
            appLogger.error('Failed to save workout:', error);
            setError(getApiErrorMessage(error, t('syncFailed')));
        } finally {
            setSaving(false);
        }
    };

    const confirmSave = () => {
        if (assignment?.source_group_id) {
            if (fromGroup) {
                handleSave(true);
            } else {
                showAlert(
                    'warning',
                    t('applyToGroupQuestion'),
                    t('groupUpdate'),
                    t('applyToAll'),
                    () => handleSave(true),
                    t('onlyThisOne'),
                    () => handleSave(false)
                );
            }
        } else {
            handleSave(false);
        }
    };

    const handleDelete = async (applyToGroup: boolean = false) => {
        if (!assignment) return;

        try {
            setDeleting(true);
            await api.delete(`/v2/trainings/assignments/${assignmentId}`, {
                data: { applyToGroup }
            });
            showAlert('success', t('deleteSuccess'));
            setTimeout(() => router.back(), 1500);
        } catch (error: unknown) {
            appLogger.error('Failed to delete assignment:', error);
            showAlert('error', t('deleteFailed'));
        } finally {
            setDeleting(false);
        }
    };

    const confirmDelete = () => {
        if (assignment?.source_group_id) {
            if (fromGroup) {
                handleDelete(true);
            } else {
                showAlert(
                    'warning',
                    t('deleteGroupQuestion'),
                    t('deleteWorkout'),
                    t('deleteAll'),
                    () => handleDelete(true),
                    t('onlyThisOne'),
                    () => handleDelete(false)
                );
            }
        } else {
            showAlert(
                'warning',
                t('deleteConfirm'),
                t('deleteWorkout'),
                t('delete'),
                () => handleDelete(false)
            );
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-theme(spacing.16))] w-[calc(100%+2rem)] md:w-[calc(100%+4rem)] -mx-4 md:-mx-8 -my-4 md:-my-8 bg-endurix-paper dark:bg-background">
                <div className="text-center tracking-widest text-xs uppercase text-endurix-black/50 dark:text-muted-foreground" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                    {t('establishingLink')}
                </div>
            </div>
        );
    }

    if (error && !assignment) {
        return (
             <div className="flex items-center justify-center h-[calc(100vh-theme(spacing.16))] w-[calc(100%+2rem)] md:w-[calc(100%+4rem)] -mx-4 md:-mx-8 -my-4 md:-my-8 bg-endurix-paper dark:bg-background">
                <div className="max-w-md text-center">
                    <p className="text-red-600 dark:text-red-400 font-semibold mb-6">{error}</p>
<BackButton label={t('navigateBack')} showLabel />
                </div>
            </div>
        );
    }

    if (!assignment) return null;

    const readOnly = !assignment.canEdit || assignment.completed;
    const displayTitle = assignment.workoutName || assignment.training.title;

    const leftSidebarContent = (
        <div className="p-6 lg:p-8 pb-32 space-y-5">
            <div className="rounded-3xl border border-endurix-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-endurix-black/10 dark:border-white/10 bg-endurix-paper/70 dark:bg-black/10 p-4">
                        <div className="text-[10px] font-bold text-endurix-black/50 dark:text-muted-foreground tracking-widest uppercase mb-2" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>{t('scheduled')}</div>
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-endurix-orange/10 flex items-center justify-center text-endurix-orange shrink-0">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-endurix-black dark:text-foreground">
                                    {format(new Date(assignment.scheduledDate), 'EEEE dd/MM/yyyy')}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-endurix-black/10 dark:border-white/10 bg-endurix-paper/70 dark:bg-black/10 p-4">
                        <div className="text-[10px] font-bold text-endurix-black/50 dark:text-muted-foreground tracking-widest uppercase mb-2" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>{t('targetAthlete')}</div>
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-endurix-black/8 dark:bg-white/8 flex items-center justify-center text-endurix-orange shrink-0">
                                <User className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-endurix-black dark:text-foreground">
                                    {assignment.athlete?.name || assignment.athlete?.email || 'N/A'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {assignment.canEdit && !assignment.completed && (
                    <div className="rounded-2xl border border-endurix-orange/20 bg-endurix-orange/5 p-4 space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-endurix-black/50 dark:text-muted-foreground tracking-widest uppercase mb-2 block" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                                {t('workoutName')}
                            </label>
                            <Input
                                value={editedWorkoutName}
                                onChange={(e) => handleWorkoutNameChange(e.target.value)}
                                disabled={readOnly}
                                className="bg-white dark:bg-background"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-endurix-black/50 dark:text-muted-foreground tracking-widest uppercase mb-2 block" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                                {t('scheduledDate')}
                            </label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-endurix-orange" />
                                <Input
                                    type="date"
                                    value={editedScheduledDate}
                                    onChange={(e) => handleScheduledDateChange(e.target.value)}
                                    disabled={readOnly}
                                    className="pl-10 bg-white dark:bg-background"
                                />
                            </div>
                        </div>
                    </div>
                )}

                <div className="rounded-2xl border border-endurix-black/10 dark:border-white/10 bg-endurix-paper/70 dark:bg-black/10 p-4">
                    <label className="text-[10px] font-bold text-endurix-black/50 dark:text-muted-foreground tracking-widest uppercase mb-3 flex items-center justify-between" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                        {t('targetRpeConstraint')}
                        <span className="text-endurix-orange font-bold text-sm bg-endurix-orange/10 border border-endurix-orange/30 px-2 py-0.5 rounded-md">{editedExpectedRpe}/10</span>
                    </label>

                    {readOnly ? (
                        <div className="h-1 bg-endurix-black/10 dark:bg-white/10 mt-6 mb-2 rounded-full">
                            <div className="h-full bg-endurix-orange rounded-full" style={{ width: `${(editedExpectedRpe / 10) * 100}%` }} />
                        </div>
                    ) : (
                        <Slider
                            value={[editedExpectedRpe]}
                            min={1}
                            max={10}
                            step={1}
                            onValueChange={(val) => { setEditedExpectedRpe(val[0]); setHasChanges(true); }}
                            className="my-6"
                        />
                    )}
                    <div className="flex justify-between text-[10px] font-bold text-endurix-black/50 dark:text-muted-foreground uppercase tracking-widest" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                        <span>{t('enduranceLoad')}</span>
                        <span>{t('maxOutput')}</span>
                    </div>
                </div>

                {readOnly ? (
                    <div className="bg-endurix-black/5 dark:bg-white/5 border border-endurix-black/10 dark:border-white/10 p-5 rounded-2xl">
                        <span className="font-bold text-sm text-endurix-black dark:text-foreground mb-1 block uppercase tracking-widest" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>{t('readOnlyMode')}</span>
                        <p className="text-xs text-muted-foreground leading-relaxed" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>{t('readOnlyDesc')}</p>
                    </div>
                ) : (
                    <Button
                        variant="ghost"
                        onClick={confirmDelete}
                        disabled={deleting}
                        className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/15 uppercase tracking-widest text-[10px] font-bold p-0 h-10 px-4"
                        style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                    >
                        <Trash2 className="w-4 h-4 mr-2" /> {t('deleteAssignment')}
                    </Button>
                )}

                {error && (
                    <div className="bg-red-500/10 dark:bg-red-500/15 text-red-700 dark:text-red-400 p-4 text-sm font-semibold border-l-4 border-red-500 rounded-xl">
                        {error}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="h-[calc(100vh-theme(spacing.16))] w-[calc(100%+2rem)] md:w-[calc(100%+4rem)] overflow-hidden -mx-4 md:-mx-8 -my-4 md:-my-8 bg-endurix-paper dark:bg-background flex flex-col relative">
            <div className="shrink-0 px-4 md:px-6 py-3 border-b border-endurix-black/10 dark:border-white/10 bg-endurix-paper/95 dark:bg-background/95 backdrop-blur-sm flex items-center justify-between gap-3">
                <BackButton label={t('backToDashboard')} showLabel />
                <div className="flex items-center gap-2 flex-wrap justify-end text-[10px] font-bold uppercase tracking-widest" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-endurix-black/15 dark:border-white/10 bg-endurix-black/5 dark:bg-white/5 text-endurix-black/60 dark:text-muted-foreground">
                        {assignment.completed ? <CheckCircle2 className="w-3 h-3" /> : <div className="w-2 h-2 rounded-full bg-amber-500" />}
                        {assignment.completed ? t('executed') : t('pendingExecution')}
                    </span>
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-endurix-orange/20 bg-endurix-orange/10 text-endurix-orange">
                        {displayTitle}
                    </span>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden flex relative">
                <aside className="w-full lg:w-[340px] xl:w-[360px] flex-shrink-0 bg-endurix-paper dark:bg-card border-r border-endurix-black/10 dark:border-white/10 overflow-y-auto z-10">
                    {leftSidebarContent}
                </aside>

                <main className="flex-1 min-w-0 overflow-hidden relative">
                    <WorkoutBuilder
                        initialBlocks={editedBlocks}
                        onChange={readOnly ? undefined : handleBlocksChange}
                        athleteId={assignment.athlete?.id}
                        readOnly={readOnly}
                        footerContent={null}
                        compactLayout
                    />
                </main>
            </div>

            {hasChanges && !readOnly && (
                <div className="absolute bottom-0 left-0 right-0 z-20 border-t border-endurix-orange/20 bg-endurix-orange/95 backdrop-blur-md shadow-[0_-12px_32px_rgba(0,0,0,0.08)]">
                    <div className="mx-auto px-4 md:px-6 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-white/85" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                                {t('uncommittedAdjustments')}
                            </div>
                            <div className="text-xs text-white/75" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                                {t('pushUpdates')}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                onClick={() => loadAssignment()}
                                disabled={saving}
                                className="h-10 px-4 bg-white/10 text-white hover:bg-white/20 uppercase tracking-widest text-xs font-bold"
                                style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                            >
                                {t('common.cancel')}
                            </Button>
                            <Button
                                onClick={confirmSave}
                                disabled={saving}
                                className="h-10 px-5 bg-white text-endurix-orange hover:bg-endurix-paper uppercase tracking-widest text-xs font-bold"
                                style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                            >
                                {saving ? t('synchronizing') : t('commitSave')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <AlertDialog
                open={alertState.open}
                onClose={closeAlert}
                onConfirm={alertState.onConfirm}
                onCancel={alertState.onCancel}
                type={alertState.type}
                title={alertState.title}
                message={alertState.message}
                confirmText={alertState.confirmText}
                cancelText={alertState.cancelText}
            />
        </div>
    );
}
