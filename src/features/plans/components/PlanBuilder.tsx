'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Plus, Trash2, Copy, X, Search, Save, Pencil, RotateCcw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/ui/BackButton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, useAlertDialog } from '@/components/ui/AlertDialog';
import { useApiError } from '@/hooks/useApiError';
import { appLogger } from '@/lib/app-logger';
import { cn } from '@/lib/utils';
import { Training, TrainingType } from '@/interfaces/training';
import { WorkoutBuilder } from '@/features/trainings/components/builder/WorkoutBuilder';
import type { WorkoutBlock } from '@/features/trainings/components/builder/types';
import { plansService } from '../services/plans.service';
import type { TrainingPlan, PlanItemInput } from '../types';

const PLEX = { fontFamily: 'var(--font-plex-mono, monospace)' } as const;
const EXO = { fontFamily: 'var(--font-exo-2, sans-serif)' } as const;
const LABEL_CLS = 'text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground font-bold';
const CARD_CLS = 'bg-endurix-paper dark:bg-card border border-endurix-black/15 dark:border-white/15';

interface BuilderItem {
    key: string;
    trainingId: string;
    /** Title of the referenced template (default label). */
    templateTitle: string;
    /** Per-slot name override; null = use the template title. */
    workoutName: string | null;
    type: TrainingType;
    weekIndex: number;
    dayOfWeek: number;
    /** Per-slot structure override; null = follow the referenced template. */
    blocks: WorkoutBlock[] | null;
}

function itemLabel(item: BuilderItem): string {
    return item.workoutName?.trim() || item.templateTitle;
}

interface PlanBuilderProps {
    initialPlan?: TrainingPlan | null;
    templates: Training[];
}

const TRAINING_TYPES: TrainingType[] = [
    TrainingType.RUNNING,
    TrainingType.STRENGTH,
    TrainingType.CYCLING,
    TrainingType.SWIMMING,
    TrainingType.OTHER,
];

