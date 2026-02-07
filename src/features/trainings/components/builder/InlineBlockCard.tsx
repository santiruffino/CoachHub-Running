'use client';

import { WorkoutBlock, DurationType, TargetType, BlockType } from './types';
import { GripVertical, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import { calculateTargetPace, VAM_DEFAULT, VAM_ZONES } from '@/features/profiles/constants/vam';

interface InlineBlockCardProps {
    block: WorkoutBlock;
    onUpdate: (id: string, updates: Partial<WorkoutBlock>) => void;
    onRemove: (id: string) => void;
    onSelect?: (id: string) => void;
    isSelected?: boolean;
    indented?: boolean;
    athleteId?: string;
    readOnly?: boolean;
    dragHandleProps?: any;
}

// Color coding based on block type
const BLOCK_COLORS: Record<BlockType, string> = {
    warmup: '#22C55E',    // Green
    interval: '#3B82F6',  // Blue  
    recovery: '#F97316',  // Orange
    cooldown: '#06B6D4',  // Cyan
};

const BLOCK_LABELS: Record<BlockType, string> = {
    warmup: 'WARM UP',
    interval: 'WORK',
    recovery: 'RECOVERY',
    cooldown: 'COOL DOWN',
};

// Helper functions
const secondsToHms = (d: number) => {
    d = Number(d);
    const h = Math.floor(d / 3600);
    const m = Math.floor(d % 3600 / 60);
    const s = Math.floor(d % 3600 % 60);
    if (h > 0) return `${h}:${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
    return `${m}:${s < 10 ? "0" + s : s}`;
};

const hmsToSeconds = (str: string) => {
    const parts = str.split(':').map(Number);
    if (parts.some(isNaN)) return 0;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 1) return parts[0];
    return 0;
};

export function InlineBlockCard({
    block,
    onUpdate,
    onRemove,
    onSelect,
    isSelected = false,
    indented = false,
    athleteId,
    readOnly = false,
    dragHandleProps
}: InlineBlockCardProps) {
    const [expanded, setExpanded] = useState(false);
    const [timeString, setTimeString] = useState(
        block.duration.type === 'time' ? secondsToHms(block.duration.value) : ''
    );
    const [athleteVAM, setAthleteVAM] = useState<string | null>(null);

    // Fetch athlete VAM when athleteId is provided
    useEffect(() => {
        const fetchAthleteVAM = async () => {
            if (!athleteId) {
                setAthleteVAM(null);
                return;
            }
            try {
                const response = await fetch(`/api/v2/users/${athleteId}/details`);
                if (response.ok) {
                    const data = await response.json();
                    setAthleteVAM(data.athleteProfile?.vam || null);
                }
            } catch (error) {
                setAthleteVAM(null);
            }
        };
        fetchAthleteVAM();
    }, [athleteId]);

    useEffect(() => {
        if (block.duration.type === 'time') {
            setTimeString(secondsToHms(block.duration.value));
        }
    }, [block.duration.value, block.duration.type]);

    const getDistanceDisplayValue = () => {
        if (block.duration.unit === 'km') {
            return (block.duration.value / 1000).toFixed(2);
        }
        return block.duration.value;
    };

    const getDurationDisplay = () => {
        if (block.duration.type === 'time') {
            return secondsToHms(block.duration.value);
        }
        const value = block.duration.unit === 'km'
            ? (block.duration.value / 1000).toFixed(2)
            : block.duration.value;
        const unit = block.duration.unit === 'km' ? 'KM' : 'M';
        return `${value} ${unit}`;
    };

    const getTargetDisplay = () => {
        switch (block.target.type) {
            case 'pace':
                return `PACE ${block.target.min || '-'} - ${block.target.max || '-'}`;
            case 'heart_rate':
                return `HR ${block.target.min || '-'} - ${block.target.max || '-'} bpm`;
            case 'hr_zone':
                return `HR Z${block.target.min || '2'}`;
            case 'vam_zone': {
                const zoneNumber = String(block.target.min || '2');
                const zone = VAM_ZONES.find(z => String(z.zone) === zoneNumber);
                if (!zone) return 'VAM Z-';

                const vamToUse = athleteVAM || VAM_DEFAULT;
                const minPace = calculateTargetPace(vamToUse, zone.max);
                const maxPace = calculateTargetPace(vamToUse, zone.min);

                return `VAM Z${zoneNumber} (${minPace}-${maxPace})`;
            }
            case 'power':
                return `${block.target.min || '-'} W`;
            default:
                return '-';
        }
    };

    const handleDurationChange = (inputValue: string) => {
        if (block.duration.type === 'time') {
            setTimeString(inputValue);
            const secs = hmsToSeconds(inputValue);
            onUpdate(block.id, {
                duration: { ...block.duration, value: secs }
            });
        } else {
            const num = Number(inputValue);
            const valueInMeters = block.duration.unit === 'km' ? num * 1000 : num;
            onUpdate(block.id, {
                duration: { ...block.duration, value: valueInMeters }
            });
        }
    };

    return (
        <div
            className={`relative flex bg-white dark:bg-gray-800 rounded-lg border transition-all duration-200 ${isSelected
                ? 'border-brand-primary shadow-md scale-[1.01]'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm'
                } ${indented ? 'ml-8' : ''}`}
            onClick={() => onSelect?.(block.id)}
        >
            {/* Colored vertical bar */}
            <div
                className="w-1.5 rounded-l-lg"
                style={{ backgroundColor: BLOCK_COLORS[block.type] }}
            />

            <div className="flex-1 p-3">
                {/* Header - Always visible */}
                <div className="flex items-center gap-2">
                    {/* Drag handle */}
                    {!readOnly && dragHandleProps && (
                        <button
                            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            {...dragHandleProps}
                        >
                            <GripVertical className="w-4 h-4" />
                        </button>
                    )}

                    {/* Type label */}
                    <span
                        className="text-xs font-bold px-2 py-0.5 rounded"
                        style={{
                            backgroundColor: BLOCK_COLORS[block.type] + '20',
                            color: BLOCK_COLORS[block.type]
                        }}
                    >
                        {BLOCK_LABELS[block.type]}
                    </span>

                    {/* Step name */}
                    <span className="flex-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {block.stepName || BLOCK_LABELS[block.type]}
                    </span>

                    {/* Expand/Collapse toggle */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setExpanded(!expanded);
                        }}
                        className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1"
                    >
                        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {/* Delete button */}
                    {!readOnly && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemove(block.id);
                            }}
                            className="text-gray-400 hover:text-red-500 p-1"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Compact metrics display */}
                <div className="mt-2 flex flex-wrap gap-3 text-xs">
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300 font-medium">
                        {getDurationDisplay()}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300">
                        {getTargetDisplay()}
                    </span>
                    {block.intensity !== undefined && (
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300">
                            RPE {Math.round(block.intensity / 10)}
                        </span>
                    )}
                </div>

                {/* Expanded editor */}
                {expanded && !readOnly && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                        {/* Step Name */}
                        <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                Step Name
                            </label>
                            <input
                                type="text"
                                value={block.stepName || ''}
                                onChange={(e) => {
                                    e.stopPropagation();
                                    onUpdate(block.id, { stepName: e.target.value });
                                }}
                                onClick={(e) => e.stopPropagation()}
                                placeholder={BLOCK_LABELS[block.type]}
                                className="w-full text-sm px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                            />
                        </div>

                        {/* Type */}
                        <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                Type
                            </label>
                            <select
                                value={block.type}
                                onChange={(e) => {
                                    e.stopPropagation();
                                    onUpdate(block.id, { type: e.target.value as BlockType });
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full text-sm px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                            >
                                <option value="warmup">Warm Up</option>
                                <option value="interval">Interval</option>
                                <option value="recovery">Recovery</option>
                                <option value="cooldown">Cool Down</option>
                            </select>
                        </div>

                        {/* Duration */}
                        <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                Duration
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="text"
                                    value={block.duration.type === 'time' ? timeString : getDistanceDisplayValue()}
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        handleDurationChange(e.target.value);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    placeholder={block.duration.type === 'time' ? "min:sec" : "0"}
                                    className="w-full text-sm px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                                />
                                <select
                                    value={block.duration.type === 'distance' ? (block.duration.unit || 'm') : block.duration.type}
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        const value = e.target.value;
                                        if (value === 'time') {
                                            onUpdate(block.id, { duration: { type: 'time', value: 300 } });
                                            setTimeString(secondsToHms(300));
                                        } else {
                                            if (block.duration.type !== 'distance') {
                                                onUpdate(block.id, { duration: { type: 'distance', value: 1000, unit: value as 'm' | 'km' } });
                                            } else {
                                                onUpdate(block.id, { duration: { ...block.duration, unit: value as 'm' | 'km' } });
                                            }
                                        }
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full text-sm px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                                >
                                    <option value="m">Meters</option>
                                    <option value="km">Kilometers</option>
                                    <option value="time">Time</option>
                                </select>
                            </div>
                        </div>

                        {/* Intensity */}
                        <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                Intensity (%)
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={block.intensity || 50}
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        onUpdate(block.id, { intensity: Number(e.target.value) });
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-brand-primary"
                                />
                                <span className="text-sm font-semibold text-gray-900 dark:text-white w-12 text-right">
                                    {block.intensity || 50}%
                                </span>
                            </div>
                        </div>

                        {/* Target Type */}
                        <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                Target
                            </label>
                            <select
                                value={block.target.type}
                                onChange={(e) => {
                                    e.stopPropagation();
                                    onUpdate(block.id, { target: { type: e.target.value as TargetType, min: '', max: '' } });
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full text-sm px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white mb-2"
                            >
                                <option value="pace">Pace (min/km)</option>
                                <option value="heart_rate">Heart Rate</option>
                                <option value="hr_zone">HR Zone</option>
                                <option value="vam_zone">VAM Zone</option>
                                <option value="power">Power</option>
                            </select>

                            {/* Pace inputs */}
                            {block.target.type === 'pace' && (
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="text"
                                        placeholder="5:00"
                                        value={block.target.min}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            onUpdate(block.id, { target: { ...block.target, min: e.target.value } });
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-full text-sm px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                                    />
                                    <input
                                        type="text"
                                        placeholder="5:30"
                                        value={block.target.max}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            onUpdate(block.id, { target: { ...block.target, max: e.target.value } });
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-full text-sm px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                                    />
                                </div>
                            )}

                            {/* VAM Zone */}
                            {block.target.type === 'vam_zone' && (
                                <select
                                    value={block.target.min || '2'}
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        onUpdate(block.id, { target: { ...block.target, min: e.target.value, max: e.target.value } });
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full text-sm px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                                >
                                    {VAM_ZONES.map(z => (
                                        <option key={z.zone} value={z.zone}>
                                            Z{z.zone} - {z.name} ({z.min}-{z.max}% VAM)
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                Notes
                            </label>
                            <textarea
                                rows={2}
                                value={block.notes || ''}
                                onChange={(e) => {
                                    e.stopPropagation();
                                    onUpdate(block.id, { notes: e.target.value });
                                }}
                                onClick={(e) => e.stopPropagation()}
                                placeholder="Add instructions..."
                                className="w-full text-sm px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white resize-none"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
