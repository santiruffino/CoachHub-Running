import api from '@/lib/axios';

export interface StravaConnectionStatus {
    isConnected: boolean;
    athleteId?: string;
    athleteName?: string;
    lastSync?: string;
}

export interface StravaExchangeResponse {
    success: boolean;
    athleteName?: string;
    message: string;
    shouldSync: boolean;
    zonesSynced: boolean;
}

export interface StravaSyncResponse {
    success: boolean;
    message: string;
    inserted: number;
    updated: number;
    total: number;
    zonesSynced: boolean;
}

export interface StravaActivityDetailResponse {
    id: string;
    title: string;
    type: string;
    distance: number;
    duration: number;
    startDate: string;
    avgHr?: number;
    elevationGain?: number;
    device_name?: string;
    streams?: Array<{
        type: string;
        data: number[];
    }>;
}

export const stravaService = {
    getAuthUrl: async () => {
        const response = await api.get<{ url: string }>('/v2/strava/auth/url');
        return response.data;
    },

    exchangeCode: async (code: string) => {
        const state = typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search).get('state')
            : null;
        const response = await api.post<StravaExchangeResponse>('/v2/strava/auth/exchange', { code, state });
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
        const response = await api.post<StravaSyncResponse>('/v2/strava/auth/sync');
        return response.data;
    },

    getActivityDetails: async (activityId: string) => {
        // Use v2 users endpoint
        const response = await api.get<StravaActivityDetailResponse>(`/v2/users/activities/${activityId}`);
        return response.data;
    }
};
