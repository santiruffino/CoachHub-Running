import api from '@/lib/axios';

export const athletesService = {
    updateProfile: async (id: string, data: any) => {
        return api.patch(`/v2/users/${id}/details`, data);
    }
};
