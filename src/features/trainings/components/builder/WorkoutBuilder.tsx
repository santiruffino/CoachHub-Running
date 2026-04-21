'use client';

import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { WorkoutBlock, BlockType, AthleteProfile } from './types';
import { StepEditor } from './StepEditor';
import { RepeatBlockEditor } from './RepeatBlockEditor';
import { WorkoutSequence } from './WorkoutSequence';
import { EstimatedTotals } from './EstimatedTotals';
import { WorkoutIntensityChart } from './WorkoutIntensityChart';
import { SessionSummary } from './SessionSummary';
import { CoachNotes } from './CoachNotes';
import { LinkedDrills } from './LinkedDrills';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { BLOCK_COLORS } from './constants';
import api from '@/lib/axios';

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
    const [athleteProfile, setAthleteProfile] = useState<AthleteProfile | null>(null);
    const t = useTranslations('builder');

    // Fetch athlete profile when athleteId is provided
    useEffect(() => {
        const fetchAthleteProfile = async () => {
            if (!athleteId) {
                setAthleteProfile(null);
                return;
            }
            try {
                const response = await api.get(`/v2/users/${athleteId}/details`);
                setAthleteProfile(response.data.athleteProfile || null);
            } catch (error) {
                console.error('Failed to fetch athlete profile:', error);
                setAthleteProfile(null);
            }
        };
        fetchAthleteProfile();
    }, [athleteId]);

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
            stepName: t(`labels.${type}`),
            duration: {
                type: type === 'recovery' || type === 'rest' ? 'time' : 'distance',
                value: type === 'recovery' || type === 'rest' ? 120 : 1000 // 2 min or 1 km
            },
            target: {
                type: 'lthr',
                min: type === 'interval' ? 90 : 75,
                max: type === 'interval' ? 95 : 85
            },
            intensity: type === 'interval' ? 85 : (type === 'recovery' ? 30 : (type === 'rest' ? 5 : 50)),
            ...(groupId && { group: { id: groupId, reps: 4 } })
        };

        setBlocks(prev => [...prev, newBlock]);
        setSelectedBlockId(newBlock.id);
    }, [t]);

    const addRepeatBlock = useCallback(() => {
        const groupId = uuidv4();

        // Add two blocks: Hard and Easy
        const hardBlock: WorkoutBlock = {
            id: uuidv4(),
            type: 'interval',
            stepName: t('labels.hard'),
            duration: { type: 'distance', value: 2000 },
            target: { type: 'lthr', min: 90, max: 95 },
            intensity: 85,
            group: { id: groupId, reps: 4 }
        };

        const easyBlock: WorkoutBlock = {
            id: uuidv4(),
            type: 'recovery',
            stepName: t('labels.easy'),
            duration: { type: 'distance', value: 1000 },
            target: { type: 'lthr', min: 75, max: 85 },
            intensity: 30,
            group: { id: groupId, reps: 4 }
        };

        setBlocks(prev => [...prev, hardBlock, easyBlock]);
        setSelectedBlockId(hardBlock.id);
    }, [t]);

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
                    <WorkoutIntensityChart blocks={blocks} />
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full bg-[#f8f9fa] dark:bg-[#0a0f14] flex font-inter overflow-hidden">
            {/* Left Main Content Area */}
            <div className="flex-1 flex flex-col h-full relative overflow-y-auto pb-24 border-r border-[#e1e5e8] dark:border-white/10">
                <div className="max-w-4xl mx-auto px-8 py-8 space-y-12 w-full">
                    {/* Projected Training Profile Chart */}
                    <div className="w-full">
                        <WorkoutIntensityChart 
                            blocks={blocks} 
                            selectedId={selectedBlockId}
                            onBlockClick={selectBlock}
                        />
                    </div>

                    {/* Sequence Builder */}
                    <div className="w-full">
                        <WorkoutSequence
                            blocks={blocks}
                            selectedBlockId={selectedBlockId}
                            onSelectBlock={selectBlock}
                            onUpdateBlock={updateBlock}
                            onRemoveBlock={removeBlock}
                            athleteProfile={athleteProfile}
                            onAddStep={(type) => {
                                if (type === 'repeat') addRepeatBlock();
                                else addBlock(type as any);
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Right Sidebar Area */}
            <div className="w-[340px] flex-shrink-0 bg-[#4e6073] dark:bg-[#131b23] border-l border-[#f1f4f6] dark:border-white/5 flex flex-col overflow-y-auto p-6 space-y-8">
                <SessionSummary blocks={blocks} athleteProfile={athleteProfile} />
                <CoachNotes />
                <LinkedDrills />
            </div>
        </div>
    );
}
