'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

interface CriticalAlertItemProps {
    athleteId: string;
    athleteName: string;
    alertType: 'rpe_mismatch' | 'new_feedback' | 'low_compliance' | 'missing_workout' | 'zone_violation' | 'training_load';
    timestamp: string;
    message: string;
    details?: string;
    priority?: 'P1' | 'P2' | 'P3' | 'P4';
    score?: number;
    recommendedAction?: string;
    canMarkAsRead?: boolean;
    onMarkAsRead?: () => void;
    canResolve?: boolean;
    onResolve?: () => void;
    canSnooze?: boolean;
    onSnooze?: () => void;
}

export function CriticalAlertItem({
    athleteName,
    alertType,
    timestamp,
    message,
    details = "",
    priority,
    score,
    recommendedAction,
    canMarkAsRead = false,
    onMarkAsRead,
    canResolve = false,
    onResolve,
    canSnooze = false,
    onSnooze,
}: CriticalAlertItemProps) {
    const t = useTranslations('dashboard.alertActions');

    let messageColor = "text-endurix-orange";
    let borderAccent = "border-l-endurix-orange";

    if (alertType === 'rpe_mismatch') {
        messageColor = "text-endurix-orange";
        borderAccent = "border-l-endurix-orange";
    } else if (alertType === 'new_feedback') {
        messageColor = "text-endurix-black dark:text-foreground";
        borderAccent = "border-l-endurix-black/30 dark:border-l-white/30";
    } else if (alertType === 'low_compliance') {
        messageColor = "text-endurix-orange";
        borderAccent = "border-l-endurix-orange";
    } else if (alertType === 'missing_workout') {
        messageColor = "text-endurix-orange";
        borderAccent = "border-l-endurix-orange";
    } else if (alertType === 'zone_violation') {
        messageColor = "text-endurix-orange font-bold";
        borderAccent = "border-l-endurix-orange";
    } else if (alertType === 'training_load') {
        messageColor = "text-endurix-orange font-bold";
        borderAccent = "border-l-endurix-orange";
    }

    return (
        <div className={`bg-endurix-paper dark:bg-card border border-y-endurix-black/10 border-r-endurix-black/10 border-l-2 ${borderAccent} dark:border-y-white/10 dark:border-r-white/10 p-4 flex items-center gap-4`}>
            <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarFallback
                    className="text-sm font-bold uppercase tracking-widest bg-endurix-black/8 dark:bg-white/8 text-endurix-black dark:text-foreground"
                    style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                >
                    {athleteName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
                <h4
                    className="text-sm font-bold uppercase tracking-widest text-endurix-black dark:text-foreground"
                    style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                >{athleteName}</h4>
                {details && (
                    <p
                        className="text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground mt-1"
                        style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                    >{details}</p>
                )}
                {recommendedAction && (
                    <p
                        className="text-[10px] uppercase tracking-widest text-endurix-orange mt-1"
                        style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                    >{recommendedAction}</p>
                )}
            </div>

            <div className="text-right flex flex-col items-end gap-1">
                <div className="flex items-center gap-1">
                    {canMarkAsRead && onMarkAsRead && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px] uppercase tracking-widest font-bold"
                            onClick={onMarkAsRead}
                            style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                        >
                            {t('markRead')}
                        </Button>
                    )}
                    {canSnooze && onSnooze && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px] uppercase tracking-widest font-bold"
                            onClick={onSnooze}
                            style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                        >
                            {t('snooze')}
                        </Button>
                    )}
                    {canResolve && onResolve && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px] uppercase tracking-widest font-bold"
                            onClick={onResolve}
                            style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                        >
                            {t('resolve')}
                        </Button>
                    )}
                </div>
                {priority && (
                    <span
                        className="text-[10px] font-bold uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground"
                        style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                    >
                        {priority}{typeof score === 'number' ? ` \u2022 ${score}` : ''}
                    </span>
                )}
                <span
                    className={`text-[10px] uppercase tracking-widest font-bold ${messageColor}`}
                    style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                >
                    {message.toUpperCase()}
                </span>
                <span
                    className="text-[10px] uppercase tracking-widest text-endurix-black/40 dark:text-muted-foreground mt-0.5"
                    style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                >
                    {timestamp}
                </span>
            </div>
        </div>
    );
}
