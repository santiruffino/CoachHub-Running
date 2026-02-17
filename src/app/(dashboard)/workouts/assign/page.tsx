'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { WorkoutBuilder } from '@/features/trainings/components/builder/WorkoutBuilder';
import { WorkoutBlock } from '@/features/trainings/components/builder/types';
import { Training, TrainingType } from '@/features/trainings/types';
import { Button } from '@/components/ui/button';
import { trainingsService } from '@/features/trainings/services/trainings.service';
import api from '@/lib/axios';
import { ArrowLeft, Users, Calendar } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { AlertDialog, useAlertDialog } from '@/components/ui/AlertDialog';

interface Athlete {
    id: string;
    name: string;
    email: string;
}

interface Group {
    id: string;
    name: string;
}

function AssignWorkoutContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const athleteId = searchParams.get('athleteId');
    const templateId = searchParams.get('templateId');

    const [step, setStep] = useState<'select-source' | 'select-template' | 'build' | 'assign-details'>('select-source');
    const [workoutSource, setWorkoutSource] = useState<'template' | 'new' | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<Training | null>(null);
    const [templates, setTemplates] = useState<Training[]>([]);
    const [blocks, setBlocks] = useState<WorkoutBlock[]>([]);
    const [editingTemplate, setEditingTemplate] = useState(false);

    // Assignment details
    const [selectedAthleteIds, setSelectedAthleteIds] = useState<string[]>(athleteId ? [athleteId] : []);
    const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
    const [scheduledDate, setScheduledDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [expectedRpe, setExpectedRpe] = useState(5);
    const [workoutName, setWorkoutName] = useState('');
    const [saveAsTemplate, setSaveAsTemplate] = useState(false);
    const [templateTitle, setTemplateTitle] = useState('');

    const [athletes, setAthletes] = useState<Athlete[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(false);
    const { alertState, showAlert, closeAlert } = useAlertDialog();

    useEffect(() => {
        loadData();

        // If templateId is provided, load it
        if (templateId) {
            loadTemplate(templateId);
            setWorkoutSource('template');
            setStep('assign-details');
        }
    }, [templateId]);

    const loadData = async () => {
        try {
            const [athletesRes, groupsRes, templatesRes] = await Promise.all([
                api.get<Athlete[]>('/v2/users/athletes'),
                api.get<Group[]>('/v2/groups'),
                api.get<Training[]>('/v2/trainings'),
            ]);
            setAthletes(athletesRes.data);
            setGroups(groupsRes.data);
            setTemplates(templatesRes.data.filter(t => t.isTemplate));
        } catch (error) {
            console.error('Failed to load data:', error);
        }
    };

    const loadTemplate = async (id: string) => {
        try {
            const res = await api.get<Training>(`/v2/trainings/${id}`);
            setSelectedTemplate(res.data);
            setBlocks(JSON.parse(JSON.stringify(res.data.blocks || [])));
        } catch (error) {
            console.error('Failed to load template:', error);
        }
    };

    const handleAssign = async () => {
        if (selectedAthleteIds.length === 0 && selectedGroupIds.length === 0) {
            showAlert('warning', 'Please select at least one athlete or group');
            return;
        }

        if (!scheduledDate) {
            showAlert('warning', 'Please select a date');
            return;
        }

        if (blocks.length === 0) {
            showAlert('warning', 'Please add at least one workout block');
            return;
        }

        try {
            setLoading(true);

            let trainingIdToAssign: string;

            if (workoutSource === 'new' || editingTemplate) {
                // Create new training
                const newTraining = await trainingsService.create({
                    title: saveAsTemplate ? (templateTitle || 'Untitled Workout') : `Workout for ${format(new Date(scheduledDate), 'MMM d, yyyy')}`,
                    type: TrainingType.RUNNING,
                    description: editingTemplate ? 'Modified from template' : 'Custom workout',
                    blocks,
                    isTemplate: saveAsTemplate
                });
                trainingIdToAssign = newTraining.data.id;
            } else {
                // Use existing template
                trainingIdToAssign = selectedTemplate!.id;
            }

            // Assign the workout
            await trainingsService.assign({
                trainingId: trainingIdToAssign,
                athleteIds: selectedAthleteIds.length > 0 ? selectedAthleteIds : undefined,
                groupIds: selectedGroupIds.length > 0 ? selectedGroupIds : undefined,
                scheduledDate: new Date(scheduledDate).toISOString(),
                expectedRpe,
                workoutName: workoutName || undefined,
            });

            showAlert('success', 'Workout assigned successfully!');
            setTimeout(() => router.push(athleteId ? `/athletes/${athleteId}` : '/athletes'), 1500);
        } catch (error) {
            console.error('Failed to assign workout:', error);
            showAlert('error', 'Failed to assign workout');
        } finally {
            setLoading(false);
        }
    };

    // Step 1: Select source (only if no templateId)
    if (step === 'select-source') {
        return (
            <div className="container mx-auto px-4 py-6">
                <div className="max-w-2xl mx-auto">
                    <div className="mb-6">
                        <Link href="/workouts/library">
                            <Button variant="outline" size="sm">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back
                            </Button>
                        </Link>
                    </div>

                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Assign Workout</h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-8">Choose how you want to create this workout</p>

                    <div className="grid grid-cols-2 gap-4">
                        <button
                            type="button"
                            onClick={() => {
                                setWorkoutSource('template');
                                setStep('select-template');
                            }}
                            className="p-8 border-2 border-gray-300 dark:border-gray-700 rounded-lg hover:border-brand-primary hover:bg-brand-primary/5 transition-all"
                        >
                            <div className="text-4xl mb-3">📋</div>
                            <div className="font-semibold text-lg text-gray-900 dark:text-gray-100 mb-2">Use Template</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Select from existing workout templates</div>
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setWorkoutSource('new');
                                setStep('build');
                            }}
                            className="p-8 border-2 border-gray-300 dark:border-gray-700 rounded-lg hover:border-brand-primary hover:bg-brand-primary/5 transition-all"
                        >
                            <div className="text-4xl mb-3">✨</div>
                            <div className="font-semibold text-lg text-gray-900 dark:text-gray-100 mb-2">Create New</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Build a custom workout from scratch</div>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Step 2: Select template
    if (step === 'select-template') {
        return (
            <div className="container mx-auto px-4 py-6">
                <div className="max-w-4xl mx-auto">
                    <div className="mb-6">
                        <Button variant="outline" size="sm" onClick={() => setStep('select-source')}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back
                        </Button>
                    </div>

                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Select Template</h1>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {templates.map((template) => (
                            <div
                                key={template.id}
                                onClick={() => {
                                    loadTemplate(template.id);
                                    setStep('assign-details');
                                }}
                                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${selectedTemplate?.id === template.id
                                    ? 'border-brand-primary bg-brand-primary/10'
                                    : 'border-gray-300 dark:border-gray-700 hover:border-brand-primary/50'
                                    }`}
                            >
                                <div className="font-semibold text-gray-900 dark:text-gray-100">{template.title}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    {template.description || 'No description'} • {template.blocks?.length || 0} steps
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Step 3: Build workout
    if (step === 'build') {
        return (
            <div className="container mx-auto px-4 py-6 h-screen flex flex-col">
                <div className="mb-6">
                    <Button variant="outline" size="sm" onClick={() => setStep('select-source')}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                </div>

                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Build Your Workout</h1>

                <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 overflow-hidden mb-4">
                    <WorkoutBuilder initialBlocks={blocks} onChange={setBlocks} />
                </div>

                <div className="flex justify-end">
                    <Button
                        onClick={() => setStep('assign-details')}
                        disabled={blocks.length === 0}
                        className="bg-brand-primary hover:bg-brand-primary-dark text-white"
                    >
                        Continue to Assignment
                    </Button>
                </div>
            </div>
        );
    }

    // Step 4: Assignment details
    return (
        <div className="container mx-auto px-4 py-6">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                    <Link href={athleteId ? `/athletes/${athleteId}` : '/workouts/library'}>
                        <Button variant="outline" size="sm">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Cancel
                        </Button>
                    </Link>
                </div>

                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Assignment Details</h1>
                <p className="text-gray-600 dark:text-gray-400 mb-8">
                    {selectedTemplate?.title || 'Custom Workout'}
                </p>

                <div className="space-y-6">
                    {/* Edit template option */}
                    {workoutSource === 'template' && selectedTemplate && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-blue-900 dark:text-blue-100">Want to modify this workout?</p>
                                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                        You can edit the workout before assigning. Changes won't affect the original template.
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setEditingTemplate(!editingTemplate);
                                    }}
                                >
                                    {editingTemplate ? 'Use Original' : 'Edit Workout'}
                                </Button>
                            </div>
                            {editingTemplate && (
                                <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg p-4 max-h-96 overflow-hidden">
                                    <WorkoutBuilder initialBlocks={blocks} onChange={setBlocks} />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Save as template option (only for new workouts) */}
                    {workoutSource === 'new' && (
                        <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-4">
                            <label className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={saveAsTemplate}
                                    onChange={(e) => setSaveAsTemplate(e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300"
                                />
                                <div>
                                    <span className="font-medium text-gray-900 dark:text-white">Save as template</span>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Also add this workout to your library for future use</p>
                                </div>
                            </label>
                            {saveAsTemplate && (
                                <input
                                    type="text"
                                    value={templateTitle}
                                    onChange={(e) => setTemplateTitle(e.target.value)}
                                    placeholder="Template name"
                                    className="mt-3 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                />
                            )}
                        </div>
                    )}

                    {/* Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <Calendar className="w-4 h-4 inline mr-2" />
                            Scheduled Date
                        </label>
                        <input
                            type="date"
                            value={scheduledDate}
                            onChange={(e) => setScheduledDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                    </div>

                    {/* Athletes/Groups (only if not pre-selected) */}
                    {!athleteId && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                <Users className="w-4 h-4 inline mr-2" />
                                Assign To
                            </label>
                            <div className="border border-gray-300 dark:border-gray-700 rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
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
                                            className="w-4 h-4 rounded border-gray-300"
                                        />
                                        <span className="text-sm text-gray-900 dark:text-white">{athlete.name || athlete.email}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* RPE */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Expected RPE
                        </label>
                        <div className="flex items-center gap-4">
                            <input
                                type="range"
                                min="1"
                                max="10"
                                value={expectedRpe}
                                onChange={(e) => setExpectedRpe(Number(e.target.value))}
                                className="flex-1"
                            />
                            <span className="text-lg font-semibold w-12 text-center">{expectedRpe}</span>
                        </div>
                    </div>

                    {/* Workout Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Workout Name (Optional)
                        </label>
                        <input
                            type="text"
                            value={workoutName}
                            onChange={(e) => setWorkoutName(e.target.value)}
                            placeholder="e.g., Monday Speed Work"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button
                            variant="outline"
                            onClick={() => router.back()}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAssign}
                            disabled={loading}
                            className="bg-brand-primary hover:bg-brand-primary-dark text-white"
                        >
                            {loading ? 'Assigning...' : 'Assign Workout'}
                        </Button>
                    </div>
                </div>
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

export default function AssignWorkoutPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
            <AssignWorkoutContent />
        </Suspense>
    );
}
