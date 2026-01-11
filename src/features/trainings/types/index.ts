export enum TrainingType {
    RUNNING = 'RUNNING',
    STRENGTH = 'STRENGTH',
    CYCLING = 'CYCLING',
    SWIMMING = 'SWIMMING',
    OTHER = 'OTHER',
}

export interface Training {
    id: string;
    title: string;
    description?: string;
    type: TrainingType;
    blocks: any; // JSON
    coachId: string;
    isTemplate?: boolean;
}

// TODO: Define Block structure if time permits

export interface CreateTrainingDto {
    title: string;
    description?: string;
    type: TrainingType;
    blocks?: any;
    isTemplate?: boolean;
}

export interface AssignTrainingDto {
    trainingId: string;
    athleteIds?: string[];
    groupIds?: string[];
    scheduledDate: string; // ISO Date
    expectedRpe?: number; // Expected Rate of Perceived Exertion (1-10)
}
