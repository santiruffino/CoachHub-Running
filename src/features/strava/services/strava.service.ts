import api from '@/lib/axios';

export interface StravaConnectionStatus {
    isConnected: boolean;
    athleteId?: string;
    athleteName?: string;
    lastSync?: string;
}

export const stravaService = {
    getAuthUrl: async () => {
        const response = await api.get<{ url: string }>('/v2/strava/auth/url');
        return response.data;
    },

    exchangeCode: async (code: string) => {
        const response = await api.post('/v2/strava/auth/exchange', { code });
        return response.data;
    },

    getStatus: async () => {
        // Add timestamp to prevent caching
        const response = await api.get<StravaConnectionStatus>(`/v2/strava/auth/status?t=${Date.now()}`);
        return response.data;
    },

    disconnect: async () => {
        await api.post('/v2/strava/auth/disconnect');
    },

    sync: async () => {
        const response = await api.post('/v2/strava/auth/sync');
        return response.data;
    },

    getActivityDetails: async (activityId: string) => {
        // Use v2 users endpoint
        const response = await api.get(`/v2/users/activities/${activityId}`);
        return response.data;
    }
};
