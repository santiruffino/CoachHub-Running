import api from '@/lib/axios';

export interface GarminStatus {
    /** Whether the Garmin integration is available to this user (pilot gate). */
    available: boolean;
    connected: boolean;
    status: 'active' | 'needs_reauth' | null;
    lastSyncedAt?: string | null;
    connectedAt?: string | null;
}

export interface GarminConnectResponse {
    success: boolean;
    status: 'active';
}

export interface GarminPushResponse {
    success: boolean;
    status: 'synced' | 'failed' | 'skipped';
    garminWorkoutId?: string;
    error?: string;
}

export const garminService = {
    getStatus: async (): Promise<GarminStatus> => {
        const response = await api.get<GarminStatus>(`/v2/garmin/auth/status?t=${Date.now()}`);
        return response.data;
    },
    connect: async (username: string, password: string, consent: boolean): Promise<GarminConnectResponse> => {
        const response = await api.post<GarminConnectResponse>('/v2/garmin/auth/connect', { username, password, consent });
        return response.data;
    },
    disconnect: async (): Promise<void> => {
        await api.post('/v2/garmin/auth/disconnect');
    },
    pushAssignment: async (assignmentId: string): Promise<GarminPushResponse> => {
        const response = await api.post<GarminPushResponse>(`/v2/garmin/workouts/${assignmentId}/push`);
        return response.data;
    },
};
