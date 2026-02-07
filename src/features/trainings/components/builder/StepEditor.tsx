'use client';

import { WorkoutBlock, TargetType, DurationType } from './types';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { X, Plus } from 'lucide-react';
import { useState } from 'react';
import { calculateTargetPace, VAM_DEFAULT, VAM_ZONES } from '@/features/profiles/constants/vam';

interface StepEditorProps {
    step: WorkoutBlock;
    stepNumber: number;
    onUpdate: (updates: Partial<WorkoutBlock>) => void;
    onRemove: () => void;
    isInRepeat?: boolean;
}

const TARGET_TYPES: { value: TargetType; label: string }[] = [
    { value: 'threshold_pace', label: '% Threshold Pace' },
    { value: 'threshold_hr', label: '% Threshold HR' },
    { value: 'hr_max', label: '% HR Max' },
    { value: 'pace', label: 'Pace (min/km)' },
    { value: 'heart_rate', label: 'Heart Rate (bpm)' },
    { value: 'hr_zone', label: 'HR Zone (1-5)' },
    { value: 'vam_zone', label: 'VAM Zone' },
    { value: 'no_target', label: 'No Target' },
];

const WORK_TYPES: { value: string; label: string }[] = [
    { value: 'warmup', label: 'Warm Up' },
    { value: 'interval', label: 'Work' },
    { value: 'recovery', label: 'Recover' },
    { value: 'cooldown', label: 'Cool Down' },
];

