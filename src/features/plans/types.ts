import { TrainingType } from '@/interfaces/training';
import { WorkoutBlock } from '@/features/trainings/components/builder/types';

export interface PlanItemInput {
    trainingId: string;
    weekIndex: number;
    dayOfWeek: number; // 0 = Monday ... 6 = Sunday
    workoutName?: string | null;
    expectedRpe?: number | null;
    sortOrder?: number;
    /** Per-slot structure override; null = follow the referenced template. */
    blocks?: WorkoutBlock[] | null;
}

/** Item as returned by the API (with the joined training template). */
export interface PlanItem {
    id: string;
    training_id: string;
    week_index: number;
    day_of_week: number;
    workout_name: string | null;
    expected_rpe: number | null;
    sort_order: number;
    /** Per-slot structure override; null = follow the referenced template. */
    blocks: WorkoutBlock[] | null;
    training: {
        id: string;
        title: string;
        description: string | null;
        type: TrainingType;
        blocks: unknown;
        team_id: string | null;
    } | null;
}

export interface TrainingPlan {
    id: string;
    name: string;
    description: string | null;
    type: TrainingType;
    duration_weeks: number;
    focus: string | null;
    is_archived: boolean;
    created_at: string;
    updated_at: string;
    /** Present on detail responses. */
    items?: PlanItem[];
    /** Present on list responses (aggregate count). */
    training_plan_items?: { count: number }[];
}

export interface CreatePlanDto {
    name: string;
    description?: string | null;
    type?: TrainingType;
    durationWeeks: number;
    focus?: string | null;
    items?: PlanItemInput[];
}

export type UpdatePlanDto = Partial<CreatePlanDto>;

export interface ApplyPlanDto {
    startDate: string; // yyyy-MM-dd
    athleteIds?: string[];
    groupIds?: string[];
    weekIndexes?: number[];
}

export interface CopyWeekDto {
    sourceUserId: string;
    sourceWeekStart: string;
    targetWeekStart: string;
    targetAthleteIds?: string[];
    targetGroupIds?: string[];
}
