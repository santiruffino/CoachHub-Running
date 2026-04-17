'use client';

import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { WorkoutBlock, BlockType } from './types';
import { StepEditor } from './StepEditor';
import { RepeatBlockEditor } from './RepeatBlockEditor';
import { WorkoutSequence } from './WorkoutSequence';
import { EstimatedTotals } from './EstimatedTotals';
import { WorkoutProfileChart } from './WorkoutProfileChart';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface WorkoutBuilderProps {
    initialBlocks?: WorkoutBlock[];
    onChange?: (blocks: WorkoutBlock[]) => void;
    athleteId?: string;
    readOnly?: boolean;
    leftSidebarContent?: React.ReactNode;
    footerContent?: React.ReactNode;
}

export function WorkoutBuilder({
    initialBlocks = [],
    onChange,
    athleteId,
    readOnly = false,
    leftSidebarContent,
    footerContent
}: WorkoutBuilderProps) {
    const [blocks, setBlocks] = useState<WorkoutBlock[]>(initialBlocks);
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
    const t = useTranslations('builder');

    // Sync with parent component
    useEffect(() => {
        if (onChange) {
            onChange(blocks);
        }
    }, [blocks, onChange]);

    // Update when initialBlocks change
    useEffect(() => {
        if (initialBlocks.length > 0 && blocks.length === 0) {
            setBlocks(initialBlocks);
        }
    }, [initialBlocks]);

    const addBlock = useCallback((type: BlockType = 'interval', groupId?: string) => {
        const newBlock: WorkoutBlock = {
            id: uuidv4(),
            type,
            stepName: type.charAt(0).toUpperCase() + type.slice(1),
            duration: {
                type: type === 'recovery' ? 'time' : 'distance',
                value: type === 'recovery' ? 120 : 1000 // 2 min or 1 km
            },
            target: {
                type: 'lthr',
                min: type === 'interval' ? 90 : 75,
                max: type === 'interval' ? 95 : 85
            },
            intensity: type === 'interval' ? 85 : (type === 'recovery' ? 30 : 50),
            ...(groupId && { group: { id: groupId, reps: 4 } })
        };

        setBlocks(prev => [...prev, newBlock]);
        setSelectedBlockId(newBlock.id);
    }, []);

    const addRepeatBlock = useCallback(() => {
        const groupId = uuidv4();

        // Add two blocks: Hard and Easy
        const hardBlock: WorkoutBlock = {
            id: uuidv4(),
            type: 'interval',
            stepName: 'Hard',
            duration: { type: 'distance', value: 2000 },
            target: { type: 'lthr', min: 90, max: 95 },
            intensity: 85,
            group: { id: groupId, reps: 4 }
        };

        const easyBlock: WorkoutBlock = {
            id: uuidv4(),
            type: 'recovery',
            stepName: 'Easy',
            duration: { type: 'distance', value: 1000 },
            target: { type: 'lthr', min: 75, max: 85 },
            intensity: 30,
            group: { id: groupId, reps: 4 }
        };

        setBlocks(prev => [...prev, hardBlock, easyBlock]);
        setSelectedBlockId(hardBlock.id);
    }, []);

    const updateBlock = useCallback((id: string, updates: Partial<WorkoutBlock>) => {
        setBlocks(prev => prev.map(block =>
            block.id === id ? { ...block, ...updates } : block
        ));
    }, []);

    const removeBlock = useCallback((id: string) => {
        setBlocks(prev => prev.filter(block => block.id !== id));
        if (selectedBlockId === id) {
            setSelectedBlockId(null);
        }
    }, [selectedBlockId]);

    const selectBlock = useCallback((id: string | null) => {
        setSelectedBlockId(id);
    }, []);

    // Get selected block or group
    const selectedBlock = blocks.find(b => b.id === selectedBlockId);
    const selectedGroupId = selectedBlock?.group?.id;
    const selectedGroupBlocks = selectedGroupId
        ? blocks.filter(b => b.group?.id === selectedGroupId)
        : [];

    if (readOnly) {
        return (
            <div className="h-full bg-[#f8f9fa] dark:bg-[#0a0f14] text-[#2b3437] dark:text-[#f8f9fa] p-4">
                <div className="text-sm text-[#4e6073] mb-4 font-inter">{t('readOnlyMode')}</div>
                <EstimatedTotals blocks={blocks} />
                <div className="mt-8">
                    <WorkoutProfileChart blocks={blocks} />
                </div>
            </div>
        );
    }

    return (
        <div className="h-full bg-[#f8f9fa] dark:bg-[#0a0f14] flex font-inter overflow-hidden border border-gray-100 rounded-lg dark:border-white/5 shadow-[0_20px_40px_rgba(43,52,55,0.05)]">
            {/* Left Sidebar */}
            <div className="w-[340px] flex-shrink-0 bg-white dark:bg-[#131b23] border-r border-[#f1f4f6] dark:border-white/5 flex flex-col overflow-y-auto">
                {leftSidebarContent}
                
                {/* Block Library */}
                <div className="p-8">
                    <h3 className="text-[10px] font-semibold text-[#8b9bb4] tracking-[0.05em] uppercase mb-2">
                        {t('blockLibrary')}
                    </h3>
                    <h2 className="text-xl font-bold font-display text-[#2b3437] dark:text-[#f8f9fa] mb-8">
                        {t('structuralBlocks')}
                    </h2>
                    
                    <div className="space-y-4">
                        <button
                            type="button"
                            onClick={() => addBlock('warmup')}
                            className="w-full flex items-center h-16 bg-white dark:bg-[#1a232c] border-none rounded shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(43,52,55,0.08)] transition-all relative overflow-hidden group"
                        >
                            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-emerald-500" />
                            <div className="flex flex-col items-start pl-5">
                                <span className="text-[10px] text-[#8b9bb4] uppercase tracking-[0.05em] font-semibold">{t('preparatory')}</span>
                                <span className="text-[#2b3437] dark:text-[#f8f9fa] font-medium text-sm">{t('warmUp')}</span>
                            </div>
                            <div className="ml-auto pr-4">
                                <div className="w-6 h-6 rounded-full bg-[#f1f4f6] dark:bg-gray-800 flex items-center justify-center group-hover:bg-[#d1e4fb] transition-colors">
                                    <Plus className="w-4 h-4 text-[#4e6073] group-hover:text-[#2b3437]" />
                                </div>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => addBlock('interval')}
                            className="w-full flex items-center h-16 bg-white dark:bg-[#1a232c] border-none rounded shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(43,52,55,0.08)] transition-all relative overflow-hidden group"
                        >
                            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#4e6073]" />
                            <div className="flex flex-col items-start pl-5">
                                <span className="text-[10px] text-[#8b9bb4] uppercase tracking-[0.05em] font-semibold">{t('performance')}</span>
                                <span className="text-[#2b3437] dark:text-[#f8f9fa] font-medium text-sm">{t('intervalWork')}</span>
                            </div>
                            <div className="ml-auto pr-4">
                                <div className="w-6 h-6 rounded-full bg-[#f1f4f6] dark:bg-gray-800 flex items-center justify-center group-hover:bg-[#d1e4fb] transition-colors">
                                    <Plus className="w-4 h-4 text-[#4e6073] group-hover:text-[#2b3437]" />
                                </div>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => addBlock('recovery')}
                            className="w-full flex items-center h-16 bg-white dark:bg-[#1a232c] border-none rounded shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(43,52,55,0.08)] transition-all relative overflow-hidden group"
                        >
                            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#abb3b7]" />
                            <div className="flex flex-col items-start pl-5">
                                <span className="text-[10px] text-[#8b9bb4] uppercase tracking-[0.05em] font-semibold">{t('activeRest')}</span>
                                <span className="text-[#2b3437] dark:text-[#f8f9fa] font-medium text-sm">{t('recovery')}</span>
                            </div>
                            <div className="ml-auto pr-4">
                                <div className="w-6 h-6 rounded-full bg-[#f1f4f6] dark:bg-gray-800 flex items-center justify-center group-hover:bg-[#d1e4fb] transition-colors">
                                    <Plus className="w-4 h-4 text-[#4e6073] group-hover:text-[#2b3437]" />
                                </div>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => addBlock('cooldown')}
                            className="w-full flex items-center h-16 bg-white dark:bg-[#1a232c] border-none rounded shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(43,52,55,0.08)] transition-all relative overflow-hidden group"
                        >
                            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-emerald-500" />
                            <div className="flex flex-col items-start pl-5">
                                <span className="text-[10px] text-[#8b9bb4] uppercase tracking-[0.05em] font-semibold">{t('closing')}</span>
                                <span className="text-[#2b3437] dark:text-[#f8f9fa] font-medium text-sm">{t('coolDown')}</span>
                            </div>
                            <div className="ml-auto pr-4">
                                <div className="w-6 h-6 rounded-full bg-[#f1f4f6] dark:bg-gray-800 flex items-center justify-center group-hover:bg-[#d1e4fb] transition-colors">
                                    <Plus className="w-4 h-4 text-[#4e6073] group-hover:text-[#2b3437]" />
                                </div>
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full bg-[#f8f9fa] dark:bg-[#0a0f14] relative">
                <div className="flex-1 overflow-y-auto w-full pb-24">
                    <div className="max-w-4xl mx-auto px-8 py-12 space-y-16">
                        <EstimatedTotals blocks={blocks} />
                        
                        <div className="w-full">
                            <WorkoutSequence
                                blocks={blocks}
                                selectedBlockId={selectedBlockId}
                                onSelectBlock={selectBlock}
                                onUpdateBlock={updateBlock}
                                onRemoveBlock={removeBlock}
                                onAddStep={(type) => {
                                    if (type === 'repeat') addRepeatBlock();
                                    else addBlock(type as any);
                                }}
                            />
                        </div>

                        {blocks.length > 0 && (
                            <div className="w-full pt-8 pb-8">
                                <WorkoutProfileChart blocks={blocks} />
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Footer Content Overlay */}
                {footerContent && (
                    <div className="absolute bottom-0 left-0 right-0 z-10 w-full mt-auto bg-[#4e6073] dark:bg-[#131b23] text-white p-6 shadow-[0_-20px_40px_rgba(43,52,55,0.1)] border-t border-white/5">
                        {footerContent}
                    </div>
                )}
            </div>
        </div>
    );
}