export function StepEditor({ step, stepNumber, onUpdate, onRemove, isInRepeat = false }: StepEditorProps) {
    const [showCadence, setShowCadence] = useState(!!step.cadenceRange);

    const getDurationValue = () => {
        if (step.duration.type === 'distance') {
            return step.duration.value / 1000; // Convert meters to km
        }
        return step.duration.value / 60; // Convert seconds to minutes
    };

    const handleDurationChange = (value: number) => {
        const newValue = step.duration.type === 'distance'
            ? value * 1000  // km to meters
            : value * 60;   // minutes to seconds

        onUpdate({
            duration: {
                ...step.duration,
                value: newValue,
            }
        });
    };

    const toggleCadence = () => {
        if (showCadence) {
            onUpdate({ cadenceRange: undefined });
            setShowCadence(false);
        } else {
            onUpdate({ cadenceRange: { min: 160, max: 180 } });
            setShowCadence(true);
        }
    };

    const getDefaultAndMax = (type: TargetType) => {
        switch (type) {
            case 'threshold_pace':
            case 'threshold_hr':
            case 'hr_max':
                return { min: 80, max: 90 };
            case 'vam_zone':
                return { min: 2, max: 3 };
            case 'hr_zone':
                return { min: 2, max: 3 };
            case 'heart_rate':
                return { min: 140, max: 160 };
            case 'pace':
                return { min: 5.0, max: 4.5 };
            case 'no_target':
                return { min: 0, max: 0 };
            default:
                return { min: 0, max: 0 };
        }
    };

    // Calculate and display target values based on type
    const getCalculatedTarget = () => {
        const min = typeof step.target.min === 'number' ? step.target.min : parseFloat(step.target.min);
        const max = typeof step.target.max === 'number' ? step.target.max : parseFloat(step.target.max);

        // Mock athlete thresholds - in production, these would come from athlete profile
        const thresholdPace = 4.0; // 4:00 min/km
        const thresholdHR = 170; // bpm
        const maxHR = 190; // bpm
        const vamThreshold = 1200; // m/h (vertical ascent meters per hour)

        switch (step.target.type) {
            case 'threshold_pace': {
                // Higher % = faster pace = LOWER min/km
                // 100% = threshold, 105% = faster than threshold
                if (!min || !max) return null;
                const minPace = thresholdPace / (min / 100);
                const maxPace = thresholdPace / (max / 100);
                // Note: min percentage results in slower pace (higher min/km), max percentage results in faster pace (lower min/km)
                // We should display range from Slower to Faster usually, or min to max
                // If min=105, max=115. minPace=3.8, maxPace=3.47. Range: 3.47 - 3.8

                const formatPace = (val: number) =>
                    `${Math.floor(val)}:${Math.round((val % 1) * 60).toString().padStart(2, '0')}`;

                return `CALCULATED: ${formatPace(maxPace)} — ${formatPace(minPace)} min/km`;
            }
            case 'threshold_hr': {
                if (!min || !max) return null;
                const minHR = Math.round((thresholdHR * min) / 100);
                const maxHR = Math.round((thresholdHR * max) / 100);
                return `CALCULATED: ${minHR} — ${maxHR} bpm`;
            }
            case 'hr_max': {
                if (!min || !max) return null;
                const minHR = Math.round((maxHR * min) / 100);
                const maxHRCalc = Math.round((maxHR * max) / 100);
                return `CALCULATED: ${minHR} — ${maxHRCalc} bpm`;
            }
            case 'vam_zone': {
                // VAM zones are defined in VAM_ZONES
                const zoneNumber = String(min);
                const zone = VAM_ZONES.find(z => String(z.zone) === zoneNumber);
                if (!zone) return null;

                const vamToUse = VAM_DEFAULT; // In StepEditor, we might not have the athlete VAM directly, let's use default or placeholder
                // Note: StepEditor seems to be a generic editor, but we should ideally pass athlete VAM here too.

                const minPace = calculateTargetPace(vamToUse, zone.max);
                const maxPace = calculateTargetPace(vamToUse, zone.min);

                return `CALCULATED: Zone ${min} (${zone.min}-${zone.max}% VAM | ${minPace} - ${maxPace} min/km)`;
            }
            case 'pace': {
                return null;
            }
            case 'heart_rate': {
                return null;
            }
            default:
                return null;
        }
    };

    return (
        <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-white font-semibold text-sm">
                        {stepNumber}
                    </div>
                    <Input
                        value={step.stepName || ''}
                        onChange={(e) => onUpdate({ stepName: e.target.value })}
                        placeholder="Step name"
                        className="bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white font-semibold text-lg w-40"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Select
                        value={step.type}
                        onValueChange={(value) => onUpdate({ type: value as any })}
                    >
                        <SelectTrigger className="w-32 bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white text-sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {WORK_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select
                        value={step.duration.type}
                        onValueChange={(value: DurationType) =>
                            onUpdate({
                                duration: {
                                    ...step.duration,
                                    type: value,
                                    value: value === 'distance' ? 1000 : 120
                                }
                            })
                        }
                    >
                        <SelectTrigger className="w-32 bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white text-sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="distance">Distance</SelectItem>
                            <SelectItem value="time">Time</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* Duration */}
                <div>
                    <Label className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-2 block">
                        Step Duration
                    </Label>
                    <div className="flex items-center gap-2">
                        {step.duration.type === 'distance' ? (
                            <Input
                                type="number"
                                step="0.1"
                                value={getDurationValue().toFixed(2)}
                                onChange={(e) => handleDurationChange(parseFloat(e.target.value))}
                                className="flex-1 bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white text-2xl font-bold"
                            />
                        ) : (
                            <Input
                                type="text"
                                placeholder="MM:SS"
                                value={(() => {
                                    // Display as MM:SS
                                    const mins = Math.floor(step.duration.value / 60);
                                    const secs = step.duration.value % 60;
                                    return `${mins}:${secs.toString().padStart(2, '0')}`;
                                })()}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    // Allow typing format 1:30, 90, etc.
                                    if (val.includes(':')) {
                                        const [m, s] = val.split(':').map(part => parseInt(part) || 0);
                                        const totalSeconds = (m * 60) + s;
                                        // Update state directly in seconds
                                        onUpdate({
                                            duration: { ...step.duration, value: totalSeconds }
                                        });
                                    } else {
                                        // Assume raw minutes if just number typed? Or seconds?
                                        // Let's assume raw number is minutes if < 60, but user asked for "Time" format.
                                        // Safest is to just let them type and only parse if valid, or just parse as minutes if single number?
                                        // Let's parse as minutes to be safe/standard, or implement strict masking.
                                        // For simplicity: if they type '5', treat as 5 minutes (300s).
                                        const num = parseInt(val) || 0;
                                        if (!isNaN(num)) {
                                            onUpdate({
                                                duration: { ...step.duration, value: num * 60 }
                                            });
                                        }
                                    }
                                }}
                                className="flex-1 bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white text-2xl font-bold font-mono"
                            />
                        )}
                        <span className="text-gray-900 dark:text-white text-sm">
                            {step.duration.type === 'distance' ? 'km' : 'min'}
                        </span>
                    </div>
                </div>


                {/* Target Range */}
                <div>
                    <Label className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-2 block">
                        Target Range
                    </Label>
                    <div className="flex items-center gap-2">
                        {step.target.type !== 'no_target' && step.target.type !== 'hr_zone' && step.target.type !== 'vam_zone' && (
                            <>
                                <Input
                                    type="number"
                                    value={step.target.min}
                                    onChange={(e) => onUpdate({
                                        target: { ...step.target, min: parseFloat(e.target.value) }
                                    })}
                                    className="flex-1 bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white text-xl"
                                />
                                <span className="text-gray-500 dark:text-gray-400">—</span>
                                <Input
                                    type="number"
                                    value={step.target.max}
                                    onChange={(e) => onUpdate({
                                        target: { ...step.target, max: parseFloat(e.target.value) }
                                    })}
                                    className="flex-1 bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white text-xl"
                                />
                            </>
                        )}

                        {/* VAM Zone Selection - Inline */}
                        {step.target.type === 'vam_zone' && (
                            <Select
                                value={String(step.target.min || '2')}
                                onValueChange={(value) => onUpdate({
                                    target: {
                                        ...step.target,
                                        min: value,
                                        max: value
                                    }
                                })}
                            >
                                <SelectTrigger className="flex-1 bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">Z1 - Regenerativo (0-70% VAM)</SelectItem>
                                    <SelectItem value="2">Z2 - Endurance (70-85% VAM)</SelectItem>
                                    <SelectItem value="3">Z3 - Tempo (85-92% VAM)</SelectItem>
                                    <SelectItem value="4">Z4 - Umbral (92-97% VAM)</SelectItem>
                                    <SelectItem value="5">Z5 - VO2 Max (97-103% VAM)</SelectItem>
                                    <SelectItem value="6">Z6 - Potencia (103-120% VAM)</SelectItem>
                                </SelectContent>
                            </Select>
                        )}

                        {/* HR Zone Selection - Inline */}
                        {step.target.type === 'hr_zone' && (
                            <Select
                                value={String(step.target.min || '2')}
                                onValueChange={(value) => onUpdate({
                                    target: {
                                        ...step.target,
                                        min: value,
                                        max: value
                                    }
                                })}
                            >
                                <SelectTrigger className="flex-1 bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">Zone 1 - Recovery</SelectItem>
                                    <SelectItem value="2">Zone 2 - Endurance</SelectItem>
                                    <SelectItem value="3">Zone 3 - Tempo</SelectItem>
                                    <SelectItem value="4">Zone 4 - Threshold</SelectItem>
                                    <SelectItem value="5">Zone 5 - VO2 Max</SelectItem>
                                </SelectContent>
                            </Select>
                        )}

                        <Select
                            value={step.target.type}
                            onValueChange={(value: TargetType) => {
                                const defaults = getDefaultAndMax(value);
                                onUpdate({
                                    target: {
                                        type: value,
                                        min: defaults.min,
                                        max: defaults.max
                                    }
                                });
                            }}
                        >
                            <SelectTrigger className="w-48 bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white text-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {TARGET_TYPES.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                        {type.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {step.target.type !== 'no_target' && getCalculatedTarget() && (
                        <div className="text-xs text-[#FFCC00] mt-1 font-medium">
                            {getCalculatedTarget()}
                        </div>
                    )}
                </div>
            </div>

            {/* Options */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <Switch
                            checked={step.endOnLapButton || false}
                            onCheckedChange={(checked: boolean) => onUpdate({ endOnLapButton: checked })}
                            className="data-[state=checked]:bg-[#FFCC00]"
                        />
                        <Label className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                            End step on lap button
                        </Label>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={toggleCadence}
                        className="text-sm text-[#FFCC00] hover:text-[#FFD633] hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                        {showCadence ? '− Remove cadence range' : '⊕ Add cadence range'}
                    </Button>
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onRemove}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                >
                    <X className="w-4 h-4 mr-1" />
                    Remove step
                </Button>
            </div>

            {/* Cadence Range */}
            {showCadence && step.cadenceRange && (
                <div className="mt-4 p-3 bg-white dark:bg-slate-900 rounded border border-gray-200 dark:border-slate-700">
                    <Label className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-2 block">
                        Cadence Range (spm)
                    </Label>
                    <div className="flex items-center gap-2">
                        <Input
                            type="number"
                            value={step.cadenceRange.min}
                            onChange={(e) => onUpdate({
                                cadenceRange: {
                                    ...step.cadenceRange!,
                                    min: parseInt(e.target.value)
                                }
                            })}
                            className="flex-1 bg-gray-50 dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"
                        />
                        <span className="text-gray-500 dark:text-gray-400">—</span>
                        <Input
                            type="number"
                            value={step.cadenceRange.max}
                            onChange={(e) => onUpdate({
                                cadenceRange: {
                                    ...step.cadenceRange!,
                                    max: parseInt(e.target.value)
                                }
                            })}
                            className="flex-1 bg-gray-50 dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"
                        />
                    </div>
                </div>
            )}

            {/* Interval RPE (Optional) */}
            <div className="mt-4 p-3 bg-white dark:bg-slate-900 rounded border border-gray-200 dark:border-slate-700">
                <Label className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-2 block">
                    Interval RPE (Optional)
                </Label>
                <div className="flex items-center gap-4">
                    <Slider
                        value={[step.rpe || 0]}
                        min={0}
                        max={10}
                        step={1}
                        onValueChange={(value) => onUpdate({ rpe: value[0] > 0 ? value[0] : undefined })}
                        className="flex-1"
                    />
                    <div className="flex items-center justify-center w-10 h-8 rounded bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 font-mono text-sm font-medium">
                        {step.rpe || '-'}
                    </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                    {step.rpe
                        ? step.rpe <= 2 ? 'Very Easy'
                            : step.rpe <= 4 ? 'Easy'
                                : step.rpe <= 6 ? 'Moderate'
                                    : step.rpe <= 8 ? 'Hard'
                                        : 'Max Effort'
                        : 'No RPE set'}
                </p>
            </div>
        </div>
    );
}
