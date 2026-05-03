import api from '@/lib/axios';

export interface UpdateAthleteProfileRequest {
    coachNotes?: string;
    vam?: string;
    uan?: string;
    restHR?: number;
    maxHR?: number;
    weight?: number;
    height?: number;
}

export interface SuccessResponse {
    success: boolean;
}

export const athletesService = {
    updateProfile: async (id: string, data: UpdateAthleteProfileRequest) => {
        return api.patch<SuccessResponse>(`/v2/users/${id}/details`, data);
    }
};
