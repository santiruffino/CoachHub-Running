'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface RepetitionDialogProps {
    patternName: string;
    onConfirm: (reps: number) => void;
    onCancel: () => void;
}

export function RepetitionDialog({ patternName, onConfirm, onCancel }: RepetitionDialogProps) {
    const t = useTranslations('builder');
    const [reps, setReps] = useState(4);

    const handleConfirm = () => {
        if (reps > 0) {
            onConfirm(reps);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-card border border-endurix-black/15 dark:border-border max-w-md w-full">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-endurix-black/10 dark:border-border bg-endurix-paper dark:bg-muted">
                    <h3 className="text-base font-bold uppercase tracking-widest text-endurix-black dark:text-foreground" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>
                        {t('howManyRepeats')}
                    </h3>
                    <button
                        onClick={onCancel}
                        className="text-endurix-black/50 dark:text-muted-foreground hover:text-endurix-black dark:hover:text-foreground transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <p className="text-sm text-muted-foreground mb-4">
                        {t('addingPattern')} <span className="font-semibold text-foreground dark:text-white">{patternName}</span>
                    </p>

                    <div>
                        <label className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-2">
                            {t('numberOfRepetitions')}
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="50"
                            value={reps}
                            onChange={(e) => setReps(Number(e.target.value))}
                            className="block w-full rounded-md border-input shadow-sm focus:border-brand-primary focus:ring-brand-primary text-lg p-3 border text-foreground dark:text-white dark:bg-muted"
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
                <div className="p-4 border-t border-border bg-muted dark:bg-background flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-white transition-colors"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="px-6 py-2 bg-brand-primary hover:bg-brand-primary-dark text-white font-semibold rounded-lg transition-colors"
                    >
                        {t('addRepeats', { reps })}
                    </button>
                </div>
            </div>
        </div>
    );
}
