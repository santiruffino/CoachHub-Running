import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { trainingsService } from '@/features/trainings/services/trainings.service';
import api from '@/lib/axios';
import { Training } from '@/interfaces/training';
import { format } from 'date-fns';
import { WorkoutBuilder } from './builder/WorkoutBuilder';
import { WorkoutBlock } from './builder/types';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';
import { appLogger } from '@/lib/app-logger';

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

type CreatableTraining = {
    title: string;
    type: Training['type'];
    description: string;
    blocks: WorkoutBlock[];
    isTemplate: boolean;
};

const FALLBACK_TRAINING_TYPE: Training['type'] = 'RUNNING' as Training['type'];

const FIELD_LABEL_CLS = 'text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground';
const FIELD_LABEL_STYLE = { fontFamily: 'var(--font-plex-mono, monospace)' } as const;

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
                api.get<Athlete[]>('/v2/users/athletes?scope=team'),
                api.get<Group[]>('/v2/groups'),
            ]);
            setAthletes(athletesRes.data);
            setGroups(groupsRes.data);
        } catch (e) {
            appLogger.error('Failed to load data', e);
        }
    };

    const loadTraining = async (id: string) => {
        try {
            const res = await trainingsService.findOne(id);
            setSelectedTraining(res.data);
            setEditedBlocks(JSON.parse(JSON.stringify(res.data.blocks || [])));
            if (res.data.expectedRpe) {
                setExpectedRpe(res.data.expectedRpe);
            }
        } catch (e) {
            appLogger.error('Failed to load training', e);
        }
    };

    const loadTemplates = async () => {
        try {
            const res = await trainingsService.findAll();
            setAvailableTemplates(res.data.filter(t => t.isTemplate));
        } catch (e) {
            appLogger.error('Failed to load templates', e);
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

                const newTrainingPayload: CreatableTraining = {
                    title: workoutName || `Workout for ${format(new Date(`${scheduledDate}T00:00:00`), 'MMM d, yyyy')}`,
                    type: FALLBACK_TRAINING_TYPE,
                    description: 'Custom workout',
                    blocks: editedBlocks,
                    isTemplate: false
                };

                const newTraining = await trainingsService.create(newTrainingPayload);

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
                appLogger.error(e);
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
                appLogger.error(e);
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
            appLogger.error(e);
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
                            <Label className={FIELD_LABEL_CLS} style={FIELD_LABEL_STYLE}>
                                {t('selectDate')}
                            </Label>
                            <Input
                                type="date"
                                variant="boxed"
                                value={scheduledDate}
                                onChange={(e) => setScheduledDate(e.target.value)}
                            />
                        </div>

                        {/* Expected RPE Selector */}
                        <div className="space-y-2">
                            <Label htmlFor="expected-rpe" className={FIELD_LABEL_CLS} style={FIELD_LABEL_STYLE}>{t('expectedRpe')}</Label>
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
                                <Badge variant="solid" className="text-lg min-w-[45px] justify-center bg-endurix-orange/15 text-endurix-orange border border-endurix-orange/30">
                                    {expectedRpe}
                                </Badge>
                            </div>
                            <p className="text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground" style={FIELD_LABEL_STYLE}>{getRpeLabel(expectedRpe)}</p>
                        </div>

                        {/* Workout Name Input */}
                        <div className="space-y-2">
                            <Label className={FIELD_LABEL_CLS} style={FIELD_LABEL_STYLE}>
                                {t('workoutName')}
                            </Label>
                            <Input
                                type="text"
                                variant="boxed"
                                placeholder={t('workoutNamePlaceholder')}
                                value={workoutName}
                                onChange={(e) => setWorkoutName(e.target.value)}
                            />
                            <p className="text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground" style={FIELD_LABEL_STYLE}>{t('workoutNameHint')}</p>
                        </div>

                        {error && <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>}
                    </div>
                    <DialogFooter className="mt-6 border-t border-endurix-black/10 dark:border-border pt-4">
                        <Button variant="outline-brand" onClick={onClose} className="uppercase tracking-widest text-[10px]">{t('cancel')}</Button>
                        <Button
                            variant="orange"
                            onClick={() => setCurrentStep('source')}
                            className="uppercase tracking-widest text-[10px]"
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
                            <Label className={FIELD_LABEL_CLS} style={FIELD_LABEL_STYLE}>
                                {t('chooseWorkoutType')}
                            </Label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => {
                                        setWorkoutSource('template');
                                        loadTemplates();
                                        setCurrentStep('workout');
                                    }}
                                    className="p-6 border-2 border-endurix-black/15 dark:border-white/15 hover:border-endurix-orange hover:bg-endurix-orange/5 transition-all text-center"
                                >
                                    <div className="text-2xl mb-2">📋</div>
                                    <div className="font-bold uppercase tracking-widest text-sm text-endurix-black dark:text-foreground" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>{t('useTemplate')}</div>
                                    <div className="text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground mt-1" style={FIELD_LABEL_STYLE}>{t('useTemplateDesc')}</div>
                                </button>
                                <button
                                    onClick={() => {
                                        setWorkoutSource('new');
                                        setEditedBlocks([]);
                                        setCurrentStep('workout');
                                    }}
                                    className="p-6 border-2 border-endurix-black/15 dark:border-white/15 hover:border-endurix-orange hover:bg-endurix-orange/5 transition-all text-center"
                                >
                                    <div className="text-2xl mb-2">✨</div>
                                    <div className="font-bold uppercase tracking-widest text-sm text-endurix-black dark:text-foreground" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>{t('createNew')}</div>
                                    <div className="text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground mt-1" style={FIELD_LABEL_STYLE}>{t('createNewDesc')}</div>
                                </button>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="mt-6 border-t border-endurix-black/10 dark:border-border pt-4">
                        <Button variant="outline-brand" onClick={() => setCurrentStep('date')} className="uppercase tracking-widest text-[10px]">{t('back')}</Button>
                        <Button variant="outline-brand" onClick={onClose} className="uppercase tracking-widest text-[10px]">{t('cancel')}</Button>
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
                                <Label className={FIELD_LABEL_CLS} style={FIELD_LABEL_STYLE}>
                                    {t('selectTemplate')}
                                </Label>
                                <div className="space-y-2 max-h-[400px] overflow-y-auto border border-endurix-black/15 dark:border-white/15 p-3 bg-endurix-black/5 dark:bg-white/5">
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
                                            className={`p-4 border cursor-pointer transition-all ${selectedTrainingId === template.id
                                                ? 'border-endurix-orange bg-endurix-orange/10'
                                                : 'border-endurix-black/15 dark:border-white/15 hover:border-endurix-orange/50'
                                                }`}
                                        >
                                            <div className="font-bold uppercase tracking-widest text-sm text-endurix-black dark:text-foreground" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>
                                                {template.title}
                                            </div>
                                            <div className="text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground mt-1" style={FIELD_LABEL_STYLE}>
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
                                        <Label className={FIELD_LABEL_CLS} style={FIELD_LABEL_STYLE}>
                                            {t('workout', { title: selectedTraining.title })}
                                        </Label>
                                        <Button
                                            variant="outline-brand"
                                            size="sm"
                                            onClick={() => setIsEditingWorkout(!isEditingWorkout)}
                                            className="uppercase tracking-widest text-[10px]"
                                        >
                                            {isEditingWorkout ? t('viewOriginal') : t('editWorkout')}
                                        </Button>
                                    </div>
                                    {isEditingWorkout && (
                                        <div className="border border-endurix-black/15 dark:border-white/15 p-2 h-[300px] overflow-hidden bg-endurix-paper dark:bg-card">
                                            <WorkoutBuilder initialBlocks={editedBlocks} onChange={setEditedBlocks} athleteId={athleteId} />
                                        </div>
                                    )}
                                </div>
                            )}

                            {error && <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>}
                        </div>
                        <DialogFooter className="mt-4 border-t border-endurix-black/10 dark:border-border pt-4">
                            <Button variant="outline-brand" onClick={() => setCurrentStep('source')} className="uppercase tracking-widest text-[10px]">{t('back')}</Button>
                            <Button variant="outline-brand" onClick={onClose} className="uppercase tracking-widest text-[10px]">{t('cancel')}</Button>
                            <Button
                                variant="orange"
                                onClick={handleAssign}
                                disabled={loading || !selectedTrainingId}
                                className="uppercase tracking-widest text-[10px]"
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
                                <Label className={FIELD_LABEL_CLS} style={FIELD_LABEL_STYLE}>
                                    {t('buildWorkout')}
                                </Label>
                                <p className="text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground" style={FIELD_LABEL_STYLE}>
                                    {t('scheduledFor', {
                                        date: scheduledDate ? (() => {
                                            const [year, month, day] = scheduledDate.split('-');
                                            return format(new Date(Number(year), Number(month) - 1, Number(day)), 'MMM d, yyyy');
                                        })() : t('notSet')
                                    })}
                                </p>
                            </div>
                            <div className="border border-endurix-black/15 dark:border-white/15 flex-1 min-h-[400px] overflow-hidden bg-endurix-paper dark:bg-card">
                                <WorkoutBuilder initialBlocks={editedBlocks} onChange={setEditedBlocks} athleteId={athleteId} />
                            </div>
                            {error && <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>}
                        </div>
                        <DialogFooter className="mt-4 border-t border-endurix-black/10 dark:border-border pt-4">
                            <Button variant="outline-brand" onClick={() => setCurrentStep('source')} className="uppercase tracking-widest text-[10px]">{t('back')}</Button>
                            <Button variant="outline-brand" onClick={onClose} className="uppercase tracking-widest text-[10px]">{t('cancel')}</Button>
                            <Button
                                variant="orange"
                                onClick={handleAssign}
                                disabled={loading}
                                className="uppercase tracking-widest text-[10px]"
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
            <DialogContent className="sm:max-w-[900px] h-[90vh] flex flex-col overflow-hidden bg-endurix-paper dark:bg-card border-endurix-black/15 dark:border-white/15">
                <DialogHeader className="border-b border-endurix-black/10 dark:border-border">
                    <DialogTitle className="uppercase tracking-widest text-lg" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>
                        {athleteId ? t('titleAthlete') : t('title')}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-4">
                    {/* If athleteId is provided, use step-based flow */}
                    {athleteId ? (
                        renderAthleteAssignmentFlow()
                    ) : (
                        /* Otherwise, use the original flow for groups/multiple athletes */
                        <>
                            {/* Assignment Type Tabs */}
                            <div className="flex gap-2 border-b border-endurix-black/10 dark:border-border pb-2">
                                <button
                                    className={`px-4 py-2 text-[10px] uppercase tracking-widest font-bold transition-colors ${assignmentType === 'athlete' ? 'bg-endurix-orange text-white' : 'text-endurix-black/60 dark:text-muted-foreground hover:bg-endurix-black/5 dark:hover:bg-white/5'}`}
                                    onClick={() => setAssignmentType('athlete')}
                                    style={FIELD_LABEL_STYLE}
                                >
                                    {t('assignToAthletes')}
                                </button>
                                <button
                                    className={`px-4 py-2 text-[10px] uppercase tracking-widest font-bold transition-colors ${assignmentType === 'group' ? 'bg-endurix-orange text-white' : 'text-endurix-black/60 dark:text-muted-foreground hover:bg-endurix-black/5 dark:hover:bg-white/5'}`}
                                    onClick={() => setAssignmentType('group')}
                                    style={FIELD_LABEL_STYLE}
                                >
                                    {t('assignToGroups')}
                                </button>
                            </div>

                            {/* Date Selection */}
                            <div className="space-y-2">
                                <Label className={FIELD_LABEL_CLS} style={FIELD_LABEL_STYLE}>{t('scheduledDate')}</Label>
                                <Input
                                    type="date"
                                    variant="boxed"
                                    value={scheduledDate}
                                    onChange={(e) => setScheduledDate(e.target.value)}
                                />
                            </div>

                            {/* Expected RPE Selector */}
                            <div className="space-y-2">
                                <Label htmlFor="expected-rpe-group" className={FIELD_LABEL_CLS} style={FIELD_LABEL_STYLE}>{t('expectedRpe')}</Label>
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
                                    <Badge variant="solid" className="text-lg min-w-[45px] justify-center bg-endurix-orange/15 text-endurix-orange border border-endurix-orange/30">
                                        {expectedRpe}
                                    </Badge>
                                </div>
                                <p className="text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground" style={FIELD_LABEL_STYLE}>{getRpeLabel(expectedRpe)}</p>
                            </div>

                            {/* Workout Name Input */}
                            <div className="space-y-2">
                                <Label className={FIELD_LABEL_CLS} style={FIELD_LABEL_STYLE}>
                                    {t('workoutName')}
                                </Label>
                                <Input
                                    type="text"
                                    variant="boxed"
                                    placeholder={t('workoutNamePlaceholder')}
                                    value={workoutName}
                                    onChange={(e) => setWorkoutName(e.target.value)}
                                />
                                <p className="text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground" style={FIELD_LABEL_STYLE}>{t('workoutNameHintTemplate')}</p>
                            </div>

                            {/* Athlete/Group Selection */}
                            {assignmentType === 'athlete' ? (
                                <div className="space-y-2">
                                    <Label className={FIELD_LABEL_CLS} style={FIELD_LABEL_STYLE}>{t('selectAthletes')}</Label>
                                    <div className="border border-endurix-black/15 dark:border-white/15 p-3 max-h-32 overflow-y-auto space-y-2 bg-endurix-black/5 dark:bg-white/5">
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
                                                    className="h-4 w-4 accent-endurix-orange"
                                                />
                                                <span className="text-sm text-endurix-black dark:text-foreground">{athlete.name || athlete.email}</span>
                                            </label>
                                        ))}
                                        {athletes.length === 0 && (
                                            <p className="text-sm text-muted-foreground">{t('noAthletes')}</p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Label className={FIELD_LABEL_CLS} style={FIELD_LABEL_STYLE}>{t('selectGroups')}</Label>
                                    <div className="border border-endurix-black/15 dark:border-white/15 p-3 max-h-32 overflow-y-auto space-y-2 bg-endurix-black/5 dark:bg-white/5">
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
                                                    className="h-4 w-4 accent-endurix-orange"
                                                />
                                                <span className="text-sm text-endurix-black dark:text-foreground">{group.name}</span>
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
                                        <Label className={FIELD_LABEL_CLS} style={FIELD_LABEL_STYLE}>
                                            {t('workout', { title: selectedTraining.title })}
                                        </Label>
                                        <Button
                                            variant="outline-brand"
                                            size="sm"
                                            onClick={() => setIsEditingWorkout(!isEditingWorkout)}
                                            className="uppercase tracking-widest text-[10px]"
                                        >
                                            {isEditingWorkout ? t('viewOriginal') : t('editWorkout')}
                                        </Button>
                                    </div>
                                    {isEditingWorkout && (
                                        <div className="border border-endurix-black/15 dark:border-white/15 p-2 h-[300px] bg-endurix-paper dark:bg-card">
                                            <WorkoutBuilder initialBlocks={editedBlocks} onChange={setEditedBlocks} athleteId={athleteId} />
                                        </div>
                                    )}
                                </div>
                            )}

                            {error && <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>}

                            <DialogFooter className="mt-4 border-t border-endurix-black/10 dark:border-border pt-4">
                                <Button variant="outline-brand" onClick={onClose} className="uppercase tracking-widest text-[10px]">{t('cancel')}</Button>
                                <Button variant="orange" onClick={handleAssign} disabled={loading} className="uppercase tracking-widest text-[10px]">
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
