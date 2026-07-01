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

export interface ChatParticipant {
    id: string;
    name: string;
    email?: string | null;
}

export interface ChatMessage {
    id: string;
    athleteId: string;
    coachId: string;
    senderId: string;
    senderName: string;
    body: string;
    readAt: string | null;
    createdAt: string;
}

export interface ChatThreadResponse {
    currentUserId: string;
    athlete: ChatParticipant;
    coach: ChatParticipant;
    messages: ChatMessage[];
}

export interface SuccessResponse {
    success: boolean;
}

export interface ConversationSummary {
    athleteId: string;
    athleteName: string;
    coachId: string;
    coachName: string;
    lastMessage: {
        body: string;
        senderId: string;
        createdAt: string;
    } | null;
    unreadCount: number;
}

export interface ConversationsResponse {
    conversations: ConversationSummary[];
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

export interface WeeklyLoadPoint {
    weekStart: string;
    km: number;
    minutes: number;
    tss: number;
    hasHrData: boolean;
}

export interface WeeklyLoadResponse {
    series: WeeklyLoadPoint[];
    meta: {
        weeks: number;
    };
}

export interface CareerStatsTotals {
    count: number;
    distance: number;
    elevationGain: number;
    movingTime: number;
}

export interface CareerStatsResponse {
    careerStats: {
        ytd: CareerStatsTotals;
        allTime: CareerStatsTotals;
    };
    syncedAt: string | null;
    stale?: boolean;
}

export const athletesService = {
    updateProfile: async (id: string, data: UpdateAthleteProfileRequest) => {
        return api.patch<SuccessResponse>(`/v2/users/${id}/details`, data);
    },
    getLoadMetrics: async (id: string, range: LoadMetricsRange) => {
        return api.get<LoadMetricsResponse>(`/v2/users/${id}/load-metrics`, {
            params: { range },
        });
    },
    getWeeklyLoad: async (id: string) => {
        return api.get<WeeklyLoadResponse>(`/v2/users/${id}/weekly-load`);
    },
    getCareerStats: async (id: string) => {
        return api.get<CareerStatsResponse>(`/v2/users/${id}/career-stats`);
    },
    getChatThread: async (id: string) => {
        return api.get<ChatThreadResponse>(`/v2/users/${id}/messages`);
    },
    getConversations: async () => {
        return api.get<ConversationsResponse>('/v2/users/conversations');
    },
    sendChatMessage: async (id: string, body: string) => {
        return api.post(`/v2/users/${id}/messages`, { body });
    }
};
