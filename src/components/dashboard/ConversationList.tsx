'use client';
import { appLogger } from '@/lib/app-logger';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { MessageSquareText } from 'lucide-react';
import { athletesService, ConversationSummary } from '@/features/users/services/athletes.service';
import { Skeleton } from '@/components/ui/skeleton';
import { subscribeToTableChanges } from '@/lib/supabase/realtime';

function formatRelativeTime(value: string) {
    return new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}

export function ConversationList() {
    const t = useTranslations('dashboard.chat');
    const [conversations, setConversations] = useState<ConversationSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const load = async (silent = false) => {
            try {
                if (!silent) setLoading(true);
                setError(false);
                const res = await athletesService.getConversations();
                if (!cancelled) setConversations(res.data.conversations);
            } catch (err) {
                appLogger.error('Failed to load conversations:', err);
                if (!cancelled) setError(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        void load();

        const unsubscribe = subscribeToTableChanges(
            'coach-athlete-messages-conversations',
            { event: '*', schema: 'public', table: 'coach_athlete_messages' },
            () => void load(true)
        );

        return () => {
            cancelled = true;
            unsubscribe();
        };
    }, []);

    if (loading) {
        return (
            <div className="space-y-2 p-4">
                {Array.from({ length: 3 }).map((_, idx) => (
                    <Skeleton key={idx} className="h-16 w-full" />
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <p className="p-4 text-sm text-muted-foreground">{t('loadError')}</p>
        );
    }

    if (conversations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
                <MessageSquareText className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm font-semibold uppercase tracking-widest text-endurix-black dark:text-foreground">
                    {t('emptyTitle')}
                </p>
            </div>
        );
    }

    return (
        <div className="divide-y divide-endurix-black/8 dark:divide-border">
            {conversations.map((conversation) => (
                <Link
                    key={conversation.athleteId}
                    href={`/athletes/${conversation.athleteId}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-endurix-black/5 dark:hover:bg-white/5"
                >
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold text-endurix-black dark:text-foreground">
                                {conversation.athleteName}
                            </p>
                            {conversation.unreadCount > 0 && (
                                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-endurix-orange px-1.5 text-[10px] font-bold text-white">
                                    {conversation.unreadCount}
                                </span>
                            )}
                        </div>
                        <p className="mt-0.5 truncate text-sm text-muted-foreground">
                            {conversation.lastMessage ? conversation.lastMessage.body : t('emptyState')}
                        </p>
                    </div>
                    {conversation.lastMessage && (
                        <span className="shrink-0 text-[10px] uppercase tracking-widest text-muted-foreground">
                            {formatRelativeTime(conversation.lastMessage.createdAt)}
                        </span>
                    )}
                </Link>
            ))}
        </div>
    );
}
