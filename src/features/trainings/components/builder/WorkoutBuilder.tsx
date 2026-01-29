'use client';

import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { WorkoutBlock, BlockType } from './types';
import { StepEditor } from './StepEditor';
import { RepeatBlockEditor } from './RepeatBlockEditor';
import { WorkoutSequence } from './WorkoutSequence';
import { EstimatedTotals } from './EstimatedTotals';
import { WorkoutProfileChart } from './WorkoutProfileChart';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface WorkoutBuilderProps {
    initialBlocks?: WorkoutBlock[];
    onChange?: (blocks: WorkoutBlock[]) => void;
    athleteId?: string;
    readOnly?: boolean;
}

export function WorkoutBuilder({
    initialBlocks = [],
    onChange,
    athleteId,
    readOnly = false
}: WorkoutBuilderProps) {
    const [blocks, setBlocks] = useState<WorkoutBlock[]>(initialBlocks);
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

    // Sync with parent component
    useEffect(() => {
        if (onChange) {
            onChange(blocks);
        }
    }, [blocks, onChange]);

    // Update when initialBlocks change
    useEffect(() => {
        if (initialBlocks.length > 0 && blocks.length === 0) {
            setBlocks(initialBlocks);
        }
    }, [initialBlocks]);

    const addBlock = useCallback((type: BlockType = 'interval', groupId?: string) => {
        const newBlock: WorkoutBlock = {
            id: uuidv4(),
            type,
            stepName: type.charAt(0).toUpperCase() + type.slice(1),
            duration: {
                type: type === 'recovery' ? 'time' : 'distance',
                value: type === 'recovery' ? 120 : 1000 // 2 min or 1 km
            },
            target: {
                type: 'threshold_pace',
                min: type === 'interval' ? 105 : 75,
                max: type === 'interval' ? 115 : 85
            },
            intensity: type === 'interval' ? 85 : (type === 'recovery' ? 30 : 50),
            ...(groupId && { group: { id: groupId, reps: 4 } })
        };

        setBlocks(prev => [...prev, newBlock]);
        setSelectedBlockId(newBlock.id);
    }, []);

    const addRepeatBlock = useCallback(() => {
        const groupId = uuidv4();

        // Add two blocks: Hard and Easy
        const hardBlock: WorkoutBlock = {
            id: uuidv4(),
            type: 'interval',
            stepName: 'Hard',
            duration: { type: 'distance', value: 2000 },
            target: { type: 'threshold_pace', min: 105, max: 115 },
            intensity: 85,
            group: { id: groupId, reps: 4 }
        };

        const easyBlock: WorkoutBlock = {
            id: uuidv4(),
            type: 'recovery',
            stepName: 'Easy',
            duration: { type: 'distance', value: 1000 },
            target: { type: 'threshold_pace', min: 75, max: 85 },
            intensity: 30,
            group: { id: groupId, reps: 4 }
        };

        setBlocks(prev => [...prev, hardBlock, easyBlock]);
        setSelectedBlockId(hardBlock.id);
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

    const selectBlock = useCallback((id: string | null) => {
        setSelectedBlockId(id);
    }, []);

    // Get selected block or group
    const selectedBlock = blocks.find(b => b.id === selectedBlockId);
    const selectedGroupId = selectedBlock?.group?.id;
    const selectedGroupBlocks = selectedGroupId
        ? blocks.filter(b => b.group?.id === selectedGroupId)
        : [];

    if (readOnly) {
        return (
            <div className="h-full bg-white dark:bg-slate-900 text-gray-900 dark:text-white p-4">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">Read-only mode</div>
                <EstimatedTotals blocks={blocks} />
                <div className="mt-4">
                    <WorkoutProfileChart blocks={blocks} />
                </div>
            </div>
        );
    }

    return (
        <div className="h-full bg-white dark:bg-slate-900 text-gray-900 dark:text-white grid grid-cols-12 gap-4 p-4">
            {/* Left Sidebar - Workout Sequence */}
            <div className="col-span-3 h-full">
                <WorkoutSequence
                    blocks={blocks}
                    selectedBlockId={selectedBlockId}
                    onSelectBlock={selectBlock}
                    onAddStep={(type) => {
                        if (type === 'repeat') {
                            addRepeatBlock();
                        } else {
                            addBlock(type === 'interval' ? 'interval' : type === 'warmup' ? 'warmup' : 'cooldown');
                        }
                    }}
                />
            </div>

            {/* Main Content Area */}
            <div className="col-span-9 flex flex-col gap-4 h-full overflow-hidden">
                {/* Top Section - Step/Repeat Editor */}
                <div className="flex-1 overflow-y-auto">
                    {selectedBlock ? (
                        selectedGroupId ? (
                            // Editing a repeat block
                            <RepeatBlockEditor
                                groupId={selectedGroupId}
                                blocks={selectedGroupBlocks}
                                onUpdate={updateBlock}
                                onRemove={removeBlock}
                                onAddStep={() => {
                                    const newBlock: WorkoutBlock = {
                                        id: uuidv4(),
                                        type: 'interval',
                                        stepName: 'New Step',
                                        duration: { type: 'distance', value: 1000 },
                                        target: { type: 'threshold_pace', min: 100, max: 110 },
                                        intensity: 75,
                                        group: { id: selectedGroupId, reps: selectedGroupBlocks[0].group!.reps }
                                    };
                                    setBlocks(prev => [...prev, newBlock]);
                                }}
                            />
                        ) : (
                            // Editing a single step
                            <StepEditor
                                step={selectedBlock}
                                stepNumber={blocks.findIndex(b => b.id === selectedBlock.id) + 1}
                                onUpdate={(updates) => updateBlock(selectedBlock.id, updates)}
                                onRemove={() => removeBlock(selectedBlock.id)}
                            />
                        )
                    ) : (
                        // No block selected - show add buttons
                        <div className="h-full flex items-center justify-center">
                            <div className="text-center">
                                <p className="text-gray-500 dark:text-gray-400 mb-6">
                                    Select a step from the sequence or create a new one
                                </p>
                                <div className="flex gap-3 justify-center">
                                    <Button
                                        type="button"
                                        onClick={() => addBlock('warmup')}
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Warm Up
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={() => addBlock('interval')}
                                        className="bg-blue-600 hover:bg-blue-700 text-white"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Interval
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={addRepeatBlock}
                                        className="bg-[#FFCC00] hover:bg-[#FFD633] text-black"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Repeat Block
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={() => addBlock('cooldown')}
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Cool Down
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom Section - Totals and Chart */}
                <div className="grid grid-cols-2 gap-4">
                    <EstimatedTotals blocks={blocks} />
                    <WorkoutProfileChart blocks={blocks} />
                </div>
            </div>
        </div>
    );
}
