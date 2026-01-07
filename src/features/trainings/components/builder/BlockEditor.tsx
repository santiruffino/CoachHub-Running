'use client';

import { WorkoutBlock, DurationType, TargetType, BlockType } from './types';
import { Trash2, HelpCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

interface BlockEditorProps {
    block: WorkoutBlock;
    onUpdate: (id: string, updates: Partial<WorkoutBlock>) => void;
    onRemove: (id: string) => void;
}

// Helper for HH:MM:SS
const secondsToHms = (d: number) => {
    d = Number(d);
    const h = Math.floor(d / 3600);
    const m = Math.floor(d % 3600 / 60);
    const s = Math.floor(d % 3600 % 60);

    const hDisplay = h > 0 ? h + (":" + (m < 10 ? "0" : "")) : "";
    const mDisplay = m + (":" + (s < 10 ? "0" : ""));
    const sDisplay = s < 10 ? "0" + s : s;

    // If we have hours, return h:mm:ss, else m:ss to avoid confusion
    if (h > 0) return `${hDisplay}${m}:${s < 10 ? "0" + s : s}`;
    return `${m}:${s < 10 ? "0" + s : s}`;
};

// Simple parser: supports h:m:s, m:s, s
const hmsToSeconds = (str: string) => {
    const parts = str.split(':').map(Number);
    if (parts.some(isNaN)) return 0;

    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 1) return parts[0];
    return 0;
};

