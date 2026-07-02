'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { subscribeToTableChanges } from '@/lib/supabase/realtime';
import type { NotificationItem } from '@/features/notifications/services/notifications.service';

/**
 * Surfaces an ephemeral toast the moment a new notification row lands for the
 * current user (e.g. Strava sync confirmation, workout assignment). The
 * NotificationBell inbox already lists these; this only adds the real-time
 * pop-up so events aren't missed until the bell is opened.
 */
export function NotificationToastListener() {
    const { user } = useAuth();
    const router = useRouter();
    const t = useTranslations('notifications');

    useEffect(() => {
        if (!user?.id) return;

        const unsubscribe = subscribeToTableChanges<NotificationItem>(
            'notifications-toast',
            { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
            (payload) => {
                if (payload.eventType !== 'INSERT') return;
                const notification = payload.new;

                toast(notification.title, {
                    description: notification.body || undefined,
                    action: notification.link
                        ? {
                            label: t('toastAction'),
                            onClick: () => router.push(notification.link as string),
                        }
                        : undefined,
                });
            }
        );

        return () => unsubscribe();
    }, [user?.id, router, t]);

    return null;
}
