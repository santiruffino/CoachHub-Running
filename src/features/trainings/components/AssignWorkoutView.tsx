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
import { ArrowLeft, ArrowRight, Search, Check, Sparkles, LayoutTemplate, Clock, X, CalendarDays, Users, Gauge } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertDialog, useAlertDialog } from '@/components/ui/AlertDialog';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { useApiError } from '@/hooks/useApiError';

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
                            <div key={id} className="flex items-center bg-muted dark:bg-card text-foreground px-3 py-1 rounded text-xs font-semibold tracking-wide">
                                {item.label}
                                <button type="button" onClick={(e) => removeSelectedItem(e, id)} className="ml-2 text-muted-foreground hover:text-primary">
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        )
                    })}
                </div>
            )}
            
            <div className="relative">
                <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder}
                    className="w-full bg-transparent border-0 border-b border-border/30 pl-8 pr-0 py-2 text-foreground focus:ring-0 focus:border-primary placeholder-muted-foreground/50 transition-colors"
                />
            </div>

            {isOpen && (
                <>
                    <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute top-full left-0 right-0 mt-2 z-20 bg-card dark:bg-muted border border-gray-100 dark:border-white/5 shadow-[0_20px_40px_rgba(43,52,55,0.08)] rounded-lg max-h-60 overflow-y-auto w-full">
                        {filtered.length === 0 ? (
                            <div className="p-4 text-xs tracking-wider text-muted-foreground uppercase font-semibold text-center">
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
                                            "w-full flex items-center justify-between px-4 py-3 hover:bg-muted dark:hover:bg-card transition-colors text-left",
                                            isSelected && "bg-background dark:bg-white/5"
                                        )}
                                    >
                                        <div className="flex flex-col">
                                            <span className={cn(
                                                "text-sm font-semibold transition-colors",
                                                isSelected ? "text-primary dark:text-white" : "text-foreground"
                                            )}>
                                                {item.label}
                                            </span>
                                            {item.subLabel && <span className="text-xs text-muted-foreground">{item.subLabel}</span>}
                                        </div>
                                        {isSelected && <Check className="w-4 h-4 text-primary dark:text-white" />}
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
    const [editingTemplate, setEditingTemplate] = useState(false);

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

            if (workoutSource === 'new' || editingTemplate) {
                const newTraining = await trainingsService.create({
                    title: saveAsTemplate ? (templateTitle || 'Protocolo sin título') : (workoutName || `Entrenamiento ${format(new Date(`${scheduledDate}T00:00:00`), 'dd/MM/yyyy')}`),
                    type: TrainingType.RUNNING,
                    description: editingTemplate ? 'Modificado desde la plantilla base.' : 'Entrenamiento diario personalizado.',
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
        if (editingTemplate) { setEditingTemplate(false); return; }
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
             <div className="bg-background dark:bg-background flex flex-col font-inter">
                <div className="flex-none p-12">
                    <Button variant="ghost" onClick={() => router.back()} className="text-muted-foreground hover:text-foreground transition-colors p-0 hover:bg-transparent tracking-widest uppercase text-xs font-semibold">
                        <ArrowLeft className="w-4 h-4 mr-2" /> {tAssign('navigateBack')}
                    </Button>
                    <h1 className="text-4xl lg:text-5xl font-extrabold font-display text-foreground mt-12 mb-4">
                        {tAssign('pageTitle')}
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-lg leading-relaxed">
                        {tAssign('pageSubtitle')}
                    </p>
                </div>

                <div className="flex-1 flex px-12 pb-12 gap-8 mt-8">
                    <button
                        type="button"
                        onClick={() => {
                            setWorkoutSource('template');
                            setStep('select-template');
                        }}
                        className="flex-1 bg-card shadow-[0_4px_24px_rgba(43,52,55,0.04)] hover:shadow-[0_20px_40px_rgba(43,52,55,0.06)] rounded-xl border border-transparent dark:border-white/5 p-12 text-left group transition-all duration-300 relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-12 opacity-5">
                            <LayoutTemplate className="w-64 h-64 text-primary -rotate-12" />
                        </div>
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                                <LayoutTemplate className="w-8 h-8 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-display font-bold text-foreground tracking-tight mb-2">{tAssign('fromLibrary')}</h2>
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
                        className="flex-1 bg-card shadow-[0_4px_24px_rgba(43,52,55,0.04)] hover:shadow-[0_20px_40px_rgba(43,52,55,0.06)] rounded-xl border border-transparent dark:border-white/5 p-12 text-left group transition-all duration-300 relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-12 opacity-5">
                            <Sparkles className="w-64 h-64 text-emerald-500 rotate-12" />
                        </div>
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div className="w-16 h-16 rounded-full bg-muted  flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                                <Sparkles className="w-8 h-8 text-emerald-500" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-display font-bold text-foreground tracking-tight mb-2">{tAssign('blankSlate')}</h2>
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
            <div className="bg-background dark:bg-background flex flex-col font-inter h-[calc(100vh-64px)] overflow-hidden">
                <div className="p-10 lg:p-12 border-b border-border dark:border-white/5 shrink-0">
                    <Button variant="ghost" onClick={() => setStep('select-source')} className="text-muted-foreground hover:text-foreground transition-colors p-0 hover:bg-transparent tracking-widest uppercase text-xs font-semibold mb-8">
                        <ArrowLeft className="w-4 h-4 mr-2" /> {tAssign('backToPhase1')}
                    </Button>
                    <h1 className="text-4xl font-extrabold font-display text-foreground tracking-tight mb-2">
                        {tAssign('templateMatrix')}
                    </h1>
                    <p className="text-muted-foreground">{tAssign('templateMatrixSubtitle')}</p>
                </div>
                <div className="flex-1 overflow-y-auto p-10 lg:p-12">
                    <div className="space-y-4">
                        {templates.map((template) => (
                            <button
                                key={template.id}
                                onClick={() => {
                                    setSelectedTemplate(template);
                                    setBlocks(template.blocks || []);
                                    setWorkoutSource('template');
                                    setStep('assign-details');
                                }}
                                className="w-full text-left bg-card shadow-[0_2px_8px_rgba(43,52,55,0.02)] hover:shadow-[0_8px_24px_rgba(43,52,55,0.06)] rounded-lg p-6 flex justify-between group transition-all relative overflow-hidden"
                            >
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-primary transition-colors" />
                                <div>
                                    <h3 className="text-xl font-bold font-display tracking-tight text-foreground mb-1">
                                        {template.title}
                                    </h3>
                                    <p className="text-sm text-muted-foreground max-w-2xl line-clamp-1">
                                        {template.description || tAssign('noDescription')}
                                    </p>
                                </div>
                                <div className="flex flex-col items-end justify-center">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted dark:bg-white/5 px-3 py-1 rounded">
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
            <div className="bg-background dark:bg-background flex flex-col font-inter h-[calc(100vh-64px)] overflow-hidden">
                <div className="p-5 px-10 border-b border-border/40 flex items-center shrink-0">
                    <Button variant="ghost" onClick={() => setStep('select-source')} className="text-muted-foreground hover:text-foreground transition-colors p-0 hover:bg-transparent tracking-widest uppercase text-xs font-semibold">
                        <ArrowLeft className="w-4 h-4 mr-2" /> {tAssign('restart')}
                    </Button>
                    <div className="ml-auto text-xs font-semibold text-muted-foreground tracking-[0.05em] uppercase">
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
                                onClick={() => setStep('assign-details')}
                                disabled={blocks.length === 0}
                                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground uppercase tracking-wider text-xs font-bold py-4 rounded transition-colors"
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
        <div className="bg-background dark:bg-background flex flex-col font-inter h-[calc(100vh-64px)] overflow-hidden">
            <div className="p-5 px-10 border-b border-border/40 flex items-center shrink-0">
                <Button
                    variant="ghost"
                    onClick={handleBack}
                    className="text-muted-foreground hover:text-foreground transition-colors p-0 hover:bg-transparent tracking-widest uppercase text-xs font-semibold"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> {tAssign('modifyBlueprint')}
                </Button>
                <div className="ml-auto text-xs font-semibold text-muted-foreground tracking-[0.05em] uppercase">
                    {tAssign('editorPhase')}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto px-10 py-12 space-y-10">
                    {/* Workout Summary Card */}
                    <div className="rounded-xl border border-border dark:border-white/10 bg-card dark:bg-muted p-6 lg:p-8">
                        <p className="text-xs uppercase tracking-[0.08em] font-semibold text-muted-foreground mb-3">Resumen del entrenamiento</p>
                        <h2 className="text-3xl lg:text-4xl font-display font-extrabold text-foreground mb-5">
                            {selectedTemplate ? selectedTemplate.title : (workoutName || tAssign('customProtocol'))}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-3 rounded-lg bg-background dark:bg-background/60 p-4 border border-border/60 dark:border-white/10">
                                <CalendarDays className="w-4 h-4 text-primary" />
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Fecha objetivo</p>
                                    <p className="font-semibold text-foreground">{format(new Date(`${scheduledDate}T00:00:00`), "EEEE dd/MM/yyyy", { locale: es })}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 rounded-lg bg-background dark:bg-background/60 p-4 border border-border/60 dark:border-white/10">
                                <Users className="w-4 h-4 text-primary" />
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Destinatarios</p>
                                    <p className="font-semibold text-foreground">{recipientsSummaryLabel}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 rounded-lg bg-background dark:bg-background/60 p-4 border border-border/60 dark:border-white/10">
                                <Clock className="w-4 h-4 text-primary" />
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Duración estimada</p>
                                    <p className="font-semibold text-foreground">~{estTimeMinutes} min</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 rounded-lg bg-background dark:bg-background/60 p-4 border border-border/60 dark:border-white/10">
                                <Gauge className="w-4 h-4 text-primary" />
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">RPE objetivo</p>
                                    <p className="font-semibold text-foreground">{expectedRpe}/10</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Block Breakdown */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="rounded-lg border border-border dark:border-white/10 p-4 bg-card dark:bg-muted">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Bloques totales</p>
                            <p className="text-2xl font-bold text-foreground mt-1">{blocks.length}</p>
                        </div>
                        <div className="rounded-lg border border-border dark:border-white/10 p-4 bg-card dark:bg-muted">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Intervalos</p>
                            <p className="text-2xl font-bold text-foreground mt-1">{workoutSummary.byType.interval}</p>
                        </div>
                        <div className="rounded-lg border border-border dark:border-white/10 p-4 bg-card dark:bg-muted">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Recuperación + descanso</p>
                            <p className="text-2xl font-bold text-foreground mt-1">{workoutSummary.byType.recovery + workoutSummary.byType.rest}</p>
                        </div>
                        <div className="rounded-lg border border-border dark:border-white/10 p-4 bg-card dark:bg-muted">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Distancia planificada</p>
                            <p className="text-2xl font-bold text-foreground mt-1">
                                {workoutSummary.totalDistanceMeters > 0
                                    ? `${(workoutSummary.totalDistanceMeters / 1000).toFixed(1)} km`
                                    : '—'}
                            </p>
                        </div>
                    </div>

                    {/* Block Details */}
                    <div className="rounded-xl border border-border dark:border-white/10 bg-card dark:bg-muted p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-foreground">Desglose de bloques</h3>
                            <span className="text-xs uppercase tracking-wide text-muted-foreground">Vista rápida</span>
                        </div>
                        {blocks.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Aun no hay bloques cargados en esta sesión.</p>
                        ) : (
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                {blocks.map((block, index) => (
                                    <div key={block.id || `${block.type}-${index}`} className="flex items-center justify-between rounded-lg border border-border/60 dark:border-white/10 px-3 py-2 bg-background dark:bg-background/60">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-foreground truncate">{index + 1}. {block.stepName || blockTypeLabel[block.type]}</p>
                                            <p className="text-xs text-muted-foreground">{blockTypeLabel[block.type]}{block.group?.reps ? ` · x${block.group.reps}` : ''}</p>
                                        </div>
                                        <div className="text-right shrink-0 ml-4">
                                            <p className="text-sm font-semibold text-foreground">{formatBlockDuration(block)}</p>
                                            <p className="text-xs text-muted-foreground">{formatBlockTarget(block)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {workoutSource === 'template' && (
                        <div className="pt-1">
                            <Button
                                variant="outline"
                                onClick={() => setEditingTemplate(true)}
                                className="border-gray-200 dark:border-white/10 text-foreground dark:text-white hover:bg-muted dark:hover:bg-white/5 uppercase tracking-wider text-xs font-bold"
                            >
                                {tAssign('overruleBlockStructure')}
                            </Button>
                        </div>
                    )}

                    {/* Assignment Form */}
                    <div className="rounded-xl border border-border dark:border-white/10 bg-card dark:bg-muted p-6 lg:p-8">
                        <h2 className="text-2xl font-extrabold font-display tracking-tight text-foreground mb-8">
                            Planificación de la sesión
                        </h2>

                        <div className="space-y-8">
                            <div>
                                <label className="text-[10px] font-semibold text-muted-foreground tracking-[0.05em] uppercase mb-4 block">
                                    {tAssign('executionDate')} <span className="text-emerald-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={scheduledDate}
                                    onChange={(e) => setScheduledDate(e.target.value)}
                                    className="w-full bg-transparent border-0 border-b border-border/30 px-0 py-2 text-xl font-bold font-display text-foreground focus:ring-0 focus:border-primary transition-colors"
                                />
                            </div>

                            {isNew && (
                                <div>
                                    <label className="text-[10px] font-semibold text-muted-foreground tracking-[0.05em] uppercase mb-4 block">
                                        {tAssign('objectiveTitle')}
                                    </label>
                                    <input
                                        type="text"
                                        value={workoutName}
                                        onChange={(e) => setWorkoutName(e.target.value)}
                                        placeholder={tAssign('exampleLongRun')}
                                        className="w-full bg-transparent border-0 border-b border-border/30 px-0 py-2 text-lg font-medium text-foreground focus:ring-0 focus:border-primary placeholder-muted-foreground/50 transition-colors"
                                    />
                                </div>
                            )}

                            {!isNew && (
                                <div>
                                    <label className="text-[10px] font-semibold text-muted-foreground tracking-[0.05em] uppercase mb-4 block">
                                        {tAssign('assignmentNameOverride')}
                                    </label>
                                    <input
                                        type="text"
                                        value={workoutName}
                                        onChange={(e) => setWorkoutName(e.target.value)}
                                        placeholder={tAssign('overwritesTemplateName')}
                                        className="w-full bg-transparent border-0 border-b border-border/30 px-0 py-2 text-lg font-medium text-foreground focus:ring-0 focus:border-primary placeholder-muted-foreground/50 transition-colors"
                                    />
                                </div>
                            )}

                            {preselectedAthlete ? (
                                <div>
                                    <label className="text-[10px] font-semibold text-muted-foreground tracking-[0.05em] uppercase mb-4 block">
                                        {tAssign('targetAthletes')}
                                    </label>
                                    <div className="flex items-center gap-3 border-b border-border/30 pb-3">
                                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                            <span className="text-sm font-bold text-primary">{(preselectedAthlete.name || preselectedAthlete.email || '?').charAt(0).toUpperCase()}</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-foreground">{preselectedAthlete.name}</p>
                                            <p className="text-xs text-muted-foreground">{preselectedAthlete.email}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label className="text-[10px] font-semibold text-muted-foreground tracking-[0.05em] uppercase mb-4 block">
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
                                        <label className="text-[10px] font-semibold text-muted-foreground tracking-[0.05em] uppercase mb-4 block">
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
                                <label className="text-[10px] font-semibold text-muted-foreground tracking-[0.05em] uppercase mb-4 flex items-center justify-between">
                                    {tAssign('globalTargetRpe')}
                                    <span className="text-primary font-bold text-sm bg-muted dark:bg-white/5 px-2 py-0.5 rounded">{expectedRpe}/10</span>
                                </label>
                                <Slider
                                    value={[expectedRpe]}
                                    min={1}
                                    max={10}
                                    step={1}
                                    onValueChange={(val) => setExpectedRpe(val[0])}
                                    className="my-6"
                                />
                                <div className="flex justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    <span>{tAssign('endurance')}</span>
                                    <span>{tAssign('maxOutput')}</span>
                                </div>
                            </div>

                            {isNew && (
                                <div className="bg-background dark:bg-white/5 rounded-lg p-6">
                                    <label className="flex items-start gap-4 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={saveAsTemplate}
                                            onChange={(e) => setSaveAsTemplate(e.target.checked)}
                                            className="w-5 h-5 mt-0.5 rounded border-gray-300 text-primary focus:ring-[#4e6073]"
                                        />
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-sm text-foreground mb-1">{tAssign('catalogStructure')}</span>
                                            <p className="text-xs text-muted-foreground leading-relaxed">{tAssign('catalogStructureDesc')}</p>
                                        </div>
                                    </label>
                                    {saveAsTemplate && (
                                        <input
                                            type="text"
                                            value={templateTitle}
                                            onChange={(e) => setTemplateTitle(e.target.value)}
                                            placeholder={tAssign('enterLibraryTitle')}
                                            className="mt-6 w-full bg-white dark:bg-background border border-border dark:border-white/10 rounded px-4 py-3 text-sm font-medium text-foreground focus:outline-none focus:border-primary transition-colors"
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-4 pb-8 space-y-3">
                        <div className="flex flex-col mb-4">
                            <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{tAssign('actionStatus')}</span>
                            <span className="text-sm font-semibold text-foreground mt-1">
                                {!scheduledDate ? tAssign('awaitingScheduling') :
                                 !canConfirm ? tAssign('awaitingRecipients') :
                                 tAssign('readyToDistribute')}
                            </span>
                        </div>
                        <Button
                            onClick={handleAssign}
                            disabled={loading || !canConfirm}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground uppercase tracking-wider text-xs font-bold py-6 rounded shadow-[0_8px_24px_rgba(78,96,115,0.3)] transition-all"
                        >
                            {loading ? tAssign('transmittingData') : tAssign('commitAssignment')}
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => router.back()}
                        >
                            {tAssign('cancelExit') || 'Cancelar'}
                        </Button>
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
