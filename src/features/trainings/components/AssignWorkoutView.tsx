'use client';
import { appLogger } from '@/lib/app-logger';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { WorkoutBuilder } from '@/features/trainings/components/builder/WorkoutBuilder';
import { WorkoutBlock } from '@/features/trainings/components/builder/types';
import { Training, TrainingType } from '@/interfaces/training';
import { Athlete } from '@/interfaces/athlete';
import { Group } from '@/interfaces/group';
import { Button } from '@/components/ui/button';
import { trainingsService } from '@/features/trainings/services/trainings.service';
import { ArrowRight, Search, Check, Sparkles, LayoutTemplate, Clock, X, CalendarDays, Users, Gauge } from 'lucide-react';
import { BackButton } from '@/components/ui/BackButton';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertDialog, useAlertDialog } from '@/components/ui/AlertDialog';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { useApiError } from '@/hooks/useApiError';

const PLEX = { fontFamily: 'var(--font-plex-mono, monospace)' } as const;
const EXO = { fontFamily: 'var(--font-exo-2, sans-serif)' } as const;
const LABEL_CLS = 'text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground';
const CARD_CLS = 'bg-endurix-paper dark:bg-card border border-endurix-black/15 dark:border-white/15';
const ROW_CLS = 'flex items-center gap-3 p-4 bg-endurix-black/5 dark:bg-white/5 border border-endurix-black/10 dark:border-white/10';

// Custom Searchable Dropdown for Performance Curator aesthetic
function SearchableMultiSelect({
    items,
    selectedIds,
    onChange,
    placeholder,
    noMatchesLabel,
}: {
    items: { id: string; label: string; subLabel?: string }[];
    selectedIds: string[];
    onChange: (ids: string[]) => void;
    placeholder: string;
    noMatchesLabel: string;
}) {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    const filtered = useMemo(() => {
        if (!search) return items;
        return items.filter(item =>
            item.label.toLowerCase().includes(search.toLowerCase()) ||
            (item.subLabel && item.subLabel.toLowerCase().includes(search.toLowerCase()))
        );
    }, [items, search]);

    const toggleItem = (id: string) => {
        if (selectedIds.includes(id)) {
            onChange(selectedIds.filter(v => v !== id));
        } else {
            onChange([...selectedIds, id]);
        }
    };

    const removeSelectedItem = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        onChange(selectedIds.filter(v => v !== id));
    };

    return (
        <div className="relative w-full">
            {selectedIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                    {selectedIds.map(id => {
                        const item = items.find(i => i.id === id);
                        if (!item) return null;
                        return (
                            <div key={id} className="flex items-center bg-endurix-orange/10 text-endurix-orange border border-endurix-orange/30 px-3 py-1 text-xs font-semibold tracking-wide" style={PLEX}>
                                {item.label}
                                <button type="button" onClick={(e) => removeSelectedItem(e, id)} className="ml-2 text-endurix-orange/70 hover:text-endurix-orange">
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        )
                    })}
                </div>
            )}

            <div className="relative">
                <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-endurix-orange" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder}
                    className="w-full bg-transparent border-0 border-b border-endurix-black/20 dark:border-white/20 pl-8 pr-0 py-2 text-endurix-black dark:text-foreground focus:ring-0 focus:border-endurix-orange placeholder-endurix-black/30 dark:placeholder:text-muted-foreground/50 transition-colors"
                />
            </div>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute top-full left-0 right-0 mt-2 z-20 bg-endurix-paper dark:bg-card border border-endurix-black/15 dark:border-white/15 max-h-60 overflow-y-auto w-full">
                        {filtered.length === 0 ? (
                            <div className="p-4 text-xs tracking-widest text-endurix-black/50 dark:text-muted-foreground uppercase font-bold text-center" style={PLEX}>
                                {noMatchesLabel}
                            </div>
                        ) : (
                            filtered.map(item => {
                                const isSelected = selectedIds.includes(item.id);
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => toggleItem(item.id)}
                                        className={cn(
                                            "w-full flex items-center justify-between px-4 py-3 hover:bg-endurix-orange/5 dark:hover:bg-endurix-orange/10 transition-colors text-left border-b border-endurix-black/8 dark:border-white/8 last:border-b-0",
                                            isSelected && "bg-endurix-orange/10"
                                        )}
                                    >
                                        <div className="flex flex-col">
                                            <span className={cn(
                                                "text-sm font-semibold transition-colors",
                                                isSelected ? "text-endurix-orange" : "text-endurix-black dark:text-foreground"
                                            )}>
                                                {item.label}
                                            </span>
                                            {item.subLabel && <span className="text-xs text-muted-foreground">{item.subLabel}</span>}
                                        </div>
                                        {isSelected && <Check className="w-4 h-4 text-endurix-orange" />}
                                    </button>
                                )
                            })
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

