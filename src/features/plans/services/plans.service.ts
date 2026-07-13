import api from '@/lib/axios';
import { TrainingPlan, CreatePlanDto, UpdatePlanDto, ApplyPlanDto, CopyWeekDto } from '../types';

export const plansService = {
    findAll: async () => {
        return api.get<TrainingPlan[]>('/v2/plans');
    },

    findOne: async (id: string) => {
        return api.get<TrainingPlan>(`/v2/plans/${id}`);
    },

    create: async (data: CreatePlanDto) => {
        return api.post<TrainingPlan>('/v2/plans', data);
    },

    update: async (id: string, data: UpdatePlanDto) => {
        return api.patch<TrainingPlan>(`/v2/plans/${id}`, data);
    },

    remove: async (id: string) => {
        return api.delete<{ message: string }>(`/v2/plans/${id}`);
    },

    duplicate: async (id: string) => {
        return api.post<TrainingPlan>(`/v2/plans/${id}/duplicate`);
    },

    apply: async (id: string, data: ApplyPlanDto) => {
        return api.post<{ message: string; assignmentCount: number; athleteCount: number }>(
            `/v2/plans/${id}/apply`,
            data,
        );
    },

    copyWeek: async (data: CopyWeekDto) => {
        return api.post<{ message: string; assignmentCount: number; athleteCount: number }>(
            '/v2/trainings/calendar/copy-week',
            data,
        );
    },
};
