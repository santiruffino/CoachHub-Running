'use client';

import { WorkoutBlock } from './types';
import { Button } from '@/components/ui/button';
import { GripVertical, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StepEditor } from './StepEditor';
import { RepeatBlockEditor } from './RepeatBlockEditor';

interface WorkoutSequenceProps {
    blocks: WorkoutBlock[];
    selectedBlockId: string | null;
    onSelectBlock: (blockId: string | null) => void;
    onUpdateBlock: (id: string, updates: Partial<WorkoutBlock>) => void;
    onRemoveBlock: (id: string) => void;
    onAddStep: (type: 'warmup' | 'interval' | 'recovery' | 'cooldown' | 'repeat') => void;
}

export function WorkoutSequence({
    blocks,
    selectedBlockId,
    onSelectBlock,
    onUpdateBlock,
    onRemoveBlock,
    onAddStep
}: WorkoutSequenceProps) {

    const getBlockColorClass = (type: string) => {
        switch (type) {
            case 'warmup':
            case 'cooldown':
                return 'bg-emerald-500';
            case 'interval':
                return 'bg-[#4e6073]';
            case 'recovery':
                return 'bg-[#abb3b7]';
            default:
                return 'bg-gray-300';
        }
    };

    const getBlockIntensity = (block: WorkoutBlock) => {
        if (block.rpe) return `RPE ${block.rpe}/10`;
        if (block.target.type === 'lthr') {
             return `${block.target.min}-${block.target.max}% LTHR`;
        }
        if (block.target.type === 'vam_zone') {
             return `Zone ${block.target.min} VAM`;
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

    const getDuration = (block: WorkoutBlock) => {
        if (block.duration.type === 'distance') {
            return `${(block.duration.value / 1000).toFixed(2)} km`;
        }
        const minutes = Math.floor(block.duration.value / 60);
        const seconds = block.duration.value % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const formatTimestamp = (seconds: number, isDeterministic: boolean) => {
        if (!isDeterministic) return '--:--';
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
    let timeIsDeterministic = true;

    return (
        <div className="w-full flex flex-col pt-4">
            {/* Sequence Header */}
            <div className="flex items-center justify-between mb-8 pb-4">
                <h3 className="text-2xl font-display font-bold text-[#2b3437] dark:text-[#f8f9fa]">
                    Workout Sequence
                </h3>
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" className="text-[#4e6073] hover:text-[#2b3437] font-semibold text-xs tracking-wider uppercase">
                        Preview Graph
                    </Button>
                    <Button variant="ghost" size="sm" className="text-[#4e6073] hover:text-[#2b3437] font-semibold text-xs tracking-wider uppercase">
                        Undo
                    </Button>
                </div>
            </div>

            <p className="text-sm text-[#8b9bb4] font-inter mb-12">
                Drag and drop blocks to rearrange the intensity flow. All metrics update in real-time as you refine the structure.
            </p>

            {/* Blocks List */}
            <div className="space-y-4 font-inter">
                {groupedBlocks.map((item, index) => {
                    // Record start time of this group/block
                    const currentStartTimeStr = formatTimestamp(cumulativeSeconds, timeIsDeterministic);
                    
                    if (item.isGroup) {
                        const reps = item.blocks[0]?.group?.reps || 1;
                        const isGroupSelected = selectedGroupId === item.groupId;
                        
                        // Advance cumulative time by this group's total time
                        for (let i = 0; i < reps; i++) {
                            item.blocks.forEach(b => {
                                if (b.duration.type === 'time') cumulativeSeconds += b.duration.value;
                                else timeIsDeterministic = false;
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
                                            onRemove={onRemoveBlock}
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
                                
                                <div className="flex-1 pl-4 border-l-2 border-dashed border-[#e1e5e8] dark:border-white/10 pb-4">
                                    <div className="flex items-center gap-2 mb-4 text-[#8b9bb4]">
                                        <Repeat className="w-3.5 h-3.5" />
                                        <span className="text-[10px] uppercase font-bold tracking-widest pl-1">
                                            Main Interval Set ({reps} Rounds)
                                        </span>
                                    </div>
                                    <div className="space-y-3">
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
                                                            athleteProfile={null}
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
                                                        "w-full flex items-center justify-between p-6 bg-white dark:bg-[#1a232c] shadow-[0_2px_8px_rgba(43,52,55,0.02)] hover:shadow-[0_8px_24px_rgba(43,52,55,0.06)] rounded transition-all group relative overflow-hidden",
                                                    )}
                                                >
                                                    <div className={cn("absolute left-0 top-0 bottom-0 w-1", getBlockColorClass(block.type))} />
                                                    <div className="flex flex-col text-left pl-2">
                                                        <div className="text-base font-semibold text-[#2b3437] dark:text-[#f8f9fa] mb-1">
                                                            {block.stepName || block.type}
                                                        </div>
                                                        <div className="text-xs text-[#8b9bb4] font-medium tracking-wide">
                                                            {getDuration(block)} @ {getBlockIntensity(block)}
                                                            {block.cadenceRange && `, Cadence ${block.cadenceRange.min}-${block.cadenceRange.max} rpm`}
                                                        </div>
                                                    </div>
                                                    <div className="text-right flex items-center gap-4">
                                                        <GripVertical className="text-[#d1e4fb] w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab hover:text-[#4e6073]" />
                                                        <span className="text-sm font-semibold text-[#4e6073] dark:text-[#f8f9fa]">
                                                            {block.duration.type === 'distance' ? '--:--' : getDuration(block)}
                                                        </span>
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
                    if (block.duration.type === 'time') {
                        cumulativeSeconds += block.duration.value;
                    } else {
                        timeIsDeterministic = false;
                    }

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
                                        athleteProfile={null}
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
                                    "w-full flex items-center justify-between p-6 bg-white dark:bg-[#1a232c] shadow-[0_2px_8px_rgba(43,52,55,0.02)] hover:shadow-[0_8px_24px_rgba(43,52,55,0.06)] rounded transition-all relative overflow-hidden",
                                )}
                            >
                                <div className={cn("absolute left-0 top-0 bottom-0 w-1", getBlockColorClass(block.type))} />
                                <div className="flex flex-col text-left pl-2">
                                    <div className="text-base font-semibold text-[#2b3437] dark:text-[#f8f9fa] mb-1">
                                        {block.stepName || block.type}
                                    </div>
                                    <div className="text-xs text-[#8b9bb4] font-medium tracking-wide">
                                        {getDuration(block)} @ {getBlockIntensity(block)}
                                        {block.cadenceRange && `, Cadence ${block.cadenceRange.min}-${block.cadenceRange.max} rpm`}
                                    </div>
                                </div>
                                <div className="text-right flex flex-row items-center gap-6">
                                     <GripVertical className="text-[#d1e4fb] w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab hover:text-[#4e6073]" />
                                     <span className="text-sm font-semibold text-[#4e6073] dark:text-[#f8f9fa] min-w-[48px] text-right">
                                        {block.duration.type === 'distance' ? '--:--' : getDuration(block)}
                                    </span>
                                </div>
                            </button>
                        </div>
                    );
                })}

                {blocks.length === 0 && (
                     <div className="flex flex-col items-center justify-center py-20 bg-white/50 border border-dashed border-[#e1e5e8] dark:border-white/10 rounded-lg ml-12">
                        <p className="text-[#8b9bb4] text-sm uppercase tracking-widest font-semibold mb-2">Drop a block to expand sequence</p>
                    </div>
                )}
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
