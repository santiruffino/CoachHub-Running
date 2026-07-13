'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { CalendarRange, Layers, Send, Plus, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ApplyPlanModal } from '@/features/plans/components/ApplyPlanModal';
import type { TrainingPlan } from '@/features/plans/types';

const PLEX = { fontFamily: 'var(--font-plex-mono, monospace)' } as const;
const EXO = { fontFamily: 'var(--font-exo-2, sans-serif)' } as const;
const CARD_CLS = 'bg-endurix-paper dark:bg-card border border-endurix-black/15 dark:border-white/15';

interface GroupPlansTabProps {
    groupId: string;
    groupName: string;
    plans: TrainingPlan[];
    onApplied?: () => void;
}

/**
 * "Planes" tab inside a group: lists the team's mesocycle templates and lets a
 * coach roll a whole plan out to the entire group in one click (start date +
 * optional weeks), reusing ApplyPlanModal locked to this group.
 */
export function GroupPlansTab({ groupId, groupName, plans, onApplied }: GroupPlansTabProps) {
    const t = useTranslations('plans');
    const tGroup = useTranslations('groups.detail');
    const [applyPlan, setApplyPlan] = useState<TrainingPlan | null>(null);

    const itemCount = (plan: TrainingPlan) => plan.training_plan_items?.[0]?.count ?? plan.items?.length ?? 0;

    if (plans.length === 0) {
        return (
            <>
                <EmptyState
                    icon={CalendarRange}
                    title={t('empty.title')}
                    description={tGroup('plansEmptyDescription')}
                    action={
                        <Button asChild variant="orange" className="uppercase tracking-widest text-xs font-bold">
                            <Link href="/plans/new">
                                <Plus className="w-4 h-4 mr-2" />
                                {t('newPlan')}
                            </Link>
                        </Button>
                    }
                />
            </>
        );
    }

    return (
        <>
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                <p className="text-sm text-muted-foreground">{tGroup('plansHint')}</p>
                <Button asChild variant="outline-brand" size="sm" className="uppercase tracking-widest text-[10px] font-bold">
                    <Link href="/plans/new">
                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                        {t('newPlan')}
                    </Link>
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {plans.map((plan) => (
                    <div key={plan.id} className={`${CARD_CLS} p-6 flex flex-col gap-4 relative overflow-hidden`}>
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-endurix-orange" />
                        <div className="flex items-start justify-between gap-3 pl-2">
                            <div className="min-w-0">
                                <h3
                                    className="text-lg font-bold text-endurix-black dark:text-foreground uppercase tracking-tight line-clamp-2"
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
                                {tGroup('applyToGroup')}
                            </Button>
                            <Button asChild variant="outline-brand" size="sm" title={t('actions.edit')}>
                                <Link href={`/plans/${plan.id}`}>
                                    <Pencil className="w-3.5 h-3.5" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            <ApplyPlanModal
                plan={applyPlan}
                lockedGroup={{ id: groupId, name: groupName }}
                open={applyPlan !== null}
                onClose={() => setApplyPlan(null)}
                onApplied={onApplied}
            />
        </>
    );
}
