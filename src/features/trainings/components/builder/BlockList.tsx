'use client';

import { WorkoutBlock, BlockType } from './types';
import { Clock, Activity, Radio, ArrowUp, ArrowDown, Repeat, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { useState } from 'react';

interface BlockListProps {
    blocks: WorkoutBlock[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    onReorder: (from: number, to: number) => void;
    onRemove: (id: string) => void;
    onRemoveGroup: (groupId: string) => void;
    onRemoveMultiple: (ids: string[]) => void;
}

export function BlockList({ blocks, selectedId, onSelect, onReorder, onRemove, onRemoveGroup, onRemoveMultiple }: BlockListProps) {
    // Key is now "groupId-startIndex" to uniqueness per visual fragment
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    const toggleGroup = (groupKey: string) => {
        setExpandedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
    };

    const getBlockColor = (type: BlockType) => {
        switch (type) {
            case 'warmup': return 'bg-gray-100 dark:bg-gray-700/50 border-l-4 border-l-gray-400 dark:border-l-gray-500';
            case 'interval': return 'bg-brand-primary/10 dark:bg-brand-primary/20 border-l-4 border-l-brand-primary';
            case 'recovery': return 'bg-green-50 dark:bg-green-900/20 border-l-4 border-l-green-500';
            case 'cooldown': return 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-400 dark:border-l-blue-500';
            default: return 'bg-white dark:bg-gray-800';
        }
    };

    const getIcon = (type: BlockType) => {
        switch (type) {
            case 'warmup': return <Clock className="w-4 h-4 text-gray-500" />;
            case 'interval': return <Activity className="w-4 h-4 text-brand-primary" />;
            case 'recovery': return <Activity className="w-4 h-4 text-green-500" />;
            case 'cooldown': return <Radio className="w-4 h-4 text-blue-500" />;
        }
    };

    // Smart Reordering Logic
    const handleReorder = (index: number, direction: 'up' | 'down') => {
        const currentBlock = blocks[index];

        if (direction === 'up') {
            if (index === 0) return;
            const targetIndex = index - 1;
            const targetBlock = blocks[targetIndex];

            // If we are moving UP into a group we don't belong to
            if (targetBlock.group && targetBlock.group.id !== currentBlock.group?.id) {
                // Scan backwards to find start of this group
                let startOfGroup = targetIndex;
                while (startOfGroup > 0 && blocks[startOfGroup - 1].group?.id === targetBlock.group.id) {
                    startOfGroup--;
                }
                onReorder(index, startOfGroup);
            } else {
                onReorder(index, targetIndex);
            }

        } else {
            if (index === blocks.length - 1) return;
            const targetIndex = index + 1;
            const targetBlock = blocks[targetIndex];

            // If we are moving DOWN into a group we don't belong to
            if (targetBlock.group && targetBlock.group.id !== currentBlock.group?.id) {
                // Scan forwards to find end of this group
                let endOfGroup = targetIndex;
                while (endOfGroup < blocks.length - 1 && blocks[endOfGroup + 1].group?.id === targetBlock.group.id) {
                    endOfGroup++;
                }
                onReorder(index, endOfGroup);
            } else {
                onReorder(index, targetIndex);
            }
        }
    };

    // Helper to render a single block item
    const renderBlockItem = (block: WorkoutBlock, index: number) => (
        <div
            key={block.id}
            onClick={() => onSelect(block.id)}
            className={clsx(
                "p-3 rounded-md cursor-pointer transition-all mb-2 flex items-center justify-between group",
                selectedId === block.id ? "ring-2 ring-brand-primary shadow-md" : "hover:bg-gray-50 dark:hover:bg-gray-700/50 shadow-sm",
                getBlockColor(block.type)
            )}
        >
            <div className="flex items-center space-x-3">
                <div className="p-1.5 bg-white dark:bg-gray-800 rounded-full shadow-sm">
                    {getIcon(block.type)}
                </div>
                <div>
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">{block.type}</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {block.duration.type === 'distance'
                            ? `${block.duration.unit === 'km' ? block.duration.value / 1000 : block.duration.value} ${block.duration.unit || 'm'}`
                            : (() => {
                                const val = Number(block.duration.value);
                                const h = Math.floor(val / 3600);
                                const m = Math.floor((val % 3600) / 60);
                                const s = val % 60;
                                if (h > 0) return `${h}:${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
                                return `${m}:${s < 10 ? '0' + s : s}`;
                            })()
                        }
                    </p>
                    {block.target.type === 'heart_rate' && (block.target.min || block.target.max) && (
                        <p className="text-xs text-brand-primary dark:text-brand-primary-light font-medium">
                            {block.target.min ? `${block.target.min}%` : '0%'}
                            {block.target.max ? ` - ${block.target.max}%` : ''}
                            {' '}({Math.round(Number(block.target.min || 0) * 1.8)}-{Math.round(Number(block.target.max || 0) * 1.8)} bpm)
                        </p>
                    )}
                    {block.target.type === 'hr_zone' && block.target.min && (
                        <p className="text-xs text-brand-primary dark:text-brand-primary-light font-medium">
                            Zone {block.target.min}
                        </p>
                    )}
                    {block.target.type === 'pace' && (block.target.min || block.target.max) && (
                        <p className="text-xs text-brand-primary dark:text-brand-primary-light font-medium">
                            {block.target.min} - {block.target.max} min/km
                        </p>
                    )}
                    {block.notes && <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px]">{block.notes}</p>}
                </div>
            </div>

            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex flex-col mr-2">
                    {index > 0 && <button onClick={(e) => { e.stopPropagation(); handleReorder(index, 'up'); }}><ArrowUp className="w-4 h-4 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300" /></button>}
                    {index < blocks.length - 1 && <button onClick={(e) => { e.stopPropagation(); handleReorder(index, 'down'); }}><ArrowDown className="w-4 h-4 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300" /></button>}
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); onRemove(block.id); }}
                    className="p-1.5 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    title="Remove Block"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );

    // Grouping Logic
    const renderContent = () => {
        if (blocks.length === 0) {
            return (
                <div className="text-center py-10 text-gray-400 dark:text-gray-500 text-sm">
                    No blocks added yet.
                </div>
            );
        }

        const renderedItems = [];
        let i = 0;

        while (i < blocks.length) {
            const block = blocks[i];

            if (block.group) {
                const groupId = block.group.id;
                const groupBlocks: { block: WorkoutBlock; index: number }[] = [];
                const startIndex = i; // Tracking start index for unique composite key

                // Collect all consecutive blocks in this group
                let j = i;
                while (j < blocks.length && blocks[j].group?.id === groupId) {
                    groupBlocks.push({ block: blocks[j], index: j });
                    j++;
                }

                // Unique Key for this visual fragment
                const groupKey = `${groupId}-${startIndex}`;
                const isExpanded = expandedGroups[groupKey];

                renderedItems.push(
                    <div key={groupKey} className="mb-2 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden transition-all group">
                        <div
                            onClick={() => toggleGroup(groupKey)}
                            className="bg-gray-50 dark:bg-gray-800 p-3 flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                        >
                            <div className="flex items-center space-x-2">
                                <Repeat className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                                <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                    Set: {block.group.reps} Reps
                                </span>
                                <span className="text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900 px-2 py-0.5 rounded-full shadow-sm border border-gray-100 dark:border-gray-700">
                                    {groupBlocks.length} blocks
                                </span>
                            </div>

                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        // Only remove blocks in this fragment
                                        const idsToRemove = groupBlocks.map(b => b.block.id);
                                        onRemoveMultiple(idsToRemove);
                                    }}
                                    className="p-1.5 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Remove Set Fragment"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />}
                            </div>
                        </div>

                        {isExpanded && (
                            <div className="bg-white dark:bg-gray-900 p-2 pl-4 border-t border-gray-200 dark:border-gray-700">
                                {groupBlocks.map(({ block, index }) => renderBlockItem(block, index))}
                            </div>
                        )}
                    </div>
                );

                i = j; // Skip past the grouped blocks
            } else {
                renderedItems.push(renderBlockItem(block, i));
                i++;
            }
        }

        return renderedItems;
    };

    return (
        <div>
            {renderContent()}
        </div>
    );
}
