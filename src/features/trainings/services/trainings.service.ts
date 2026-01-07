import api from '@/lib/axios';
import { Training, CreateTrainingDto, AssignTrainingDto } from '../types';

export const trainingsService = {
    findAll: async () => {
        return api.get<Training[]>('/v2/trainings');
    },

    create: async (data: CreateTrainingDto) => {
        return api.post<Training>('/v2/trainings', data);
    },

    assign: async (data: AssignTrainingDto) => {
        return api.post('/v2/trainings/assign', data);
    },

    delete: async (id: string) => {
        return api.delete(`/v2/trainings/${id}`);
    },

    deleteAssignment: async (id: string) => {
        return api.delete(`/v2/trainings/assignments/${id}`);
    }
};
