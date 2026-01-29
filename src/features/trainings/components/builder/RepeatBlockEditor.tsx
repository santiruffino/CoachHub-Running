'use client';

import { WorkoutBlock } from './types';
import { StepEditor } from './StepEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Repeat, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface RepeatBlockEditorProps {
    groupId: string;
    blocks: WorkoutBlock[];
    onUpdate: (blockId: string, updates: Partial<WorkoutBlock>) => void;
    onRemove: (blockId: string) => void;
    onAddStep: () => void;
}

export function RepeatBlockEditor({
    groupId,
    blocks,
    onUpdate,
    onRemove,
    onAddStep
}: RepeatBlockEditorProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const reps = blocks[0]?.group?.reps || 1;

    const updateReps = (newReps: number) => {
        blocks.forEach(block => {
            if (block.group?.id === groupId) {
                onUpdate(block.id, {
                    group: {
                        ...block.group,
                        reps: newReps
                    }
                });
            }
        });
    };

    // Calculate total distance for this block
    const getTotalDistance = () => {
        const singleDistance = blocks.reduce((sum, block) => {
            if (block.duration.type === 'distance') {
                return sum + (block.duration.value / 1000); // Convert to km
            }
            return sum;
        }, 0);
        return (singleDistance * reps).toFixed(2);
    };

    return (
        <div className="bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
            {/* Header */}
            <div className="bg-gray-200 dark:bg-slate-700 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Repeat className="w-5 h-5 text-[#FFCC00]" />
                    <div className="flex items-center gap-2">
                        <span className="text-gray-900 dark:text-white font-semibold">Repeat</span>
                        <Input
                            type="number"
                            min="1"
                            value={reps}
                            onChange={(e) => updateReps(parseInt(e.target.value) || 1)}
                            className="w-16 h-8 bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white text-center font-bold"
                        />
                        <span className="text-gray-900 dark:text-white font-semibold">times</span>
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400 ml-4">
                        Total for this block: <span className="text-[#FFCC00] font-semibold">{getTotalDistance()} km</span>
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-300 dark:hover:bg-slate-600"
                    >
                        {isCollapsed ? (
                            <>
                                <ChevronDown className="w-4 h-4 mr-1" />
                                Expand
                            </>
                        ) : (
                            <>
                                <ChevronUp className="w-4 h-4 mr-1" />
                                Collapse
                            </>
                        )}
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            // Remove all blocks in this group
                            blocks.forEach(block => onRemove(block.id));
                        }}
                        className="text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-300 dark:hover:bg-slate-600"
                    >
                        Delete Block
                    </Button>
                </div>
            </div>

            {/* Steps */}
            {!isCollapsed && (
                <div className="p-4 space-y-3">
                    {blocks.map((block, index) => (
                        <StepEditor
                            key={block.id}
                            step={block}
                            stepNumber={index + 1}
                            onUpdate={(updates) => onUpdate(block.id, updates)}
                            onRemove={() => onRemove(block.id)}
                            isInRepeat={true}
                        />
                    ))}

                    <Button
                        type="button"
                        variant="outline"
                        className="w-full border-dashed border-gray-300 dark:border-slate-600 text-[#FFCC00] hover:text-[#FFD633] hover:bg-gray-100 dark:hover:bg-slate-700 hover:border-[#FFCC00]"
                        onClick={onAddStep}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add step to repeat
                    </Button>
                </div>
            )}
        </div>
    );
}