function newKey() {
    return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export function PlanBuilder({ initialPlan, templates }: PlanBuilderProps) {
    const t = useTranslations('plans');
    const router = useRouter();
    const { translateError } = useApiError();
    const { alertState, showAlert, closeAlert } = useAlertDialog();

    const isEdit = !!initialPlan;

    const [name, setName] = useState(initialPlan?.name ?? '');
    const [description, setDescription] = useState(initialPlan?.description ?? '');
    const [type, setType] = useState<TrainingType>((initialPlan?.type as TrainingType) ?? TrainingType.RUNNING);
    const [focus, setFocus] = useState(initialPlan?.focus ?? '');
    const [weeks, setWeeks] = useState(Math.max(1, initialPlan?.duration_weeks ?? 1));
    const [items, setItems] = useState<BuilderItem[]>(() =>
        (initialPlan?.items ?? [])
            .filter((i) => i.training)
            .map((i) => ({
                key: i.id || newKey(),
                trainingId: i.training_id,
                templateTitle: i.training!.title,
                workoutName: i.workout_name,
                type: i.training!.type,
                weekIndex: i.week_index,
                dayOfWeek: i.day_of_week,
                blocks: (i.blocks as WorkoutBlock[] | null) ?? null,
            })),
    );

    const [pickerFor, setPickerFor] = useState<{ weekIndex: number; dayOfWeek: number } | null>(null);
    const [pickerSearch, setPickerSearch] = useState('');
    const [saving, setSaving] = useState(false);

    // Per-slot workout editor state.
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [draftName, setDraftName] = useState('');
    const [draftBlocks, setDraftBlocks] = useState<WorkoutBlock[]>([]);

    const templateMap = useMemo(() => new Map(templates.map((tpl) => [tpl.id, tpl])), [templates]);
    const editingItem = editingKey ? items.find((i) => i.key === editingKey) ?? null : null;

    const openEditor = (item: BuilderItem) => {
        const seed = item.blocks ?? ((templateMap.get(item.trainingId)?.blocks as WorkoutBlock[] | undefined) ?? []);
        setDraftBlocks(seed);
        setDraftName(item.workoutName ?? '');
        setEditingKey(item.key);
    };

    const commitEditor = () => {
        if (!editingKey) return;
        setItems((prev) =>
            prev.map((i) =>
                i.key === editingKey
                    ? { ...i, blocks: draftBlocks, workoutName: draftName.trim() || null }
                    : i,
            ),
        );
        setEditingKey(null);
    };

    const resetEditorToTemplate = () => {
        if (!editingKey) return;
        setItems((prev) => prev.map((i) => (i.key === editingKey ? { ...i, blocks: null } : i)));
        setEditingKey(null);
    };

    const dayLabels = [t('days.mon'), t('days.tue'), t('days.wed'), t('days.thu'), t('days.fri'), t('days.sat'), t('days.sun')];

    const itemsByCell = useMemo(() => {
        const map = new Map<string, BuilderItem[]>();
        for (const item of items) {
            const k = `${item.weekIndex}-${item.dayOfWeek}`;
            if (!map.has(k)) map.set(k, []);
            map.get(k)!.push(item);
        }
        return map;
    }, [items]);

    const addTemplateToCell = (template: Training) => {
        if (!pickerFor) return;
        setItems((prev) => [
            ...prev,
            {
                key: newKey(),
                trainingId: template.id,
                templateTitle: template.title,
                workoutName: null,
                type: template.type,
                weekIndex: pickerFor.weekIndex,
                dayOfWeek: pickerFor.dayOfWeek,
                blocks: null,
            },
        ]);
        setPickerFor(null);
        setPickerSearch('');
    };

    const removeItem = (key: string) => setItems((prev) => prev.filter((i) => i.key !== key));

    const addWeek = () => setWeeks((w) => Math.min(52, w + 1));

    const removeLastWeek = () => {
        if (weeks <= 1) return;
        const target = weeks - 1;
        setItems((prev) => prev.filter((i) => i.weekIndex !== target));
        setWeeks(target);
    };

    const duplicateWeek = (weekIndex: number) => {
        if (weeks >= 52) return;
        const target = weeks; // appended new week index
        setItems((prev) => [
            ...prev,
            ...prev
                .filter((i) => i.weekIndex === weekIndex)
                .map((i) => ({ ...i, key: newKey(), weekIndex: target })),
        ]);
        setWeeks((w) => w + 1);
    };

    const handleSave = async () => {
        if (!name.trim()) {
            showAlert('warning', t('builder.nameRequired'));
            return;
        }
        const payloadItems: PlanItemInput[] = items.map((i, index) => ({
            trainingId: i.trainingId,
            weekIndex: i.weekIndex,
            dayOfWeek: i.dayOfWeek,
            workoutName: i.workoutName,
            blocks: i.blocks,
            sortOrder: index,
        }));

        try {
            setSaving(true);
            if (isEdit && initialPlan) {
                await plansService.update(initialPlan.id, {
                    name: name.trim(),
                    description: description || null,
                    type,
                    durationWeeks: weeks,
                    focus: focus || null,
                    items: payloadItems,
                });
            } else {
                await plansService.create({
                    name: name.trim(),
                    description: description || null,
                    type,
                    durationWeeks: weeks,
                    focus: focus || null,
                    items: payloadItems,
                });
            }
            router.push('/plans');
            router.refresh();
        } catch (error) {
            appLogger.error('Failed to save plan:', error);
            showAlert('error', translateError(error));
            setSaving(false);
        }
    };

    const filteredTemplates = useMemo(() => {
        if (!pickerSearch) return templates;
        const q = pickerSearch.toLowerCase();
        return templates.filter((tpl) => tpl.title.toLowerCase().includes(q));
    }, [templates, pickerSearch]);

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <BackButton href="/plans" label={t('builder.back')} showLabel />
                <Button
                    variant="orange"
                    onClick={handleSave}
                    disabled={saving}
                    className="uppercase tracking-widest text-xs font-bold"
                >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? t('builder.saving') : isEdit ? t('builder.saveChanges') : t('builder.createPlan')}
                </Button>
            </div>

            {/* Plan meta */}
            <div className={`${CARD_CLS} p-6 grid grid-cols-1 lg:grid-cols-2 gap-6`}>
                <div className="lg:col-span-2">
                    <label className={`${LABEL_CLS} block mb-2`} style={PLEX}>
                        {t('builder.name')} <span className="text-endurix-orange">*</span>
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t('builder.namePlaceholder')}
                        className="w-full bg-transparent border-0 border-b border-endurix-black/20 dark:border-white/20 px-0 py-2 text-2xl font-bold text-endurix-black dark:text-foreground focus:ring-0 focus:border-endurix-orange transition-colors"
                        style={EXO}
                    />
                </div>
                <div>
                    <label className={`${LABEL_CLS} block mb-2`} style={PLEX}>
                        {t('builder.type')}
                    </label>
                    <select
                        value={type}
                        onChange={(e) => setType(e.target.value as TrainingType)}
                        className="w-full bg-transparent border border-endurix-black/20 dark:border-white/20 px-3 py-2 text-sm font-medium text-endurix-black dark:text-foreground focus:outline-none focus:border-endurix-orange transition-colors"
                    >
                        {TRAINING_TYPES.map((tp) => (
                            <option key={tp} value={tp} className="bg-endurix-paper dark:bg-card">
                                {tp}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className={`${LABEL_CLS} block mb-2`} style={PLEX}>
                        {t('builder.focus')}
                    </label>
                    <input
                        type="text"
                        value={focus}
                        onChange={(e) => setFocus(e.target.value)}
                        placeholder={t('builder.focusPlaceholder')}
                        className="w-full bg-transparent border border-endurix-black/20 dark:border-white/20 px-3 py-2 text-sm font-medium text-endurix-black dark:text-foreground focus:outline-none focus:border-endurix-orange transition-colors"
                    />
                </div>
                <div className="lg:col-span-2">
                    <label className={`${LABEL_CLS} block mb-2`} style={PLEX}>
                        {t('builder.description')}
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={2}
                        placeholder={t('builder.descriptionPlaceholder')}
                        className="w-full bg-transparent border border-endurix-black/20 dark:border-white/20 px-3 py-2 text-sm text-endurix-black dark:text-foreground focus:outline-none focus:border-endurix-orange transition-colors resize-none"
                    />
                </div>
            </div>

            {/* Week grid */}
            <div className="space-y-4">
                {Array.from({ length: weeks }, (_, weekIndex) => (
                    <div key={weekIndex} className={`${CARD_CLS} p-4`}>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-endurix-black dark:text-foreground" style={PLEX}>
                                {t('builder.weekN', { n: weekIndex + 1 })}
                            </h3>
                            <button
                                type="button"
                                onClick={() => duplicateWeek(weekIndex)}
                                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-endurix-orange transition-colors"
                                style={PLEX}
                                title={t('builder.duplicateWeek')}
                            >
                                <Copy className="w-3.5 h-3.5" />
                                {t('builder.duplicateWeek')}
                            </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                            {dayLabels.map((label, dayOfWeek) => {
                                const cellItems = itemsByCell.get(`${weekIndex}-${dayOfWeek}`) || [];
                                return (
                                    <div
                                        key={dayOfWeek}
                                        className="min-h-[120px] border border-endurix-black/10 dark:border-white/10 p-2 flex flex-col gap-2 bg-endurix-black/[0.02] dark:bg-white/[0.02]"
                                    >
                                        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground" style={PLEX}>
                                            {label}
                                        </span>
                                        {cellItems.map((item) => (
                                            <div
                                                key={item.key}
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => openEditor(item)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        openEditor(item);
                                                    }
                                                }}
                                                title={t('builder.editSlot')}
                                                className="group relative bg-endurix-orange/10 border border-endurix-orange/30 p-1.5 pr-5 cursor-pointer hover:border-endurix-orange transition-colors"
                                            >
                                                <span className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest text-endurix-orange" style={PLEX}>
                                                    {item.type}
                                                    {item.blocks !== null && (
                                                        <span
                                                            className="inline-flex items-center gap-0.5 text-endurix-orange"
                                                            title={t('builder.edited')}
                                                        >
                                                            <Pencil className="w-2.5 h-2.5" />
                                                        </span>
                                                    )}
                                                </span>
                                                <span className="block text-[11px] font-medium text-endurix-black dark:text-foreground line-clamp-2 leading-tight" style={EXO}>
                                                    {itemLabel(item)}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeItem(item.key);
                                                    }}
                                                    className="absolute top-1 right-1 text-endurix-orange/60 hover:text-endurix-orange"
                                                    aria-label={t('builder.removeItem')}
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => setPickerFor({ weekIndex, dayOfWeek })}
                                            className={cn(
                                                'mt-auto flex items-center justify-center gap-1 py-1.5 border border-dashed border-endurix-orange/30 text-endurix-orange hover:bg-endurix-orange/10 transition-colors text-[10px] font-bold uppercase tracking-widest',
                                            )}
                                            style={PLEX}
                                        >
                                            <Plus className="w-3 h-3" />
                                            {t('builder.add')}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex items-center gap-3">
                <Button variant="outline-brand" size="sm" onClick={addWeek} className="uppercase tracking-widest text-[10px] font-bold">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    {t('builder.addWeek')}
                </Button>
                {weeks > 1 && (
                    <Button variant="outline-brand" size="sm" onClick={removeLastWeek} className="uppercase tracking-widest text-[10px] font-bold">
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                        {t('builder.removeWeek')}
                    </Button>
                )}
            </div>

            {/* Template picker */}
            <Dialog open={pickerFor !== null} onOpenChange={(v) => !v && setPickerFor(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="uppercase tracking-tight">{t('builder.pickTemplate')}</DialogTitle>
                    </DialogHeader>
                    <div className="relative mb-3">
                        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-endurix-orange" />
                        <input
                            type="text"
                            value={pickerSearch}
                            onChange={(e) => setPickerSearch(e.target.value)}
                            placeholder={t('builder.searchTemplates')}
                            className="w-full bg-transparent border-b border-endurix-black/20 dark:border-white/20 pl-10 py-2 text-sm focus:ring-0 focus:border-endurix-orange"
                        />
                    </div>
                    <div className="max-h-72 overflow-y-auto space-y-2">
                        {filteredTemplates.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-6">{t('builder.noTemplates')}</p>
                        ) : (
                            filteredTemplates.map((tpl) => (
                                <button
                                    key={tpl.id}
                                    type="button"
                                    onClick={() => addTemplateToCell(tpl)}
                                    className={`w-full text-left ${CARD_CLS} hover:border-endurix-orange p-3 flex items-center justify-between transition-colors`}
                                >
                                    <span className="text-sm font-bold text-endurix-black dark:text-foreground" style={EXO}>
                                        {tpl.title}
                                    </span>
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-endurix-orange bg-endurix-orange/10 border border-endurix-orange/30 px-2 py-0.5" style={PLEX}>
                                        {tpl.type}
                                    </span>
                                </button>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Per-slot workout editor */}
            <Dialog open={editingKey !== null} onOpenChange={(v) => !v && setEditingKey(null)}>
                <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0 gap-0 flex flex-col overflow-hidden">
                    <DialogHeader className="p-4 border-b border-endurix-black/10 dark:border-white/10 space-y-3">
                        <DialogTitle className="uppercase tracking-tight flex items-center gap-2">
                            {t('builder.editSlot')}
                            {editingItem && (
                                <span className="text-[10px] font-normal normal-case text-muted-foreground" style={PLEX}>
                                    {t('builder.basedOn', { name: editingItem.templateTitle })}
                                </span>
                            )}
                        </DialogTitle>
                        <input
                            type="text"
                            value={draftName}
                            onChange={(e) => setDraftName(e.target.value)}
                            placeholder={editingItem?.templateTitle || t('builder.workoutNamePlaceholder')}
                            className="w-full bg-transparent border-0 border-b border-endurix-black/20 dark:border-white/20 px-0 py-1.5 text-base font-bold text-endurix-black dark:text-foreground focus:ring-0 focus:border-endurix-orange transition-colors"
                            style={EXO}
                        />
                    </DialogHeader>

                    <div className="flex-1 min-h-0">
                        {editingItem && (
                            <WorkoutBuilder
                                key={editingItem.key}
                                initialBlocks={draftBlocks}
                                onChange={setDraftBlocks}
                                trainingType={editingItem.type}
                                compactLayout
                                footerContent={
                                    <div className="space-y-2">
                                        <Button
                                            variant="orange"
                                            onClick={commitEditor}
                                            className="w-full uppercase tracking-widest text-xs font-bold"
                                        >
                                            <Check className="w-4 h-4 mr-2" />
                                            {t('builder.done')}
                                        </Button>
                                        {editingItem.blocks !== null && (
                                            <Button
                                                variant="outline-brand"
                                                onClick={resetEditorToTemplate}
                                                className="w-full uppercase tracking-widest text-[10px] font-bold"
                                            >
                                                <RotateCcw className="w-3.5 h-3.5 mr-2" />
                                                {t('builder.resetToTemplate')}
                                            </Button>
                                        )}
                                    </div>
                                }
                            />
                        )}
                    </div>
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
        </div>
    );
}
