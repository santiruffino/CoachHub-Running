import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
    value: number;
    showLabel?: boolean;
    label?: string;
}

export function ProgressBar({
    value,
    showLabel = false,
    label,
    className,
    ...props
}: ProgressBarProps) {
    const clampedValue = Math.max(0, Math.min(100, value));
    return (
        <div className={cn('flex items-center gap-3', className)} {...props}>
            <div className="flex-1 h-1.5 bg-endurix-black/15 dark:bg-border relative">
                <div
                    className="absolute inset-y-0 left-0 bg-endurix-orange"
                    style={{ width: `${clampedValue}%` }}
                />
                <div
                    className="absolute inset-y-0 left-0 right-0 bg-[#111317] dark:bg-white opacity-60 dark:opacity-20"
                    style={{ left: `${clampedValue}%` }}
                />
            </div>
            {showLabel && label && (
                <span className="text-[10px] text-endurix-black/60 dark:text-muted-foreground font-semibold tabular-nums w-10 text-right">
                    {label}
                </span>
            )}
        </div>
    );
}
