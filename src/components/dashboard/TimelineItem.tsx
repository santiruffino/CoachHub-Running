import * as React from 'react';
import { cn } from '@/lib/utils';
import { MonospaceLabel } from './MonospaceLabel';

export interface TimelineItemProps extends React.HTMLAttributes<HTMLDivElement> {
    time: string;
    athleteName: string;
    activityName: string;
    content?: string;
    warning?: boolean;
}

export function TimelineItem({
    time,
    athleteName,
    activityName,
    content,
    warning = false,
    className,
    ...props
}: TimelineItemProps) {
    return (
        <div className={cn('border-l-2 border-endurix-orange pl-4 py-2', className)} {...props}>
            <MonospaceLabel color="muted" size="sm">
                {time}
            </MonospaceLabel>
            <p className="text-sm font-semibold text-endurix-black dark:text-foreground mt-1">
                {athleteName}
            </p>
            <p className="text-sm text-endurix-black/80 dark:text-muted-foreground">
                {activityName}
            </p>
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
        </div>
    );
}
