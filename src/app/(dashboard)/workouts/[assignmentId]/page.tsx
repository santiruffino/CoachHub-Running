'use client';
import { appLogger } from '@/lib/app-logger';


import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
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
    const assignmentDateLabel = assignment?.scheduledDate
        ? format(new Date(assignment.scheduledDate), 'EEEE dd/MM/yyyy', { locale: es })
        : t('scheduled');

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
        <div className="p-4 lg:p-5">
            <div className="flex flex-wrap gap-3 items-stretch">
                <div className="flex min-w-[240px] flex-1 items-center gap-3 rounded-2xl border border-endurix-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4">
                    <div className="w-10 h-10 rounded-xl bg-endurix-orange/10 flex items-center justify-center text-endurix-orange shrink-0">
                        <Calendar className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <div className="text-[10px] font-bold text-endurix-black/50 dark:text-muted-foreground tracking-widest uppercase" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>{t('scheduled')}</div>
                        <div className="text-sm font-bold text-endurix-black dark:text-foreground truncate">
                            {format(new Date(assignment.scheduledDate), 'EEEE dd/MM/yyyy')}
                        </div>
                    </div>
                </div>

                <div className="flex min-w-[240px] flex-1 items-center gap-3 rounded-2xl border border-endurix-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4">
                    <div className="w-10 h-10 rounded-xl bg-endurix-black/8 dark:bg-white/8 flex items-center justify-center text-endurix-orange shrink-0">
                        <User className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <div className="text-[10px] font-bold text-endurix-black/50 dark:text-muted-foreground tracking-widest uppercase" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>{t('targetAthlete')}</div>
                        <div className="text-sm font-bold text-endurix-black dark:text-foreground truncate">
                            {assignment.athlete?.name || assignment.athlete?.email || 'No disponible'}
                        </div>
                    </div>
                </div>

                {assignment.canEdit && !assignment.completed && (
                    <div className="flex min-w-[360px] flex-[2] items-center gap-3 rounded-2xl border border-endurix-orange/20 bg-endurix-orange/5 p-4">
                        <div className="min-w-[180px] flex-1">
                            <label className="text-[10px] font-bold text-endurix-black/50 dark:text-muted-foreground tracking-widest uppercase mb-2 block" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                                {t('workoutName')}
                            </label>
                            <Input
                                value={editedWorkoutName}
                                onChange={(e) => handleWorkoutNameChange(e.target.value)}
                                disabled={readOnly}
                                className="h-10 bg-white dark:bg-background"
                            />
                        </div>

                        <div className="min-w-[180px] flex-1">
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
                                    className="h-10 pl-10 bg-white dark:bg-background"
                                />
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex min-w-[280px] flex-1 items-center gap-3 rounded-2xl border border-endurix-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4">
                    <div className="min-w-0 flex-1">
                        <label className="text-[10px] font-bold text-endurix-black/50 dark:text-muted-foreground tracking-widest uppercase mb-2 block flex items-center justify-between" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                            {t('targetRpeConstraint')}
                            <span className="text-endurix-orange font-bold text-sm bg-endurix-orange/10 border border-endurix-orange/30 px-2 py-0.5 rounded-md">{editedExpectedRpe}/10</span>
                        </label>

                        {readOnly ? (
                            <div className="h-1 bg-endurix-black/10 dark:bg-white/10 rounded-full">
                                <div className="h-full bg-endurix-orange rounded-full" style={{ width: `${(editedExpectedRpe / 10) * 100}%` }} />
                            </div>
                        ) : (
                            <Slider
                                value={[editedExpectedRpe]}
                                min={1}
                                max={10}
                                step={1}
                                onValueChange={(val) => { setEditedExpectedRpe(val[0]); setHasChanges(true); }}
                                className="my-0"
                            />
                        )}

                        <div className="mt-2 flex justify-between text-[10px] font-bold text-endurix-black/50 dark:text-muted-foreground uppercase tracking-widest" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                            <span>{t('enduranceLoad')}</span>
                            <span>{t('maxOutput')}</span>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="flex min-w-full items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 dark:bg-red-500/15 text-red-700 dark:text-red-400 p-4 text-sm font-semibold">
                        <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
                            <Trash2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">{error}</div>
                    </div>
                )}

                {!readOnly && assignment.canEdit && (
                    <div className="min-w-full rounded-2xl border border-endurix-orange/20 bg-endurix-orange/5 p-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                                {t('uncommittedAdjustments')}
                            </div>
                            <div className="text-xs text-endurix-black/70 dark:text-muted-foreground" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                                {t('pushUpdates')}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap md:justify-end">
                            <Button
                                variant="ghost"
                                onClick={confirmDelete}
                                disabled={deleting}
                                className="h-10 px-4 bg-white/10 text-red-600 hover:text-red-700 hover:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/15 uppercase tracking-widest text-xs font-bold"
                                style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                {t('deleteAssignment')}
                            </Button>

                            {hasChanges && (
                                <Button
                                    onClick={confirmSave}
                                    disabled={saving}
                                    className="h-10 px-5 bg-endurix-orange text-white hover:bg-endurix-orange/90 uppercase tracking-widest text-xs font-bold"
                                    style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                                >
                                    {saving ? t('synchronizing') : t('commitSave')}
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="min-h-[calc(100vh-theme(spacing.16))] w-full overflow-hidden bg-endurix-paper dark:bg-background flex flex-col relative">
            <div className="shrink-0 px-4 md:px-6 py-3 border-b border-endurix-black/10 dark:border-white/10 bg-endurix-paper/95 dark:bg-background/95 backdrop-blur-md shadow-[0_8px_24px_rgba(0,0,0,0.03)] sticky top-0 z-20">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-3 min-w-0">
                        <BackButton label={t('backToDashboard')} showLabel />
                        <div className="min-w-0">
                            <h1 className="text-base md:text-lg font-bold uppercase tracking-[0.18em] text-endurix-black dark:text-foreground truncate" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>
                                {t('assignmentTitle')}
                            </h1>
                            <div className="flex items-center gap-2 flex-wrap mt-1 text-[10px] md:text-[11px] uppercase tracking-[0.22em] text-endurix-black/50 dark:text-muted-foreground" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                                <span className="truncate">{assignment.athlete?.name || assignment.athlete?.email || 'No disponible'}</span>
                                <span className="hidden md:inline-flex h-1 w-1 rounded-full bg-endurix-black/25 dark:bg-muted-foreground/40" />
                                <span>{assignmentDateLabel}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap justify-end text-[10px] font-bold uppercase tracking-widest" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-endurix-black/15 dark:border-white/10 bg-endurix-black/5 dark:bg-white/5 text-endurix-black/60 dark:text-muted-foreground">
                            {assignment.completed ? <CheckCircle2 className="w-3 h-3" /> : <div className="w-2 h-2 rounded-full bg-amber-500" />}
                            {assignment.completed ? t('executed') : t('pendingExecution')}
                        </span>
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-endurix-orange/20 bg-endurix-orange/10 text-endurix-orange max-w-[240px] truncate">
                            {displayTitle}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden flex flex-col relative">
                <div className="shrink-0 border-b border-endurix-black/10 dark:border-white/10 bg-white/60 dark:bg-card/50 backdrop-blur-sm">
                    <div className="px-4 md:px-6 py-4">
                        <div className="grid grid-cols-1 gap-4 items-start">
                            <div className="bg-endurix-paper dark:bg-card border border-endurix-black/10 dark:border-white/10 overflow-hidden rounded-3xl">
                                {leftSidebarContent}
                            </div>
                        </div>
                    </div>
                </div>

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
