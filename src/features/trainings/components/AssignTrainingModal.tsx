import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { trainingsService } from '@/features/trainings/services/trainings.service';
import api from '@/lib/axios';
import { Training, TrainingType } from '@/features/trainings/types';
import { format } from 'date-fns';
import { WorkoutBuilder } from './builder/WorkoutBuilder';
import { WorkoutBlock } from './builder/types';

interface AssignTrainingModalProps {
    athleteId?: string;
    groupId?: string;
    trainingId?: string;
    isOpen: boolean;
    onClose: () => void;
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

export function AssignTrainingModal({ athleteId, groupId, trainingId, isOpen, onClose }: AssignTrainingModalProps) {
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

    // Data
    const [athletes, setAthletes] = useState<Athlete[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            loadData();
            // Pre-set values if provided
            if (trainingId) {
                setSelectedTrainingId(trainingId);
                loadTraining(trainingId);
            }
            if (athleteId) {
                setAssignmentType('athlete');
                setSelectedAthleteIds([athleteId]);
            }
            if (groupId) {
                setAssignmentType('group');
                setSelectedGroupIds([groupId]);
            }
            setError('');
            setIsEditingWorkout(false);
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
            // Clone the blocks for editing
            setEditedBlocks(JSON.parse(JSON.stringify(res.data.blocks || [])));
        } catch (e) {
            console.error('Failed to load training', e);
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

    const handleAssign = async () => {
        if (!selectedTrainingId) {
            setError('Please select a workout.');
            return;
        }

        if (!scheduledDate) {
            setError('Please select a date.');
            return;
        }

        if (selectedAthleteIds.length === 0 && selectedGroupIds.length === 0) {
            setError('Please select at least one athlete or group.');
            return;
        }

        try {
            setLoading(true);
            setError('');

            let trainingIdToAssign = selectedTrainingId;

            // If workout was edited, create a new one-off training
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

            // Assign
            await trainingsService.assign({
                trainingId: trainingIdToAssign,
                athleteIds: selectedAthleteIds.length > 0 ? selectedAthleteIds : undefined,
                groupIds: selectedGroupIds.length > 0 ? selectedGroupIds : undefined,
                scheduledDate: new Date(scheduledDate).toISOString(),
            });

            onClose();
        } catch (e) {
            console.error(e);
            setError('Failed to assign training.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[900px] h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Assign Workout</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                    {/* Assignment Type Tabs */}
                    <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
                        <button
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${assignmentType === 'athlete' ? 'bg-brand-primary text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}
                            onClick={() => setAssignmentType('athlete')}
                        >
                            Assign to Athletes
                        </button>
                        <button
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${assignmentType === 'group' ? 'bg-brand-primary text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}
                            onClick={() => setAssignmentType('group')}
                        >
                            Assign to Groups
                        </button>
                    </div>

                    {/* Date Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Scheduled Date</label>
                        <input
                            type="date"
                            className="flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary outline-none dark:text-white"
                            value={scheduledDate}
                            onChange={(e) => setScheduledDate(e.target.value)}
                        />
                    </div>

                    {/* Athlete/Group Selection */}
                    {assignmentType === 'athlete' ? (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Select Athletes</label>
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
                                    <p className="text-sm text-muted-foreground">No athletes found</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Select Groups</label>
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
                                    <p className="text-sm text-muted-foreground">No groups found</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Workout Preview/Edit */}
                    {selectedTraining && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    Workout: {selectedTraining.title}
                                </label>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsEditingWorkout(!isEditingWorkout)}
                                >
                                    {isEditingWorkout ? 'View Original' : 'Edit Workout'}
                                </Button>
                            </div>
                            {isEditingWorkout && (
                                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-2 h-[300px]">
                                    <WorkoutBuilder initialBlocks={editedBlocks} onChange={setEditedBlocks} />
                                </div>
                            )}
                        </div>
                    )}

                    {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
                </div>

                <DialogFooter className="mt-4 border-t pt-4">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleAssign} disabled={loading} className="bg-brand-primary text-white hover:bg-brand-deep">
                        {loading ? 'Assigning...' : 'Assign Workout'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
