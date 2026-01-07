export type BlockType = 'warmup' | 'interval' | 'recovery' | 'cooldown';
export type DurationType = 'distance' | 'time';
export type TargetType = 'heart_rate' | 'pace' | 'hr_zone';

export interface WorkoutBlock {
    id: string;
    type: BlockType;
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
