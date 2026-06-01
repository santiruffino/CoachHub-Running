'use client';
import { appLogger } from '@/lib/app-logger';


import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { WorkoutBuilder } from '@/features/trainings/components/builder/WorkoutBuilder';
import { WorkoutBlock } from '@/features/trainings/components/builder/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Calendar, CheckCircle2, Trash2, Users } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
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
    const { user } = useAuth();
    const assignmentId = params.assignmentId as string;
    const fromGroup = searchParams.get('fromGroup') === 'true';
    const t = useTranslations('workouts.detail');

    const [assignment, setAssignment] = useState<WorkoutAssignment | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [editedBlocks, setEditedBlocks] = useState<WorkoutBlock[]>([]);
    const [editedExpectedRpe, setEditedExpectedRpe] = useState<number>(5);
    const [hasChanges, setHasChanges] = useState(false);
    const [error, setError] = useState('');
    const { alertState, showAlert, closeAlert } = useAlertDialog();

    useEffect(() => {
        const fetchAssignment = async () => {
            try {
                setLoading(true);
                const response = await api.get<WorkoutAssignment>(`/v2/trainings/assignments/${assignmentId}`);
                setAssignment(response.data);
                setEditedBlocks(response.data.training.blocks || []);
                setEditedExpectedRpe(response.data.expectedRpe || 5);
            } catch (error: unknown) {
                appLogger.error('Failed to fetch assignment:', error);
                setError(getApiErrorMessage(error, t('loadingError')));
            } finally {
                setLoading(false);
            }
        };

        if (assignmentId) {
            fetchAssignment();
        }
    }, [assignmentId, t]);

    const handleBlocksChange = (blocks: WorkoutBlock[]) => {
        setEditedBlocks(blocks);
        setHasChanges(true);
    };

    const handleSave = async (applyToGroup: boolean = false) => {
        if (!assignment || !hasChanges) return;

        try {
            setSaving(true);
            setError('');

            await api.patch(`/v2/trainings/assignments/${assignmentId}`, {
                blocks: editedBlocks,
                expectedRpe: editedExpectedRpe,
                applyToGroup
            });

            const response = await api.get<WorkoutAssignment>(`/v2/trainings/assignments/${assignmentId}`);
            setAssignment(response.data);
            setEditedBlocks(response.data.training.blocks || []);
            setEditedExpectedRpe(response.data.expectedRpe || 5);
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
                    <Button
                        variant="ghost"
                        onClick={() => router.back()}
                        className="text-endurix-black/60 dark:text-muted-foreground hover:text-endurix-orange uppercase tracking-widest text-xs font-bold"
                        style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" /> {t('navigateBack')}
                    </Button>
                </div>
            </div>
        );
    }

    if (!assignment) return null;

    const isCoach = user?.role === 'COACH';
    const readOnly = !assignment.canEdit;

    const leftSidebarContent = (
        <div className="p-12 pb-4 flex flex-col h-full overflow-y-auto">
            <Button variant="ghost" onClick={() => router.back()} className="w-min text-endurix-black/60 dark:text-muted-foreground hover:text-endurix-orange transition-colors p-0 hover:bg-transparent tracking-widest uppercase text-xs font-semibold mb-12" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                 <ArrowLeft className="w-4 h-4 mr-2" /> {t('backToDashboard')}
            </Button>

            <div className="mb-4 flex flex-wrap gap-2">
                {assignment.completed ? (
                    <span className="inline-flex items-center gap-2 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 px-3 py-1 text-[10px] font-bold tracking-widest uppercase" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                        <CheckCircle2 className="w-3 h-3" /> {t('executed')}
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-2 bg-endurix-black/8 dark:bg-white/8 text-endurix-black/60 dark:text-muted-foreground border border-endurix-black/15 dark:border-white/15 px-3 py-1 text-[10px] font-bold tracking-widest uppercase" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                       {t('pendingExecution')}
                    </span>
                )}

                {assignment.source_group_id && (
                    <span className="inline-flex items-center gap-2 bg-endurix-orange/10 text-endurix-orange border border-endurix-orange/30 px-3 py-1 text-[10px] font-bold tracking-widest uppercase" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                        <Users className="w-3 h-3" /> {assignment.groupName || 'Grupo'}
                    </span>
                )}
            </div>

            <h1 className="text-4xl font-bold uppercase leading-tight tracking-tight text-endurix-black dark:text-foreground mb-4" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>
                {assignment.training.title}
            </h1>

            {assignment.training.description && (
                <p className="text-muted-foreground font-medium leading-relaxed mb-12">
                    {assignment.training.description}
                </p>
            )}

            <div className="space-y-8 pb-12">
                <div className="flex gap-4 items-center">
                    <div className="w-12 h-12 bg-endurix-orange/10 flex items-center justify-center text-endurix-orange shrink-0">
                        <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-[10px] font-bold text-endurix-black/50 dark:text-muted-foreground tracking-widest uppercase mb-1" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>{t('scheduled')}</div>
                         <div className="text-sm font-bold text-endurix-black dark:text-foreground">
                            {format(new Date(assignment.scheduledDate), 'EEEE dd/MM/yyyy')}
                        </div>
                    </div>
                </div>

                {isCoach && (
                     <div className="flex gap-4 items-center">
                        <div className="w-12 h-12 bg-endurix-black/8 dark:bg-white/8 flex items-center justify-center text-endurix-orange shrink-0">
                            <User className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-[10px] font-bold text-endurix-black/50 dark:text-muted-foreground tracking-widest uppercase mb-1" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>{t('targetAthlete')}</div>
                             <div className="text-sm font-bold text-endurix-black dark:text-foreground">
                                {assignment.athlete?.name || assignment.athlete?.email || 'N/A'}
                            </div>
                        </div>
                    </div>
                )}

                {/* Global Expected RPE */}
                 <div className="pt-8 border-t border-endurix-black/10 dark:border-white/10">
                    <label className="text-[10px] font-bold text-endurix-black/50 dark:text-muted-foreground tracking-widest uppercase mb-4 flex items-center justify-between" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                        {t('targetRpeConstraint')}
                        <span className="text-endurix-orange font-bold text-sm bg-endurix-orange/10 border border-endurix-orange/30 px-2 py-0.5">{editedExpectedRpe}/10</span>
                    </label>

                    {readOnly ? (
                        <div className="h-1 bg-endurix-black/10 dark:bg-white/10 mt-6 mb-2">
                             <div className="h-full bg-endurix-orange" style={{ width: `${(editedExpectedRpe / 10) * 100}%` }} />
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

                {!readOnly && (
                    <div className="pt-8 mt-8 border-t border-endurix-black/10 dark:border-white/10">
                        <Button
                            variant="ghost"
                            onClick={confirmDelete}
                            disabled={deleting}
                            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/15 uppercase tracking-widest text-[10px] font-bold p-0 h-10 px-4"
                            style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                        >
                            <Trash2 className="w-4 h-4 mr-2" /> {t('deleteAssignment')}
                        </Button>
                    </div>
                )}

                {readOnly && (
                    <div className="bg-endurix-black/5 dark:bg-white/5 border border-endurix-black/10 dark:border-white/10 p-6">
                        <span className="font-bold text-sm text-endurix-black dark:text-foreground mb-1 block uppercase tracking-widest" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>{t('readOnlyMode')}</span>
                        <p className="text-xs text-muted-foreground leading-relaxed" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>{t('readOnlyDesc')}</p>
                    </div>
                )}

                {error && (
                    <div className="bg-red-500/10 dark:bg-red-500/15 text-red-700 dark:text-red-400 p-4 text-sm font-semibold border-l-4 border-red-500">
                        {error}
                    </div>
                )}
            </div>
        </div>
    );

    const footerContent = hasChanges && !readOnly ? (
         <div className="w-full flex items-center justify-between mx-auto px-12 bg-endurix-orange py-6 -top-6 translate-y-6 animate-in slide-in-from-bottom-12">
            <div className="flex flex-col">
                <span className="text-base font-bold text-white uppercase tracking-tight" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>{t('uncommittedAdjustments')}</span>
                <span className="text-xs text-white/70" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>{t('pushUpdates')}</span>
            </div>
            <Button
                onClick={confirmSave}
                disabled={saving}
                className="bg-white text-endurix-orange hover:bg-endurix-paper uppercase tracking-widest text-xs font-bold px-8 py-5"
                style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
            >
                {saving ? t('synchronizing') : t('commitSave')}
            </Button>
        </div>
    ) : null;

    return (
        <div className="h-[calc(100vh-theme(spacing.16))] w-[calc(100%+2rem)] md:w-[calc(100%+4rem)] overflow-hidden -mx-4 md:-mx-8 -my-4 md:-my-8 bg-endurix-paper dark:bg-background flex relative">
            <div className="w-[380px] lg:w-[480px] flex-shrink-0 bg-endurix-paper dark:bg-card border-r border-endurix-black/10 dark:border-white/10 overflow-y-auto z-10">
                {leftSidebarContent}
            </div>
            <div className="flex-1 overflow-hidden relative">
                <WorkoutBuilder
                    initialBlocks={editedBlocks}
                    onChange={readOnly ? undefined : handleBlocksChange}
                    athleteId={assignment.athlete?.id}
                    readOnly={readOnly}
                    footerContent={footerContent}
                />
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
