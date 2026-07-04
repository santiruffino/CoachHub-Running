'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AxiosError } from 'axios';
import { Loader2, MessageSquareText, RefreshCcw, Send } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { appLogger } from '@/lib/app-logger';
import { athletesService, ChatThreadResponse } from '@/features/users/services/athletes.service';
import { subscribeToTableChanges } from '@/lib/supabase/realtime';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface ApiErrorResponse {
    error?: string;
    message?: string;
}

interface CoachAthleteChatProps {
    athleteId: string;
    showHeader?: boolean;
    className?: string;
}

function formatMessageTime(value: string) {
    return new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}

export function CoachAthleteChat({ athleteId, showHeader = true, className = '' }: CoachAthleteChatProps) {
    const t = useTranslations('dashboard.chat');
    const [thread, setThread] = useState<ChatThreadResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [draft, setDraft] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    const loadThread = useCallback(async (silent = false) => {
        try {
            if (silent) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            const response = await athletesService.getChatThread(athleteId);
            setThread(response.data);
            setError(null);
        } catch (err: unknown) {
            appLogger.error('Failed to load coach-athlete thread', err);
            const message = (err as AxiosError<ApiErrorResponse>)?.response?.data?.message
                || (err as AxiosError<ApiErrorResponse>)?.response?.data?.error
                || t('loadError');
            setError(message);
        } finally {
            if (silent) {
                setRefreshing(false);
            } else {
                setLoading(false);
            }
        }
    }, [athleteId, t]);

    useEffect(() => {
        void loadThread();
    }, [loadThread]);

    useEffect(() => {
        const unsubscribe = subscribeToTableChanges(
            `coach-athlete-messages-${athleteId}`,
            { event: '*', schema: 'public', table: 'coach_athlete_messages', filter: `athlete_id=eq.${athleteId}` },
            () => void loadThread(true)
        );

        return unsubscribe;
    }, [athleteId, loadThread]);

    useEffect(() => {
        if (thread?.messages.length) {
            scrollRef.current?.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: 'smooth',
            });
        }
    }, [thread?.messages.length]);

    const otherParticipantName = useMemo(() => {
        if (!thread) return '';
        return thread.currentUserId === thread.athlete.id ? thread.coach.name : thread.athlete.name;
    }, [thread]);

    const handleSend = async () => {
        const body = draft.trim();
        if (!body) return;

        try {
            setSending(true);
            await athletesService.sendChatMessage(athleteId, body);
            setDraft('');
            await loadThread(true);
        } catch (err: unknown) {
            appLogger.error('Failed to send coach-athlete message', err);
            const message = (err as AxiosError<ApiErrorResponse>)?.response?.data?.message
                || (err as AxiosError<ApiErrorResponse>)?.response?.data?.error
                || t('sendError');
            setError(message);
        } finally {
            setSending(false);
        }
    };

    const isBusy = loading && !thread;

    if (isBusy) {
        return (
            <div className={`flex min-h-[24rem] items-center justify-center rounded-2xl border border-endurix-black/10 dark:border-border bg-endurix-paper dark:bg-card ${className}`}>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm uppercase tracking-widest">{t('loading')}</span>
                </div>
            </div>
        );
    }

    if (error && !thread) {
        return (
            <div className={`rounded-2xl border border-endurix-black/10 dark:border-border bg-endurix-paper dark:bg-card p-5 ${className}`}>
                <p className="text-sm font-medium text-destructive">{error}</p>
            </div>
        );
    }

    return (
        <div className={`flex min-h-[24rem] min-h-0 flex-col gap-4 ${className}`}>
            {showHeader && (
                <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <MessageSquareText className="h-4 w-4 text-endurix-orange" />
                            <h3 className="text-xl font-medium tracking-tight uppercase text-endurix-black dark:text-foreground" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>
                                {t('title')}
                            </h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {otherParticipantName ? t('subtitleWithName', { name: otherParticipantName }) : t('subtitle')}
                        </p>
                    </div>

                    <Button variant="outline-brand" size="sm" type="button" onClick={() => void loadThread(true)} disabled={refreshing || loading} className="shrink-0 uppercase tracking-widest text-[10px]">
                        {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                        <span className="hidden sm:inline">{refreshing ? t('refreshing') : t('refresh')}</span>
                    </Button>
                </div>
            )}

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-endurix-black/10 dark:border-border bg-endurix-paper/70 dark:bg-card">
                <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
                    {thread?.messages.length ? (
                        thread.messages.map((message) => {
                            const isMine = message.senderId === thread.currentUserId;
                            return (
                                <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[88%] rounded-2xl px-4 py-3 shadow-sm ${isMine ? 'bg-endurix-orange text-white' : 'bg-white dark:bg-muted text-endurix-black dark:text-foreground border border-endurix-black/10 dark:border-border'}`}>
                                        <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-widest opacity-80">
                                            <span>{isMine ? t('you') : message.senderName}</span>
                                            <span>{formatMessageTime(message.createdAt)}</span>
                                        </div>
                                        <p className="whitespace-pre-wrap text-sm leading-relaxed">
                                            {message.body}
                                        </p>
                                        {isMine && message.readAt && (
                                            <p className="text-[10px] uppercase tracking-widest opacity-80">
                                                {t('read')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="flex h-full min-h-[12rem] items-center justify-center p-6 text-center text-muted-foreground">
                            <div className="space-y-2">
                                <p className="text-sm font-semibold uppercase tracking-widest text-endurix-black dark:text-foreground">
                                    {t('emptyTitle')}
                                </p>
                                <p className="text-sm">
                                    {otherParticipantName ? t('emptyWithName', { name: otherParticipantName }) : t('emptyState')}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {error && thread && (
                    <div className="border-t border-endurix-black/10 dark:border-border px-4 py-3 text-sm text-destructive">
                        {error}
                    </div>
                )}

                <div className="border-t border-endurix-black/10 dark:border-border p-4 sm:p-5">
                    <Textarea
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        placeholder={t('placeholder')}
                        className="min-h-32 resize-none rounded-2xl border border-endurix-black/10 bg-white/95 px-4 py-3 text-sm leading-relaxed shadow-inner placeholder:text-muted-foreground/60 focus-visible:border-endurix-orange focus-visible:ring-2 focus-visible:ring-endurix-orange/20 dark:bg-background"
                    />
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <p className="max-w-[22rem] text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                            {t('threadHint')}
                        </p>
                        <Button
                            type="button"
                            variant="orange"
                            onClick={() => void handleSend()}
                            disabled={sending || !draft.trim()}
                            className="h-11 w-full rounded-full px-5 uppercase tracking-[0.22em] text-[10px] shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md disabled:translate-y-0 disabled:shadow-none sm:w-auto"
                        >
                            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 shrink-0" />}
                            <span>{sending ? t('sending') : t('send')}</span>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
