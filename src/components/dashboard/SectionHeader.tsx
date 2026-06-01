import * as React from 'react';
import { cn } from '@/lib/utils';

const FONT_MONO = { fontFamily: 'var(--font-ibm-plex-mono, monospace)' } as const;
const FONT_DISPLAY = { fontFamily: 'var(--font-exo-2, sans-serif)' } as const;

export interface SectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
    eyebrow?: string;
    title: string;
    description?: string;
    action?: React.ReactNode;
    size?: 'sm' | 'md' | 'lg';
}

const titleSizeMap = {
    sm: 'text-xl lg:text-2xl',
    md: 'text-2xl lg:text-3xl',
    lg: 'text-4xl lg:text-5xl',
} as const;

export function SectionHeader({
    eyebrow,
    title,
    description,
    action,
    size = 'md',
    className,
    ...props
}: SectionHeaderProps) {
    return (
        <div
            className={cn('flex items-end justify-between gap-4 mb-3', className)}
            {...props}
        >
            <div>
                {eyebrow && (
                    <span
                        className="inline-block text-[10px] text-endurix-black/50 dark:text-muted-foreground tracking-widest mb-1 uppercase"
                        style={FONT_MONO}
                    >
                        {eyebrow}
                    </span>
                )}
                <h3
                    className={cn(
                        'font-bold text-endurix-black dark:text-foreground leading-[1.05] tracking-tight uppercase',
                        titleSizeMap[size],
                    )}
                    style={FONT_DISPLAY}
                >
                    {title}
                </h3>
                {description && (
                    <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{description}</p>
                )}
            </div>
            {action && <div className="flex-shrink-0">{action}</div>}
        </div>
    );
}
