import * as React from 'react';
import { cn } from '@/lib/utils';

const FONT_MONO = { fontFamily: 'var(--font-ibm-plex-mono, monospace)' } as const;

export interface DashboardCardProps extends React.HTMLAttributes<HTMLElement> {
    headerLabel?: string;
    headerAccessory?: React.ReactNode;
    bodyClassName?: string;
    headerless?: boolean;
    children: React.ReactNode;
}

export function DashboardCard({
    headerLabel,
    headerAccessory,
    bodyClassName,
    headerless = false,
    className,
    children,
    ...props
}: DashboardCardProps) {
    return (
        <article
            className={cn(
                'border border-endurix-black/12 dark:border-border bg-white dark:bg-card',
                className,
            )}
            {...props}
        >
            {!headerless && (headerLabel || headerAccessory) && (
                <div className="flex w-full items-center justify-between gap-3 px-4 py-2.5 bg-endurix-paper dark:bg-muted border-b border-endurix-black/8 dark:border-border">
                    {headerLabel && (
                        <span
                            className="text-[9px] text-endurix-black/60 dark:text-muted-foreground tracking-widest uppercase"
                            style={FONT_MONO}
                        >
                            {headerLabel}
                        </span>
                    )}
                    {headerAccessory && <div className="ml-auto flex shrink-0 items-center gap-1.5">{headerAccessory}</div>}
                </div>
            )}
            <div className={cn('p-4', bodyClassName)}>{children}</div>
        </article>
    );
}

export function DashboardCardHeaderDots() {
    return (
        <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-endurix-orange" />
            <div className="w-2 h-2 rounded-full bg-endurix-black dark:bg-white" />
            <div className="w-2 h-2 rounded-full bg-endurix-stone" />
        </div>
    );
}
