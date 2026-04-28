import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { trainingsService } from '@/features/trainings/services/trainings.service';
import api from '@/lib/axios';
import { Training, TrainingType } from '@/interfaces/training';
import { format } from 'date-fns';
import { WorkoutBuilder } from './builder/WorkoutBuilder';
import { WorkoutBlock } from './builder/types';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';

interface AssignTrainingModalProps {
    athleteId?: string;
    groupId?: string;
    trainingId?: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

interface Athlete {
    id: string;
    name: string;
    email: string;
}

interface Group {
    id: string;
    name: string;
}

export function AssignTrainingModal({ athleteId, groupId, trainingId, isOpen, onClose, onSuccess }: AssignTrainingModalProps) {
    const t = useTranslations('trainings.assign');

    const [selectedTrainingId, setSelectedTrainingId] = useState<string>('');
    const [selectedTraining, setSelectedTraining] = useState<Training | null>(null);
    const [scheduledDate, setScheduledDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

    // Selection state
    const [assignmentType, setAssignmentType] = useState<'athlete' | 'group'>('athlete');
    const [selectedAthleteIds, setSelectedAthleteIds] = useState<string[]>([]);
    const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

    // Edit workout state
    const [isEditingWorkout, setIsEditingWorkout] = useState(false);
    const [editedBlocks, setEditedBlocks] = useState<WorkoutBlock[]>([]);

    // Athlete-specific flow state
    const [workoutSource, setWorkoutSource] = useState<'template' | 'new' | null>(null);
    const [currentStep, setCurrentStep] = useState<'date' | 'source' | 'workout'>('date');
    const [availableTemplates, setAvailableTemplates] = useState<Training[]>([]);

    // Data
    const [athletes, setAthletes] = useState<Athlete[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [expectedRpe, setExpectedRpe] = useState<number>(5);
    const [workoutName, setWorkoutName] = useState<string>('');

    useEffect(() => {
        if (isOpen) {
            loadData();
            if (trainingId) {
                setSelectedTrainingId(trainingId);
                loadTraining(trainingId);
            }
            if (athleteId) {
                setAssignmentType('athlete');
                setSelectedAthleteIds([athleteId]);
                setCurrentStep('date');
                setWorkoutSource(null);
            }
            if (groupId) {
                setAssignmentType('group');
                setSelectedGroupIds([groupId]);
            }
            setError('');
            setIsEditingWorkout(false);
            setWorkoutName('');
        }
    }, [isOpen, trainingId, athleteId, groupId]);

    const loadData = async () => {
        try {
            const [athletesRes, groupsRes] = await Promise.all([
                api.get<Athlete[]>('/v2/users/athletes'),
                api.get<Group[]>('/v2/groups'),
            ]);
            setAthletes(athletesRes.data);
            setGroups(groupsRes.data);
        } catch (e) {
            console.error('Failed to load data', e);
        }
    };

    const loadTraining = async (id: string) => {
        try {
            const res = await api.get<Training>(`/v2/trainings/${id}`);
            setSelectedTraining(res.data);
            setEditedBlocks(JSON.parse(JSON.stringify(res.data.blocks || [])));
            if (res.data.expectedRpe) {
                setExpectedRpe(res.data.expectedRpe);
            }
        } catch (e) {
            console.error('Failed to load training', e);
        }
    };

    const loadTemplates = async () => {
        try {
            const res = await api.get<Training[]>('/v2/trainings');
            setAvailableTemplates(res.data.filter(t => t.isTemplate));
        } catch (e) {
            console.error('Failed to load templates', e);
        }
    };

    const handleTrainingSelect = (id: string) => {
        setSelectedTrainingId(id);
        if (id) {
            loadTraining(id);
        } else {
            setSelectedTraining(null);
            setEditedBlocks([]);
        }
    };

    const getRpeLabel = (rpe: number) => {
        if (rpe <= 2) return t('rpeVeryEasy');
        if (rpe <= 4) return t('rpeEasy');
        if (rpe <= 6) return t('rpeModerate');
        if (rpe <= 8) return t('rpeHard');
        return t('rpeMax');
    };

    const handleAssign = async () => {
        if (!scheduledDate) {
            setError(t('errorNoDate'));
            return;
        }

        // For athlete-specific flow with builder (creating new workout from scratch)
        if (athleteId && workoutSource === 'new') {
            if (editedBlocks.length === 0) {
                setError(t('errorNoBlocks'));
                return;
            }

            try {
                setLoading(true);
                setError('');

                const newTraining = await trainingsService.create({
                    title: workoutName || `Workout for ${format(new Date(`${scheduledDate}T00:00:00`), 'MMM d, yyyy')}`,
                    type: 'RUNNING' as any,
                    description: 'Custom workout',
                    blocks: editedBlocks,
                    isTemplate: false
                });

                await trainingsService.assign({
                    trainingId: newTraining.data.id,
                    athleteIds: [athleteId],
                    scheduledDate: new Date(`${scheduledDate}T00:00:00`).toISOString(),
                    expectedRpe: expectedRpe,
                    workoutName: workoutName || undefined,
                });

                if (onSuccess) onSuccess();
                else window.location.reload();
                onClose();
            } catch (e) {
                console.error(e);
                setError(t('errorCreate'));
            } finally {
                setLoading(false);
            }
            return;
        }

        // For athlete-specific flow with template
        if (athleteId && workoutSource === 'template') {
            if (!selectedTrainingId) {
                setError(t('errorNoWorkout'));
                return;
            }

            try {
                setLoading(true);
                setError('');

                let trainingIdToAssign = selectedTrainingId;

                if (isEditingWorkout && selectedTraining) {
                    const newTraining = await trainingsService.create({
                        title: workoutName || selectedTraining.title,
                        type: selectedTraining.type,
                        description: 'Modified from template',
                        blocks: editedBlocks,
                        isTemplate: false
                    });
                    trainingIdToAssign = newTraining.data.id;
                }

                await trainingsService.assign({
                    trainingId: trainingIdToAssign,
                    athleteIds: [athleteId],
                    scheduledDate: new Date(`${scheduledDate}T00:00:00`).toISOString(),
                    expectedRpe: expectedRpe,
                    workoutName: workoutName || undefined,
                });

                if (onSuccess) onSuccess();
                else window.location.reload();
                onClose();
            } catch (e) {
                console.error(e);
                setError(t('errorAssign'));
            } finally {
                setLoading(false);
            }
            return;
        }

        // For template-based flow (group or multi-athlete)
        if (!selectedTrainingId) {
            setError(t('errorNoWorkout'));
            return;
        }

        if (selectedAthleteIds.length === 0 && selectedGroupIds.length === 0) {
            setError(t('errorNoRecipient'));
            return;
        }

        try {
            setLoading(true);
            setError('');

            let trainingIdToAssign = selectedTrainingId;

            if (isEditingWorkout && selectedTraining) {
                const newTraining = await trainingsService.create({
                    title: selectedTraining.title,
                    type: selectedTraining.type,
                    description: 'Modified from template',
                    blocks: editedBlocks,
                    isTemplate: false
                });
                trainingIdToAssign = newTraining.data.id;
            }

            await trainingsService.assign({
                trainingId: trainingIdToAssign,
                athleteIds: selectedAthleteIds.length > 0 ? selectedAthleteIds : undefined,
                groupIds: selectedGroupIds.length > 0 ? selectedGroupIds : undefined,
                scheduledDate: new Date(`${scheduledDate}T00:00:00`).toISOString(),
                expectedRpe: expectedRpe,
                workoutName: workoutName || undefined,
            });

            if (onSuccess) onSuccess();
            else window.location.reload();
            onClose();
        } catch (e) {
            console.error(e);
            setError(t('errorAssign'));
        } finally {
            setLoading(false);
        }
    };

    // Render step-based flow for single athlete assignment
    const renderAthleteAssignmentFlow = () => {
        // Step 1: Date Selection
        if (currentStep === 'date') {
            return (
                <>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {t('selectDate')}
                            </label>
                            <input
                                type="date"
                                className="flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary outline-none dark:text-white"
                                value={scheduledDate}
                                onChange={(e) => setScheduledDate(e.target.value)}
                            />
                        </div>

                        {/* Expected RPE Selector */}
                        <div className="space-y-2">
                            <Label htmlFor="expected-rpe">{t('expectedRpe')}</Label>
                            <div className="flex items-center gap-4">
                                <Slider
                                    id="expected-rpe"
                                    min={1}
                                    max={10}
                                    step={1}
                                    value={[expectedRpe]}
                                    onValueChange={(value) => setExpectedRpe(value[0])}
                                    className="flex-1"
                                />
                                <Badge variant="secondary" className="text-lg min-w-[45px] justify-center">
                                    {expectedRpe}
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{getRpeLabel(expectedRpe)}</p>
                        </div>

                        {/* Workout Name Input */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {t('workoutName')}
                            </label>
                            <input
                                type="text"
                                className="flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary outline-none dark:text-white"
                                placeholder={t('workoutNamePlaceholder')}
                                value={workoutName}
                                onChange={(e) => setWorkoutName(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">{t('workoutNameHint')}</p>
                        </div>

                        {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
                    </div>
                    <DialogFooter className="mt-6 border-t pt-4">
                        <Button variant="outline" onClick={onClose}>{t('cancel')}</Button>
                        <Button
                            onClick={() => setCurrentStep('source')}
                            className="bg-brand-primary text-white hover:bg-brand-deep"
                        >
                            {t('next')}
                        </Button>
                    </DialogFooter>
                </>
            );
        }

        // Step 2: Choose workout source
        if (currentStep === 'source') {
            return (
                <>
                    <div className="space-y-4">
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {t('chooseWorkoutType')}
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => {
                                        setWorkoutSource('template');
                                        loadTemplates();
                                        setCurrentStep('workout');
                                    }}
                                    className="p-6 border-2 border-gray-300 dark:border-gray-700 rounded-lg hover:border-brand-primary hover:bg-brand-primary/5 transition-all text-center"
                                >
                                    <div className="text-2xl mb-2">📋</div>
                                    <div className="font-medium text-gray-900 dark:text-gray-100">{t('useTemplate')}</div>
                                    <div className="text-xs text-muted-foreground mt-1">{t('useTemplateDesc')}</div>
                                </button>
                                <button
                                    onClick={() => {
                                        setWorkoutSource('new');
                                        setEditedBlocks([]);
                                        setCurrentStep('workout');
                                    }}
                                    className="p-6 border-2 border-gray-300 dark:border-gray-700 rounded-lg hover:border-brand-primary hover:bg-brand-primary/5 transition-all text-center"
                                >
                                    <div className="text-2xl mb-2">✨</div>
                                    <div className="font-medium text-gray-900 dark:text-gray-100">{t('createNew')}</div>
                                    <div className="text-xs text-muted-foreground mt-1">{t('createNewDesc')}</div>
                                </button>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="mt-6 border-t pt-4">
                        <Button variant="outline" onClick={() => setCurrentStep('date')}>{t('back')}</Button>
                        <Button variant="outline" onClick={onClose}>{t('cancel')}</Button>
                    </DialogFooter>
                </>
            );
        }

        // Step 3: Workout selection/creation
        if (currentStep === 'workout') {
            if (workoutSource === 'template') {
                return (
                    <>
                        <div className="space-y-4 flex-1 overflow-y-auto">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {t('selectTemplate')}
                                </label>
                                <div className="space-y-2 max-h-[400px] overflow-y-auto border border-gray-300 dark:border-gray-700 rounded-md p-3">
                                    {availableTemplates.length === 0 && (
                                        <p className="text-sm text-muted-foreground text-center py-8">
                                            {t('noTemplates')}
                                        </p>
                                    )}
                                    {availableTemplates.map((template) => (
                                        <div
                                            key={template.id}
                                            onClick={() => {
                                                setSelectedTrainingId(template.id);
                                                loadTraining(template.id);
                                            }}
                                            className={`p-4 border rounded-lg cursor-pointer transition-all ${selectedTrainingId === template.id
                                                ? 'border-brand-primary bg-brand-primary/10'
                                                : 'border-gray-300 dark:border-gray-700 hover:border-brand-primary/50'
                                                }`}
                                        >
                                            <div className="font-medium text-gray-900 dark:text-gray-100">
                                                {template.title}
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-1">
                                                {template.type} • {template.description || t('noDescription')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Edit Workout Section */}
                            {selectedTraining && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {t('workout', { title: selectedTraining.title })}
                                        </label>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setIsEditingWorkout(!isEditingWorkout)}
                                        >
                                            {isEditingWorkout ? t('viewOriginal') : t('editWorkout')}
                                        </Button>
                                    </div>
                                    {isEditingWorkout && (
                                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-2 h-[300px] overflow-hidden">
                                            <WorkoutBuilder initialBlocks={editedBlocks} onChange={setEditedBlocks} athleteId={athleteId} />
                                        </div>
                                    )}
                                </div>
                            )}

                            {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
                        </div>
                        <DialogFooter className="mt-4 border-t pt-4">
                            <Button variant="outline" onClick={() => setCurrentStep('source')}>{t('back')}</Button>
                            <Button variant="outline" onClick={onClose}>{t('cancel')}</Button>
                            <Button
                                onClick={handleAssign}
                                disabled={loading || !selectedTrainingId}
                                className="bg-brand-primary text-white hover:bg-brand-deep"
                            >
                                {loading ? t('assigning') : t('assignWorkout')}
                            </Button>
                        </DialogFooter>
                    </>
                );
            }

            if (workoutSource === 'new') {
                return (
                    <>
                        <div className="space-y-4 flex-1 flex flex-col">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {t('buildWorkout')}
                                </label>
                                <p className="text-xs text-muted-foreground">
                                    {t('scheduledFor', {
                                        date: scheduledDate ? (() => {
                                            const [year, month, day] = scheduledDate.split('-');
                                            return format(new Date(Number(year), Number(month) - 1, Number(day)), 'MMM d, yyyy');
                                        })() : t('notSet')
                                    })}
                                </p>
                            </div>
                            <div className="border border-gray-200 dark:border-gray-700 rounded-lg flex-1 min-h-[400px] overflow-hidden">
                                <WorkoutBuilder initialBlocks={editedBlocks} onChange={setEditedBlocks} athleteId={athleteId} />
                            </div>
                            {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
                        </div>
                        <DialogFooter className="mt-4 border-t pt-4">
                            <Button variant="outline" onClick={() => setCurrentStep('source')}>{t('back')}</Button>
                            <Button variant="outline" onClick={onClose}>{t('cancel')}</Button>
                            <Button
                                onClick={handleAssign}
                                disabled={loading}
                                className="bg-brand-primary text-white hover:bg-brand-deep"
                            >
                                {loading ? t('creatingAndAssigning') : t('createAndAssign')}
                            </Button>
                        </DialogFooter>
                    </>
                );
            }
        }

        return null;
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[900px] h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>
                        {athleteId ? t('titleAthlete') : t('title')}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                    {/* If athleteId is provided, use step-based flow */}
                    {athleteId ? (
                        renderAthleteAssignmentFlow()
                    ) : (
                        /* Otherwise, use the original flow for groups/multiple athletes */
                        <>
                            {/* Assignment Type Tabs */}
                            <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
                                <button
                                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${assignmentType === 'athlete' ? 'bg-brand-primary text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}
                                    onClick={() => setAssignmentType('athlete')}
                                >
                                    {t('assignToAthletes')}
                                </button>
                                <button
                                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${assignmentType === 'group' ? 'bg-brand-primary text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}
                                    onClick={() => setAssignmentType('group')}
                                >
                                    {t('assignToGroups')}
                                </button>
                            </div>

                            {/* Date Selection */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('scheduledDate')}</label>
                                <input
                                    type="date"
                                    className="flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary outline-none dark:text-white"
                                    value={scheduledDate}
                                    onChange={(e) => setScheduledDate(e.target.value)}
                                />
                            </div>

                            {/* Expected RPE Selector */}
                            <div className="space-y-2">
                                <Label htmlFor="expected-rpe-group">{t('expectedRpe')}</Label>
                                <div className="flex items-center gap-4">
                                    <Slider
                                        id="expected-rpe-group"
                                        min={1}
                                        max={10}
                                        step={1}
                                        value={[expectedRpe]}
                                        onValueChange={(value) => setExpectedRpe(value[0])}
                                        className="flex-1"
                                    />
                                    <Badge variant="secondary" className="text-lg min-w-[45px] justify-center">
                                        {expectedRpe}
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">{getRpeLabel(expectedRpe)}</p>
                            </div>

                            {/* Workout Name Input */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {t('workoutName')}
                                </label>
                                <input
                                    type="text"
                                    className="flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary outline-none dark:text-white"
                                    placeholder={t('workoutNamePlaceholder')}
                                    value={workoutName}
                                    onChange={(e) => setWorkoutName(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">{t('workoutNameHintTemplate')}</p>
                            </div>

                            {/* Athlete/Group Selection */}
                            {assignmentType === 'athlete' ? (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('selectAthletes')}</label>
                                    <div className="border border-gray-300 dark:border-gray-700 rounded-md p-3 max-h-32 overflow-y-auto space-y-2">
                                        {athletes.map((athlete) => (
                                            <label key={athlete.id} className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedAthleteIds.includes(athlete.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedAthleteIds([...selectedAthleteIds, athlete.id]);
                                                        } else {
                                                            setSelectedAthleteIds(selectedAthleteIds.filter(id => id !== athlete.id));
                                                        }
                                                    }}
                                                    className="h-4 w-4 rounded border-gray-300"
                                                />
                                                <span className="text-sm text-gray-900 dark:text-gray-100">{athlete.name || athlete.email}</span>
                                            </label>
                                        ))}
                                        {athletes.length === 0 && (
                                            <p className="text-sm text-muted-foreground">{t('noAthletes')}</p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('selectGroups')}</label>
                                    <div className="border border-gray-300 dark:border-gray-700 rounded-md p-3 max-h-32 overflow-y-auto space-y-2">
                                        {groups.map((group) => (
                                            <label key={group.id} className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedGroupIds.includes(group.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedGroupIds([...selectedGroupIds, group.id]);
                                                        } else {
                                                            setSelectedGroupIds(selectedGroupIds.filter(id => id !== group.id));
                                                        }
                                                    }}
                                                    className="h-4 w-4 rounded border-gray-300"
                                                />
                                                <span className="text-sm text-gray-900 dark:text-gray-100">{group.name}</span>
                                            </label>
                                        ))}
                                        {groups.length === 0 && (
                                            <p className="text-sm text-muted-foreground">{t('noGroups')}</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Workout Preview/Edit */}
                            {selectedTraining && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {t('workout', { title: selectedTraining.title })}
                                        </label>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setIsEditingWorkout(!isEditingWorkout)}
                                        >
                                            {isEditingWorkout ? t('viewOriginal') : t('editWorkout')}
                                        </Button>
                                    </div>
                                    {isEditingWorkout && (
                                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-2 h-[300px]">
                                            <WorkoutBuilder initialBlocks={editedBlocks} onChange={setEditedBlocks} athleteId={athleteId} />
                                        </div>
                                    )}
                                </div>
                            )}

                            {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

                            <DialogFooter className="mt-4 border-t pt-4">
                                <Button variant="outline" onClick={onClose}>{t('cancel')}</Button>
                                <Button onClick={handleAssign} disabled={loading} className="bg-brand-primary text-white hover:bg-brand-deep">
                                    {loading ? t('assigning') : t('assignWorkout')}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
