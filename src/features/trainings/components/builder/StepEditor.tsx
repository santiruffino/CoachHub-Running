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

interface AthleteProfile {
    vam?: string;    // e.g., "4:30" min/km
    lthr?: number;   // e.g., 170 bpm
    maxHR?: number;  // e.g., 190 bpm
}

interface StepEditorProps {
    step: WorkoutBlock;
    stepNumber: number;
    onUpdate: (updates: Partial<WorkoutBlock>) => void;
    onRemove: () => void;
    isInRepeat?: boolean;
    athleteProfile?: AthleteProfile | null;
}

const TARGET_TYPES: { value: TargetType; label: string }[] = [
    { value: 'vam_zone', label: 'VAM Zone' },
    { value: 'lthr', label: 'LTHR' },
    { value: 'rpe_target', label: 'RPE Target' },
];

const WORK_TYPES: { value: string; label: string }[] = [
    { value: 'warmup', label: 'Warm Up' },
    { value: 'interval', label: 'Work' },
    { value: 'recovery', label: 'Recover' },
    { value: 'cooldown', label: 'Cool Down' },
];

export function StepEditor({ step, stepNumber, onUpdate, onRemove, isInRepeat = false, athleteProfile = null }: StepEditorProps) {
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
            case 'lthr':
                return { min: 85, max: 95 }; // 85-95% of LTHR
            case 'vam_zone':
                return { min: 2, max: 2 }; // Zone 2 by default
            case 'rpe_target':
                return { min: 5, max: 7 }; // RPE 5-7
            default:
                return { min: 0, max: 0 };
        }
    };

    // Calculate and display target values based on type
    const getCalculatedTarget = () => {
        const min = typeof step.target.min === 'number' ? step.target.min : parseFloat(step.target.min);
        const max = typeof step.target.max === 'number' ? step.target.max : parseFloat(step.target.max);

        switch (step.target.type) {
            case 'lthr': {
                // LTHR: percentage of lactate threshold heart rate
                if (!athleteProfile?.lthr) {
                    return 'No athlete selected - LTHR unavailable';
                }
                if (!min || !max) return null;

                const minHR = Math.round((athleteProfile.lthr * min) / 100);
                const maxHR = Math.round((athleteProfile.lthr * max) / 100);
                return `${minHR} — ${maxHR} bpm`;
            }
            case 'vam_zone': {
                // VAM zones are defined in VAM_ZONES
                const zoneNumber = String(min);
                const zone = VAM_ZONES.find(z => String(z.zone) === zoneNumber);
                if (!zone) return null;

                if (!athleteProfile?.vam) {
                    return `Zone ${min} - No athlete VAM data`;
                }

                // Parse VAM from "4:30" format to decimal
                const [vamMin, vamSec] = athleteProfile.vam.split(':').map((s: string) => parseInt(s));
                const vamDecimal = vamMin + vamSec / 60;

                // Calculate pace range based on zone percentages
                const minPace = calculateTargetPace(athleteProfile.vam, zone.max);
                const maxPace = calculateTargetPace(athleteProfile.vam, zone.min);

                return `Zone ${min} (${zone.min}-${zone.max}% VAM | ${minPace} - ${maxPace} min/km)`;
            }
            case 'rpe_target': {
                // RPE target: no calculation needed, just display the range
                if (!min || !max) return null;
                if (min === max) {
                    return `RPE ${min}`;
                }
                return `RPE ${min} — ${max}`;
            }
            default:
                return null;
        }
    };

    return (
        <div className="bg-white dark:bg-[#1a232c] rounded shadow-[0_4px_12px_rgba(43,52,55,0.04)] p-6 relative overflow-visible mt-2 mb-4 border-l-[3px] border-[#abb3b7]">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#f1f4f6] dark:bg-white/5 text-[#8b9bb4] font-semibold text-[10px]">
                        {stepNumber}
                    </div>
                    <Input
                        value={step.stepName || ''}
                        onChange={(e) => onUpdate({ stepName: e.target.value })}
                        placeholder="Step name"
                        className="bg-transparent border-0 border-b border-[#abb3b7]/30 px-0 py-1 text-[#2b3437] dark:text-[#f8f9fa] font-semibold text-xl w-64 rounded-none focus:ring-0 focus:border-[#4e6073]"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <Select
                        value={step.type}
                        onValueChange={(value) => onUpdate({ type: value as any })}
                    >
                        <SelectTrigger className="w-32 bg-transparent border-0 border-b border-[#abb3b7]/30 rounded-none focus:ring-0 text-[#2b3437] dark:text-[#f8f9fa] text-sm font-semibold">
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
                        <SelectTrigger className="w-28 bg-transparent border-0 border-b border-[#abb3b7]/30 rounded-none focus:ring-0 text-[#2b3437] dark:text-[#f8f9fa] text-sm font-semibold">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="distance">Distance</SelectItem>
                            <SelectItem value="time">Time</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
                {/* Duration */}
                <div>
                    <Label className="text-[10px] font-semibold text-[#8b9bb4] tracking-[0.05em] uppercase mb-3 block">
                        Step Duration
                    </Label>
                    <div className="flex items-baseline gap-2">
                        {step.duration.type === 'distance' ? (
                            <input
                                type="number"
                                step="0.1"
                                value={getDurationValue().toFixed(2)}
                                onChange={(e) => handleDurationChange(parseFloat(e.target.value))}
                                className="flex-1 bg-transparent border-0 border-b border-[#abb3b7]/30 px-0 py-1 text-[#2b3437] dark:text-[#f8f9fa] text-3xl font-extrabold font-display focus:ring-0 focus:border-[#4e6073] transition-colors outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                        ) : (
                            <input
                                type="text"
                                placeholder="MM:SS"
                                value={(() => {
                                    const mins = Math.floor(step.duration.value / 60);
                                    const secs = step.duration.value % 60;
                                    return `${mins}:${secs.toString().padStart(2, '0')}`;
                                })()}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val.includes(':')) {
                                        const [m, s] = val.split(':').map(part => parseInt(part) || 0);
                                        onUpdate({ duration: { ...step.duration, value: (m * 60) + s } });
                                    } else {
                                        const num = parseInt(val) || 0;
                                        if (!isNaN(num)) {
                                            onUpdate({ duration: { ...step.duration, value: num * 60 } });
                                        }
                                    }
                                }}
                                className="flex-1 bg-transparent border-0 border-b border-[#abb3b7]/30 px-0 py-1 text-[#2b3437] dark:text-[#f8f9fa] text-3xl font-extrabold font-display font-mono focus:ring-0 focus:border-[#4e6073] transition-colors outline-none"
                            />
                        )}
                        <span className="text-[#8b9bb4] text-sm font-semibold shrink-0">
                            {step.duration.type === 'distance' ? 'km' : 'min'}
                        </span>
                    </div>
                </div>


                {/* Target Range */}
                <div>
                    <Label className="text-[10px] font-semibold text-[#8b9bb4] tracking-[0.05em] uppercase mb-3 block">
                        Target Range
                    </Label>
                    <div className="flex items-center gap-2">
                        {/* LTHR: Percentage Inputs */}
                        {step.target.type === 'lthr' && (
                            <>
                                <input
                                    type="number"
                                    value={step.target.min}
                                    onChange={(e) => onUpdate({
                                        target: { ...step.target, min: parseFloat(e.target.value) }
                                    })}
                                    className="w-16 bg-transparent border-0 border-b border-[#abb3b7]/30 px-0 py-1 text-[#2b3437] dark:text-[#f8f9fa] text-2xl font-extrabold font-display text-center focus:ring-0 focus:border-[#4e6073] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <span className="text-[#8b9bb4] font-semibold">—</span>
                                <input
                                    type="number"
                                    value={step.target.max}
                                    onChange={(e) => onUpdate({
                                        target: { ...step.target, max: parseFloat(e.target.value) }
                                    })}
                                    className="w-16 bg-transparent border-0 border-b border-[#abb3b7]/30 px-0 py-1 text-[#2b3437] dark:text-[#f8f9fa] text-2xl font-extrabold font-display text-center focus:ring-0 focus:border-[#4e6073] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <span className="text-[#8b9bb4] text-sm font-semibold">%</span>
                            </>
                        )}

                        {/* RPE Target: Range Selector */}
                        {step.target.type === 'rpe_target' && (
                            <>
                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={step.target.min}
                                    onChange={(e) => onUpdate({
                                        target: { ...step.target, min: parseFloat(e.target.value) }
                                    })}
                                    className="w-16 bg-transparent border-0 border-b border-[#abb3b7]/30 px-0 py-1 text-[#2b3437] dark:text-[#f8f9fa] text-2xl font-extrabold font-display text-center focus:ring-0 focus:border-[#4e6073] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <span className="text-[#8b9bb4] font-semibold">—</span>
                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={step.target.max}
                                    onChange={(e) => onUpdate({
                                        target: { ...step.target, max: parseFloat(e.target.value) }
                                    })}
                                    className="w-16 bg-transparent border-0 border-b border-[#abb3b7]/30 px-0 py-1 text-[#2b3437] dark:text-[#f8f9fa] text-2xl font-extrabold font-display text-center focus:ring-0 focus:border-[#4e6073] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                            </>
                        )}

                        {/* VAM Zone Selection - Inline */}
                        {step.target.type === 'vam_zone' && (
                            <Select
                                value={String(step.target.min || '2')}
                                onValueChange={(value) => onUpdate({
                                    target: { ...step.target, min: value, max: value }
                                })}
                            >
                                <SelectTrigger className="flex-1 bg-transparent border-0 border-b border-[#abb3b7]/30 rounded-none focus:ring-0 text-[#2b3437] dark:text-[#f8f9fa] font-semibold text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">Z1 — Regenerativo (0–70% VAM)</SelectItem>
                                    <SelectItem value="2">Z2 — Endurance (70–85% VAM)</SelectItem>
                                    <SelectItem value="3">Z3 — Tempo (85–92% VAM)</SelectItem>
                                    <SelectItem value="4">Z4 — Umbral (92–97% VAM)</SelectItem>
                                    <SelectItem value="5">Z5 — VO₂ Max (97–103% VAM)</SelectItem>
                                    <SelectItem value="6">Z6 — Potencia (103–120% VAM)</SelectItem>
                                </SelectContent>
                            </Select>
                        )}

                        {/* Target Type Selector */}
                        <Select
                            value={step.target.type}
                            onValueChange={(value: TargetType) => {
                                const defaults = getDefaultAndMax(value);
                                onUpdate({ target: { type: value, min: defaults.min, max: defaults.max } });
                            }}
                        >
                            <SelectTrigger className="w-40 bg-transparent border-0 border-b border-[#abb3b7]/30 rounded-none focus:ring-0 text-[#2b3437] dark:text-[#f8f9fa] text-sm font-semibold">
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
                    {getCalculatedTarget() && (
                        <div className="text-[11px] text-amber-500 dark:text-amber-400 mt-2 font-semibold tracking-wide">
                            {getCalculatedTarget()}
                        </div>
                    )}
                </div>
            </div>

            {/* Options */}
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-[#e1e5e8] dark:border-white/5">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <Switch
                            checked={step.endOnLapButton || false}
                            onCheckedChange={(checked: boolean) => onUpdate({ endOnLapButton: checked })}
                            className="data-[state=checked]:bg-[#4e6073]"
                        />
                        <Label className="text-xs font-semibold text-[#8b9bb4] uppercase tracking-wider cursor-pointer">
                            End step on lap button
                        </Label>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={toggleCadence}
                        className="text-xs font-semibold text-[#4e6073] hover:text-[#2b3437] dark:hover:text-white hover:bg-transparent uppercase tracking-wider p-0"
                    >
                        <Plus className="w-3 h-3 mr-1" />
                        {showCadence ? 'Remove cadence' : 'Add cadence range'}
                    </Button>
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onRemove}
                    className="text-xs font-semibold text-[#8b9bb4] hover:text-red-500 hover:bg-transparent uppercase tracking-wider p-0"
                >
                    <X className="w-3 h-3 mr-1" />
                    Remove step
                </Button>
            </div>

            {/* Cadence Range */}
            {showCadence && step.cadenceRange && (
                <div className="mt-6 pt-4 border-t border-[#e1e5e8] dark:border-white/5">
                    <Label className="text-[10px] font-semibold text-[#8b9bb4] tracking-[0.05em] uppercase mb-4 block">
                        Cadence Range — spm
                    </Label>
                    <div className="flex items-baseline gap-3">
                        <input
                            type="number"
                            value={step.cadenceRange.min}
                            onChange={(e) => onUpdate({
                                cadenceRange: { ...step.cadenceRange!, min: parseInt(e.target.value) }
                            })}
                            className="w-20 bg-transparent border-0 border-b border-[#abb3b7]/30 px-0 py-1 text-[#2b3437] dark:text-[#f8f9fa] text-2xl font-extrabold font-display text-center focus:ring-0 focus:border-[#4e6073] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-[#8b9bb4] font-semibold">—</span>
                        <input
                            type="number"
                            value={step.cadenceRange.max}
                            onChange={(e) => onUpdate({
                                cadenceRange: { ...step.cadenceRange!, max: parseInt(e.target.value) }
                            })}
                            className="w-20 bg-transparent border-0 border-b border-[#abb3b7]/30 px-0 py-1 text-[#2b3437] dark:text-[#f8f9fa] text-2xl font-extrabold font-display text-center focus:ring-0 focus:border-[#4e6073] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                    </div>
                </div>
            )}

            {/* Interval RPE (Optional) */}
            <div className="mt-6 pt-4 border-t border-[#e1e5e8] dark:border-white/5">
                <Label className="text-[10px] font-semibold text-[#8b9bb4] tracking-[0.05em] uppercase mb-4 flex items-center justify-between">
                    Interval RPE (Optional)
                    {step.rpe && <span className="text-[#4e6073] dark:text-white text-sm font-bold bg-[#f1f4f6] dark:bg-white/5 px-2 py-0.5 rounded">{step.rpe}/10</span>}
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
                </div>
                <p className="text-[11px] font-semibold text-[#8b9bb4] uppercase tracking-wider mt-3">
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
