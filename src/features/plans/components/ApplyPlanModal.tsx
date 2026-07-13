'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { appLogger } from '@/lib/app-logger';
import { useApiError } from '@/hooks/useApiError';
import { AlertDialog, useAlertDialog } from '@/components/ui/AlertDialog';
import { SearchableMultiSelect } from './SearchableMultiSelect';
import { plansService } from '../services/plans.service';
import type { TrainingPlan } from '../types';

const PLEX = { fontFamily: 'var(--font-plex-mono, monospace)' } as const;
const LABEL_CLS = 'text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground font-bold';

interface ApplyPlanModalProps {
    plan: TrainingPlan | null;
    athletes?: { id: string; name: string; email: string }[];
    groups?: { id: string; name: string }[];
    /** When set, the modal targets this group only and hides the target pickers. */
    lockedGroup?: { id: string; name: string };
    open: boolean;
    onClose: () => void;
    onApplied?: () => void;
}

export function ApplyPlanModal({ plan, athletes = [], groups = [], lockedGroup, open, onClose, onApplied }: ApplyPlanModalProps) {
    const t = useTranslations('plans');
    const { translateError } = useApiError();
    const { alertState, showAlert, closeAlert } = useAlertDialog();

    const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [athleteIds, setAthleteIds] = useState<string[]>([]);
    const [groupIds, setGroupIds] = useState<string[]>([]);
    const [applyAllWeeks, setApplyAllWeeks] = useState(true);
    const [selectedWeeks, setSelectedWeeks] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);

    const weekCount = plan?.duration_weeks ?? 1;

    const toggleWeek = (w: number) => {
        setSelectedWeeks((prev) => (prev.includes(w) ? prev.filter((x) => x !== w) : [...prev, w]));
    };

    const handleApply = async () => {
        if (!plan) return;
        if (!lockedGroup && athleteIds.length === 0 && groupIds.length === 0) {
            showAlert('warning', t('apply.selectAtLeastOne'));
            return;
        }
        if (!applyAllWeeks && selectedWeeks.length === 0) {
            showAlert('warning', t('apply.selectAtLeastOneWeek'));
            return;
        }
        try {
            setLoading(true);
            const res = await plansService.apply(plan.id, {
                startDate,
                athleteIds: !lockedGroup && athleteIds.length > 0 ? athleteIds : undefined,
                groupIds: lockedGroup ? [lockedGroup.id] : groupIds.length > 0 ? groupIds : undefined,
                weekIndexes: applyAllWeeks ? undefined : selectedWeeks,
            });
            showAlert(
                'success',
                t('apply.success', {
                    assignments: res.data.assignmentCount,
                    athletes: res.data.athleteCount,
                }),
            );
            onApplied?.();
            setTimeout(() => {
                closeAlert();
                onClose();
            }, 1500);
        } catch (error) {
            appLogger.error('Failed to apply plan:', error);
            showAlert('error', translateError(error));
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="uppercase tracking-tight">
                            {t('apply.title', { name: plan?.name ?? '' })}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6 py-2">
                        <div>
                            <label className={`${LABEL_CLS} block mb-3`} style={PLEX}>
                                {t('apply.startDate')} <span className="text-endurix-orange">*</span>
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full bg-transparent border-0 border-b border-endurix-black/20 dark:border-white/20 px-0 py-2 text-lg font-bold text-endurix-black dark:text-foreground focus:ring-0 focus:border-endurix-orange transition-colors"
                            />
                            <p className="text-[11px] text-muted-foreground mt-1">{t('apply.startDateHint')}</p>
                        </div>

                        {lockedGroup ? (
                            <div>
                                <label className={`${LABEL_CLS} block mb-3`} style={PLEX}>
                                    {t('apply.target')}
                                </label>
                                <div className="flex items-center gap-2 border border-endurix-orange/30 bg-endurix-orange/10 px-3 py-2 text-endurix-orange text-sm font-semibold" style={PLEX}>
                                    <Users className="w-4 h-4" />
                                    {lockedGroup.name}
                                </div>
                            </div>
                        ) : (
                            <>
                                <div>
                                    <label className={`${LABEL_CLS} block mb-3`} style={PLEX}>
                                        {t('apply.athletes')}
                                    </label>
                                    <SearchableMultiSelect
                                        items={athletes.map((a) => ({ id: a.id, label: a.name, subLabel: a.email }))}
                                        selectedIds={athleteIds}
                                        onChange={setAthleteIds}
                                        placeholder={t('apply.searchAthletes')}
                                        noMatchesLabel={t('apply.noMatches')}
                                    />
                                </div>

                                <div>
                                    <label className={`${LABEL_CLS} block mb-3`} style={PLEX}>
                                        {t('apply.groups')}
                                    </label>
                                    <SearchableMultiSelect
                                        items={groups.map((g) => ({ id: g.id, label: g.name }))}
                                        selectedIds={groupIds}
                                        onChange={setGroupIds}
                                        placeholder={t('apply.searchGroups')}
                                        noMatchesLabel={t('apply.noMatches')}
                                    />
                                </div>
                            </>
                        )}

                        {weekCount > 1 && (
                            <div>
                                <label className="flex items-center gap-3 cursor-pointer mb-3">
                                    <input
                                        type="checkbox"
                                        checked={applyAllWeeks}
                                        onChange={(e) => setApplyAllWeeks(e.target.checked)}
                                        className="w-4 h-4 accent-endurix-orange"
                                    />
                                    <span className={LABEL_CLS} style={PLEX}>
                                        {t('apply.allWeeks')}
                                    </span>
                                </label>
                                {!applyAllWeeks && (
                                    <div className="flex flex-wrap gap-2">
                                        {Array.from({ length: weekCount }, (_, w) => (
                                            <button
                                                key={w}
                                                type="button"
                                                onClick={() => toggleWeek(w)}
                                                className={`px-3 py-1 text-xs font-bold border transition-colors ${
                                                    selectedWeeks.includes(w)
                                                        ? 'bg-endurix-orange text-white border-endurix-orange'
                                                        : 'bg-transparent text-muted-foreground border-endurix-black/20 dark:border-white/20'
                                                }`}
                                                style={PLEX}
                                            >
                                                {t('apply.weekN', { n: w + 1 })}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline-brand" onClick={onClose} disabled={loading}>
                            {t('apply.cancel')}
                        </Button>
                        <Button variant="orange" onClick={handleApply} disabled={loading}>
                            {loading ? t('apply.applying') : t('apply.confirm')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog
                open={alertState.open}
                onClose={closeAlert}
                type={alertState.type}
                title={alertState.title}
                message={alertState.message}
                confirmText={alertState.confirmText}
            />
        </>
    );
}
