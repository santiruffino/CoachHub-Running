'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { WorkoutBuilder } from '@/features/trainings/components/builder/WorkoutBuilder';
import { WorkoutBlock } from '@/features/trainings/components/builder/types';
import { Training, TrainingType } from '@/interfaces/training';
import { Athlete } from '@/interfaces/athlete';
import { Group } from '@/interfaces/group';
import { Button } from '@/components/ui/button';
import { trainingsService } from '@/features/trainings/services/trainings.service';
import api from '@/lib/axios';
import { ArrowLeft, Search, Check, Sparkles, LayoutTemplate, Clock, X } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { AlertDialog, useAlertDialog } from '@/components/ui/AlertDialog';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

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
            {/* Display Selected Tags Over Input Area */}
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

function AssignWorkoutContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const tAssign = useTranslations('trainings.assign');

    const athleteId = searchParams.get('athleteId');
    const templateId = searchParams.get('templateId');

    const [step, setStep] = useState<'select-source' | 'select-template' | 'build' | 'assign-details'>('select-source');
    const [workoutSource, setWorkoutSource] = useState<'template' | 'new' | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<Training | null>(null);
    const [templates, setTemplates] = useState<Training[]>([]);
    const [blocks, setBlocks] = useState<WorkoutBlock[]>([]);
    const [editingTemplate, setEditingTemplate] = useState(false);

    // Assignment details
    const [selectedAthleteIds, setSelectedAthleteIds] = useState<string[]>(athleteId ? [athleteId] : []);
    const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
    const [scheduledDate, setScheduledDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [expectedRpe, setExpectedRpe] = useState(5);
    const [workoutName, setWorkoutName] = useState('');
    const [saveAsTemplate, setSaveAsTemplate] = useState(false);
    const [templateTitle, setTemplateTitle] = useState('');

    const [athletes, setAthletes] = useState<Athlete[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(false);
    const { alertState, showAlert, closeAlert } = useAlertDialog();

    useEffect(() => {
        loadData();

        // If templateId is provided, bypass to build/assign
        if (templateId) {
            loadTemplate(templateId);
            setWorkoutSource('template');
            setStep('assign-details');
        }
    }, [templateId]);

    const loadData = async () => {
        try {
            const [athletesRes, groupsRes, templatesRes] = await Promise.all([
                api.get<Athlete[]>('/v2/users/athletes'),
                api.get<Group[]>('/v2/groups'),
                api.get<Training[]>('/v2/trainings'),
            ]);
            setAthletes(athletesRes.data);
            setGroups(groupsRes.data);
            setTemplates(templatesRes.data.filter(t => t.isTemplate));
        } catch (error) {
            console.error('Failed to load data:', error);
        }
    };

    const loadTemplate = async (id: string) => {
        try {
            const res = await api.get<Training>(`/v2/trainings/${id}`);
            setSelectedTemplate(res.data);
            setBlocks(JSON.parse(JSON.stringify(res.data.blocks || [])));
        } catch (error) {
            console.error('Failed to load template:', error);
        }
    };

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
                    title: saveAsTemplate ? (templateTitle || 'Protocolo sin título') : (workoutName || `Entrenamiento ${format(new Date(scheduledDate), 'dd/MM/yyyy')}`),
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
                scheduledDate: new Date(scheduledDate).toISOString(),
                expectedRpe,
                workoutName: workoutName || undefined,
            });

            showAlert('success', tAssign('successAssigned'));
            setTimeout(() => router.push(athleteId ? `/athletes/${athleteId}` : '/athletes'), 1500);
        } catch (error) {
            console.error('Failed to assign workout:', error);
            showAlert('error', tAssign('errorExecutionFailed'));
        } finally {
            setLoading(false);
        }
    };

    // Calculate Estimated Active Time for UX preview
    const estTimeMinutes = useMemo(() => {
        let total = 0;
        blocks.forEach(b => {
             const mult = b.group?.reps || 1;
             if (b.duration.type === 'time') total += b.duration.value * mult;
             else if (b.duration.type === 'distance') total += (b.duration.value / 1000) * 300 * mult;
        });
        return Math.round(total / 60);
    }, [blocks]);


    // Step 1: Select source
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
                    {/* Option: Template */}
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

                    {/* Option: Custom */}
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

    // Step 2: Select template
    if (step === 'select-template') {
        return (
            <div className="bg-background dark:bg-background flex flex-col font-inter">
                <div className="p-12 pb-8 border-b border-border dark:border-white/5">
                     <Button variant="ghost" onClick={() => setStep('select-source')} className="text-muted-foreground hover:text-foreground transition-colors p-0 hover:bg-transparent tracking-widest uppercase text-xs font-semibold mb-8">
                        <ArrowLeft className="w-4 h-4 mr-2" /> {tAssign('backToPhase1')}
                    </Button>
                    <div className="flex items-end justify-between">
                        <div>
                             <h1 className="text-4xl font-extrabold font-display text-foreground tracking-tight mb-2">
                                {tAssign('templateMatrix')}
                            </h1>
                            <p className="text-muted-foreground">{tAssign('templateMatrixSubtitle')}</p>
                        </div>
                        
                        {/* Fake Search input just for layout harmony */}
                         <div className="w-72">
                            <div className="relative">
                                <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder={tAssign('filterRoutines')}
                                    className="w-full bg-transparent border-0 border-b border-border/30 pl-8 pr-0 py-2 text-foreground focus:ring-0 focus:border-primary transition-colors"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-12">
                     <div className="max-w-5xl mx-auto space-y-4">
                        {templates.map((template) => (
                            <button
                                key={template.id}
                                onClick={() => {
                                    loadTemplate(template.id);
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

    // Step 3: Build new workout (Inline Full Page Builder)
    if (step === 'build') {
        return (
            <div className="bg-background dark:bg-background flex flex-col">
                <div className="p-6 px-12 border-b border-border/40 flex items-center shrink-0">
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
                        athleteId={athleteId || undefined} 
                        footerContent={
                            <div className="w-full flex items-center justify-between mx-auto px-8">
                                <div className="flex flex-col">
                                    <span className="text-lg font-bold font-display">{tAssign('blocksRegistered')}</span>
                                    <span className="text-xs text-white/60">{tAssign('proceedToScheduling')}</span>
                                </div>
                                <Button 
                                    onClick={() => setStep('assign-details')}
                                    disabled={blocks.length === 0}
                                    className="bg-white text-[#2b3437] hover:bg-white/90 uppercase tracking-wider text-xs font-semibold px-8 py-6 rounded shadow-lg"
                                >
                                    {tAssign('continueToScheduling')}
                                </Button>
                            </div>
                        }
                    />
                </div>
            </div>
        );
    }

    // Step 4: Assignment Details / Scheduling Mode / The Final Split View Layout
    const isNew = workoutSource === 'new';

    return (
        <div className="bg-background dark:bg-background flex font-inter">
            {/* Left Col: Setting Data */}
            <div className="w-[480px] flex-shrink-0 bg-card dark:bg-muted border-r border-border dark:border-white/5 flex flex-col h-full overflow-y-auto z-10 p-12">
                <Button variant="ghost" onClick={() => editingTemplate ? setEditingTemplate(false) : (isNew ? setStep('build') : setStep('select-template'))} className="w-min text-muted-foreground hover:text-foreground transition-colors p-0 hover:bg-transparent tracking-widest uppercase text-xs font-semibold mb-12">
                     <ArrowLeft className="w-4 h-4 mr-2" /> {tAssign('modifyBlueprint')}
                </Button>

                <h1 className="text-3xl font-extrabold font-display tracking-tight text-foreground mb-12">
                    {tAssign('actionCalendar')}
                </h1>

                <div className="space-y-12 pb-12">
                    {/* Execution Date */}
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

                    {/* Meta Input if Custom */}
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

                    {/* Custom Name Override if Template */}
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

                    {/* Athlete Search Select */}
                    {!athleteId && (
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
                    )}

                    {/* Team/Group Search Select */}
                    {!athleteId && (
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
                    )}

                    {/* RPE */}
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

                    {/* Save Template Option */}
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

            {/* Right Col: Payload Execution Summary */}
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-background dark:bg-background relative">
                {editingTemplate ? (
                     <div className="flex-1 overflow-y-auto">
                        <WorkoutBuilder 
                            initialBlocks={blocks} 
                            onChange={setBlocks} 
                            athleteId={athleteId || undefined}
                        />
                    </div>
                ) : (
                    <div className="flex-1 p-16 flex flex-col items-center justify-center">
                        <div className="max-w-md text-center">
                            <Clock className="w-16 h-16 text-accent mx-auto mb-8" />
                            <h2 className="text-4xl font-display font-extrabold text-foreground mb-4">
                                {selectedTemplate ? selectedTemplate.title : (workoutName || tAssign('customProtocol'))}
                            </h2>
                            <p className="text-lg text-muted-foreground mb-8">
                                {tAssign('scheduledToExecute')} <strong className="text-primary dark:text-white font-bold">{format(new Date(scheduledDate), 'EEEE dd/MM/yyyy')}</strong>.{' '}
                                {tAssign('payloadContains')} <strong className="text-primary dark:text-white font-bold">{blocks.length} {tAssign('structuralComponents')}</strong> {tAssign('estimatedLoad', { minutes: estTimeMinutes })}
                            </p>

                            {/* Decorative Block Preview */}
                            <div className="flex flex-wrap justify-center gap-1.5 mb-16 opacity-60">
                                {blocks.map((b, i) => (
                                    <div key={i} className={cn(
                                        "h-8 rounded", 
                                        b.type === 'warmup' || b.type === 'cooldown' ? 'w-4 bg-emerald-500' :
                                        b.type === 'interval' ? 'w-12 bg-primary' : 'w-6 bg-border'
                                    )} />
                                ))}
                            </div>

                            {workoutSource === 'template' && (
                                <Button 
                                    variant="outline" 
                                    onClick={() => setEditingTemplate(true)}
                                    className="border-gray-200 dark:border-white/10 text-foreground dark:text-white hover:bg-muted dark:hover:bg-white/5 uppercase tracking-wider text-xs font-bold"
                                >
                                    {tAssign('overruleBlockStructure')}
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                 {/* Sticky Footer Action */}
                 <div className="flex-none p-12 bg-background dark:bg-background border-t border-border dark:border-white/5 flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-xs uppercase tracking-widest font-bold text-muted-foreground">{tAssign('actionStatus')}</span>
                        <span className="text-sm font-semibold text-foreground dark:text-white mt-1">
                            {!scheduledDate ? tAssign('awaitingScheduling') : 
                             (selectedAthleteIds.length === 0 && selectedGroupIds.length === 0) ? tAssign('awaitingRecipients') :
                             tAssign('readyToDistribute')}
                        </span>
                    </div>

                    <Button
                        onClick={handleAssign}
                        disabled={loading || !scheduledDate || (selectedAthleteIds.length === 0 && selectedGroupIds.length === 0)}
                        className="bg-primary hover:bg-foreground text-white uppercase tracking-wider text-xs font-bold px-12 py-6 rounded shadow-[0_8px_24px_rgba(78,96,115,0.3)] transition-all"
                    >
                        {loading ? tAssign('transmittingData') : tAssign('commitAssignment')}
                    </Button>
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

function AssignWorkoutFallback() {
    const tAssign = useTranslations('trainings.assign');
    return (
        <div className="flex items-center justify-center h-[calc(100vh-theme(spacing.16))]">
            {tAssign('loadingMatrix')}
        </div>
    );
}

export default function AssignWorkoutPage() {
    return (
        <Suspense fallback={<AssignWorkoutFallback />}>
            <AssignWorkoutContent />
        </Suspense>
    );
}
