'use client';

import { WorkoutBlock, BlockType } from './types';
import { GripVertical, Trash2, Plus, ChevronDown, ChevronRight, X } from 'lucide-react';
import { clsx } from 'clsx';
import { useState, useEffect } from 'react';

interface BlockListProps {
    blocks: WorkoutBlock[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    onReorder: (from: number, to: number) => void;
    onRemove: (id: string) => void;
    onRemoveGroup: (groupId: string) => void;
    onRemoveMultiple: (ids: string[]) => void;
    onAddStepToGroup?: (groupId: string) => void;
    onUpdateGroupReps?: (groupId: string, newReps: number) => void;
    athleteVAM?: string | null; // VAM for pace calculation
}

export function BlockList({
    blocks,
    selectedId,
    onSelect,
    onReorder,
    onRemove,
    onRemoveGroup,
    onRemoveMultiple,
    onAddStepToGroup,
    onUpdateGroupReps,
    athleteVAM
}: BlockListProps) {
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    // Debug: Log when athleteVAM changes
    useEffect(() => {
        console.log('BlockList: athleteVAM updated:', athleteVAM);
    }, [athleteVAM]);

    const toggleGroup = (groupKey: string) => {
        setExpandedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
    };

    const getDisplayName = (block: WorkoutBlock) => {
        return block.stepName || block.type.charAt(0).toUpperCase() + block.type.slice(1);
    };

    const getTypeTag = (type: BlockType) => {
        const tags = {
            warmup: 'warmup',
            interval: 'work',
            recovery: 'rest',
            cooldown: 'cooldown'
        };
        return tags[type];
    };

    const getTagColor = (type: BlockType) => {
        const colors = {
            warmup: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
            interval: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
            recovery: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
            cooldown: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
        };
        return colors[type];
    };

    const formatDuration = (block: WorkoutBlock) => {
        if (block.duration.type === 'distance') {
            const value = block.duration.unit === 'km' ? block.duration.value / 1000 : block.duration.value;
            const unit = block.duration.unit || 'm';
            return `${value} ${unit}`;
        } else {
            const val = Number(block.duration.value);
            const m = Math.floor(val / 60);
            const s = val % 60;
            return `${m} min`;
        }
    };

    const formatTarget = (block: WorkoutBlock) => {
        if (block.target.type === 'pace' && (block.target.min || block.target.max)) {
            return `${block.target.min}-${block.target.max} min/km`;
        }
        if (block.target.type === 'heart_rate' && (block.target.min || block.target.max)) {
            return `${block.target.min}-${block.target.max} bpm`;
        }
        if (block.target.type === 'hr_zone' && block.target.min) {
            const zoneLabels: Record<string, string> = {
                '1': 'Zone 1 (Recovery)',
                '2': 'Zone 2 (Endurance)',
                '3': 'Zone 3 (Tempo)',
                '4': 'Zone 4 (Threshold)',
                '5': 'Zone 5 (VO2 Max)'
            };
            return zoneLabels[block.target.min] || `Zone ${block.target.min}`;
        }
        if (block.target.type === 'vam_zone' && block.target.min) {
            const vamZoneLabels: Record<string, string> = {
                '1': 'Z1 Regenerativo',
                '2': 'Z2 Endurance',
                '3': 'Z3 Tempo',
                '4': 'Z4 Umbral Anaeróbico',
                '5': 'Z5 VO2 Max',
                '6': 'Z6 Potencia Anaeróbica'
            };
            const zoneName = vamZoneLabels[block.target.min] || `Z${block.target.min}`;

            console.log('BlockList formatTarget: VAM zone detected', {
                zoneNumber: block.target.min,
                athleteVAM,
                hasVAM: !!athleteVAM
            });

            // If athleteVAM is available, calculate and show pace
            if (athleteVAM) {
                const pace = calculatePaceFromVAM(athleteVAM, String(block.target.min));
                console.log('BlockList formatTarget: Calculated pace:', pace);
                return `${zoneName} (${pace})`;
            }

            console.log('BlockList formatTarget: No VAM, returning zone name only');
            return zoneName;
        }
        if (block.target.type === 'power' && (block.target.min || block.target.max)) {
            return `${block.target.min}-${block.target.max}W`;
        }
        return null;
    };

    // Calculate pace from VAM and zone
    const calculatePaceFromVAM = (vam: string, zoneNumber: string): string => {
        const vamZones = [
            { min: 0.0, max: 0.70 },
            { min: 0.70, max: 0.85 },
            { min: 0.85, max: 0.92 },
            { min: 0.92, max: 0.97 },
            { min: 0.97, max: 1.03 },
            { min: 1.03, max: 1.20 }
        ];

        const zone = vamZones[parseInt(zoneNumber) - 1];
        if (!zone) return '-';

        const vamValue = parseFloat(vam);
        if (isNaN(vamValue) || vamValue <= 0) return '-';

        // Calculate pace range (min/km)
        const minPaceSeconds = 1000 / (vamValue * zone.max);
        const maxPaceSeconds = 1000 / (vamValue * zone.min);

        const formatPace = (seconds: number) => {
            const mins = Math.floor(seconds / 60);
            const secs = Math.round(seconds % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        };

        return `${formatPace(minPaceSeconds)} - ${formatPace(maxPaceSeconds)} min/km`;
    };

    // Render a single block item
    const renderBlockItem = (block: WorkoutBlock, index: number) => (
        <div
            key={block.id}
            onClick={() => onSelect(block.id)}
            className={clsx(
                "p-3 rounded-md cursor-pointer transition-all mb-2 border-l-4 group",
                selectedId === block.id
                    ? "bg-blue-50 dark:bg-blue-900/20 border-l-blue-500 shadow-md"
                    : "bg-white dark:bg-gray-800 border-l-gray-300 dark:border-l-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 shadow-sm"
            )}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />

                    <div className="flex-1 min-w-0">
                        {/* Step name with tag */}
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                                {getDisplayName(block)}
                            </span>
                            <span className={clsx(
                                "text-xs px-2 py-0.5 rounded-full font-medium",
                                getTagColor(block.type)
                            )}>
                                {getTypeTag(block.type)}
                            </span>
                        </div>

                        {/* Info line: duration, target, intensity */}
                        <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                            <span className="font-medium">{formatDuration(block)}</span>
                            {formatTarget(block) && (
                                <>
                                    <span>•</span>
                                    <span>{formatTarget(block)}</span>
                                </>
                            )}
                            {block.intensity !== undefined && (
                                <>
                                    <span>•</span>
                                    <span className="text-brand-primary dark:text-brand-primary-light font-medium">
                                        {block.intensity}%
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <button
                    onClick={(e) => { e.stopPropagation(); onRemove(block.id); }}
                    className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    title="Remove Step"
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
                    No steps added yet.
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
                const startIndex = i;

                // Collect all consecutive blocks in this group
                let j = i;
                while (j < blocks.length && blocks[j].group?.id === groupId) {
                    groupBlocks.push({ block: blocks[j], index: j });
                    j++;
                }

                const groupKey = `${groupId}-${startIndex}`;
                const isExpanded = expandedGroups[groupKey] ?? true; // Default expanded

                renderedItems.push(
                    <div key={groupKey} className="mb-3 border border-purple-200 dark:border-purple-800 rounded-lg overflow-hidden bg-purple-50/50 dark:bg-purple-900/10">
                        <div
                            onClick={() => toggleGroup(groupKey)}
                            className="bg-purple-100 dark:bg-purple-900/30 p-3 flex items-center justify-between cursor-pointer hover:bg-purple-200 dark:hover:bg-purple-900/40 transition group"
                        >
                            <div className="flex items-center space-x-3">
                                {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                ) : (
                                    <ChevronRight className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                )}
                                <span className="text-sm font-bold text-purple-900 dark:text-purple-200">
                                    Repeats
                                </span>
                                {onUpdateGroupReps ? (
                                    <input
                                        type="number"
                                        min="1"
                                        max="50"
                                        value={block.group.reps}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            const newReps = Number(e.target.value);
                                            if (newReps > 0) {
                                                onUpdateGroupReps(groupId, newReps);
                                            }
                                        }}
                                        className="w-12 bg-purple-200 dark:bg-purple-800 text-purple-900 dark:text-purple-100 px-2 py-0.5 rounded-full text-xs font-semibold text-center border-none focus:ring-2 focus:ring-purple-500"
                                    />
                                ) : (
                                    <span className="bg-purple-200 dark:bg-purple-800 text-purple-900 dark:text-purple-100 px-2 py-0.5 rounded-full text-xs font-semibold">
                                        {block.group.reps}×
                                    </span>
                                )}
                                <span className="text-xs text-purple-700 dark:text-purple-300">
                                    times
                                </span>
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const idsToRemove = groupBlocks.map(b => b.block.id);
                                    onRemoveMultiple(idsToRemove);
                                }}
                                className="p-1.5 text-purple-500 hover:text-red-500 dark:text-purple-400 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Remove Repeat Block"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {isExpanded && (
                            <div className="p-3 pt-2 bg-white dark:bg-gray-900">
                                {groupBlocks.map(({ block, index }) => renderBlockItem(block, index))}

                                {/* Add Step to Block button */}
                                {onAddStepToGroup && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onAddStepToGroup(groupId);
                                        }}
                                        className="w-full mt-2 py-2 border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-md text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition flex items-center justify-center gap-2 text-sm font-medium"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Step to Block
                                    </button>
                                )}
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
