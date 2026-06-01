import * as React from 'react';
import { cn } from '@/lib/utils';

const FONT_MONO = { fontFamily: 'var(--font-ibm-plex-mono, monospace)' } as const;
const FONT_DISPLAY = { fontFamily: 'var(--font-exo-2, sans-serif)' } as const;

type ChipColor = 'orange' | 'green' | 'red' | 'neutral';

const chipColorMap: Record<ChipColor, string> = {
    orange: 'text-endurix-orange border-endurix-orange/30',
    green: 'text-green-600 dark:text-green-500 border-green-500/30',
    red: 'text-red-600 dark:text-red-500 border-red-500/30',
    neutral: 'text-endurix-black/60 dark:text-muted-foreground border-endurix-black/20 dark:border-border',
};

export interface StatCardProps extends React.HTMLAttributes<HTMLElement> {
    label: string;
    value: React.ReactNode;
    chip?: string;
    chipColor?: ChipColor;
    footerLabel?: string;
}

export function StatCard({
    label,
    value,
    chip,
    chipColor = 'orange',
    footerLabel = 'Live operating signal',
    className,
    ...props
}: StatCardProps) {
    return (
        <article
            className={cn(
                'border border-endurix-black/12 dark:border-border bg-white dark:bg-card p-4',
                className,
            )}
            {...props}
        >
            <div className="flex items-start justify-between gap-2">
                <span
                    className="text-[10px] text-endurix-black/50 dark:text-muted-foreground tracking-widest font-semibold uppercase"
                    style={FONT_MONO}
                >
                    {label}
                </span>
                {chip !== undefined && (
                    <span
                        className={cn(
                            'text-[9px] font-bold tracking-wider border px-2 py-0.5',
                            chipColorMap[chipColor],
                        )}
                        style={FONT_MONO}
                    >
                        {chip}
                    </span>
                )}
            </div>
            <p
                className="mt-3 text-4xl font-bold text-endurix-black dark:text-foreground leading-none"
                style={FONT_DISPLAY}
            >
                {value}
            </p>
            {footerLabel && (
                <p
                    className="mt-3 border-t border-endurix-black/8 dark:border-border pt-2 text-[9px] text-endurix-black/40 dark:text-muted-foreground tracking-widest uppercase"
                    style={FONT_MONO}
                >
                    {footerLabel}
                </p>
            )}
        </article>
    );
}
