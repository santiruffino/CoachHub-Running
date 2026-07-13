'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CalendarRange, Plus, Copy, Pencil, Archive, Send, Layers } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';
import { AlertDialog, useAlertDialog } from '@/components/ui/AlertDialog';
import { useApiError } from '@/hooks/useApiError';
import { appLogger } from '@/lib/app-logger';
import { ApplyPlanModal } from './ApplyPlanModal';
import { plansService } from '../services/plans.service';
import type { TrainingPlan } from '../types';

const PLEX = { fontFamily: 'var(--font-plex-mono, monospace)' } as const;
const EXO = { fontFamily: 'var(--font-exo-2, sans-serif)' } as const;
const CARD_CLS = 'bg-endurix-paper dark:bg-card border border-endurix-black/15 dark:border-white/15';

interface PlansListProps {
    initialPlans: TrainingPlan[];
    athletes: { id: string; name: string; email: string }[];
    groups: { id: string; name: string }[];
}

export function PlansList({ initialPlans, athletes, groups }: PlansListProps) {
    const t = useTranslations('plans');
    const router = useRouter();
    const { translateError } = useApiError();
    const { alertState, showAlert, closeAlert } = useAlertDialog();

    const [applyPlan, setApplyPlan] = useState<TrainingPlan | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

    const itemCount = (plan: TrainingPlan) => plan.training_plan_items?.[0]?.count ?? plan.items?.length ?? 0;

    const handleDuplicate = async (plan: TrainingPlan) => {
        try {
            setBusyId(plan.id);
            await plansService.duplicate(plan.id);
            router.refresh();
        } catch (error) {
            appLogger.error('Failed to duplicate plan:', error);
            showAlert('error', translateError(error));
        } finally {
            setBusyId(null);
        }
    };

    const handleArchive = async (plan: TrainingPlan) => {
        try {
            setBusyId(plan.id);
            await plansService.remove(plan.id);
            router.refresh();
        } catch (error) {
            appLogger.error('Failed to archive plan:', error);
            showAlert('error', translateError(error));
        } finally {
            setBusyId(null);
        }
    };

    return (
        <>
            <PageHeader
                eyebrow={t('eyebrow')}
                title={t('title')}
                description={t('subtitle')}
                action={
                    <Button asChild variant="orange" className="uppercase tracking-widest text-xs font-bold">
                        <Link href="/plans/new">
                            <Plus className="w-4 h-4 mr-2" />
                            {t('newPlan')}
                        </Link>
                    </Button>
                }
            />

            {initialPlans.length === 0 ? (
                <EmptyState
                    icon={CalendarRange}
                    title={t('empty.title')}
                    description={t('empty.description')}
                    action={
                        <Button asChild variant="orange" className="uppercase tracking-widest text-xs font-bold">
                            <Link href="/plans/new">
                                <Plus className="w-4 h-4 mr-2" />
                                {t('newPlan')}
                            </Link>
                        </Button>
                    }
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {initialPlans.map((plan) => (
                        <div key={plan.id} className={`${CARD_CLS} p-6 flex flex-col gap-4 relative overflow-hidden`}>
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-endurix-orange" />
                            <div className="flex items-start justify-between gap-3 pl-2">
                                <div className="min-w-0">
                                    <h3
                                        className="text-xl font-bold text-endurix-black dark:text-foreground uppercase tracking-tight line-clamp-2"
                                        style={EXO}
                                    >
                                        {plan.name}
                                    </h3>
                                    {plan.description && (
                                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{plan.description}</p>
                                    )}
                                </div>
                                <span
                                    className="shrink-0 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest bg-endurix-orange/10 text-endurix-orange border border-endurix-orange/30"
                                    style={PLEX}
                                >
                                    {plan.type}
                                </span>
                            </div>

                            <div className="flex items-center gap-4 pl-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground" style={PLEX}>
                                <span className="flex items-center gap-1">
                                    <CalendarRange className="w-3.5 h-3.5" />
                                    {t('weeksCount', { count: plan.duration_weeks })}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Layers className="w-3.5 h-3.5" />
                                    {t('sessionsCount', { count: itemCount(plan) })}
                                </span>
                                {plan.focus && <span className="text-endurix-orange">{plan.focus}</span>}
                            </div>

                            <div className="flex items-center gap-2 pl-2 mt-auto pt-2">
                                <Button
                                    variant="orange"
                                    size="sm"
                                    className="uppercase tracking-widest text-[10px] font-bold"
                                    onClick={() => setApplyPlan(plan)}
                                >
                                    <Send className="w-3.5 h-3.5 mr-1.5" />
                                    {t('actions.apply')}
                                </Button>
                                <Button asChild variant="outline-brand" size="sm" title={t('actions.edit')}>
                                    <Link href={`/plans/${plan.id}`}>
                                        <Pencil className="w-3.5 h-3.5" />
                                    </Link>
                                </Button>
                                <Button
                                    variant="outline-brand"
                                    size="sm"
                                    title={t('actions.duplicate')}
                                    disabled={busyId === plan.id}
                                    onClick={() => handleDuplicate(plan)}
                                >
                                    <Copy className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                    variant="outline-brand"
                                    size="sm"
                                    title={t('actions.archive')}
                                    disabled={busyId === plan.id}
                                    onClick={() => handleArchive(plan)}
                                >
                                    <Archive className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <ApplyPlanModal
                plan={applyPlan}
                athletes={athletes}
                groups={groups}
                open={applyPlan !== null}
                onClose={() => setApplyPlan(null)}
                onApplied={() => router.refresh()}
            />

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
