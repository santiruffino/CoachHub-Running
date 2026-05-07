'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

interface CriticalAlertItemProps {
    athleteId: string;
    athleteName: string;
    alertType: 'rpe_mismatch' | 'new_feedback' | 'low_compliance' | 'missing_workout' | 'zone_violation';
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

    let messageColor = "text-red-500/90";
    
    if (alertType === 'rpe_mismatch') {
        messageColor = "text-orange-500/90";
    } else if (alertType === 'new_feedback') {
        messageColor = "text-primary/90";
    } else if (alertType === 'low_compliance') {
        messageColor = "text-red-500/90";
    } else if (alertType === 'missing_workout') {
        messageColor = "text-orange-500/90";
    } else if (alertType === 'zone_violation') {
        messageColor = "text-red-500/90 font-bold";
    }

    return (
        <div className="bg-card rounded-lg p-4 flex items-center gap-4 border-0 shadow-[0_2px_10px_rgba(43,52,55,0.02)] transition-shadow hover:shadow-[0_8px_30px_rgba(43,52,55,0.06)]">
            <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarFallback className="text-sm bg-muted text-muted-foreground">
                    {athleteName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm text-foreground tracking-[0.01em]">{athleteName}</h4>
                {details && <p className="text-xs text-muted-foreground mt-0.5 tracking-[0.01em]">{details}</p>}
                {recommendedAction && (
                    <p className="text-xs text-primary mt-1 tracking-[0.01em]">{recommendedAction}</p>
                )}
            </div>
            
            <div className="text-right flex flex-col items-end">
                {canMarkAsRead && onMarkAsRead && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 mb-1 text-[10px]"
                        onClick={onMarkAsRead}
                    >
                        {t('markRead')}
                    </Button>
                )}
                {canSnooze && onSnooze && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 mb-1 text-[10px]"
                        onClick={onSnooze}
                    >
                        {t('snooze')}
                    </Button>
                )}
                {canResolve && onResolve && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 mb-1 text-[10px]"
                        onClick={onResolve}
                    >
                        {t('resolve')}
                    </Button>
                )}
                {priority && (
                    <span className="text-[10px] font-semibold tracking-wider text-foreground/80 mb-1">
                        {priority}{typeof score === 'number' ? ` • ${score}` : ''}
                    </span>
                )}
                <span className={`text-[10px] tracking-wider font-semibold ${messageColor}`}>
                    {message.toUpperCase()}
                </span>
                <span className="text-[10px] text-muted-foreground mt-1 tracking-wide">
                    {timestamp}
                </span>
            </div>
        </div>
    );
}