export function BlockEditor({ block, onUpdate, onRemove }: BlockEditorProps) {
    // Local state for time string to allow editing "1:30" comfortably
    const [timeString, setTimeString] = useState(
        block.duration.type === 'time' ? secondsToHms(block.duration.value) : ''
    );

    // Sync local state when block changes externally (e.g. initial load or type switch)
    useEffect(() => {
        if (block.duration.type === 'time') {
            setTimeString(secondsToHms(block.duration.value));
        }
    }, [block.duration.value, block.duration.type]);

    const handleTypeChange = (value: BlockType) => {
        onUpdate(block.id, { type: value });
    };

    // Duration Logic
    const handleDurationChange = (inputValue: string) => {
        if (block.duration.type === 'time') {
            setTimeString(inputValue);
            // Parse immediately for store, or use onBlur? for now, parse on change
            const secs = hmsToSeconds(inputValue);
            onUpdate(block.id, {
                duration: { ...block.duration, value: secs }
            });
        } else {
            // Distance
            const num = Number(inputValue);
            const valueInMeters = block.duration.unit === 'km' ? num * 1000 : num;
            onUpdate(block.id, {
                duration: { ...block.duration, value: valueInMeters }
            });
        }
    };

    const handleDurationTypeChange = (value: DurationType) => {
        // Reset defaults when switching types to avoid confusion (e.g. 1000m -> 1000s)
        const defaultValue = value === 'distance' ? 1000 : 300; // 1km or 5min
        onUpdate(block.id, {
            duration: { type: value, value: defaultValue, unit: value === 'distance' ? 'm' : undefined }
        });
        if (value === 'time') setTimeString(secondsToHms(300));
    };

    const toggleDistanceUnit = (unit: 'm' | 'km') => {
        onUpdate(block.id, {
            duration: { ...block.duration, unit }
        });
    };

    // Target Logic
    const handleTargetTypeChange = (value: TargetType) => {
        onUpdate(block.id, {
            target: { ...block.target, type: value, min: '', max: '' }
        });
    };

    // Render Helpers
    const getDistanceDisplayValue = () => {
        if (block.duration.unit === 'km') {
            return block.duration.value / 1000;
        }
        return block.duration.value;
    };

    const getTargetBpmRange = () => {
        if (block.target.type !== 'heart_rate') return null;
        const min = Number(block.target.min);
        const max = Number(block.target.max);
        if (!min && !max) return null;

        // Mock Max HR: 180
        const calc = (pct: number) => Math.round((pct / 100) * 180);

        const minBpm = min ? calc(min) : '?';
        const maxBpm = max ? calc(max) : '?';
        return `${minBpm} - ${maxBpm} bpm`;
    };

    // Karvonen Logic
    const [localMaxHr, setLocalMaxHr] = useState(180);
    const [localRestHr, setLocalRestHr] = useState(60);

    const calculateKarvonenRange = (zone: number) => {
        if (!zone) return null;
        const zones = {
            1: [0.5, 0.6],
            2: [0.6, 0.7],
            3: [0.7, 0.8],
            4: [0.8, 0.9],
            5: [0.9, 1.0],
        };

        const range = zones[zone as keyof typeof zones];
        if (!range) return null;

        const hrr = localMaxHr - localRestHr;
        const minBpm = Math.round((hrr * range[0]) + localRestHr);
        const maxBpm = Math.round((hrr * range[1]) + localRestHr);

        return `${minBpm} - ${maxBpm} bpm (Z${zone})`;
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div className="flex-1 mr-4">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                        Block Type
                    </label>
                    <select
                        value={block.type}
                        onChange={(e) => handleTypeChange(e.target.value as BlockType)}
                        className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm p-2 border font-medium bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                        <option value="warmup">Warm Up</option>
                        <option value="interval">Interval</option>
                        <option value="recovery">Recovery</option>
                        <option value="cooldown">Cool Down</option>
                    </select>
                </div>
                <button
                    onClick={() => onRemove(block.id)}
                    className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors p-2 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30"
                >
                    <Trash2 className="w-5 h-5" />
                </button>
            </div>

            <div className="space-y-4">
                {/* Duration Section */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Duration
                    </label>
                    <div className="flex space-x-2">
                        <select
                            value={block.duration.type}
                            onChange={(e) => handleDurationTypeChange(e.target.value as DurationType)}
                            className="block w-1/3 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm p-2 border text-gray-900 dark:text-white dark:bg-gray-700"
                        >
                            <option value="distance">Distance</option>
                            <option value="time">Time</option>
                        </select>

                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={block.duration.type === 'time' ? timeString : getDistanceDisplayValue()}
                                onChange={(e) => handleDurationChange(e.target.value)}
                                placeholder={block.duration.type === 'time' ? "min:sec" : "0"}
                                className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm p-2 border pr-12 text-gray-900 dark:text-white dark:bg-gray-700 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                            />

                            {block.duration.type === 'distance' && (
                                <div className="absolute inset-y-0 right-0 flex items-center">
                                    <select
                                        value={block.duration.unit || 'm'}
                                        onChange={(e) => toggleDistanceUnit(e.target.value as 'm' | 'km')}
                                        className="h-full py-0 pl-2 pr-7 border-transparent bg-transparent text-gray-600 dark:text-gray-400 sm:text-sm rounded-md focus:ring-brand-primary focus:border-brand-primary"
                                    >
                                        <option value="m">m</option>
                                        <option value="km">km</option>
                                    </select>
                                </div>
                            )}

                            {block.duration.type === 'time' && (
                                <span className="absolute inset-y-0 right-3 flex items-center text-gray-500 dark:text-gray-400 text-xs pointer-events-none">
                                    hh:mm:ss
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Target Section */}
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Intensity Target
                        </label>
                        {block.target.type === 'heart_rate' && (
                            <span className="text-xs text-brand-primary font-medium">
                                {getTargetBpmRange()}
                            </span>
                        )}
                        {block.target.type === 'hr_zone' && (
                            <span className="text-xs text-brand-primary font-medium">
                                {calculateKarvonenRange(Number(block.target.min || 0))}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-col space-y-2">
                        <select
                            value={block.target.type}
                            onChange={(e) => handleTargetTypeChange(e.target.value as TargetType)}
                            className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm p-2 border text-gray-900 dark:text-white dark:bg-gray-700"
                        >
                            <option value="pace">Pace (min/km)</option>
                            <option value="heart_rate">Heart Rate % (Max 180)</option>
                            <option value="hr_zone">Heart Rate Zone (Karvonen)</option>
                        </select>

                        {block.target.type === 'pace' && (
                            <div className="flex space-x-2 items-center">
                                <input
                                    type="text"
                                    placeholder="Min"
                                    value={block.target.min}
                                    onChange={(e) => onUpdate(block.id, { target: { ...block.target, min: e.target.value } })}
                                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm p-2 border text-gray-900 dark:text-white dark:bg-gray-700 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                                />
                                <span className="text-gray-500 dark:text-gray-400">-</span>
                                <input
                                    type="text"
                                    placeholder="Max"
                                    value={block.target.max}
                                    onChange={(e) => onUpdate(block.id, { target: { ...block.target, max: e.target.value } })}
                                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm p-2 border text-gray-900 dark:text-white dark:bg-gray-700 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                                />
                            </div>
                        )}

                        {block.target.type === 'heart_rate' && (
                            <div className="flex space-x-2 items-center">
                                <input
                                    type="number"
                                    placeholder="% Min"
                                    value={block.target.min}
                                    onChange={(e) => onUpdate(block.id, { target: { ...block.target, min: e.target.value } })}
                                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm p-2 border text-gray-900 dark:text-white dark:bg-gray-700 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                                />
                                <span className="text-gray-500 dark:text-gray-400">-</span>
                                <input
                                    type="number"
                                    placeholder="% Max"
                                    value={block.target.max}
                                    onChange={(e) => onUpdate(block.id, { target: { ...block.target, max: e.target.value } })}
                                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm p-2 border text-gray-900 dark:text-white dark:bg-gray-700 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                                />
                            </div>
                        )}

                        {block.target.type === 'hr_zone' && (
                            <div className="space-y-2">
                                <select
                                    value={block.target.min}
                                    onChange={(e) => onUpdate(block.id, { target: { ...block.target, min: e.target.value } })}
                                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm p-2 border text-gray-900 dark:text-white dark:bg-gray-700"
                                >
                                    <option value="">Select Zone</option>
                                    <option value="1">Zone 1 (50-60%)</option>
                                    <option value="2">Zone 2 (60-70%)</option>
                                    <option value="3">Zone 3 (70-80%)</option>
                                    <option value="4">Zone 4 (80-90%)</option>
                                    <option value="5">Zone 5 (90-100%)</option>
                                </select>
                                <div className="flex space-x-2">
                                    <div className="flex-1">
                                        <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold">Max HR</label>
                                        <input
                                            type="number"
                                            value={localMaxHr}
                                            onChange={(e) => setLocalMaxHr(Number(e.target.value))}
                                            className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm p-1.5 border text-gray-900 dark:text-white dark:bg-gray-700"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold">Rest HR</label>
                                        <input
                                            type="number"
                                            value={localRestHr}
                                            onChange={(e) => setLocalRestHr(Number(e.target.value))}
                                            className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm p-1.5 border text-gray-900 dark:text-white dark:bg-gray-700"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Notes Section */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Notes <span className="text-gray-500 dark:text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <textarea
                        rows={2}
                        value={block.notes || ''}
                        onChange={(e) => onUpdate(block.id, { notes: e.target.value })}
                        className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm p-2 border text-gray-900 dark:text-white dark:bg-gray-700 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        placeholder="e.g. Keep steady pace"
                    />
                </div>
            </div>
        </div>
    );
}
