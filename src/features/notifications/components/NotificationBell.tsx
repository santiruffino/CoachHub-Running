'use client';
import { appLogger } from '@/lib/app-logger';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, MessageSquareText, Dumbbell, Flag, Megaphone, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { isToday, isThisWeek } from 'date-fns';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { notificationsService, NotificationItem } from '@/features/notifications/services/notifications.service';
import { subscribeToTableChanges } from '@/lib/supabase/realtime';

interface GroupedNotifications {
    today: NotificationItem[];
    thisWeek: NotificationItem[];
    older: NotificationItem[];
}

function groupNotifications(notifications: NotificationItem[]): GroupedNotifications {
    const groups: GroupedNotifications = { today: [], thisWeek: [], older: [] };

    for (const notification of notifications) {
        const date = new Date(notification.created_at);
        if (isToday(date)) {
            groups.today.push(notification);
        } else if (isThisWeek(date, { weekStartsOn: 1 })) {
            groups.thisWeek.push(notification);
        } else {
            groups.older.push(notification);
        }
    }

    return groups;
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
    chat_message: MessageSquareText,
    workout_assigned: Dumbbell,
    race_reminder: Flag,
    system: Megaphone,
};

function getCategoryIcon(type: string): LucideIcon {
    return CATEGORY_ICONS[type] || Megaphone;
}

function formatNotificationTime(value: string) {
    return new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}

export function NotificationBell() {
    const t = useTranslations('notifications');
    const router = useRouter();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const res = await notificationsService.list();
                if (!cancelled) {
                    setNotifications(res.data.notifications);
                    setUnreadCount(res.data.unreadCount);
                }
            } catch (err) {
                appLogger.error('Failed to load notifications:', err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        void load();

        const unsubscribe = subscribeToTableChanges(
            'notifications-bell',
            { event: '*', schema: 'public', table: 'notifications' },
            () => void load()
        );

        return () => {
            cancelled = true;
            unsubscribe();
        };
    }, []);

    const groups = useMemo(() => groupNotifications(notifications), [notifications]);

    const handleSelect = async (notification: NotificationItem) => {
        if (!notification.is_read) {
            try {
                await notificationsService.markRead(notification.id);
                setNotifications((prev) =>
                    prev.map((item) => (item.id === notification.id ? { ...item, is_read: true } : item))
                );
                setUnreadCount((prev) => Math.max(0, prev - 1));
            } catch (err) {
                appLogger.error('Failed to mark notification as read:', err);
            }
        }

        if (notification.link) {
            router.push(notification.link);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await notificationsService.markAllRead();
            setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
            setUnreadCount(0);
        } catch (err) {
            appLogger.error('Failed to mark all notifications as read:', err);
        }
    };

    const renderGroup = (label: string, items: NotificationItem[]) => {
        if (items.length === 0) return null;
        return (
            <div key={label}>
                <DropdownMenuLabel className="px-4 pt-3 pb-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                    {label}
                </DropdownMenuLabel>
                {items.map((notification) => {
                    const Icon = getCategoryIcon(notification.type);
                    return (
                        <DropdownMenuItem
                            key={notification.id}
                            onClick={() => void handleSelect(notification)}
                            className={`mx-2 flex items-start gap-3 rounded-lg px-3 py-3 ${!notification.is_read ? 'bg-endurix-orange/5' : ''}`}
                        >
                            <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-endurix-orange" />
                            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                <div className="flex w-full items-center justify-between gap-2">
                                    <span className="min-w-0 truncate text-sm font-medium">{notification.title}</span>
                                    {!notification.is_read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-endurix-orange" />}
                                </div>
                                {notification.body && (
                                    <span className="line-clamp-2 text-xs text-muted-foreground">{notification.body}</span>
                                )}
                                <span className="text-[10px] text-muted-foreground">{formatNotificationTime(notification.created_at)}</span>
                            </div>
                        </DropdownMenuItem>
                    );
                })}
            </div>
        );
    };

    return (
            <DropdownMenu>
                <DropdownMenuTrigger className="relative flex h-9 w-9 items-center justify-center rounded-full text-endurix-black/70 hover:bg-endurix-black/5 dark:text-muted-foreground dark:hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                    <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-endurix-orange px-1 text-[9px] font-bold text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
                </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[22rem] max-w-[calc(100vw-1rem)] p-0 overflow-hidden sm:w-[26rem]">
                <div className="flex items-start justify-between gap-3 border-b border-endurix-black/8 dark:border-border bg-endurix-paper/80 dark:bg-muted/50 px-4 py-3">
                    <DropdownMenuLabel className="p-0 text-sm font-semibold leading-none">{t('title')}</DropdownMenuLabel>
                    <div className="flex items-center gap-3 shrink-0">
                        {unreadCount > 0 && (
                            <button
                                type="button"
                                onClick={() => void handleMarkAllRead()}
                                className="flex items-center gap-1 whitespace-nowrap text-[10px] font-medium uppercase tracking-widest text-endurix-orange hover:underline"
                            >
                                <CheckCheck className="h-3 w-3" />
                                {t('markAllRead')}
                            </button>
                        )}
                        <Link
                            href="/settings/notifications"
                            className="flex items-center text-muted-foreground hover:text-endurix-black dark:hover:text-foreground"
                            aria-label={t('preferencesLink')}
                            title={t('preferencesLink')}
                        >
                            <Settings className="h-3.5 w-3.5" />
                        </Link>
                    </div>
                </div>
                <DropdownMenuSeparator />
                <div className="max-h-[32rem] overflow-y-auto pb-2">
                    {loading ? (
                        <p className="px-4 py-5 text-center text-sm text-muted-foreground">{t('loading')}</p>
                    ) : notifications.length === 0 ? (
                        <p className="px-4 py-5 text-center text-sm text-muted-foreground">{t('empty')}</p>
                    ) : (
                        <>
                            {renderGroup(t('groups.today'), groups.today)}
                            {renderGroup(t('groups.thisWeek'), groups.thisWeek)}
                            {renderGroup(t('groups.older'), groups.older)}
                        </>
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
