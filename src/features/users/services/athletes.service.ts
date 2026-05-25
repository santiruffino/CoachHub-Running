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

export type LoadMetricsRange = 7 | 30 | 90;

export interface LoadMetricsPoint {
    date: string;
    load: number;
    ctl: number;
    atl: number;
    tsb: number;
    acwr: number;
}

export interface LoadMetricsResponse {
    current: {
        ctl: number;
        atl: number;
        tsb: number;
        acwr: number;
        todayLoad: number;
        avg7d: number;
        risk: 'insufficientData' | 'high' | 'moderate' | 'balanced' | 'lowStimulus';
    };
    series: LoadMetricsPoint[];
    meta: {
        range: LoadMetricsRange;
        partial: boolean;
        warmupDays: number;
        historyDaysAvailable: number;
        backfillStatus: 'idle' | 'queued' | 'running' | 'success' | 'failed';
        backfillJob: {
            id: string;
            status: string;
            created_at: string;
            started_at?: string | null;
            finished_at?: string | null;
            activities_processed?: number;
            error?: string | null;
            window_days?: number;
        } | null;
    };
}

export const athletesService = {
    updateProfile: async (id: string, data: UpdateAthleteProfileRequest) => {
        return api.patch<SuccessResponse>(`/v2/users/${id}/details`, data);
    },
    getLoadMetrics: async (id: string, range: LoadMetricsRange) => {
        return api.get<LoadMetricsResponse>(`/v2/users/${id}/load-metrics`, {
            params: { range },
        });
    }
};
