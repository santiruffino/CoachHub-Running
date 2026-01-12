import api from '@/lib/axios';
import { ProfileDetails, UpdateProfileDto } from '../types';

export const profileService = {
    getProfile: async () => {
        return api.get<ProfileDetails>('/v2/users/profile');
    },

    updateProfile: async (data: UpdateProfileDto) => {
        return api.patch<ProfileDetails>('/v2/users/profile', data);
    },

    changePassword: async (data: any) => {
        return api.patch('/v2/users/change-password', data);
    },

    syncZonesFromStrava: async () => {
        return api.post('/v2/athlete/zones');
    }
};
