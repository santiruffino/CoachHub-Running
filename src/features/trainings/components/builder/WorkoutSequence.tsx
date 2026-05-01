'use client';

import { WorkoutBlock, AthleteProfile } from './types';
import { Button } from '@/components/ui/button';
import { GripVertical, Repeat, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VAM_ZONES } from '@/features/profiles/constants/vam';
import { BLOCK_COLORS } from './constants';
import { StepEditor } from './StepEditor';
import { RepeatBlockEditor } from './RepeatBlockEditor';
import { useTranslations } from 'next-intl';

interface WorkoutSequenceProps {
    blocks: WorkoutBlock[];
    selectedBlockId: string | null;
    onSelectBlock: (blockId: string | null) => void;
    onUpdateBlock: (id: string, updates: Partial<WorkoutBlock>) => void;
    onUpdateGroupReps?: (groupId: string, reps: number) => void;
    onRemoveBlock: (id: string) => void;
    athleteProfile?: AthleteProfile | null;
    onAddStep: (type: 'warmup' | 'interval' | 'recovery' | 'rest' | 'cooldown' | 'repeat') => void;
}

export function WorkoutSequence({
    blocks,
    selectedBlockId,
    onSelectBlock,
    onUpdateBlock,
    onUpdateGroupReps,
    onRemoveBlock,
    athleteProfile,
    onAddStep
}: WorkoutSequenceProps) {
    const t = useTranslations('builder');

    const getBlockColorClass = (type: string) => {
        return BLOCK_COLORS[type as keyof typeof BLOCK_COLORS] || '#e2e8f0';
    };

    const getBlockLabel = (type: string) => {
        return t(`labels.${type}`);
    };

    const getBlockIntensity = (block: WorkoutBlock) => {
        if (block.rpe) return `RPE ${block.rpe}/10`;
        if (block.target.type === 'lthr') {
            return `${block.target.min}-${block.target.max}% LTHR`;
        }
        if (block.target.type === 'vam_zone') {
            return `${t('vamZone')} ${block.target.min}`;
        }
        if (block.intensity) return `${block.intensity}%`;

        switch (block.type) {
            case 'warmup':
            case 'cooldown': return '70%';
            case 'interval': return '105%';
            case 'recovery': return '75%';
            default: return '—';
        }
    };

    const getBlockEstimatedSeconds = (block: WorkoutBlock): number => {
        if (block.duration.type === 'time') return block.duration.value;

        let intensityFactor = (block.intensity || 50) / 100;

        if (block.target?.type === 'vam_zone') {
            const zoneNum = Number(block.target.min);
            const zone = VAM_ZONES.find(z => z.zone === zoneNum);
            if (zone) intensityFactor = ((zone.min + zone.max) / 2) / 100;
        } else if (block.target?.type === 'lthr') {
            const minTarget = Number(block.target.min);
            const maxTarget = Number(block.target.max);
            if (!isNaN(minTarget) && !isNaN(maxTarget)) {
                intensityFactor = ((minTarget + maxTarget) / 2) / 100;
            }
        }

        const distMeters = block.duration.unit === 'km' ? block.duration.value * 1000 : block.duration.value;
        let vamKmh = 15; // default fallback

        if (athleteProfile?.vam) {
            const parts = athleteProfile.vam.split(':').map(Number);
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                const secsPerKm = parts[0] * 60 + parts[1];
                if (secsPerKm > 0) vamKmh = 3600 / secsPerKm;
            } else if (!isNaN(Number(athleteProfile.vam))) {
                vamKmh = Number(athleteProfile.vam);
            }
        }

        const speedKmH = vamKmh * intensityFactor;
        const speedMs = speedKmH / 3.6;

        if (speedMs > 0) return Math.round(distMeters / speedMs);
        return 0;
    };

    const getDuration = (block: WorkoutBlock) => {
        const seconds = getBlockEstimatedSeconds(block);
        const minutes = Math.floor(seconds / 60);
        const remSecs = seconds % 60;
        const timeStr = `${minutes}:${remSecs.toString().padStart(2, '0')}`;

        if (block.duration.type === 'distance') {
            const val = block.duration.unit === 'km' ? block.duration.value : block.duration.value;
            const unit = block.duration.unit || 'm';
            return `~${timeStr} (${val}${unit})`;
        }
        return timeStr;
    };

    const formatTimestamp = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // Group blocks by repeat groups
    const groupedBlocks: Array<{ isGroup: boolean; groupId?: string; blocks: WorkoutBlock[] }> = [];
    const processedBlocks = new Set<string>();

    blocks.forEach(block => {
        if (processedBlocks.has(block.id)) return;

        if (block.group) {
            const groupBlocks = blocks.filter(b => b.group?.id === block.group?.id);
            groupBlocks.forEach(b => processedBlocks.add(b.id));
            groupedBlocks.push({
                isGroup: true,
                groupId: block.group.id,
                blocks: groupBlocks
            });
        } else {
            processedBlocks.add(block.id);
            groupedBlocks.push({
                isGroup: false,
                blocks: [block]
            });
        }
    });

    const selectedGroupId = blocks.find(b => b.id === selectedBlockId)?.group?.id;

    let cumulativeSeconds = 0;

    return (
        <div className="w-full flex flex-col pt-4">
            {/* Sequence Header */}
            <div className="flex items-center justify-between mb-8 pb-4">
                <h3 className="text-2xl font-display font-bold text-[#2b3437] dark:text-[#f8f9fa]">
                    {t('sequenceBuilder')}
                </h3>
            </div>

            <p className="text-sm text-[#8b9bb4] font-inter mb-12">
                {t('sequenceDescription')}
            </p>

            {/* Blocks List */}
            <div className="space-y-4 font-inter">
                {groupedBlocks.map((item, index) => {
                    // Record start time of this group/block
                    const currentStartTimeStr = formatTimestamp(cumulativeSeconds);

                    if (item.isGroup) {
                        const reps = item.blocks[0]?.group?.reps || 1;
                        const isGroupSelected = selectedGroupId === item.groupId;

                        // Advance cumulative time by this group's total time
                        for (let i = 0; i < reps; i++) {
                            item.blocks.forEach(b => {
                                cumulativeSeconds += getBlockEstimatedSeconds(b);
                            });
                        }

                        if (isGroupSelected) {
                            return (
                                <div key={item.groupId} className="flex gap-6 relative ml-12">
                                    <div className="w-12 text-xs font-semibold text-[#8b9bb4] absolute -left-[72px] top-6 text-right">
                                        {currentStartTimeStr}
                                    </div>
                                    <div className="flex-1">
                                        <RepeatBlockEditor
                                            groupId={item.groupId!}
                                            blocks={item.blocks}
                                            onUpdate={onUpdateBlock}
                                            onUpdateReps={onUpdateGroupReps}
                                            onRemove={onRemoveBlock}
                                            athleteProfile={athleteProfile}
                                            onAddStep={() => {
                                                // Handle inline add to repeat block
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div key={item.groupId} className="flex gap-6 relative ml-12">
                                <div className="w-12 text-xs font-semibold text-[#8b9bb4] absolute -left-[72px] top-6 text-right">
                                    {currentStartTimeStr}
                                </div>

                                <div className="flex-1 pl-4 pb-4">
                                    <div className="flex items-center rotate-180" style={{ writingMode: 'vertical-rl', position: 'absolute', left: '-20px', top: '10px', bottom: '10px' }}>
                                        <div className="bg-[#4e6073] text-white text-[10px] font-bold tracking-widest uppercase py-4 px-2 rounded-l w-[32px] flex items-center justify-center">
                                            {t('repeats', { reps })}
                                        </div>
                                    </div>
                                    <div className="space-y-3 bg-[#f8f9fa] dark:bg-white/5 p-4 rounded-xl ml-4">
                                        {item.blocks.map((block, idx) => {
                                            const isSelected = selectedBlockId === block.id;

                                            if (isSelected) {
                                                return (
                                                    <div key={block.id} className="w-full">
                                                        <StepEditor
                                                            step={block}
                                                            stepNumber={idx + 1}
                                                            onUpdate={(updates) => onUpdateBlock(block.id, updates)}
                                                            onRemove={() => onRemoveBlock(block.id)}
                                                            isInRepeat={true}
                                                            athleteProfile={athleteProfile}
                                                        />
                                                    </div>
                                                );
                                            }

                                            return (
                                                <button
                                                    key={block.id}
                                                    type="button"
                                                    onClick={() => onSelectBlock(block.id)}
                                                    className={cn(
                                                        "w-full flex items-center py-4 bg-white dark:bg-[#1a232c] shadow-[0_2px_8px_rgba(43,52,55,0.02)] hover:shadow-[0_8px_24px_rgba(43,52,55,0.06)] rounded-lg transition-all group relative overflow-hidden",
                                                    )}
                                                >
                                                    <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: getBlockColorClass(block.type) }} />
                                                    <div className="flex items-center w-full px-4 text-left">
                                                        <div className="w-8 shrink-0 flex items-center justify-center">
                                                            <GripVertical className="text-gray-300 dark:text-gray-600 w-4 h-4 cursor-grab" />
                                                        </div>
                                                        <div className="grid grid-cols-4 w-full items-start gap-4">
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8b9bb4] mb-1">{t('stage')}</span>
                                                                <span className="text-sm font-semibold whitespace-nowrap" style={{ color: getBlockColorClass(block.type) }}>{block.stepName || getBlockLabel(block.type)}</span>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8b9bb4] mb-1">{t('duration')}</span>
                                                                <span className="text-sm font-semibold text-[#2b3437] dark:text-[#f8f9fa] uppercase">{getDuration(block)}</span>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8b9bb4] mb-1">{t('target')}</span>
                                                                <span className="text-sm font-semibold text-[#2b3437] dark:text-[#f8f9fa]">{getBlockIntensity(block)}</span>
                                                            </div>
                                                            <div className="flex flex-col text-right items-end justify-start h-full pr-4">
                                                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8b9bb4] mb-1">{t('notes')}</span>
                                                                <span className="text-xs text-[#8b9bb4] italic truncate max-w-[120px]">{block.notes || '—'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    // Not a group block
                    const block = item.blocks[0];
                    const isSelected = selectedBlockId === block.id;

                    // Advance cumulative time
                    cumulativeSeconds += getBlockEstimatedSeconds(block);

                    if (isSelected) {
                        return (
                            <div key={block.id} className="flex gap-6 relative ml-12">
                                <div className="w-12 text-xs font-semibold text-[#8b9bb4] absolute -left-[72px] top-6 text-right">
                                    {currentStartTimeStr}
                                </div>
                                <div className="flex-1 w-full">
                                    <StepEditor
                                        step={block}
                                        stepNumber={index + 1}
                                        onUpdate={(updates) => onUpdateBlock(block.id, updates)}
                                        onRemove={() => onRemoveBlock(block.id)}
                                        athleteProfile={athleteProfile}
                                    />
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={block.id} className="flex gap-6 items-center relative ml-12 group">
                            <div className="w-12 text-xs font-semibold text-[#8b9bb4] absolute -left-[72px] text-right">
                                {currentStartTimeStr}
                            </div>

                            <button
                                type="button"
                                onClick={() => onSelectBlock(block.id)}
                                className={cn(
                                    "w-full flex items-center py-4 bg-white dark:bg-[#1a232c] shadow-[0_2px_8px_rgba(43,52,55,0.02)] hover:shadow-[0_8px_24px_rgba(43,52,55,0.06)] rounded-lg transition-all relative overflow-hidden border border-[#f1f4f6] dark:border-white/5",
                                )}
                            >
                                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: getBlockColorClass(block.type) }} />
                                <div className="flex items-center w-full px-4 text-left">
                                    <div className="w-8 shrink-0 flex items-center justify-center">
                                        <GripVertical className="text-gray-300 dark:text-gray-600 w-4 h-4 cursor-grab" />
                                    </div>
                                    <div className="grid grid-cols-4 w-full items-start gap-4">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8b9bb4] mb-1">{t('stage')}</span>
                                            <span className="text-sm font-semibold whitespace-nowrap" style={{ color: getBlockColorClass(block.type) }}>{block.stepName || getBlockLabel(block.type)}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8b9bb4] mb-1">{t('duration')}</span>
                                            <span className="text-sm font-semibold text-[#2b3437] dark:text-[#f8f9fa] uppercase">{getDuration(block)}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8b9bb4] mb-1">{t('target')}</span>
                                            <span className="text-sm font-semibold text-[#2b3437] dark:text-[#f8f9fa]">{getBlockIntensity(block)}</span>
                                        </div>
                                        <div className="flex flex-col text-right items-end justify-start h-full pr-4">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8b9bb4] mb-1">{t('notes')}</span>
                                            <span className="text-xs text-[#8b9bb4] italic truncate max-w-[120px]">{block.notes || '—'}</span>
                                        </div>
                                    </div>
                                </div>
                            </button>
                        </div>
                    );
                })}

                {/* Horizontal Add Block Buttons */}
                <div className="pt-6 flex flex-col gap-4 pl-12">
                    <button
                        onClick={() => onAddStep('repeat')}
                        className="w-full flex items-center justify-center py-4 rounded-lg border border-dashed border-[#2b3437]/30 dark:border-white/30 bg-[#8b9bb4]/10 hover:bg-[#8b9bb4]/20 transition-colors gap-2"
                    >
                        <Repeat size={14} className="text-[#2b3437] dark:text-[#f8f9fa]" />
                        <span className="text-[10px] uppercase font-bold tracking-widest text-[#2b3437] dark:text-[#f8f9fa]">{t('labels.repeat') || 'REPETICONES'}</span>
                    </button>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <button
                            onClick={() => onAddStep('warmup')}
                            className="flex flex-col items-center justify-center py-4 rounded-lg border border-dashed border-[#2b3437]/20 dark:border-white/20 bg-[#b1f0cc]/30 hover:bg-[#b1f0cc]/50 transition-colors"
                        >
                            <span className="text-[10px] uppercase font-bold tracking-widest text-[#2b3437] dark:text-[#f8f9fa]">{t('labels.warmup')}</span>
                        </button>
                        <button
                            onClick={() => onAddStep('interval')}
                            className="flex flex-col items-center justify-center py-4 rounded-lg border border-dashed border-[#2b3437]/20 dark:border-white/20 bg-[#fb8b8b]/30 hover:bg-[#fb8b8b]/50 transition-colors"
                        >
                            <span className="text-[10px] uppercase font-bold tracking-widest text-[#2b3437] dark:text-[#f8f9fa]">{t('labels.interval')}</span>
                        </button>
                        <button
                            onClick={() => onAddStep('recovery')}
                            className="flex flex-col items-center justify-center py-4 rounded-lg border border-dashed border-[#2b3437]/20 dark:border-white/20 bg-[#c5e0fa]/30 hover:bg-[#c5e0fa]/50 transition-colors"
                        >
                            <span className="text-[10px] uppercase font-bold tracking-widest text-[#2b3437] dark:text-[#f8f9fa]">{t('labels.recovery')}</span>
                        </button>
                        <button
                            onClick={() => onAddStep('rest')}
                            className="flex flex-col items-center justify-center py-4 rounded-lg border border-dashed border-[#2b3437]/20 dark:border-white/20 bg-[#e2e8f0]/50 hover:bg-[#e2e8f0]/70 transition-colors"
                        >
                            <span className="text-[10px] uppercase font-bold tracking-widest text-[#2b3437] dark:text-[#f8f9fa]">{t('labels.rest')}</span>
                        </button>
                        <button
                            onClick={() => onAddStep('cooldown')}
                            className="flex flex-col items-center justify-center py-4 rounded-lg border border-dashed border-[#2b3437]/20 dark:border-white/20 bg-[#e2e8f0]/50 hover:bg-[#e2e8f0]/70 transition-colors"
                        >
                            <span className="text-[10px] uppercase font-bold tracking-widest text-[#2b3437] dark:text-[#f8f9fa]">{t('labels.cooldown')}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Click outside to unselect */}
            {selectedBlockId && (
                <div
                    className="absolute inset-0 z-[-1] cursor-default"
                    onClick={() => onSelectBlock(null)}
                />
            )}
        </div>
    );
}
