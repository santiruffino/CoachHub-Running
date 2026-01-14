'use client';

import { WorkoutBlock, DurationType, TargetType, BlockType } from './types';
import { Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';

interface BlockEditorProps {
    block: WorkoutBlock;
    onUpdate: (id: string, updates: Partial<WorkoutBlock>) => void;
    onRemove: (id: string) => void;
    athleteId?: string; // Optional athlete ID for VAM-based pace calculation
}

// Helper for HH:MM:SS
const secondsToHms = (d: number) => {
    d = Number(d);
    const h = Math.floor(d / 3600);
    const m = Math.floor(d % 3600 / 60);
    const s = Math.floor(d % 3600 % 60);

    if (h > 0) return `${h}:${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
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

export function BlockEditor({ block, onUpdate, onRemove, athleteId }: BlockEditorProps) {
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
                    console.log(data.athleteProfile)
                    setAthleteVAM(data.athleteProfile?.vam || null);
                }
            } catch (error) {
                console.error('Failed to fetch athlete VAM:', error);
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

    const handleTypeChange = (value: BlockType) => {
        onUpdate(block.id, { type: value });
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

    const handleDurationTypeChange = (value: DurationType) => {
        const defaultValue = value === 'distance' ? 1000 : 300;
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

    const handleTargetTypeChange = (value: TargetType) => {
        onUpdate(block.id, {
            target: { ...block.target, type: value, min: '', max: '' }
        });
    };

    const getDistanceDisplayValue = () => {
        if (block.duration.unit === 'km') {
            return block.duration.value / 1000;
        }
        return block.duration.value;
    };

    const getIntensityColor = () => {
        const intensity = block.intensity || 0;
        if (intensity >= 80) return 'from-orange-500 to-red-500';
        if (intensity >= 60) return 'from-yellow-500 to-orange-500';
        if (intensity >= 40) return 'from-green-400 to-yellow-500';
        return 'from-green-400 to-green-500';
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
        // Pace = 1000 / (VAM * zone_percentage)
        const minPaceSeconds = 1000 / (vamValue * zone.max);
        const maxPaceSeconds = 1000 / (vamValue * zone.min);

        const formatPace = (seconds: number) => {
            const mins = Math.floor(seconds / 60);
            const secs = Math.round(seconds % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        };

        return `${formatPace(minPaceSeconds)} - ${formatPace(maxPaceSeconds)}`;
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 shadow-sm h-full overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Step Details</h3>
                <button
                    onClick={() => onRemove(block.id)}
                    className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors p-2 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30"
                    title="Remove Step"
                >
                    <Trash2 className="w-5 h-5" />
                </button>
            </div>

            <div className="space-y-4">
                {/* Step Name */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Step Name
                    </label>
                    <input
                        type="text"
                        value={block.stepName || ''}
                        onChange={(e) => onUpdate(block.id, { stepName: e.target.value })}
                        placeholder={block.type.charAt(0).toUpperCase() + block.type.slice(1)}
                        className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary text-sm p-2.5 border bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    />
                </div>

                {/* Type */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Type
                    </label>
                    <select
                        value={block.type}
                        onChange={(e) => handleTypeChange(e.target.value as BlockType)}
                        className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary text-sm p-2.5 border font-medium bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                        <option value="warmup">Warm Up</option>
                        <option value="interval">Interval</option>
                        <option value="recovery">Recovery</option>
                        <option value="cooldown">Cool Down</option>
                    </select>
                </div>

                {/* Duration */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Duration
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <input
                            type="text"
                            value={block.duration.type === 'time' ? timeString : getDistanceDisplayValue()}
                            onChange={(e) => handleDurationChange(e.target.value)}
                            placeholder={block.duration.type === 'time' ? "min:sec" : "0"}
                            className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary text-sm p-2.5 border text-gray-900 dark:text-white dark:bg-gray-700 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        />

                        <select
                            value={block.duration.type === 'distance' ? (block.duration.unit || 'm') : block.duration.type}
                            onChange={(e) => {
                                const value = e.target.value;
                                if (value === 'time') {
                                    handleDurationTypeChange('time');
                                } else {
                                    if (block.duration.type !== 'distance') {
                                        handleDurationTypeChange('distance');
                                    }
                                    toggleDistanceUnit(value as 'm' | 'km');
                                }
                            }}
                            className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary text-sm p-2.5 border text-gray-900 dark:text-white dark:bg-gray-700"
                        >
                            <option value="m">Meters</option>
                            <option value="km">Kilometers</option>
                            <option value="time">Minutes</option>
                        </select>
                    </div>
                </div>

                {/* Intensity (RPE) Slider */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Intensity (%)
                    </label>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={block.intensity || 50}
                                onChange={(e) => onUpdate(block.id, { intensity: Number(e.target.value) })}
                                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-brand-primary"
                            />
                            <span className="ml-3 text-sm font-semibold text-gray-900 dark:text-white w-12 text-right">
                                {block.intensity || 50}%
                            </span>
                        </div>
                        {/* Visual intensity bar */}
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full bg-gradient-to-r ${getIntensityColor()} transition-all`}
                                style={{ width: `${block.intensity || 50}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Target Type Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Pace/Speed
                    </label>
                    <select
                        value={block.target.type}
                        onChange={(e) => handleTargetTypeChange(e.target.value as TargetType)}
                        className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary text-sm p-2.5 border text-gray-900 dark:text-white dark:bg-gray-700 mb-3"
                    >
                        <option value="pace">Pace (min/km)</option>
                        <option value="heart_rate">Heart Rate (bpm)</option>
                        <option value="hr_zone">Heart Rate Zone</option>
                        <option value="vam_zone">VAM Zone</option>
                        <option value="power">Power (watts)</option>
                    </select>

                    {/* Pace Input */}
                    {block.target.type === 'pace' && (
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                type="text"
                                placeholder="6:00"
                                value={block.target.min}
                                onChange={(e) => onUpdate(block.id, { target: { ...block.target, min: e.target.value } })}
                                className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary text-sm p-2.5 border text-gray-900 dark:text-white dark:bg-gray-700 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                            />
                            <input
                                type="text"
                                placeholder="6:30"
                                value={block.target.max}
                                onChange={(e) => onUpdate(block.id, { target: { ...block.target, max: e.target.value } })}
                                className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary text-sm p-2.5 border text-gray-900 dark:text-white dark:bg-gray-700 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                            />
                        </div>
                    )}

                    {/* Heart Rate Input */}
                    {block.target.type === 'heart_rate' && (
                        <div>
                            <input
                                type="text"
                                placeholder="120-140 bpm"
                                value={block.target.min && block.target.max ? `${block.target.min}-${block.target.max}` : ''}
                                onChange={(e) => {
                                    const parts = e.target.value.split('-');
                                    onUpdate(block.id, {
                                        target: {
                                            ...block.target,
                                            min: parts[0]?.trim() || '',
                                            max: parts[1]?.trim() || ''
                                        }
                                    });
                                }}
                                className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary text-sm p-2.5 border text-gray-900 dark:text-white dark:bg-gray-700 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                            />
                        </div>
                    )}

                    {/* Power Input */}
                    {block.target.type === 'power' && (
                        <div>
                            <input
                                type="text"
                                placeholder="e.g., 250"
                                value={block.target.min}
                                onChange={(e) => onUpdate(block.id, { target: { ...block.target, min: e.target.value, max: e.target.value } })}
                                className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary text-sm p-2.5 border text-gray-900 dark:text-white dark:bg-gray-700 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                            />
                        </div>
                    )}

                    {/* HR Zone Selection */}
                    {block.target.type === 'hr_zone' && (
                        <div className="space-y-2">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Select a training zone. The actual heart rate range will be calculated based on the athlete's zones when assigned.
                            </p>
                            <select
                                value={block.target.min || '2'}
                                onChange={(e) => onUpdate(block.id, {
                                    target: {
                                        ...block.target,
                                        min: e.target.value,
                                        max: e.target.value
                                    }
                                })}
                                className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary text-sm p-2.5 border text-gray-900 dark:text-white dark:bg-gray-700"
                            >
                                <option value="1">Zone 1 - Recovery</option>
                                <option value="2">Zone 2 - Endurance</option>
                                <option value="3">Zone 3 - Tempo</option>
                                <option value="4">Zone 4 - Threshold</option>
                                <option value="5">Zone 5 - VO2 Max</option>
                            </select>
                        </div>
                    )}

                    {/* VAM Zone Selection */}
                    {block.target.type === 'vam_zone' && (
                        <div className="space-y-2">
                            <select
                                value={block.target.min || '2'}
                                onChange={(e) => onUpdate(block.id, {
                                    target: {
                                        ...block.target,
                                        min: e.target.value,
                                        max: e.target.value
                                    }
                                })}
                                className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary text-sm p-2.5 border text-gray-900 dark:text-white dark:bg-gray-700"
                            >
                                <option value="1">Z1 - Regenerativo (0-70% VAM)</option>
                                <option value="2">Z2 - Endurance (70-85% VAM)</option>
                                <option value="3">Z3 - Tempo (85-92% VAM)</option>
                                <option value="4">Z4 - Umbral Anaeróbico (92-97% VAM)</option>
                                <option value="5">Z5 - VO2 Max (97-103% VAM)</option>
                                <option value="6">Z6 - Potencia Anaeróbica (103-120% VAM)</option>
                            </select>

                            {/* Display calculated pace or message */}
                            {athleteId ? (
                                athleteVAM ? (
                                    <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                                        <p className="text-sm text-green-800 dark:text-green-300 font-medium">
                                            📊 Expected Pace: {calculatePaceFromVAM(athleteVAM, String(block.target.min || '2'))} min/km
                                        </p>
                                        <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                                            Based on VAM: {athleteVAM} m/min
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-sm text-amber-600 dark:text-amber-400">
                                        ⚠️ Athlete has no VAM test registered
                                    </p>
                                )
                            ) : (
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    💡 Assign to an athlete to see calculated pace
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Step Notes */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Step Notes
                    </label>
                    <textarea
                        rows={3}
                        value={block.notes || ''}
                        onChange={(e) => onUpdate(block.id, { notes: e.target.value })}
                        className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary text-sm p-2.5 border text-gray-900 dark:text-white dark:bg-gray-700 placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none"
                        placeholder="Instructions for this step..."
                    />
                </div>
            </div>
        </div>
    );
}
