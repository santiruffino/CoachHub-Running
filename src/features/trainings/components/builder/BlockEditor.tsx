'use client';

import { WorkoutBlock, DurationType, TargetType, BlockType } from './types';
import { Trash2 } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { calculateTargetPace, VAM_DEFAULT, VAM_ZONES } from '@/features/profiles/constants/vam';
import { BLOCK_COLORS } from './constants';
import { useTranslations } from 'next-intl';

interface BlockEditorProps {
    block: WorkoutBlock;
    onUpdate: (id: string, updates: Partial<WorkoutBlock>) => void;
    onRemove: (id: string) => void;
    athleteId?: string; // Optional athlete ID for VAM-based pace calculation
    readOnly?: boolean; // If true, disables all editing
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

export function BlockEditor({ block, onUpdate, onRemove, athleteId, readOnly = false }: BlockEditorProps) {
    const t = useTranslations('builder');
    const [timeString, setTimeString] = useState('');
    const [athleteVAM, setAthleteVAM] = useState<string | null>(null);

    const displayedTimeString = useMemo(() => {
        if (block.duration.type !== 'time') {
            return '';
        }

        if (timeString.trim().length > 0) {
            return timeString;
        }

        return secondsToHms(block.duration.value);
    }, [block.duration.type, block.duration.value, timeString]);

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
                console.error('Failed to fetch athlete VAM:', error);
                setAthleteVAM(null);
            }
        };
        fetchAthleteVAM();
    }, [athleteId]);

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
        if (value === 'time') {
            setTimeString(secondsToHms(300));
        } else {
            setTimeString('');
        }
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

    // Calculate pace from VAM and zone
    const calculatePaceFromVAM = (vam: string | null, zoneNumber: string): string => {
        const paceToUse = vam || VAM_DEFAULT;
        const zone = VAM_ZONES.find(z => String(z.zone) === zoneNumber);
        if (!zone) return '-:--';

        // Percentage range
        const minPace = calculateTargetPace(paceToUse, zone.max);
        const maxPace = calculateTargetPace(paceToUse, zone.min);

        return `${minPace} - ${maxPace}`;
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 shadow-sm h-full overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{t('stepDetails')}</h3>
                <button
                    onClick={() => onRemove(block.id)}
                    className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors p-2 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={t('removeStep')}
                    disabled={readOnly}
                >
                    <Trash2 className="w-5 h-5" />
                </button>
            </div>

            <div className="space-y-4">
                {/* Step Name */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('stepName')}
                    </label>
                    <input
                        type="text"
                        value={block.stepName || ''}
                        onChange={(e) => onUpdate(block.id, { stepName: e.target.value })}
                        placeholder={t(`labels.${block.type}`)}
                        className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary text-sm p-2.5 border bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 disabled:opacity-60 disabled:cursor-not-allowed"
                        disabled={readOnly}
                    />
                </div>

                {/* Type */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('type')}
                    </label>
                    <select
                        value={block.type}
                        onChange={(e) => handleTypeChange(e.target.value as BlockType)}
                        className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary text-sm p-2.5 border font-medium bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                        disabled={readOnly}
                    >
                        <option value="warmup">{t('labels.warmup')}</option>
                        <option value="interval">{t('labels.interval')}</option>
                        <option value="recovery">{t('labels.recovery')}</option>
                        <option value="rest">{t('labels.rest')}</option>
                        <option value="cooldown">{t('labels.cooldown')}</option>
                    </select>
                </div>

                {/* Duration */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('duration')}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <input
                            type="text"
                            value={block.duration.type === 'time' ? displayedTimeString : getDistanceDisplayValue()}
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
                            <option value="m">{t('meters')}</option>
                            <option value="km">{t('kilometers')}</option>
                            <option value="time">{t('minutes')}</option>
                        </select>
                    </div>
                </div>

                {/* Intensity (RPE) Slider */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('intensity')}
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
                                className="h-full transition-all"
                                style={{ 
                                    width: `${block.intensity || 50}%`,
                                    backgroundColor: BLOCK_COLORS[block.type]
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Target Type Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('paceSpeed')}
                    </label>
                    <select
                        value={block.target.type}
                        onChange={(e) => handleTargetTypeChange(e.target.value as TargetType)}
                        className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary text-sm p-2.5 border text-gray-900 dark:text-white dark:bg-gray-700 mb-3"
                    >
                        <option value="vam_zone">{t('vamZone')}</option>
                        <option value="lthr">{t('lthr')}</option>
                        <option value="rpe_target">{t('rpeTarget')}</option>
                    </select>

                    {/* LTHR: Percentage Inputs */}
                    {block.target.type === 'lthr' && (
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                type="number"
                                placeholder="85"
                                value={block.target.min}
                                onChange={(e) => onUpdate(block.id, { target: { ...block.target, min: e.target.value } })}
                                className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary text-sm p-2.5 border text-gray-900 dark:text-white dark:bg-gray-700 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                            />
                            <input
                                type="number"
                                placeholder="95"
                                value={block.target.max}
                                onChange={(e) => onUpdate(block.id, { target: { ...block.target, max: e.target.value } })}
                                className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary text-sm p-2.5 border text-gray-900 dark:text-white dark:bg-gray-700 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                            />
                        </div>
                    )}

                    {/* RPE Target: Range Selector */}
                    {block.target.type === 'rpe_target' && (
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                type="number"
                                min="1"
                                max="10"
                                placeholder="5"
                                value={block.target.min}
                                onChange={(e) => onUpdate(block.id, { target: { ...block.target, min: e.target.value } })}
                                className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary text-sm p-2.5 border text-gray-900 dark:text-white dark:bg-gray-700 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                            />
                            <input
                                type="number"
                                min="1"
                                max="10"
                                placeholder="7"
                                value={block.target.max}
                                onChange={(e) => onUpdate(block.id, { target: { ...block.target, max: e.target.value } })}
                                className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary text-sm p-2.5 border text-gray-900 dark:text-white dark:bg-gray-700 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                            />
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
                                {VAM_ZONES.map(z => (
                                    <option key={z.zone} value={z.zone}>
                                        Z{z.zone} - {z.name} ({z.min}-{z.max}% VAM)
                                    </option>
                                ))}
                            </select>

                            {/* Display calculated pace or message */}
                            {athleteId ? (
                                <div className={`mt-2 p-2 rounded border ${athleteVAM ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'}`}>
                                    <p className={`text-sm font-medium ${athleteVAM ? 'text-green-800 dark:text-green-300' : 'text-amber-800 dark:text-amber-300'}`}>
                                        📊 {athleteVAM ? t('expectedPace') : t('estimatedPaceDefault')} {calculatePaceFromVAM(athleteVAM, String(block.target.min || '2'))} min/km
                                    </p>
                                    <p className={`text-xs mt-1 ${athleteVAM ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`}>
                                        {t('basedOnVam')} {athleteVAM || VAM_DEFAULT} min/km
                                    </p>
                                </div>
                            ) : (
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    💡 {t('assignToAthleteHint')}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Step Notes */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('stepNotes')}
                    </label>
                    <textarea
                        rows={3}
                        value={block.notes || ''}
                        onChange={(e) => onUpdate(block.id, { notes: e.target.value })}
                        className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary text-sm p-2.5 border text-gray-900 dark:text-white dark:bg-gray-700 placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none"
                        placeholder={t('notesPlaceholderStep')}
                    />
                </div>
            </div>
        </div>
    );
}