interface AssignWorkoutViewProps {
    initialAthletes: Athlete[];
    initialGroups: Group[];
    initialTemplates: Training[];
    preselectedAthleteId: string | null;
    initialTemplate: Training | null;
}

export function AssignWorkoutView({
    initialAthletes,
    initialGroups,
    initialTemplates,
    preselectedAthleteId,
    initialTemplate
}: AssignWorkoutViewProps) {
    const router = useRouter();
    const tAssign = useTranslations('trainings.assign');
    const { translateError } = useApiError();

    const [step, setStep] = useState<'select-source' | 'select-template' | 'build' | 'assign-details'>(
        initialTemplate ? 'assign-details' : 'select-source'
    );
    const [workoutSource, setWorkoutSource] = useState<'template' | 'new' | null>(initialTemplate ? 'template' : null);
    const [selectedTemplate, setSelectedTemplate] = useState<Training | null>(initialTemplate);
    const [templates] = useState<Training[]>(initialTemplates);
    const [blocks, setBlocks] = useState<WorkoutBlock[]>(initialTemplate?.blocks || []);
    const [selectedAthleteIds, setSelectedAthleteIds] = useState<string[]>(preselectedAthleteId ? [preselectedAthleteId] : []);
    const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
    const [scheduledDate, setScheduledDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [expectedRpe, setExpectedRpe] = useState(initialTemplate?.expectedRpe || 5);
    const [workoutName, setWorkoutName] = useState('');
    const [saveAsTemplate, setSaveAsTemplate] = useState(false);
    const [templateTitle, setTemplateTitle] = useState('');

    const [athletes] = useState<Athlete[]>(initialAthletes);
    const [groups] = useState<Group[]>(initialGroups);
    const [loading, setLoading] = useState(false);
    const { alertState, showAlert, closeAlert } = useAlertDialog();

    const builderAthleteId = preselectedAthleteId || (selectedAthleteIds.length === 1 ? selectedAthleteIds[0] : undefined);

    const handleAssign = async () => {
        if (selectedAthleteIds.length === 0 && selectedGroupIds.length === 0) {
            showAlert('warning', tAssign('selectAtLeastOne'));
            return;
        }

        if (!scheduledDate) {
            showAlert('warning', tAssign('errorNoDate'));
            return;
        }

        if (blocks.length === 0 && !selectedTemplate) {
            showAlert('warning', tAssign('errorNoBlocks'));
            return;
        }

        try {
            setLoading(true);
            let trainingIdToAssign: string;

            if (workoutSource === 'new') {
                const newTraining = await trainingsService.create({
                    title: saveAsTemplate ? (templateTitle || 'Protocolo sin título') : (workoutName || `Entrenamiento ${format(new Date(`${scheduledDate}T00:00:00`), 'dd/MM/yyyy')}`),
                    type: TrainingType.RUNNING,
                    description: 'Entrenamiento diario personalizado.',
                    blocks,
                    isTemplate: saveAsTemplate,
                    expectedRpe
                });
                trainingIdToAssign = newTraining.data.id;
            } else {
                trainingIdToAssign = selectedTemplate!.id;
            }

            await trainingsService.assign({
                trainingId: trainingIdToAssign,
                athleteIds: selectedAthleteIds.length > 0 ? selectedAthleteIds : undefined,
                groupIds: selectedGroupIds.length > 0 ? selectedGroupIds : undefined,
                scheduledDate: new Date(`${scheduledDate}T00:00:00`).toISOString(),
                expectedRpe,
                workoutName: workoutName || undefined,
            });
            showAlert('success', tAssign('successAssigned'));
            setTimeout(() => router.push(preselectedAthleteId ? `/athletes/${preselectedAthleteId}` : '/athletes'), 1500);
        } catch (error) {
            appLogger.error('Failed to assign workout:', error);
            showAlert('error', translateError(error));
        } finally {
            setLoading(false);
        }
    };

    const estTimeMinutes = useMemo(() => {
        let total = 0;
        blocks.forEach(b => {
             const mult = b.group?.reps || 1;
             if (b.duration.type === 'time') total += b.duration.value * mult;
             else if (b.duration.type === 'distance') total += (b.duration.value / 1000) * 300 * mult;
        });
        return Math.round(total / 60);
    }, [blocks]);

    const workoutSummary = useMemo(() => {
        const byType: Record<WorkoutBlock['type'], number> = {
            warmup: 0,
            interval: 0,
            recovery: 0,
            rest: 0,
            cooldown: 0,
        };

        let totalDistanceMeters = 0;
        let totalTimeSeconds = 0;

        for (const block of blocks) {
            const reps = block.group?.reps || 1;
            byType[block.type] += reps;

            if (block.duration.type === 'distance') {
                const rawDistance = block.duration.value;
                const distanceMeters = block.duration.unit === 'km' ? rawDistance * 1000 : rawDistance;
                totalDistanceMeters += distanceMeters * reps;
            }

            if (block.duration.type === 'time') {
                totalTimeSeconds += block.duration.value * reps;
            }
        }

        return {
            byType,
            totalDistanceMeters,
            totalTimeSeconds,
            totalRecipients: selectedAthleteIds.length + selectedGroupIds.length,
        };
    }, [blocks, selectedAthleteIds.length, selectedGroupIds.length]);

    const recipientsSummaryLabel = useMemo(() => {
        const hasSingleAthlete = selectedAthleteIds.length === 1 && selectedGroupIds.length === 0;
        if (hasSingleAthlete) {
            const athlete = athletes.find((a) => a.id === selectedAthleteIds[0]);
            return athlete?.name || '1 atleta seleccionado';
        }

        const hasSingleGroup = selectedGroupIds.length === 1 && selectedAthleteIds.length === 0;
        if (hasSingleGroup) {
            const group = groups.find((g) => g.id === selectedGroupIds[0]);
            return group?.name || '1 grupo seleccionado';
        }

        return `${workoutSummary.totalRecipients} seleccionados`;
    }, [selectedAthleteIds, selectedGroupIds, athletes, groups, workoutSummary.totalRecipients]);

    const blockTypeLabel: Record<WorkoutBlock['type'], string> = {
        warmup: 'Calentamiento',
        interval: 'Intervalo',
        recovery: 'Recuperación',
        rest: 'Descanso',
        cooldown: 'Vuelta a la calma',
    };

    const formatBlockDuration = (block: WorkoutBlock) => {
        const reps = block.group?.reps || 1;

        if (block.duration.type === 'time') {
            const totalSeconds = block.duration.value * reps;
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            if (seconds === 0) return `${minutes} min`;
            return `${minutes} min ${seconds}s`;
        }

        const rawDistance = block.duration.value;
        const meters = block.duration.unit === 'km' ? rawDistance * 1000 : rawDistance;
        const totalMeters = meters * reps;
        if (totalMeters >= 1000) {
            return `${(totalMeters / 1000).toFixed(totalMeters % 1000 === 0 ? 0 : 1)} km`;
        }

        return `${Math.round(totalMeters)} m`;
    };

    const formatBlockTarget = (block: WorkoutBlock) => {
        const min = String(block.target.min);
        const max = String(block.target.max);
        const range = min === max ? min : `${min}-${max}`;

        if (block.target.type === 'rpe_target') return `RPE ${range}`;
        if (block.target.type === 'lthr') return `%LTHR ${range}`;
        if (block.target.type === 'hr_reserve') return `%FC Res. ${range}`;
        if (block.target.type === 'ftp_percent') return `%FTP ${range}`;
        if (block.target.type === 'power_zone') return `Zona Pot. ${range}`;
        return `Zona VAM ${range}`;
    };

    const isNew = workoutSource === 'new';

    const handleBack = () => {
        if (step === 'select-template') { setStep('select-source'); return; }
        if (step === 'build') { setStep('select-source'); return; }
        if (step === 'assign-details') {
            if (isNew) { setStep('build'); } else { setStep('select-template'); }
            return;
        }
    };

    const canConfirm = scheduledDate && (selectedAthleteIds.length > 0 || selectedGroupIds.length > 0);

    if (step === 'select-source') {
        return (
             <div className="bg-endurix-paper dark:bg-background flex flex-col">
                <div className="flex-none p-12">
                    <BackButton label={tAssign('navigateBack')} showLabel className="mb-8" />
                    <h1 className="text-4xl lg:text-5xl font-bold text-endurix-black dark:text-foreground mt-12 mb-4 uppercase tracking-tight" style={EXO}>
                        {tAssign('pageTitle')}
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-lg leading-relaxed">
                        {tAssign('pageSubtitle')}
                    </p>
                </div>

                <div className="flex-1 flex px-12 pb-12 gap-6 mt-8">
                    <button
                        type="button"
                        onClick={() => {
                            setWorkoutSource('template');
                            setStep('select-template');
                        }}
                        className={`flex-1 ${CARD_CLS} hover:border-endurix-orange p-12 text-left group transition-all relative overflow-hidden`}
                    >
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div className="w-16 h-16 bg-endurix-orange/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                                <LayoutTemplate className="w-8 h-8 text-endurix-orange" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-bold text-endurix-black dark:text-foreground tracking-tight mb-2 uppercase" style={EXO}>{tAssign('fromLibrary')}</h2>
                                <p className="text-muted-foreground font-medium leading-relaxed">
                                    {tAssign('fromLibraryDesc')}
                                </p>
                            </div>
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setWorkoutSource('new');
                            setStep('build');
                        }}
                        className={`flex-1 ${CARD_CLS} hover:border-endurix-orange p-12 text-left group transition-all relative overflow-hidden`}
                    >
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div className="w-16 h-16 bg-endurix-black/8 dark:bg-white/8 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                                <Sparkles className="w-8 h-8 text-endurix-orange" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-bold text-endurix-black dark:text-foreground tracking-tight mb-2 uppercase" style={EXO}>{tAssign('blankSlate')}</h2>
                                <p className="text-muted-foreground font-medium leading-relaxed">
                                    {tAssign('blankSlateDesc')}
                                </p>
                            </div>
                        </div>
                    </button>
                </div>
            </div>
        );
    }

    if (step === 'select-template') {
        return (
            <div className="bg-endurix-paper dark:bg-background flex flex-col h-[calc(100vh-64px)] overflow-hidden">
                <div className="p-10 lg:p-12 border-b border-endurix-black/10 dark:border-white/10 shrink-0">
                    <BackButton onClick={() => setStep('select-source')} label={tAssign('backToPhase1')} showLabel className="mb-8" />
                    <h1 className="text-4xl font-bold text-endurix-black dark:text-foreground tracking-tight mb-2 uppercase" style={EXO}>
                        {tAssign('templateMatrix')}
                    </h1>
                    <p className="text-muted-foreground">{tAssign('templateMatrixSubtitle')}</p>
                </div>
                <div className="flex-1 overflow-y-auto p-10 lg:p-12">
                    <div className="space-y-3">
                        {templates.map((template) => (
                            <button
                                key={template.id}
                                onClick={() => {
                                    setSelectedTemplate(template);
                                    setBlocks(template.blocks || []);
                                    setWorkoutSource('template');
                                    setStep('assign-details');
                                }}
                                className={`w-full text-left ${CARD_CLS} hover:border-endurix-orange p-6 flex justify-between group transition-all relative overflow-hidden`}
                            >
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-endurix-orange transition-colors" />
                                <div>
                                    <h3 className="text-xl font-bold text-endurix-black dark:text-foreground mb-1 uppercase tracking-tight" style={EXO}>
                                        {template.title}
                                    </h3>
                                    <p className="text-sm text-muted-foreground max-w-2xl line-clamp-1">
                                        {template.description || tAssign('noDescription')}
                                    </p>
                                </div>
                                <div className="flex flex-col items-end justify-center">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-endurix-orange bg-endurix-orange/10 border border-endurix-orange/30 px-3 py-1" style={PLEX}>
                                        {template.blocks?.length || 0} {tAssign('intervals')}
                                    </span>
                                </div>
                            </button>
                        ))}
                        {templates.length === 0 && (
                            <p className="text-muted-foreground text-center pt-12">{tAssign('noTemplatesInLibrary')}</p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (step === 'build') {
        return (
            <div className="bg-endurix-paper dark:bg-background flex flex-col h-[calc(100vh-64px)] overflow-hidden">
                <div className="p-5 px-10 border-b border-endurix-black/10 dark:border-white/10 flex items-center shrink-0">
                    <BackButton onClick={() => setStep('select-source')} label={tAssign('restart')} showLabel />
                    <div className="ml-auto text-[10px] font-bold text-endurix-black/50 dark:text-muted-foreground tracking-widest uppercase" style={PLEX}>
                        {tAssign('editorPhase')}
                    </div>
                </div>
                <div className="flex-1 overflow-hidden">
                    <WorkoutBuilder
                        initialBlocks={blocks}
                        onChange={setBlocks}
                        athleteId={builderAthleteId}
                        footerContent={
                            <Button
                                variant="orange"
                                onClick={() => setStep('assign-details')}
                                disabled={blocks.length === 0}
                                className="w-full uppercase tracking-widest text-xs font-bold py-4"
                            >
                                {tAssign('continueToAssignment')}
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        }
                    />
                </div>
            </div>
        );
    }

    // Step: assign-details (full-width form with summary + assignment details)
    const preselectedAthlete = preselectedAthleteId ? athletes.find(a => a.id === preselectedAthleteId) : null;

    return (
        <div className="bg-endurix-paper dark:bg-background flex flex-col h-[calc(100vh-64px)] overflow-hidden">
            <div className="p-5 px-10 border-b border-endurix-black/10 dark:border-white/10 flex items-center shrink-0">
                <BackButton onClick={handleBack} label={tAssign('back')} showLabel />
                <div className="ml-auto text-[10px] font-bold text-endurix-black/50 dark:text-muted-foreground tracking-widest uppercase" style={PLEX}>
                    {tAssign('editorPhase')}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto px-10 py-12 space-y-10">
                    {/* Workout Summary Card */}
                    <div className={`${CARD_CLS} p-6 lg:p-8`}>
                        <p className={`${LABEL_CLS} mb-3 font-bold`} style={PLEX}>Resumen del entrenamiento</p>
                        <h2 className="text-3xl lg:text-4xl font-bold text-endurix-black dark:text-foreground mb-5 uppercase tracking-tight" style={EXO}>
                            {selectedTemplate ? selectedTemplate.title : (workoutName || tAssign('customProtocol'))}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div className={ROW_CLS}>
                                <CalendarDays className="w-4 h-4 text-endurix-orange" />
                                <div>
                                    <p className={`${LABEL_CLS}`} style={PLEX}>Fecha objetivo</p>
                                    <p className="font-bold text-endurix-black dark:text-foreground">{format(new Date(`${scheduledDate}T00:00:00`), "EEEE dd/MM/yyyy", { locale: es })}</p>
                                </div>
                            </div>
                            <div className={ROW_CLS}>
                                <Users className="w-4 h-4 text-endurix-orange" />
                                <div>
                                    <p className={`${LABEL_CLS}`} style={PLEX}>Destinatarios</p>
                                    <p className="font-bold text-endurix-black dark:text-foreground">{recipientsSummaryLabel}</p>
                                </div>
                            </div>
                            <div className={ROW_CLS}>
                                <Clock className="w-4 h-4 text-endurix-orange" />
                                <div>
                                    <p className={`${LABEL_CLS}`} style={PLEX}>Duración estimada</p>
                                    <p className="font-bold text-endurix-black dark:text-foreground">~{estTimeMinutes} min</p>
                                </div>
                            </div>
                            <div className={ROW_CLS}>
                                <Gauge className="w-4 h-4 text-endurix-orange" />
                                <div>
                                    <p className={`${LABEL_CLS}`} style={PLEX}>RPE objetivo</p>
                                    <p className="font-bold text-endurix-black dark:text-foreground">{expectedRpe}/10</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Block Breakdown */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className={`${CARD_CLS} p-4`}>
                            <p className={`${LABEL_CLS}`} style={PLEX}>Bloques totales</p>
                            <p className="text-2xl font-bold text-endurix-black dark:text-foreground mt-1" style={EXO}>{blocks.length}</p>
                        </div>
                        <div className={`${CARD_CLS} p-4`}>
                            <p className={`${LABEL_CLS}`} style={PLEX}>Intervalos</p>
                            <p className="text-2xl font-bold text-endurix-black dark:text-foreground mt-1" style={EXO}>{workoutSummary.byType.interval}</p>
                        </div>
                        <div className={`${CARD_CLS} p-4`}>
                            <p className={`${LABEL_CLS}`} style={PLEX}>Recuperación + descanso</p>
                            <p className="text-2xl font-bold text-endurix-black dark:text-foreground mt-1" style={EXO}>{workoutSummary.byType.recovery + workoutSummary.byType.rest}</p>
                        </div>
                        <div className={`${CARD_CLS} p-4`}>
                            <p className={`${LABEL_CLS}`} style={PLEX}>Distancia planificada</p>
                            <p className="text-2xl font-bold text-endurix-black dark:text-foreground mt-1" style={EXO}>
                                {workoutSummary.totalDistanceMeters > 0
                                    ? `${(workoutSummary.totalDistanceMeters / 1000).toFixed(1)} km`
                                    : '—'}
                            </p>
                        </div>
                    </div>

                    {/* Block Details */}
                    <div className={`${CARD_CLS} p-6`}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-endurix-black dark:text-foreground uppercase tracking-tight" style={EXO}>Desglose de bloques</h3>
                            <span className={`${LABEL_CLS}`} style={PLEX}>Vista rápida</span>
                        </div>
                        {blocks.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Aun no hay bloques cargados en esta sesión.</p>
                        ) : (
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                {blocks.map((block, index) => (
                                    <div key={block.id || `${block.type}-${index}`} className="flex items-center justify-between px-3 py-2 bg-endurix-black/5 dark:bg-white/5 border border-endurix-black/10 dark:border-white/10">
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-endurix-black dark:text-foreground truncate" style={EXO}>{index + 1}. {block.stepName || blockTypeLabel[block.type]}</p>
                                            <p className="text-xs text-muted-foreground" style={PLEX}>{blockTypeLabel[block.type]}{block.group?.reps ? ` · x${block.group.reps}` : ''}</p>
                                        </div>
                                        <div className="text-right shrink-0 ml-4">
                                            <p className="text-sm font-bold text-endurix-black dark:text-foreground" style={PLEX}>{formatBlockDuration(block)}</p>
                                            <p className="text-xs text-muted-foreground" style={PLEX}>{formatBlockTarget(block)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Assignment Form */}
                    <div className={`${CARD_CLS} p-6 lg:p-8`}>
                        <h2 className="text-2xl font-bold text-endurix-black dark:text-foreground mb-8 uppercase tracking-tight" style={EXO}>
                            Planificación de la sesión
                        </h2>

                        <div className="space-y-8">
                            <div>
                                <label className={`${LABEL_CLS} font-bold block mb-4`} style={PLEX}>
                                    {tAssign('executionDate')} <span className="text-endurix-orange">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={scheduledDate}
                                    onChange={(e) => setScheduledDate(e.target.value)}
                                    className="w-full bg-transparent border-0 border-b border-endurix-black/20 dark:border-white/20 px-0 py-2 text-xl font-bold text-endurix-black dark:text-foreground focus:ring-0 focus:border-endurix-orange transition-colors"
                                    style={EXO}
                                />
                            </div>

                            {isNew && (
                                <div>
                                    <label className={`${LABEL_CLS} font-bold block mb-4`} style={PLEX}>
                                        {tAssign('objectiveTitle')}
                                    </label>
                                    <input
                                        type="text"
                                        value={workoutName}
                                        onChange={(e) => setWorkoutName(e.target.value)}
                                        placeholder={tAssign('exampleLongRun')}
                                        className="w-full bg-transparent border-0 border-b border-endurix-black/20 dark:border-white/20 px-0 py-2 text-lg font-medium text-endurix-black dark:text-foreground focus:ring-0 focus:border-endurix-orange placeholder-endurix-black/30 dark:placeholder:text-muted-foreground/50 transition-colors"
                                    />
                                </div>
                            )}

                            {!isNew && (
                                <div>
                                    <label className={`${LABEL_CLS} font-bold block mb-4`} style={PLEX}>
                                        {tAssign('assignmentNameOverride')}
                                    </label>
                                    <input
                                        type="text"
                                        value={workoutName}
                                        onChange={(e) => setWorkoutName(e.target.value)}
                                        placeholder={tAssign('overwritesTemplateName')}
                                        className="w-full bg-transparent border-0 border-b border-endurix-black/20 dark:border-white/20 px-0 py-2 text-lg font-medium text-endurix-black dark:text-foreground focus:ring-0 focus:border-endurix-orange placeholder-endurix-black/30 dark:placeholder:text-muted-foreground/50 transition-colors"
                                    />
                                </div>
                            )}

                            {preselectedAthlete ? (
                                <div>
                                    <label className={`${LABEL_CLS} font-bold block mb-4`} style={PLEX}>
                                        {tAssign('targetAthletes')}
                                    </label>
                                    <div className="flex items-center gap-3 border-b border-endurix-black/15 dark:border-white/15 pb-3">
                                        <div className="w-9 h-9 bg-endurix-orange/15 flex items-center justify-center shrink-0">
                                            <span className="text-sm font-bold text-endurix-orange" style={EXO}>{(preselectedAthlete.name || preselectedAthlete.email || '?').charAt(0).toUpperCase()}</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-endurix-black dark:text-foreground">{preselectedAthlete.name}</p>
                                            <p className="text-xs text-muted-foreground" style={PLEX}>{preselectedAthlete.email}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label className={`${LABEL_CLS} font-bold block mb-4`} style={PLEX}>
                                            {tAssign('targetAthletes')}
                                        </label>
                                        <SearchableMultiSelect
                                            items={athletes.map(a => ({ id: a.id, label: a.name, subLabel: a.email }))}
                                            selectedIds={selectedAthleteIds}
                                            onChange={setSelectedAthleteIds}
                                            placeholder={tAssign('searchByNameOrEmail')}
                                            noMatchesLabel={tAssign('noMatches')}
                                        />
                                    </div>
                                    <div>
                                        <label className={`${LABEL_CLS} font-bold block mb-4`} style={PLEX}>
                                            {tAssign('targetRunningTeams')}
                                        </label>
                                        <SearchableMultiSelect
                                            items={groups.map(g => ({ id: g.id, label: g.name }))}
                                            selectedIds={selectedGroupIds}
                                            onChange={setSelectedGroupIds}
                                            placeholder={tAssign('searchGroups')}
                                            noMatchesLabel={tAssign('noMatches')}
                                        />
                                    </div>
                                </>
                            )}

                            <div>
                                <label className={`${LABEL_CLS} font-bold flex items-center justify-between mb-4`} style={PLEX}>
                                    {tAssign('globalTargetRpe')}
                                    <span className="text-endurix-orange font-bold text-sm bg-endurix-orange/10 px-2 py-0.5 border border-endurix-orange/30" style={PLEX}>{expectedRpe}/10</span>
                                </label>
                                <Slider
                                    value={[expectedRpe]}
                                    min={1}
                                    max={10}
                                    step={1}
                                    onValueChange={(val) => setExpectedRpe(val[0])}
                                    className="my-6"
                                />
                                <div className="flex justify-between text-[10px] font-bold text-endurix-black/50 dark:text-muted-foreground uppercase tracking-widest" style={PLEX}>
                                    <span>{tAssign('endurance')}</span>
                                    <span>{tAssign('maxOutput')}</span>
                                </div>
                            </div>

                            {isNew && (
                                <div className="bg-endurix-black/5 dark:bg-white/5 p-6 border border-endurix-black/10 dark:border-white/10">
                                    <label className="flex items-start gap-4 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={saveAsTemplate}
                                            onChange={(e) => setSaveAsTemplate(e.target.checked)}
                                            className="w-5 h-5 mt-0.5 accent-endurix-orange"
                                        />
                                        <div className="flex flex-col">
                                            <span className="font-bold text-sm text-endurix-black dark:text-foreground mb-1 uppercase tracking-widest" style={EXO}>{tAssign('catalogStructure')}</span>
                                            <p className="text-xs text-muted-foreground leading-relaxed">{tAssign('catalogStructureDesc')}</p>
                                        </div>
                                    </label>
                                    {saveAsTemplate && (
                                        <input
                                            type="text"
                                            value={templateTitle}
                                            onChange={(e) => setTemplateTitle(e.target.value)}
                                            placeholder={tAssign('enterLibraryTitle')}
                                            className="mt-6 w-full bg-endurix-paper dark:bg-background border border-endurix-black/15 dark:border-white/15 px-4 py-3 text-sm font-medium text-endurix-black dark:text-foreground focus:outline-none focus:border-endurix-orange transition-colors"
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-4 pb-8 space-y-3">
                        <div className="flex flex-col mb-4">
                            <span className={`${LABEL_CLS} font-bold`} style={PLEX}>{tAssign('actionStatus')}</span>
                            <span className="text-sm font-bold text-endurix-black dark:text-foreground mt-1" style={EXO}>
                                {!scheduledDate ? tAssign('awaitingScheduling') :
                                 !canConfirm ? tAssign('awaitingRecipients') :
                                 tAssign('readyToDistribute')}
                            </span>
                        </div>
                        <Button
                            variant="orange"
                            onClick={handleAssign}
                            disabled={loading || !canConfirm}
                            className="w-full uppercase tracking-widest text-xs font-bold py-6"
                        >
                            {loading ? tAssign('transmittingData') : tAssign('commitAssignment')}
                        </Button>
                        <BackButton label={tAssign('cancel') || 'Cancelar'} showLabel className="w-full justify-center" variant="outline-brand" />
                    </div>
                </div>
            </div>

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
