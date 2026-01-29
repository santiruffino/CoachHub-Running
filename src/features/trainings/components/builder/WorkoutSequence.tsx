'use client';

import { WorkoutBlock } from './types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, GripVertical, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkoutSequenceProps {
    blocks: WorkoutBlock[];
    selectedBlockId: string | null;
    onSelectBlock: (blockId: string) => void;
    onAddStep: (type: 'warmup' | 'interval' | 'recovery' | 'cooldown' | 'repeat') => void;
}

export function WorkoutSequence({
    blocks,
    selectedBlockId,
    onSelectBlock,
    onAddStep
}: WorkoutSequenceProps) {

    const getBlockColor = (type: string) => {
        switch (type) {
            case 'warmup':
            case 'cooldown':
                return 'bg-green-500';
            case 'interval':
                return 'bg-blue-500';
            case 'recovery':
                return 'bg-blue-300';
            default:
                return 'bg-gray-500';
        }
    };

    const getBlockIntensity = (block: WorkoutBlock) => {
        if (block.rpe) return `RPE ${block.rpe}/10`;
        if (block.intensity) return `${block.intensity}%`;

        // Fallback based on type
        switch (block.type) {
            case 'warmup':
            case 'cooldown':
                return '70%';
            case 'interval':
                return '105%';
            case 'recovery':
                return '75%';
            default:
                return '—';
        }
    };

    const getDuration = (block: WorkoutBlock) => {
        if (block.duration.type === 'distance') {
            return `${(block.duration.value / 1000).toFixed(2)} km`;
        }
        const minutes = Math.floor(block.duration.value / 60);
        const seconds = block.duration.value % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // Group blocks by repeat groups
    const groupedBlocks: Array<{ isGroup: boolean; groupId?: string; blocks: WorkoutBlock[] }> = [];
    const processedBlocks = new Set<string>();

    blocks.forEach(block => {
        if (processedBlocks.has(block.id)) return;

        if (block.group) {
            const groupBlocks = blocks.filter(b => b.group?.id === block.group?.id);
            groupBlocks.forEach(b => processedBlocks.add(b.id));
            groupedBlocks.push({
                isGroup: true,
                groupId: block.group.id,
                blocks: groupBlocks
            });
        } else {
            processedBlocks.add(block.id);
            groupedBlocks.push({
                isGroup: false,
                blocks: [block]
            });
        }
    });

    return (
        <div className="h-full flex flex-col bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-1 h-4 bg-[#FFCC00] rounded" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                        Workout Sequence
                    </h3>
                </div>
            </div>

            {/* Blocks List */}
            <ScrollArea className="flex-1 p-3">
                <div className="space-y-2">
                    {groupedBlocks.map((item, index) => {
                        if (item.isGroup) {
                            const reps = item.blocks[0]?.group?.reps || 1;
                            return (
                                <div
                                    key={item.groupId}
                                    className="bg-gray-200 dark:bg-slate-700 rounded-md p-2 border border-gray-300 dark:border-slate-600"
                                >
                                    <div className="flex items-center gap-2 mb-2 px-2">
                                        <Repeat className="w-3 h-3 text-[#FFCC00]" />
                                        <span className="text-xs text-gray-700 dark:text-gray-300 font-semibold">
                                            {reps}× Repeat
                                        </span>
                                    </div>
                                    <div className="space-y-1 ml-2">
                                        {item.blocks.map((block) => (
                                            <button
                                                key={block.id}
                                                type="button"
                                                onClick={() => onSelectBlock(block.id)}
                                                className={cn(
                                                    "w-full flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors group",
                                                    selectedBlockId === block.id && "bg-gray-100 dark:bg-slate-800 ring-1 ring-[#FFCC00]"
                                                )}
                                            >
                                                <GripVertical className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                <div className={cn("w-1 h-8 rounded", getBlockColor(block.type))} />
                                                <div className="flex-1 text-left">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                        {block.stepName || block.type}
                                                    </div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                        {getDuration(block)} @ {getBlockIntensity(block)} HR Max
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        }

                        const block = item.blocks[0];
                        return (
                            <button
                                key={block.id}
                                type="button"
                                onClick={() => onSelectBlock(block.id)}
                                className={cn(
                                    "w-full flex items-center gap-2 p-2 rounded hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors group",
                                    selectedBlockId === block.id && "bg-gray-200 dark:bg-slate-700 ring-1 ring-[#FFCC00]"
                                )}
                            >
                                <GripVertical className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className={cn("w-1 h-10 rounded", getBlockColor(block.type))} />
                                <div className="flex-1 text-left">
                                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {block.stepName || block.type}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        {getDuration(block)} @ {getBlockIntensity(block)} HR Max
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </ScrollArea>

            {/* Add Step Buttons */}
            <div className="p-3 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-b-lg">
                <div className="grid grid-cols-2 gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onAddStep('warmup')}
                        className="border-green-200 dark:border-green-900 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                    >
                        <Plus className="w-3 h-3 mr-1" />
                        Warm Up
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onAddStep('interval')}
                        className="border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    >
                        <Plus className="w-3 h-3 mr-1" />
                        Interval
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onAddStep('repeat')}
                        className="col-span-2 border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                    >
                        <Repeat className="w-3 h-3 mr-1" />
                        Add Repeat Block
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onAddStep('cooldown')}
                        className="col-span-2 border-green-200 dark:border-green-900 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                    >
                        <Plus className="w-3 h-3 mr-1" />
                        Cool Down
                    </Button>
                </div>
            </div>
        </div>
    );
}
