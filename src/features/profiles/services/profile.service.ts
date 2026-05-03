import api from '@/lib/axios';
import { ProfileDetails, UpdateProfileDto } from '../types';

export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
}

export interface MessageResponse {
    message: string;
}

export interface ZonesSyncResponse {
    success: boolean;
    message: string;
    zones?: {
        zones: Array<{ min: number; max: number }>;
        custom_zones?: boolean;
    };
}

export const profileService = {
    getProfile: async () => {
        return api.get<ProfileDetails>('/v2/users/profile');
    },

    updateProfile: async (data: UpdateProfileDto) => {
        return api.patch<ProfileDetails>('/v2/users/profile', data);
    },

    changePassword: async (data: ChangePasswordRequest) => {
        return api.patch<MessageResponse>('/v2/users/change-password', data);
    },

    syncZonesFromStrava: async () => {
        return api.post<ZonesSyncResponse>('/v2/athlete/zones');
    }
};
