'use client';

import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { WorkoutBlock, BlockType } from './types';
import { BlockList } from './BlockList';
import { BlockEditor } from './BlockEditor';
import { WorkoutChart } from './WorkoutChart';
import { RepeatWizard } from './RepeatWizard';
import { WorkoutSummary } from './WorkoutSummary';
import { PresetIntervals } from './PresetIntervals';
import { Plus, Repeat, Upload, FileText } from 'lucide-react';

interface WorkoutBuilderProps {
    initialBlocks?: WorkoutBlock[];
    onChange?: (blocks: WorkoutBlock[]) => void;
    athleteId?: string; // Optional athlete ID for VAM pace calculation
    readOnly?: boolean; // If true, disables all editing
}

export function WorkoutBuilder({ initialBlocks = [], onChange, athleteId, readOnly = false }: WorkoutBuilderProps) {
    const [blocks, setBlocks] = useState<WorkoutBlock[]>(initialBlocks);
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
    const [showWizard, setShowWizard] = useState(false);
    const [showSummary, setShowSummary] = useState(false);
    const [workoutNotes, setWorkoutNotes] = useState('');
    const [workoutRPE, setWorkoutRPE] = useState<number | undefined>(undefined);
    const [athleteVAM, setAthleteVAM] = useState<string | null>(null);

    // Fetch athlete VAM when athleteId is provided
    useEffect(() => {
        const fetchAthleteVAM = async () => {
            if (!athleteId) {
                console.log('WorkoutBuilder: No athleteId provided');
                setAthleteVAM(null);
                return;
            }
            console.log('WorkoutBuilder: Fetching VAM for athlete:', athleteId);
            try {
                const response = await fetch(`/api/v2/users/${athleteId}/details`);
                console.log(response)
                if (response.ok) {
                    const data = await response.json();
                    console.log('WorkoutBuilder: Athlete data received:', data.athleteProfile);
                    console.log('WorkoutBuilder: VAM value:', data.athleteProfile?.vam);
                    setAthleteVAM(data.athleteProfile?.vam || null);
                } else {
                    console.error('WorkoutBuilder: Failed to fetch, status:', response.status);
                }
            } catch (error) {
                console.error('WorkoutBuilder: Failed to fetch athlete VAM:', error);
                setAthleteVAM(null);
            }
        };
        fetchAthleteVAM();
    }, [athleteId]);

    // Notify parent onChange whenever blocks change
    useEffect(() => {
        if (onChange) {
            onChange(blocks);
        }
    }, [blocks, onChange]);

    const addBlock = useCallback((type: BlockType) => {
        const newBlock: WorkoutBlock = {
            id: uuidv4(),
            type,
            duration: { type: 'distance', value: type === 'warmup' || type === 'cooldown' ? 1000 : 400 },
            target: { type: 'pace', min: '5:00', max: '4:30' },
            notes: '',
            intensity: 50
        };

        setBlocks(prev => [...prev, newBlock]);
        setSelectedBlockId(newBlock.id);
    }, []);

    const handleAddRepeats = useCallback((newBlocks: WorkoutBlock[]) => {
        setBlocks(prev => [...prev, ...newBlocks]);
        setShowWizard(false);
    }, []);

    const updateBlock = useCallback((id: string, updates: Partial<WorkoutBlock>) => {
        setBlocks(prev => prev.map(block =>
            block.id === id ? { ...block, ...updates } : block
        ));
    }, []);

    const removeBlock = useCallback((id: string) => {
        setBlocks(prev => prev.filter(block => block.id !== id));
        if (selectedBlockId === id) {
            setSelectedBlockId(null);
        }
    }, [selectedBlockId]);

    const removeBlocks = useCallback((ids: string[]) => {
        setBlocks(prev => prev.filter(block => !ids.includes(block.id)));
        if (selectedBlockId && ids.includes(selectedBlockId)) {
            setSelectedBlockId(null);
        }
    }, [selectedBlockId]);

    const removeGroup = useCallback((groupId: string) => {
        setBlocks(prev => {
            return prev.filter(block => block.group?.id !== groupId);
        });

        const selected = blocks.find(b => b.id === selectedBlockId);
        if (selected?.group?.id === groupId) {
            setSelectedBlockId(null);
        }
    }, [blocks, selectedBlockId]);

    const reorderBlocks = useCallback((fromIndex: number, toIndex: number) => {
        setBlocks(prev => {
            const newBlocks = [...prev];
            const [movedBlock] = newBlocks.splice(fromIndex, 1);
            newBlocks.splice(toIndex, 0, movedBlock);
            return newBlocks;
        });
    }, []);

    const handleAddStepToGroup = useCallback((groupId: string) => {
        // Find the first block in this group to get the group details
        const groupBlock = blocks.find(b => b.group?.id === groupId);
        if (!groupBlock?.group) return;

        const newBlock: WorkoutBlock = {
            id: uuidv4(),
            type: 'interval',
            duration: { type: 'distance', value: 400 },
            target: { type: 'pace', min: '4:00', max: '3:30' },
            notes: '',
            intensity: 80,
            group: groupBlock.group
        };

        // Find the last index of blocks in this group
        const lastGroupIndex = blocks.reduce((lastIdx, block, idx) => {
            return block.group?.id === groupId ? idx : lastIdx;
        }, -1);

        setBlocks(prev => {
            const newBlocks = [...prev];
            newBlocks.splice(lastGroupIndex + 1, 0, newBlock);
            return newBlocks;
        });

        setSelectedBlockId(newBlock.id);
    }, [blocks]);

    const handleAddPreset = useCallback((presetBlocks: WorkoutBlock[]) => {
        setBlocks(prev => [...prev, ...presetBlocks]);
        // Select the first block from the preset
        if (presetBlocks.length > 0) {
            setSelectedBlockId(presetBlocks[0].id);
        }
    }, []);

    const handleUpdateGroupReps = useCallback((groupId: string, newReps: number) => {
        setBlocks(prev => prev.map(block => {
            if (block.group?.id === groupId) {
                return { ...block, group: { ...block.group, reps: newReps } };
            }
            return block;
        }));
    }, []);

    const selectedBlock = blocks.find(b => b.id === selectedBlockId);

    return (
        <div className="flex flex-col h-full space-y-4">
            {showWizard && (
                <RepeatWizard
                    onAdd={handleAddRepeats}
                    onClose={() => setShowWizard(false)}
                />
            )}

            {showSummary && (
                <WorkoutSummary
                    blocks={blocks}
                    workoutRPE={workoutRPE}
                    onClose={() => setShowSummary(false)}
                />
            )}

            {/* Header with title and action buttons */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Visual Workout</h2>
                {!readOnly && (
                    <div className="flex items-center gap-2">
                        <button
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center gap-2"
                            title="Upload workout file"
                        >
                            <Upload className="w-4 h-4" />
                            Upload
                        </button>
                        <button
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                            title="Save graph as image"
                        >
                            Save Graph
                        </button>
                        <button
                            onClick={() => setShowSummary(true)}
                            className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-dark text-white rounded-lg text-sm font-medium transition flex items-center gap-2"
                        >
                            <FileText className="w-4 h-4" />
                            Summary
                        </button>
                    </div>
                )}
            </div>

            {/* Preset Intervals */}
            {!readOnly && <PresetIntervals onSelectPreset={handleAddPreset} />}

            {/* Visual Workout Chart */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm h-64">
                <WorkoutChart
                    blocks={blocks}
                    selectedId={selectedBlockId}
                    onBlockClick={setSelectedBlockId}
                />
            </div>

            {/* Main content: Workout Steps + Step Details */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
                {/* Left Panel: Workout Steps */}
                <div className="flex flex-col bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                        <h3 className="font-semibold text-gray-700 dark:text-gray-200">Workout Steps</h3>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4">
                        <BlockList
                            blocks={blocks}
                            selectedId={readOnly ? null : selectedBlockId}
                            onSelect={readOnly ? () => { } : setSelectedBlockId}
                            onReorder={readOnly ? () => { } : reorderBlocks}
                            onRemove={readOnly ? () => { } : removeBlock}
                            onRemoveGroup={readOnly ? () => { } : removeGroup}
                            onRemoveMultiple={readOnly ? () => { } : removeBlocks}
                            onAddStepToGroup={readOnly ? undefined : handleAddStepToGroup}
                            onUpdateGroupReps={readOnly ? undefined : handleUpdateGroupReps}
                            athleteVAM={athleteVAM}
                        />
                    </div>

                    {!readOnly && (
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 space-y-2">
                            <button
                                onClick={() => setShowWizard(true)}
                                className="w-full flex items-center justify-center py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition text-sm font-semibold"
                            >
                                <Repeat className="w-4 h-4 mr-2" />
                                Add Repeats
                            </button>

                            <div className="grid grid-cols-4 gap-2">
                                <button
                                    onClick={() => addBlock('warmup')}
                                    className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition text-xs font-medium text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
                                >
                                    <Plus className="w-4 h-4 mb-1" />
                                    Warm Up
                                </button>
                                <button
                                    onClick={() => addBlock('interval')}
                                    className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition text-xs font-medium text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
                                >
                                    <Plus className="w-4 h-4 mb-1" />
                                    Interval
                                </button>
                                <button
                                    onClick={() => addBlock('recovery')}
                                    className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition text-xs font-medium text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
                                >
                                    <Plus className="w-4 h-4 mb-1" />
                                    Recovery
                                </button>
                                <button
                                    onClick={() => addBlock('cooldown')}
                                    className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition text-xs font-medium text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
                                >
                                    <Plus className="w-4 h-4 mb-1" />
                                    Cool Down
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Panel: Step Details */}
                <div className="flex flex-col overflow-hidden">
                    {selectedBlock ? (
                        <BlockEditor
                            block={selectedBlock}
                            onUpdate={updateBlock}
                            onRemove={removeBlock}
                            athleteId={athleteId}
                        />
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-8 bg-white dark:bg-gray-800">
                            <p className="text-center">Select a step to edit its details</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Workout Notes Section */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Workout Notes
                </label>
                <textarea
                    rows={3}
                    value={workoutNotes}
                    onChange={(e) => setWorkoutNotes(e.target.value)}
                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary text-sm p-3 border text-gray-900 dark:text-white dark:bg-gray-700 placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none"
                    placeholder="Add notes, instructions, or goals for this workout..."
                />
            </div>
        </div>
    );
}
