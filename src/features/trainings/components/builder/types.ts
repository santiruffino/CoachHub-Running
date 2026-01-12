export type BlockType = 'warmup' | 'interval' | 'recovery' | 'cooldown';
export type DurationType = 'distance' | 'time';
export type TargetType = 'heart_rate' | 'pace' | 'hr_zone' | 'vam_zone' | 'power';

export interface WorkoutBlock {
    id: string;
    type: BlockType;
    stepName?: string; // User-friendly name for the step
    duration: {
        type: DurationType;
        value: number; // meters or seconds
        unit?: 'm' | 'km'; // optional unit preference for distance
    };
    target: {
        type: TargetType;
        min: number | string;
        max: number | string;
    };
    intensity?: number; // RPE value (0-100) - optional
    notes?: string;
    group?: {
        id: string;
        reps: number;
    };
}

export type WorkoutBuilderStore = {
    blocks: WorkoutBlock[];
    selectedBlockId: string | null;
    addBlock: (type: BlockType) => void;
    updateBlock: (id: string, updates: Partial<WorkoutBlock>) => void;
    removeBlock: (id: string) => void;
    selectBlock: (id: string | null) => void;
    reorderBlocks: (fromIndex: number, toIndex: number) => void;
};
