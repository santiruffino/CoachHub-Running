'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface RepetitionDialogProps {
    patternName: string;
    onConfirm: (reps: number) => void;
    onCancel: () => void;
}

export function RepetitionDialog({ patternName, onConfirm, onCancel }: RepetitionDialogProps) {
    const [reps, setReps] = useState(4);

    const handleConfirm = () => {
        if (reps > 0) {
            onConfirm(reps);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        How many repeats?
                    </h3>
                    <button
                        onClick={onCancel}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Adding pattern: <span className="font-semibold text-gray-900 dark:text-white">{patternName}</span>
                    </p>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Number of repetitions
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="50"
                            value={reps}
                            onChange={(e) => setReps(Number(e.target.value))}
                            className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary text-lg p-3 border text-gray-900 dark:text-white dark:bg-gray-700"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleConfirm();
                                }
                            }}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="px-6 py-2 bg-brand-primary hover:bg-brand-primary-dark text-white font-semibold rounded-lg transition-colors"
                    >
                        Add {reps}× Repeats
                    </button>
                </div>
            </div>
        </div>
    );
}
