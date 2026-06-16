import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { MonospaceLabel } from './MonospaceLabel';

export interface TimelineItemProps extends React.HTMLAttributes<HTMLDivElement> {
    time: string;
    athleteName: string;
    activityName: string;
    activityId: string;
    content?: string;
    warning?: boolean;
    onMarkRead?: () => void;
    isRead?: boolean;
}

export function TimelineItem({
    time,
    athleteName,
    activityName,
    activityId,
    content,
    warning = false,
    onMarkRead,
    isRead = false,
    className,
    ...props
}: TimelineItemProps) {
    return (
        <div className={cn('border-l-2 border-endurix-orange pl-4 py-2', className)} {...props}>
            <MonospaceLabel color="muted" size="sm">
                {time}
            </MonospaceLabel>
            <div className="flex items-center justify-between gap-2 mt-1">
                <p className="text-sm font-semibold text-endurix-black dark:text-foreground">
                    {athleteName}
                </p>
                {onMarkRead && !isRead && (
                    <button
                        type="button"
                        onClick={onMarkRead}
                        className="text-[9px] font-bold tracking-widest text-endurix-black/50 dark:text-muted-foreground hover:text-endurix-orange transition-colors px-2 py-0.5"
                        style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                    >
                        Mark as read
                    </button>
                )}
            </div>
            <Link
                href={`/activities/${activityId}`}
                className="text-sm text-endurix-black/80 dark:text-muted-foreground hover:text-endurix-orange transition-colors"
            >
                {activityName}
            </Link>
            {content && (
                <p
                    className={cn(
                        'text-sm mt-1',
                        warning
                            ? 'text-endurix-orange font-medium'
                            : 'text-endurix-black/60 dark:text-muted-foreground italic',
                    )}
                >
                    {warning ? `⚠ ${content}` : `"${content}"`}
                </p>
            )}
            {isRead && (
                <p className="text-[9px] text-green-600 dark:text-green-500 mt-1 uppercase tracking-widest" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>
                    Marked as read
                </p>
            )}
        </div>
    );
}
