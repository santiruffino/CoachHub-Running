'use client';

import { WorkoutBlock, AthleteProfile } from './types';
import { StepEditor } from './StepEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Repeat, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface RepeatBlockEditorProps {
    groupId: string;
    blocks: WorkoutBlock[];
    onUpdate: (blockId: string, updates: Partial<WorkoutBlock>) => void;
    onUpdateReps?: (groupId: string, reps: number) => void;
    onRemove: (blockId: string) => void;
    athleteProfile?: AthleteProfile | null;
    athleteId?: string | null;
    onAddStep: () => void;
    readOnly?: boolean;
}

export function RepeatBlockEditor({
    groupId,
    blocks,
    onUpdate,
    onUpdateReps,
    onRemove,
    athleteProfile,
    athleteId,
    onAddStep,
    readOnly = false,
}: RepeatBlockEditorProps) {
    const t = useTranslations('builder');
    const [isCollapsed, setIsCollapsed] = useState(false);

    const reps = blocks[0]?.group?.reps || 1;
    const skipLastRest = blocks[0]?.group?.skipLastRest || false;

    const updateReps = (newReps: number) => {
        if (onUpdateReps) {
            onUpdateReps(groupId, newReps);
            return;
        }

        blocks.forEach(block => {
            if (block.group?.id === groupId) {
                onUpdate(block.id, {
                    group: {
                        ...block.group,
                        reps: newReps
                    }
                });
            }
        });
    };

    const updateSkipLastRest = (value: boolean) => {
        blocks.forEach(block => {
            if (block.group?.id === groupId) {
                onUpdate(block.id, {
                    group: {
                        ...block.group,
                        skipLastRest: value
                    }
                });
            }
        });
    };

    // Calculate total distance for this block
    const getTotalDistance = () => {
        const singleDistance = blocks.reduce((sum, block) => {
            if (block.duration.type === 'distance') {
                return sum + (block.duration.value / 1000); // Convert to km
            }
            return sum;
        }, 0);
        return (singleDistance * reps).toFixed(2);
    };

    return (
        <div className="bg-muted dark:bg-slate-800 rounded-lg border border-border dark:border-slate-700 overflow-hidden">
            {/* Header */}
            <div className="bg-muted dark:bg-slate-700 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Repeat className="w-5 h-5 text-[#FFCC00]" />
                    <div className="flex items-center gap-2">
                        <span className="text-foreground dark:text-white font-semibold">{t('repeat')}</span>
                        <Input
                            type="number"
                            min="1"
                            value={reps}
                            onChange={(e) => updateReps(parseInt(e.target.value) || 1)}
                            disabled={readOnly}
                            className="w-16 h-8 bg-white dark:bg-slate-800 border-input dark:border-slate-600 text-foreground dark:text-white text-center font-bold"
                        />
                        <span className="text-foreground dark:text-white font-semibold">{t('times')}</span>
                    </div>
                    <span className="text-sm text-muted-foreground ml-4">
                        {t('totalForBlock')} <span className="text-[#FFCC00] font-semibold">{getTotalDistance()} {t('units.km')}</span>
                    </span>
                </div>

                {/* Skip Last Rest/Recovery Option */}
                {blocks.length > 0 && (blocks[blocks.length - 1].type === 'rest' || blocks[blocks.length - 1].type === 'recovery') && (
                    <div className="flex items-center gap-2 ml-4">
                        <Switch
                            checked={skipLastRest}
                            onCheckedChange={updateSkipLastRest}
                            disabled={readOnly}
                            id={`skip-last-rest-${groupId}`}
                            style={{
                                backgroundColor: skipLastRest ? 'var(--color-endurix-orange)' : 'hsl(var(--input))'
                            }}
                            thumbClassName="bg-white dark:bg-white"
                            className="focus-visible:ring-endurix-orange/30"
                        />
                        <Label htmlFor={`skip-last-rest-${groupId}`} className="text-sm text-foreground dark:text-muted-foreground cursor-pointer">
                            {t('skipLastRestRecovery')}
                        </Label>
                    </div>
                )}

                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="text-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-white hover:bg-muted dark:hover:bg-slate-600"
                    >
                        {isCollapsed ? (
                            <>
                                <ChevronDown className="w-4 h-4 mr-1" />
                                {t('expand')}
                            </>
                        ) : (
                            <>
                                <ChevronUp className="w-4 h-4 mr-1" />
                                {t('collapse')}
                            </>
                        )}
                    </Button>
                    {!readOnly && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                // Remove all blocks in this group
                                blocks.forEach(block => onRemove(block.id));
                            }}
                            className="text-foreground dark:text-muted-foreground hover:text-destructive hover:bg-muted dark:hover:bg-slate-600"
                        >
                            {t('deleteBlock')}
                        </Button>
                    )}
                </div>
            </div>

            {/* Steps */}
            {!isCollapsed && (
                <div className="p-4 space-y-3">
                    {blocks.map((block, index) => (
                        <StepEditor
                            key={block.id}
                            step={block}
                            stepNumber={index + 1}
                            onUpdate={(updates) => onUpdate(block.id, updates)}
                            onRemove={() => onRemove(block.id)}
                            isInRepeat={true}
                            athleteProfile={athleteProfile}
                            athleteId={athleteId}
                            readOnly={readOnly}
                        />
                    ))}

                    {!readOnly && (
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full border-dashed border-input dark:border-slate-600 text-[#FFCC00] hover:text-[#FFD633] hover:bg-muted dark:hover:bg-slate-700 hover:border-[#FFCC00]"
                            onClick={onAddStep}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            {t('addStepToRepeat')}
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
