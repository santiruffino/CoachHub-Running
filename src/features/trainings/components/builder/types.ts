export type BlockType = 'warmup' | 'interval' | 'recovery' | 'rest' | 'cooldown';
export type DurationType = 'distance' | 'time';
export type TargetType =
    | 'vam_zone'    // VAM Zones 1-6
    | 'lthr'        // LTHR (% of threshold HR)
    | 'hr_reserve'  // FC de Reserva - Karvonen (% of HR reserve)
    | 'rpe_target' // RPE (1-10) as workout target
    | 'power_zone'  // Power Zones 1-7 (Cycling)
    | 'ftp_percent'; // % of Functional Threshold Power (Cycling)

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
    intensity?: number; // Used for bar height in the workout graph (0-100)
    notes?: string;
    group?: {
        id: string;
        reps: number;
        skipLastRest?: boolean; // Skip the last rest/recovery step in the repeat
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

export interface AthleteProfile {
    vam?: string;    // e.g., "4:30" min/km
    lthr?: number;   // e.g., 170 bpm
    maxHR?: number;  // e.g., 190 bpm
    restHR?: number; // e.g., 45 bpm
    ftp?: number;    // Functional Threshold Power (Watts)
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
