'use client';

import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { WorkoutBlock, BlockType, DurationType, TargetType } from './types';
import { X, Repeat } from 'lucide-react';

interface RepeatWizardProps {
    onAdd: (blocks: WorkoutBlock[]) => void;
    onClose: () => void;
}

export function RepeatWizard({ onAdd, onClose }: RepeatWizardProps) {
    const [reps, setReps] = useState(6);

    // Active Interval State
    const [activeDurationType, setActiveDurationType] = useState<DurationType>('time');
    const [activeDurationValue, setActiveDurationValue] = useState(180); // 3 mins default
    const [activeTargetType, setActiveTargetType] = useState<TargetType>('pace');
    const [activeTargetMin, setActiveTargetMin] = useState<string>('4:00');
    const [activeTargetMax, setActiveTargetMax] = useState<string>('3:45');

    // Recovery Interval State
    const [recoveryDurationType, setRecoveryDurationType] = useState<DurationType>('time');
    const [recoveryDurationValue, setRecoveryDurationValue] = useState(60); // 1 min default
    const [recoveryTargetType, setRecoveryTargetType] = useState<TargetType>('pace');
    const [recoveryTargetMin, setRecoveryTargetMin] = useState<string>('6:00');
    const [recoveryTargetMax, setRecoveryTargetMax] = useState<string>('5:30');

    const handleGenerate = () => {
        const newBlocks: WorkoutBlock[] = [];
        const groupId = uuidv4(); // Unique ID for this set of repetitions

        for (let i = 0; i < reps; i++) {
            // Add Active Block
            newBlocks.push({
                id: uuidv4(),
                type: 'interval',
                duration: { type: activeDurationType, value: activeDurationValue },
                target: { type: activeTargetType, min: activeTargetMin, max: activeTargetMax },
                notes: `Rep ${i + 1}/${reps}`,
                group: { id: groupId, reps }
            });

            // Add Recovery Block
            newBlocks.push({
                id: uuidv4(),
                type: 'recovery',
                duration: { type: recoveryDurationType, value: recoveryDurationValue },
                target: { type: recoveryTargetType, min: recoveryTargetMin, max: recoveryTargetMax },
                group: { id: groupId, reps }
            });
        }

        onAdd(newBlocks);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center">
                        <Repeat className="w-5 h-5 mr-2 text-brand-primary" />
                        Repeat Wizard
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Repetitions */}
                    <div className="flex items-center space-x-4">
                        <label className="text-sm font-semibold text-gray-700">Repetitions:</label>
                        <input
                            type="number"
                            min="1"
                            max="50"
                            value={reps}
                            onChange={(e) => setReps(Number(e.target.value))}
                            className="w-20 rounded-md border-gray-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary p-2 border"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Active Interval Configuration */}
                        <div className="bg-brand-primary/5 p-4 rounded-lg border border-brand-primary/20">
                            <h4 className="font-bold text-brand-deep mb-3 text-sm uppercase tracking-wide">Runs (Interval)</h4>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Duration</label>
                                    <div className="flex gap-2">
                                        <select
                                            value={activeDurationType}
                                            onChange={(e) => setActiveDurationType(e.target.value as DurationType)}
                                            className="text-sm rounded border-gray-300 p-1.5 w-24"
                                        >
                                            <option value="time">Time</option>
                                            <option value="distance">Distance</option>
                                        </select>
                                        <input
                                            type="number"
                                            value={activeDurationValue}
                                            onChange={(e) => setActiveDurationValue(Number(e.target.value))}
                                            className="text-sm rounded border-gray-300 p-1.5 flex-1"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Target</label>
                                    <div className="flex gap-2 mb-2">
                                        <select
                                            value={activeTargetType}
                                            onChange={(e) => setActiveTargetType(e.target.value as TargetType)}
                                            className="text-sm rounded border-gray-300 p-1.5 w-full"
                                        >
                                            <option value="pace">Pace (min/km)</option>
                                            <option value="heart_rate">Heart Rate</option>
                                        </select>
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            placeholder="Min"
                                            value={activeTargetMin}
                                            onChange={(e) => setActiveTargetMin(e.target.value)}
                                            className="text-sm rounded border-gray-300 p-1.5 w-1/2"
                                        />
                                        <input
                                            placeholder="Max"
                                            value={activeTargetMax}
                                            onChange={(e) => setActiveTargetMax(e.target.value)}
                                            className="text-sm rounded border-gray-300 p-1.5 w-1/2"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recovery Interval Configuration */}
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                            <h4 className="font-bold text-green-700 mb-3 text-sm uppercase tracking-wide">Recoveries</h4>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Duration</label>
                                    <div className="flex gap-2">
                                        <select
                                            value={recoveryDurationType}
                                            onChange={(e) => setRecoveryDurationType(e.target.value as DurationType)}
                                            className="text-sm rounded border-gray-300 p-1.5 w-24"
                                        >
                                            <option value="time">Time</option>
                                            <option value="distance">Distance</option>
                                        </select>
                                        <input
                                            type="number"
                                            value={recoveryDurationValue}
                                            onChange={(e) => setRecoveryDurationValue(Number(e.target.value))}
                                            className="text-sm rounded border-gray-300 p-1.5 flex-1"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Target</label>
                                    <div className="flex gap-2 mb-2">
                                        <select
                                            value={recoveryTargetType}
                                            onChange={(e) => setRecoveryTargetType(e.target.value as TargetType)}
                                            className="text-sm rounded border-gray-300 p-1.5 w-full"
                                        >
                                            <option value="pace">Pace (min/km)</option>
                                            <option value="heart_rate">Heart Rate</option>
                                        </select>
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            placeholder="Min"
                                            value={recoveryTargetMin}
                                            onChange={(e) => setRecoveryTargetMin(e.target.value)}
                                            className="text-sm rounded border-gray-300 p-1.5 w-1/2"
                                        />
                                        <input
                                            placeholder="Max"
                                            value={recoveryTargetMax}
                                            onChange={(e) => setRecoveryTargetMax(e.target.value)}
                                            className="text-sm rounded border-gray-300 p-1.5 w-1/2"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleGenerate}
                        className="px-6 py-2 bg-brand-primary text-brand-deep font-bold rounded-lg shadow-sm hover:bg-yellow-400 hover:shadow transition-all text-sm"
                    >
                        Generate {reps * 2} Blocks
                    </button>
                </div>
            </div>
        </div>
    );
}
