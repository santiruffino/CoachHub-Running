'use client';

import { WorkoutBlock } from './types';
import { InlineBlockCard } from './InlineBlockCard';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface RepeatBlockCardProps {
    groupId: string;
    reps: number;
    blocks: WorkoutBlock[];
    onUpdate: (id: string, updates: Partial<WorkoutBlock>) => void;
    onRemove: (id: string) => void;
    onRemoveGroup: (groupId: string) => void;
    onAddStepToGroup?: (groupId: string) => void;
    onUpdateGroupReps?: (groupId: string, newReps: number) => void;
    onSelect?: (id: string) => void;
    selectedBlockId?: string | null;
    athleteId?: string;
    readOnly?: boolean;
    dragHandleProps?: any;
}

export function RepeatBlockCard({
    groupId,
    reps,
    blocks,
    onUpdate,
    onRemove,
    onRemoveGroup,
    onAddStepToGroup,
    onUpdateGroupReps,
    onSelect,
    selectedBlockId,
    athleteId,
    readOnly = false,
    dragHandleProps
}: RepeatBlockCardProps) {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className="relative bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/10 dark:to-blue-900/10 rounded-lg border-2 border-purple-200 dark:border-purple-800 p-3">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded">
                        REPEAT BLOCK
                    </span>

                    {/* Editable reps */}
                    {!readOnly && onUpdateGroupReps ? (
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                min="1"
                                max="99"
                                value={reps}
                                onChange={(e) => {
                                    const newReps = Math.max(1, Math.min(99, Number(e.target.value)));
                                    onUpdateGroupReps(groupId, newReps);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-14 text-sm px-2 py-1 rounded border border-purple-300 dark:border-purple-700 bg-white dark:bg-gray-800 text-center font-bold text-purple-600 dark:text-purple-400"
                            />
                            <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                                TIMES
                            </span>
                        </div>
                    ) : (
                        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-bold rounded">
                            {reps} TIMES
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {/* Collapse/Expand button */}
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 p-1"
                    >
                        {collapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                    </button>

                    {/* Delete group button */}
                    {!readOnly && (
                        <button
                            onClick={() => {
                                if (confirm(`Delete this repeat block with ${blocks.length} steps?`)) {
                                    onRemoveGroup(groupId);
                                }
                            }}
                            className="text-gray-400 hover:text-red-500 p-1"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Nested blocks */}
            {!collapsed && (
                <div className="space-y-2">
                    {blocks.map((block) => (
                        <InlineBlockCard
                            key={block.id}
                            block={block}
                            onUpdate={onUpdate}
                            onRemove={onRemove}
                            onSelect={onSelect}
                            isSelected={selectedBlockId === block.id}
                            indented={true}
                            athleteId={athleteId}
                            readOnly={readOnly}
                        />
                    ))}

                    {/* Add step to group button */}
                    {!readOnly && onAddStepToGroup && (
                        <button
                            onClick={() => onAddStepToGroup(groupId)}
                            className="w-full mt-2 py-2 border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-lg text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                        >
                            <Plus className="w-4 h-4" />
                            Add Step to Repeat
                        </button>
                    )}
                </div>
            )}

            {/* Collapsed summary */}
            {collapsed && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                    {blocks.length} step{blocks.length !== 1 ? 's' : ''} • {reps} repetitions
                </div>
            )}
        </div>
    );
}
