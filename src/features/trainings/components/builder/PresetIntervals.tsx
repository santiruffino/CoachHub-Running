'use client';

import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { WorkoutBlock } from './types';
import { RepetitionDialog } from './RepetitionDialog';
import { useTranslations } from 'next-intl';

interface PresetPattern {
    id: string;
    name: string;
    description: string;
    blocks: Omit<WorkoutBlock, 'id'>[];
    visualPattern: number[]; // Heights for visual representation (0-100)
    requiresRepetitions?: boolean; // If true, ask for repetitions before adding
}

interface PresetIntervalsProps {
    onSelectPreset: (blocks: WorkoutBlock[]) => void;
}

export function PresetIntervals({ onSelectPreset }: PresetIntervalsProps) {
    const t = useTranslations('builder');
    const [pendingPattern, setPendingPattern] = useState<PresetPattern | null>(null);

    const PRESET_PATTERNS: PresetPattern[] = [
        {
            id: 'warmup',
            name: t('labels.warmup'),
            description: 'Single warm-up block',
            visualPattern: [50],
            blocks: [
                {
                    type: 'warmup',
                    stepName: t('labels.warmup'),
                    duration: { type: 'time', value: 600 }, // 10 min
                    target: { type: 'vam_zone', min: '2', max: '2' },
                    intensity: 40,
                    notes: ''
                }
            ]
        },
        {
            id: 'active',
            name: t('labels.interval'),
            description: 'Single interval block',
            visualPattern: [90],
            blocks: [
                {
                    type: 'interval',
                    stepName: t('labels.interval'),
                    duration: { type: 'distance', value: 1000 },
                    target: { type: 'vam_zone', min: '5', max: '5' },
                    intensity: 85,
                    notes: ''
                }
            ]
        },
        {
            id: 'recovery',
            name: t('labels.recovery'),
            description: 'Single recovery block',
            visualPattern: [30],
            blocks: [
                {
                    type: 'recovery',
                    stepName: t('labels.recovery'),
                    duration: { type: 'time', value: 120 }, // 2 min
                    target: { type: 'vam_zone', min: '1', max: '1' },
                    intensity: 30,
                    notes: ''
                }
            ]
        },
        {
            id: 'cooldown',
            name: t('labels.cooldown'),
            description: 'Single cool-down block',
            visualPattern: [50],
            blocks: [
                {
                    type: 'cooldown',
                    stepName: t('labels.cooldown'),
                    duration: { type: 'time', value: 600 }, // 10 min
                    target: { type: 'vam_zone', min: '2', max: '2' },
                    intensity: 40,
                    notes: ''
                }
            ]
        },
        {
            id: 'two-steps-active-recovery',
            name: t('presets.twoSteps'),
            description: t('presets.activeRecovery'),
            visualPattern: [85, 30],
            requiresRepetitions: true,
            blocks: [
                {
                    type: 'interval',
                    stepName: t('labels.interval'),
                    duration: { type: 'distance', value: 400 },
                    target: { type: 'vam_zone', min: '5', max: '5' },
                    intensity: 85,
                    notes: ''
                },
                {
                    type: 'recovery',
                    stepName: t('labels.rest'),
                    duration: { type: 'time', value: 90 },
                    target: { type: 'vam_zone', min: '1', max: '1' },
                    intensity: 30,
                    notes: ''
                }
            ]
        },
        {
            id: 'two-steps-active-faster',
            name: t('presets.twoSteps'),
            description: t('presets.activeFaster'),
            visualPattern: [75, 90],
            requiresRepetitions: true,
            blocks: [
                {
                    type: 'interval',
                    stepName: t('labels.interval'),
                    duration: { type: 'distance', value: 800 },
                    target: { type: 'vam_zone', min: '4', max: '4' },
                    intensity: 75,
                    notes: ''
                },
                {
                    type: 'interval',
                    stepName: t('labels.hard'),
                    duration: { type: 'distance', value: 400 },
                    target: { type: 'vam_zone', min: '5', max: '5' },
                    intensity: 90,
                    notes: ''
                }
            ]
        },
        {
            id: 'ramp-up',
            name: t('presets.rampUp'),
            description: t('presets.rampUpDesc'),
            visualPattern: [40, 55, 70, 85],
            requiresRepetitions: true,
            blocks: [
                {
                    type: 'interval',
                    stepName: t('presets.build', { n: 1 }),
                    duration: { type: 'distance', value: 400 },
                    target: { type: 'vam_zone', min: '2', max: '2' },
                    intensity: 40,
                    notes: ''
                },
                {
                    type: 'interval',
                    stepName: t('presets.build', { n: 2 }),
                    duration: { type: 'distance', value: 400 },
                    target: { type: 'vam_zone', min: '3', max: '3' },
                    intensity: 55,
                    notes: ''
                },
                {
                    type: 'interval',
                    stepName: t('presets.build', { n: 3 }),
                    duration: { type: 'distance', value: 400 },
                    target: { type: 'vam_zone', min: '4', max: '4' },
                    intensity: 70,
                    notes: ''
                },
                {
                    type: 'interval',
                    stepName: t('presets.build', { n: 4 }),
                    duration: { type: 'distance', value: 400 },
                    target: { type: 'vam_zone', min: '5', max: '5' },
                    intensity: 85,
                    notes: ''
                }
            ]
        },
        {
            id: 'ramp-down',
            name: t('presets.rampDown'),
            description: t('presets.rampDownDesc'),
            visualPattern: [85, 70, 55, 40],
            requiresRepetitions: true,
            blocks: [
                {
                    type: 'interval',
                    stepName: t('labels.hard'),
                    duration: { type: 'distance', value: 400 },
                    target: { type: 'vam_zone', min: '5', max: '5' },
                    intensity: 85,
                    notes: ''
                },
                {
                    type: 'interval',
                    stepName: t('presets.medium'),
                    duration: { type: 'distance', value: 400 },
                    target: { type: 'vam_zone', min: '4', max: '4' },
                    intensity: 70,
                    notes: ''
                },
                {
                    type: 'interval',
                    stepName: t('labels.easy'),
                    duration: { type: 'distance', value: 400 },
                    target: { type: 'vam_zone', min: '3', max: '3' },
                    intensity: 55,
                    notes: ''
                },
                {
                    type: 'interval',
                    stepName: t('labels.recovery'),
                    duration: { type: 'distance', value: 400 },
                    target: { type: 'vam_zone', min: '2', max: '2' },
                    intensity: 40,
                    notes: ''
                }
            ]
        }
    ];

    const handlePresetClick = (pattern: PresetPattern) => {
        if (pattern.requiresRepetitions) {
            // Show dialog to ask for repetitions
            setPendingPattern(pattern);
        } else {
            // Add single block directly
            addPattern(pattern, 1);
        }
    };

    const addPattern = (pattern: PresetPattern, reps: number) => {
        if (pattern.requiresRepetitions && reps > 1) {
            // Create blocks with group for repetitions
            const groupId = uuidv4();
            const newBlocks: WorkoutBlock[] = pattern.blocks.map(block => ({
                ...block,
                id: uuidv4(),
                group: { id: groupId, reps }
            }));
            onSelectPreset(newBlocks);
        } else {
            // Create blocks without group (single use or single blocks)
            const newBlocks: WorkoutBlock[] = pattern.blocks.map(block => ({
                ...block,
                id: uuidv4()
            }));
            onSelectPreset(newBlocks);
        }
        setPendingPattern(null);
    };

    const getBlockColor = (index: number, total: number) => {
        if (total === 1) {
            const intensity = PRESET_PATTERNS.find(p => p.visualPattern.length === 1)?.visualPattern[0] || 50;
            if (intensity >= 80) return 'bg-blue-500';
            if (intensity >= 60) return 'bg-blue-400';
            return 'bg-green-500';
        }

        // For multi-block patterns, use alternating colors based on intensity
        const heights = PRESET_PATTERNS.find(p => p.visualPattern.length === total)?.visualPattern || [];
        const intensity = heights[index] || 50;

        if (intensity >= 80) return 'bg-blue-500';
        if (intensity >= 60) return 'bg-blue-400';
        if (intensity >= 40) return 'bg-green-400';
        return 'bg-blue-200';
    };

    return (
        <>
            {pendingPattern && (
                <RepetitionDialog
                    patternName={pendingPattern.name}
                    onConfirm={(reps) => addPattern(pendingPattern, reps)}
                    onCancel={() => setPendingPattern(null)}
                />
            )}

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {t('clickBlocksHint')}
                    </h3>
                    <button
                        type="button"
                        className="w-4 h-4 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 text-[10px] hover:bg-gray-400 dark:hover:bg-gray-500 transition"
                        title={t('clickPresetHint')}
                    >
                        ?
                    </button>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {PRESET_PATTERNS.map((pattern) => (
                        <button
                            key={pattern.id}
                            type="button"
                            onClick={() => handlePresetClick(pattern)}
                            className="group flex flex-col items-center p-2 rounded-md border border-gray-200 dark:border-gray-700 hover:border-brand-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                            title={pattern.description}
                        >
                            {/* Visual representation */}
                            <div className="flex items-end justify-center gap-0.5 h-8 w-full mb-1">
                                {pattern.visualPattern.map((height, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex-1 rounded-sm ${getBlockColor(idx, pattern.visualPattern.length)} transition-all group-hover:opacity-80`}
                                        style={{ height: `${height}%` }}
                                    />
                                ))}
                            </div>

                            {/* Label */}
                            <div className="text-center text-[10px] font-medium text-gray-700 dark:text-gray-300 leading-tight">
                                {pattern.name}
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </>
    );
}
