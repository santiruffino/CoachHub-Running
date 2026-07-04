import * as React from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const FONT_MONO = { fontFamily: 'var(--font-ibm-plex-mono, monospace)' } as const;
const FONT_DISPLAY = { fontFamily: 'var(--font-exo-2, sans-serif)' } as const;

type ChipColor = 'orange' | 'green' | 'red' | 'neutral';

const chipColorMap: Record<ChipColor, string> = {
    orange: 'text-endurix-orange border-endurix-orange/30',
    green: 'text-green-600 dark:text-green-500 border-green-500/30',
    red: 'text-destructive border-destructive/30',
    neutral: 'text-endurix-black/60 dark:text-muted-foreground border-endurix-black/20 dark:border-border',
};

export interface StatCardProps extends React.HTMLAttributes<HTMLElement> {
    label: string;
    value: React.ReactNode;
    chip?: string;
    chipColor?: ChipColor;
    footerLabel?: string;
    tooltip?: string;
}

export function StatCard({
    label,
    value,
    chip,
    chipColor = 'orange',
    footerLabel = '',
    tooltip,
    className,
    ...props
}: StatCardProps) {
    return (
        <article
            className={cn(
                'border border-endurix-black/20 dark:border-white/20 bg-white dark:bg-white/5 p-4',
                className,
            )}
            {...props}
        >
            <div className="flex items-start justify-between gap-2">
                <span className="inline-flex items-center gap-1 text-[10px] text-endurix-black/50 dark:text-muted-foreground tracking-widest font-semibold uppercase" style={FONT_MONO}>
                    {label}
                    {tooltip && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    type="button"
                                    className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-current/70 transition-colors hover:text-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                >
                                    <Info className="h-3 w-3" />
                                    <span className="sr-only">{tooltip}</span>
                                </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs text-[10px] leading-relaxed">
                                {tooltip}
                            </TooltipContent>
                        </Tooltip>
                    )}
                </span>
                {chip !== undefined && (
                    <span
                        className={cn(
                            'text-[9px] font-bold tracking-wider border px-2 py-0.5 whitespace-nowrap shrink-0 max-w-[9rem] truncate',
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
