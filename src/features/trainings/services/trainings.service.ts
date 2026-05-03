import api from '@/lib/axios';
import {
    Training,
    CreateTrainingDto,
    AssignTrainingDto,
    AssignmentResponse,
    DeleteResponse,
} from '../types';

export const trainingsService = {
    findAll: async () => {
        return api.get<Training[]>('/v2/trainings');
    },

    findOne: async (id: string) => {
        return api.get<Training>(`/v2/trainings/${id}`);
    },

    create: async (data: CreateTrainingDto) => {
        return api.post<Training>('/v2/trainings', data);
    },

    update: async (id: string, data: Partial<CreateTrainingDto>) => {
        return api.patch<Training>(`/v2/trainings/${id}`, data);
    },

    assign: async (data: AssignTrainingDto) => {
        return api.post<AssignmentResponse>('/v2/trainings/assign', data);
    },

    delete: async (id: string) => {
        return api.delete<DeleteResponse>(`/v2/trainings/${id}`);
    },

    deleteAssignment: async (id: string) => {
        return api.delete<DeleteResponse>(`/v2/trainings/assignments/${id}`);
    }
};
