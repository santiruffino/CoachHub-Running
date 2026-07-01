import api from '@/lib/axios';

export interface NotificationItem {
    id: string;
    type: string;
    title: string;
    body: string | null;
    link: string | null;
    is_read: boolean;
    created_at: string;
}

export interface NotificationsResponse {
    notifications: NotificationItem[];
    unreadCount: number;
}

export interface SuccessResponse {
    success: boolean;
}

export type NotificationCategory =
    | 'chat_message'
    | 'workout_assigned'
    | 'race_reminder'
    | 'system'
    | 'rpe_mismatch'
    | 'low_compliance'
    | 'training_load';
export type NotificationFrequency = 'immediate' | 'daily' | 'weekly';

export interface NotificationPreference {
    category: NotificationCategory;
    in_app_enabled: boolean;
    push_enabled: boolean;
    email_enabled: boolean;
    frequency: NotificationFrequency;
}

export interface NotificationPreferencesResponse {
    preferences: NotificationPreference[];
}

export interface PushSubscriptionPayload {
    endpoint: string;
    keys: { p256dh: string; auth: string };
}

export const notificationsService = {
    list: async (limit?: number) => {
        return api.get<NotificationsResponse>('/v2/notifications', {
            params: limit ? { limit } : undefined,
        });
    },
    markRead: async (id: string) => {
        return api.post<SuccessResponse>(`/v2/notifications/${id}/read`);
    },
    markAllRead: async () => {
        return api.post<SuccessResponse>('/v2/notifications/read-all');
    },
    getPreferences: async () => {
        return api.get<NotificationPreferencesResponse>('/v2/notifications/preferences');
    },
    updatePreference: async (preference: NotificationPreference) => {
        return api.put<SuccessResponse>('/v2/notifications/preferences', preference);
    },
    savePushSubscription: async (subscription: PushSubscriptionPayload) => {
        return api.post<SuccessResponse>('/v2/notifications/push-subscriptions', subscription);
    },
    removePushSubscription: async (endpoint: string) => {
        return api.delete<SuccessResponse>('/v2/notifications/push-subscriptions', {
            params: { endpoint },
        });
    },
};
