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
    workoutName?: string; // Custom name for this specific workout assignment
}

// Workout Matching Types
export interface WorkoutMatch {
    matched: boolean;
    activityId?: string;
    activityExternalId?: string;
    matchQuality?: MatchQuality;
    blockComparison?: BlockComparison[];
}

export interface MatchQuality {
    overallScore: number; // 0-100
    objectiveType: 'distance' | 'time'; // Primary workout objective
    objectiveMatch: number; // % accuracy of primary objective
    distanceMatch?: number; // % difference (negative = shorter, positive = longer)
    durationMatch?: number; // % difference (negative = faster, positive = slower)
    paceCompliance?: number; // % compliance with target pace zones
    plannedDistance?: number; // Planned distance in meters
    actualDistance?: number; // Actual distance in meters
    plannedDuration?: number; // Planned duration in seconds
    actualDuration?: number; // Actual duration in seconds
}

export interface BlockComparison {
    blockId: string;
    blockName?: string;
    blockType: string;
    planned: {
        duration: number; // seconds
        distance?: number; // meters
        targetPace?: { min: string; max: string };
        targetType?: string;
    };
    actual?: {
        duration?: number; // seconds
        distance?: number; // meters
        avgPace?: string;
    };
    compliance?: number; // 0-100, only if we have actual data
}
