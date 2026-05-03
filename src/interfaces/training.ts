import { WorkoutBlock } from '@/features/trainings/components/builder/types';

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
    blocks: WorkoutBlock[];
    coachId: string;
    teamId?: string; // Links this template to a B2B Running Team
    coach?: { name: string }; // Useful for UI display badge
    isTemplate?: boolean;
    expectedRpe?: number; // Global expected RPE (1-10)
}

export interface TrainingAssignment {
    id: string;
    scheduledDate: string; // CamelCase version used in some parts
    scheduled_date?: string; // SnakeCase version used in others
    completed: boolean;
    expectedRpe?: number;
    training: Training;
    athlete?: {
        id: string;
        name: string;
        email: string;
    };
    user?: {
        id: string;
        name: string | null;
    };
    workout_name?: string | null;
    source_group_id?: string | null;
    groupName?: string;
    canEdit?: boolean;
}

export type WorkoutAssignment = TrainingAssignment;

export interface AssignmentResponse {
    message: string;
    assignments: TrainingAssignment[];
}

export interface DeleteResponse {
    message: string;
}

export interface CreateTrainingDto {
    title: string;
    description?: string;
    type: TrainingType;
    blocks?: WorkoutBlock[];
    teamId?: string;
    isTemplate?: boolean;
    expectedRpe?: number;
}

export interface MatchCandidateActivity {
    id: string;
    title: string;
    start_date: string;
    distance: number;
    duration: number;
    sport_type: string;
}

export interface MatchCandidateAssignment {
    id: string;
    scheduledDate: string;
    title: string;
    type?: string;
    isLinked: boolean;
    isLinkedToThis: boolean;
}

export interface AssignTrainingDto {
    trainingId: string;
    athleteIds?: string[];
    groupIds?: string[];
    scheduledDate: string; // ISO Date
    expectedRpe?: number; // Expected Rate of Perceived Exertion (1-10)
    workoutName?: string; // Custom name for this specific workout assignment
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

export interface WorkoutMatch {
    matched: boolean;
    activityId?: string;
    matchQuality?: MatchQuality;
    blockComparison?: BlockComparison[];
    isManualMatch?: boolean;
}
