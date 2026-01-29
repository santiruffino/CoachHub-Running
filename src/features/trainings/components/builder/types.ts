export type BlockType = 'warmup' | 'interval' | 'recovery' | 'cooldown';
export type DurationType = 'distance' | 'time';
export type TargetType =
    | 'heart_rate'
    | 'pace'
    | 'hr_zone'
    | 'vam_zone'
    | 'power'
    | 'threshold_pace' // % of threshold pace
    | 'threshold_hr'   // % of threshold HR
    | 'threshold_hr'   // % of threshold HR
    | 'hr_max'         // % of max HR
    | 'no_target';     // No specific target

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
    rpe?: number; // RPE value (1-10) - optional
    intensity?: number; // Deprecated: old intensity value
    notes?: string;
    group?: {
        id: string;
        reps: number;
    };
    // New fields for redesign
    endOnLapButton?: boolean; // End step when lap button is pressed
    cadenceRange?: {
        min: number;
        max: number;
    };
}

export interface WorkoutTotals {
    distance: number; // in km
    duration: number; // in seconds
    tss: number; // Training Stress Score
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
