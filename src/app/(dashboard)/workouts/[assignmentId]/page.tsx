'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { WorkoutBuilder } from '@/features/trainings/components/builder/WorkoutBuilder';
import { WorkoutBlock } from '@/features/trainings/components/builder/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, User, Calendar, Activity, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import api from '@/lib/axios';
import { AlertDialog, useAlertDialog } from '@/components/ui/AlertDialog';
import { Slider } from '@/components/ui/slider';
import { useTranslations } from 'next-intl';

interface WorkoutAssignment {
    id: string;
    scheduledDate: string;
    completed: boolean;
    expectedRpe: number;
    training: {
        id: string;
        title: string;
        description: string;
        type: string;
        blocks: WorkoutBlock[];
    };
    athlete: {
        id: string;
        name: string;
        email: string;
    };
    canEdit: boolean;
}

export default function WorkoutDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const assignmentId = params.assignmentId as string;
    const t = useTranslations('workouts.detail');

    const [assignment, setAssignment] = useState<WorkoutAssignment | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
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
            } catch (err: any) {
                console.error('Failed to fetch assignment:', err);
                setError(err.response?.data?.error || t('loadingError'));
            } finally {
                setLoading(false);
            }
        };

        if (assignmentId) {
            fetchAssignment();
        }
    }, [assignmentId]);

    const handleBlocksChange = (blocks: WorkoutBlock[]) => {
        setEditedBlocks(blocks);
        setHasChanges(true);
    };

    const handleSave = async () => {
        if (!assignment || !hasChanges) return;

        try {
            setSaving(true);
            setError('');

            await api.patch(`/v2/trainings/assignments/${assignmentId}`, {
                blocks: editedBlocks,
                expectedRpe: editedExpectedRpe
            });

            const response = await api.get<WorkoutAssignment>(`/v2/trainings/assignments/${assignmentId}`);
            setAssignment(response.data);
            setEditedBlocks(response.data.training.blocks || []);
            setEditedExpectedRpe(response.data.expectedRpe || 5);
            setHasChanges(false);

            showAlert('success', t('syncSuccess'));
        } catch (err: any) {
            console.error('Failed to save workout:', err);
            setError(err.response?.data?.error || t('syncFailed'));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-theme(spacing.16))] w-[calc(100%+2rem)] md:w-[calc(100%+4rem)] -mx-4 md:-mx-8 -my-4 md:-my-8 bg-background dark:bg-background">
                <div className="text-center font-inter tracking-widest text-xs uppercase text-muted-foreground">
                    {t('establishingLink')}
                </div>
            </div>
        );
    }

    if (error && !assignment) {
        return (
             <div className="flex items-center justify-center h-[calc(100vh-theme(spacing.16))] w-[calc(100%+2rem)] md:w-[calc(100%+4rem)] -mx-4 md:-mx-8 -my-4 md:-my-8 bg-background dark:bg-background">
                <div className="max-w-md text-center">
                    <p className="text-red-500 font-semibold mb-6">{error}</p>
                    <Button
                        variant="ghost"
                        onClick={() => router.back()}
                        className="text-muted-foreground hover:text-foreground uppercase tracking-wider text-xs font-bold"
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
            <Button variant="ghost" onClick={() => router.back()} className="w-min text-muted-foreground hover:text-foreground transition-colors p-0 hover:bg-transparent tracking-widest uppercase text-xs font-semibold mb-12">
                 <ArrowLeft className="w-4 h-4 mr-2" /> {t('backToDashboard')}
            </Button>
            
            <div className="mb-4">
                {assignment.completed ? (
                    <span className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded text-[10px] font-bold tracking-widest uppercase">
                        <CheckCircle2 className="w-3 h-3" /> {t('executed')}
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-2 bg-muted dark:bg-white/5 text-muted-foreground px-3 py-1 rounded text-[10px] font-bold tracking-widest uppercase">
                       {t('pendingExecution')}
                    </span>
                )}
            </div>
            
            <h1 className="text-4xl font-extrabold font-display leading-tight tracking-tight text-foreground dark:text-background mb-4">
                {assignment.training.title}
            </h1>
            
            {assignment.training.description && (
                <p className="text-muted-foreground font-medium leading-relaxed mb-12">
                    {assignment.training.description}
                </p>
            )}

            <div className="space-y-8 pb-12">
                <div className="flex gap-4 items-center">
                    <div className="w-12 h-12 rounded-full bg-muted dark:bg-white/5 flex items-center justify-center text-primary shrink-0">
                        <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-[10px] font-semibold text-muted-foreground tracking-[0.05em] uppercase mb-1">{t('scheduled')}</div>
                         <div className="text-sm font-bold text-foreground dark:text-background">
                            {format(new Date(assignment.scheduledDate), 'EEEE dd/MM/yyyy')}
                        </div>
                    </div>
                </div>

                {isCoach && (
                     <div className="flex gap-4 items-center">
                        <div className="w-12 h-12 rounded-full bg-muted dark:bg-white/5 flex items-center justify-center text-primary shrink-0">
                            <User className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-[10px] font-semibold text-muted-foreground tracking-[0.05em] uppercase mb-1">{t('targetAthlete')}</div>
                             <div className="text-sm font-bold text-foreground dark:text-background">
                                {assignment.athlete.name || assignment.athlete.email}
                            </div>
                        </div>
                    </div>
                )}

                {/* Global Expected RPE */}
                 <div className="pt-8 border-t border-border dark:border-white/5">
                    <label className="text-[10px] font-semibold text-muted-foreground tracking-[0.05em] uppercase mb-4 flex items-center justify-between">
                        {t('targetRpeConstraint')}
                        <span className="text-primary font-bold text-sm bg-muted dark:bg-white/5 px-2 py-0.5 rounded">{editedExpectedRpe}/10</span>
                    </label>
                    
                    {readOnly ? (
                        <div className="h-1 bg-muted dark:bg-white/5 rounded-full mt-6 mb-2">
                             <div className="h-full bg-primary dark:bg-white rounded-full" style={{ width: `${(editedExpectedRpe / 10) * 100}%` }} />
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
                     <div className="flex justify-between text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        <span>{t('enduranceLoad')}</span>
                        <span>{t('maxOutput')}</span>
                    </div>
                </div>

                {readOnly && (
                    <div className="bg-muted dark:bg-white/5 rounded-lg p-6">
                        <span className="font-semibold text-sm text-foreground dark:text-background mb-1 block">{t('readOnlyMode')}</span>
                        <p className="text-xs text-muted-foreground leading-relaxed">{t('readOnlyDesc')}</p>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg p-4 text-sm font-semibold border-l-4 border-red-500">
                        {error}
                    </div>
                )}
            </div>
        </div>
    );

    const footerContent = hasChanges && !readOnly ? (
         <div className="w-full flex items-center justify-between mx-auto px-12 bg-foreground py-6 rounded-xl relative shadow-2xl -top-6 translate-y-6 animate-in slide-in-from-bottom-12">
            <div className="flex flex-col">
                <span className="text-base font-bold font-display text-white">{t('uncommittedAdjustments')}</span>
                <span className="text-xs text-muted-foreground/60">{t('pushUpdates')}</span>
            </div>
            <Button 
                onClick={handleSave}
                disabled={saving}
                className="bg-white text-foreground hover:bg-background uppercase tracking-wider text-xs font-bold px-8 py-5 rounded"
            >
                {saving ? t('synchronizing') : t('commitSave')}
            </Button>
        </div>
    ) : null;

    return (
        <div className="h-[calc(100vh-theme(spacing.16))] w-[calc(100%+2rem)] md:w-[calc(100%+4rem)] overflow-hidden -mx-4 md:-mx-8 -my-4 md:-my-8 bg-background dark:bg-background font-inter">
            <WorkoutBuilder
                initialBlocks={editedBlocks}
                onChange={readOnly ? undefined : handleBlocksChange}
                athleteId={assignment.athlete.id}
                readOnly={readOnly}
                leftSidebarContent={leftSidebarContent}
                footerContent={footerContent}
            />

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
