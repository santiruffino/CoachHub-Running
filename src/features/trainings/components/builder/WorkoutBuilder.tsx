'use client';

import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { WorkoutBlock, BlockType } from './types';
import { BlockList } from './BlockList';
import { BlockEditor } from './BlockEditor';
import { WorkoutChart } from './WorkoutChart';
import { RepeatWizard } from './RepeatWizard';
import { Plus, Repeat } from 'lucide-react';

interface WorkoutBuilderProps {
    initialBlocks?: WorkoutBlock[];
    onChange?: (blocks: WorkoutBlock[]) => void;
}

export function WorkoutBuilder({ initialBlocks = [], onChange }: WorkoutBuilderProps) {
    const [blocks, setBlocks] = useState<WorkoutBlock[]>(initialBlocks);
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
    const [showWizard, setShowWizard] = useState(false);

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
            notes: ''
        };

        setBlocks(prev => [...prev, newBlock]);
        setSelectedBlockId(newBlock.id);
    }, []);

    const handleAddRepeats = useCallback((newBlocks: WorkoutBlock[]) => {
        setBlocks(prev => [...prev, ...newBlocks]);
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
            const newBlocks = prev.filter(block => block.group?.id !== groupId);
            // If selected block was in this group, deselect it
            // (This check assumes we have access to the filtered-out blocks, or we check if selectedId exists in newBlocks)
            // Simpler: just check if the current selectedBlock's groupId matches.
            return newBlocks;
        });

        // We need to check if the selected block was removed. 
        // Accessing state inside setState callback is tricky for side effects.
        // Let's do it in two steps or use a useEffect/ref, but simpler logic:
        // if selectedBlock is in the group being removed -> deselect.
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

    const selectedBlock = blocks.find(b => b.id === selectedBlockId);

    // Calculate Totals
    const totals = blocks.reduce((acc, block) => {
        if (block.duration.type === 'distance') {
            acc.distance += block.duration.value;
            // Est time: distance (m) / 1000 * 5.0 (min/km)
            acc.time += (block.duration.value / 1000) * 5;
        } else {
            acc.time += block.duration.value / 60; // seconds to minutes
        }
        return acc;
    }, { distance: 0, time: 0 });

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[600px] relative">
            {showWizard && (
                <RepeatWizard
                    onAdd={handleAddRepeats}
                    onClose={() => setShowWizard(false)}
                />
            )}

            {/* Left Panel: List & Controls */}
            <div className="lg:col-span-5 flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-700 dark:text-gray-200">Workout Blocks</h3>
                    <div className="text-xs text-gray-500 dark:text-gray-400 space-x-3">
                        <span>Running: <strong>{(totals.distance / 1000).toFixed(1)} km</strong></span>
                        <span>~ <strong>{Math.ceil(totals.time)} min</strong></span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-white dark:bg-gray-800">
                    <BlockList
                        blocks={blocks}
                        selectedId={selectedBlockId}
                        onSelect={setSelectedBlockId}
                        onReorder={reorderBlocks}
                        onRemove={removeBlock}
                        onRemoveGroup={removeGroup}
                        onRemoveMultiple={removeBlocks}
                    />
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex flex-col gap-2">
                    <div className="grid grid-cols-4 gap-2">
                        <button
                            onClick={() => addBlock('warmup')}
                            className="flex flex-col items-center justify-center p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition text-xs font-medium text-gray-600 dark:text-gray-300"
                        >
                            <Plus className="w-4 h-4 mb-1" />
                            Warm Up
                        </button>
                        <button
                            onClick={() => addBlock('interval')}
                            className="flex flex-col items-center justify-center p-2 rounded hover:bg-brand-primary/20 dark:hover:bg-brand-primary/30 transition text-xs font-medium text-brand-deep dark:text-brand-primary"
                        >
                            <Plus className="w-4 h-4 mb-1" />
                            Interval
                        </button>
                        <button
                            onClick={() => addBlock('recovery')}
                            className="flex flex-col items-center justify-center p-2 rounded hover:bg-green-100 dark:hover:bg-green-900/30 transition text-xs font-medium text-green-600 dark:text-green-400"
                        >
                            <Plus className="w-4 h-4 mb-1" />
                            Recovery
                        </button>
                        <button
                            onClick={() => addBlock('cooldown')}
                            className="flex flex-col items-center justify-center p-2 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition text-xs font-medium text-blue-600 dark:text-blue-400"
                        >
                            <Plus className="w-4 h-4 mb-1" />
                            Cool Down
                        </button>
                    </div>
                    <button
                        onClick={() => setShowWizard(true)}
                        className="w-full flex items-center justify-center py-2 bg-gray-800 dark:bg-gray-700 text-white rounded hover:bg-gray-900 dark:hover:bg-gray-600 transition text-xs font-bold uppercase tracking-wider"
                    >
                        <Repeat className="w-4 h-4 mr-2" />
                        Add Repeats
                    </button>
                </div>
            </div>

            {/* Right Panel: Editor & Visualization */}
            <div className="lg:col-span-7 flex flex-col space-y-6">
                {/* Chart */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm h-32">
                    <WorkoutChart blocks={blocks} />
                </div>

                {/* Editor */}
                <div className="flex-1">
                    {selectedBlock ? (
                        <BlockEditor
                            block={selectedBlock}
                            onUpdate={updateBlock}
                            onRemove={removeBlock}
                        />
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-8">
                            <p>Select a block to edit its details</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
