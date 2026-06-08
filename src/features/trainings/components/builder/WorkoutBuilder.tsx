'use client';
import { appLogger } from '@/lib/app-logger';


import { ReactNode, useCallback, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AthleteProfile, BlockType, WorkoutBlock } from './types';
import { TrainingType } from '@/interfaces/training';
import { WorkoutSequence } from './WorkoutSequence';
import { EstimatedTotals } from './EstimatedTotals';
import { WorkoutIntensityChart } from './WorkoutIntensityChart';
import { SessionSummary } from './SessionSummary';
import { useTranslations } from 'next-intl';
import api from '@/lib/axios';
import { Repeat } from 'lucide-react';

interface WorkoutBuilderProps {
  initialBlocks?: WorkoutBlock[];
  onChange?: (blocks: WorkoutBlock[]) => void;
  athleteId?: string;
  readOnly?: boolean;
  trainingType?: TrainingType;
  footerContent?: ReactNode;
}

export function WorkoutBuilder({
                                  initialBlocks = [],
                                  onChange,
                                  athleteId,
                                  readOnly = false,
                                  trainingType = TrainingType.RUNNING,
                                  footerContent
                                }: WorkoutBuilderProps) {
  const [localBlocks, setLocalBlocks] = useState<WorkoutBlock[] | null>(null);
  const blocks = localBlocks ?? initialBlocks;
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [athleteProfile, setAthleteProfile] = useState<AthleteProfile | null>(null);
  const t = useTranslations('builder');

  const updateBlocks = useCallback((updater: (prev: WorkoutBlock[]) => WorkoutBlock[]) => {
    setLocalBlocks((prev) => {
      const base = prev ?? initialBlocks;
      return updater(base);
    });
  }, [initialBlocks]);

  // Fetch athlete profile when athleteId is provided
  useEffect(() => {
    const fetchAthleteProfile = async () => {
      if (!athleteId) {
        setAthleteProfile(null);
        return;
      }
      try {
        const response = await api.get(`/v2/users/${athleteId}/details`);
        const ap = response.data.athleteProfile;
        if (ap) {
          setAthleteProfile({
            vam: ap.vam,
            lthr: ap.lthr,
            maxHR: ap.maxHR,
            restHR: ap.restHR,
            ftp: ap.ftp,
          });
        } else {
          setAthleteProfile(null);
        }
      } catch (error) {
        appLogger.error('Failed to fetch athlete profile:', error);
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

  const getDefaultTarget = (trainingType: TrainingType, blockType: BlockType) => {
    if (trainingType === TrainingType.RUNNING) {
      return { type: 'vam_zone' as const, min: 2, max: 2 };
    }
    if (trainingType === TrainingType.CYCLING) {
      return { type: 'power_zone' as const, min: 2, max: 2 };
    }
    return { type: 'lthr' as const, min: blockType === 'interval' ? 90 : 75, max: blockType === 'interval' ? 95 : 85 };
  };

  const addBlock = useCallback((type: BlockType = 'interval', groupId?: string) => {
    const defaultTarget = getDefaultTarget(trainingType, type);
    const newBlock: WorkoutBlock = {
      id: uuidv4(),
      type,
      stepName: t(`labels.${type}`),
      duration: {
        type: type === 'recovery' || type === 'rest' ? 'time' : 'distance',
        value: type === 'recovery' || type === 'rest' ? 120 : 1000
      },
      target: defaultTarget,
      intensity: type === 'interval' ? 85 : (type === 'recovery' ? 30 : (type === 'rest' ? 5 : 50)),
      ...(groupId && {group: {id: groupId, reps: 4}})
    };

    updateBlocks((prev) => [...prev, newBlock]);
    setSelectedBlockId(newBlock.id);
  }, [t, updateBlocks, trainingType]);

  const addRepeatBlock = useCallback(() => {
    const groupId = uuidv4();
    const hardTarget = getDefaultTarget(trainingType, 'interval');
    const easyTarget = getDefaultTarget(trainingType, 'recovery');

    // Add two blocks: Hard and Easy
    const hardBlock: WorkoutBlock = {
      id: uuidv4(),
      type: 'interval',
      stepName: t('labels.hard'),
      duration: {type: 'distance', value: 2000},
      target: {...hardTarget, min: hardTarget.type === 'vam_zone' ? 4 : (hardTarget.type === 'power_zone' ? 4 : 90), max: hardTarget.type === 'vam_zone' ? 4 : (hardTarget.type === 'power_zone' ? 4 : 95)},
      intensity: 85,
      group: {id: groupId, reps: 4}
    };

    const easyBlock: WorkoutBlock = {
      id: uuidv4(),
      type: 'recovery',
      stepName: t('labels.easy'),
      duration: {type: 'distance', value: 1000},
      target: {...easyTarget, min: easyTarget.type === 'vam_zone' ? 2 : (easyTarget.type === 'power_zone' ? 2 : 75), max: easyTarget.type === 'vam_zone' ? 2 : (easyTarget.type === 'power_zone' ? 2 : 85)},
      intensity: 30,
      group: {id: groupId, reps: 4}
    };

    updateBlocks((prev) => [...prev, hardBlock, easyBlock]);
    setSelectedBlockId(hardBlock.id);
  }, [t, updateBlocks, trainingType]);

  const updateBlock = useCallback((id: string, updates: Partial<WorkoutBlock>) => {
    updateBlocks((prev) => prev.map(block =>
      block.id === id ? {...block, ...updates} : block
    ));
  }, [updateBlocks]);

  const updateGroupReps = useCallback((groupId: string, reps: number) => {
    const safeReps = Number.isFinite(reps) ? Math.floor(reps) : 1;
    const normalizedReps = Math.max(1, safeReps);

    updateBlocks((prev) => prev.map(block => {
      if (block.group?.id !== groupId) {
        return block;
      }

      return {
        ...block,
        group: {
          ...block.group,
          reps: normalizedReps
        }
      };
    }));
  }, [updateBlocks]);

  const removeBlock = useCallback((id: string) => {
    updateBlocks((prev) => prev.filter(block => block.id !== id));
    if (selectedBlockId === id) {
      setSelectedBlockId(null);
    }
  }, [selectedBlockId, updateBlocks]);

  const reorderBlocks = useCallback((fromIndex: number, toIndex: number) => {
    updateBlocks((prev) => {
      const newBlocks = [...prev];
      const [removed] = newBlocks.splice(fromIndex, 1);
      newBlocks.splice(toIndex, 0, removed);
      return newBlocks;
    });
  }, [updateBlocks]);

  const handleDragStart = useCallback((e: React.DragEvent, blockId: string) => {
    setDraggedBlockId(blockId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', blockId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetBlockId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain');
    if (sourceId && sourceId !== targetBlockId) {
      const sourceIndex = blocks.findIndex(b => b.id === sourceId);
      const targetIndex = blocks.findIndex(b => b.id === targetBlockId);
      if (sourceIndex !== -1 && targetIndex !== -1) {
        reorderBlocks(sourceIndex, targetIndex);
      }
    }
    setDraggedBlockId(null);
  }, [blocks, reorderBlocks]);

  const handleDragEnd = useCallback(() => {
    setDraggedBlockId(null);
  }, []);

  const selectBlock = useCallback((id: string | null) => {
    setSelectedBlockId(id);
  }, []);

  const handleAddStep = useCallback((type: 'warmup' | 'interval' | 'recovery' | 'rest' | 'cooldown' | 'repeat') => {
    if (type === 'repeat') addRepeatBlock();
    else addBlock(type);
  }, [addBlock, addRepeatBlock]);

  if (readOnly) {
    return (
      <div className="h-full bg-[#f8f9fa] dark:bg-[#0a0f14] text-[#2b3437] dark:text-[#f8f9fa] p-4">
        <div className="text-sm text-[#4e6073] mb-4 font-inter">{t('readOnlyMode')}</div>
        <EstimatedTotals blocks={blocks}/>
        <div className="mt-8">
          <WorkoutIntensityChart blocks={blocks}/>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-[#f8f9fa] dark:bg-[#0a0f14] flex font-inter overflow-hidden relative">
      {/* Left Sidebar - Always Visible */}
      <div
        className="w-64 shrink-0 bg-white dark:bg-[#0d1117] border-r border-[#e2e8f0] dark:border-white/5 overflow-hidden z-10 flex flex-col">
        <div className="flex-1 overflow-y-auto p-6">
          {/* Add Step Buttons */}
          <div className="mb-6">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#8b9bb4] mb-4">
              {t('blockLibrary')}
            </h4>

            <button
              onClick={() => handleAddStep('repeat')}
              className="w-full flex items-center justify-center py-3 rounded-lg border border-dashed border-[#2b3437]/30 dark:border-white/30 bg-[#8b9bb4]/10 hover:bg-[#8b9bb4]/20 transition-colors gap-2"
            >
              <Repeat size={14} className="text-[#2b3437] dark:text-[#f8f9fa]"/>
              <span
                className="text-[10px] uppercase font-bold tracking-widest text-[#2b3437] dark:text-[#f8f9fa]">{t('labels.repeat')}</span>
            </button>

            <button
              onClick={() => handleAddStep('warmup')}
              className="w-full flex items-center justify-center py-3 mt-2 rounded-lg border border-dashed border-[#2b3437]/20 dark:border-white/20 bg-[#b1f0cc]/30 hover:bg-[#b1f0cc]/50 transition-colors"
            >
              <span
                className="text-[10px] uppercase font-bold tracking-widest text-[#2b3437] dark:text-[#f8f9fa]">{t('labels.warmup')}</span>
            </button>

            <button
              onClick={() => handleAddStep('interval')}
              className="w-full flex items-center justify-center py-3 mt-2 rounded-lg border border-dashed border-[#2b3437]/20 dark:border-white/20 bg-[#fb8b8b]/30 hover:bg-[#fb8b8b]/50 transition-colors"
            >
              <span
                className="text-[10px] uppercase font-bold tracking-widest text-[#2b3437] dark:text-[#f8f9fa]">{t('labels.interval')}</span>
            </button>

            <button
              onClick={() => handleAddStep('recovery')}
              className="w-full flex flex-col items-center justify-center py-3 mt-2 rounded-lg border border-dashed border-[#2b3437]/20 dark:border-white/20 bg-[#c5e0fa]/30 hover:bg-[#c5e0fa]/50 transition-colors"
            >
              <span
                className="text-[10px] uppercase font-bold tracking-widest text-[#2b3437] dark:text-[#f8f9fa]">{t('labels.recovery')}</span>
              <span
                className="mt-1 text-[9px] uppercase font-semibold tracking-wide text-[#4e6073] dark:text-[#b8c3d1]">{t('labels.recoveryDescription')}</span>
            </button>

            <button
              onClick={() => handleAddStep('rest')}
              className="w-full flex flex-col items-center justify-center py-3 mt-2 rounded-lg border border-dashed border-[#2b3437]/20 dark:border-white/20 bg-[#e2e8f0]/50 hover:bg-[#e2e8f0]/70 transition-colors"
            >
              <span
                className="text-[10px] uppercase font-bold tracking-widest text-[#2b3437] dark:text-[#f8f9fa]">{t('labels.rest')}</span>
              <span
                className="mt-1 text-[9px] uppercase font-semibold tracking-wide text-[#4e6073] dark:text-[#b8c3d1]">{t('labels.restDescription')}</span>
            </button>

            <button
              onClick={() => handleAddStep('cooldown')}
              className="w-full flex items-center justify-center py-3 mt-2 rounded-lg border border-dashed border-[#2b3437]/20 dark:border-white/20 bg-[#e2e8f0]/50 hover:bg-[#e2e8f0]/70 transition-colors"
            >
              <span
                className="text-[10px] uppercase font-bold tracking-widest text-[#2b3437] dark:text-[#f8f9fa]">{t('labels.cooldown')}</span>
            </button>
          </div>

          {/* Session Summary */}
          <div className="border-t border-[#e2e8f0] dark:border-white/10 pt-6">
            <SessionSummary blocks={blocks} athleteProfile={athleteProfile} trainingType={trainingType} compact />
          </div>
        </div>

        {/* Action Buttons - Pinned to bottom */}
        {footerContent && (
          <div className="flex-none border-t border-[#e2e8f0] dark:border-white/10 bg-[#f8f9fa] dark:bg-[#0a0f14] p-4">
            {footerContent}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-transparent">

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto px-8 py-8 w-full">
          <div className="max-w-5xl mx-auto space-y-12 pb-24">
            {/* Projected Training Profile Chart */}
            <div className="w-full">
              <WorkoutIntensityChart
                blocks={blocks}
                selectedId={selectedBlockId}
                onBlockClick={selectBlock}
                athleteProfile={athleteProfile}
              />
            </div>

            {/* Sequence Builder */}
            <div className="w-full">
              <WorkoutSequence
                blocks={blocks}
                selectedBlockId={selectedBlockId}
                onSelectBlock={selectBlock}
                onUpdateBlock={updateBlock}
                onUpdateGroupReps={updateGroupReps}
                onRemoveBlock={removeBlock}
                athleteProfile={athleteProfile}
                athleteId={athleteId}
                trainingType={trainingType}
                onAddStep={handleAddStep}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                draggedBlockId={draggedBlockId}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
