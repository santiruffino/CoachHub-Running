import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Optional icon shown in a subtle square badge above the message. */
    icon?: LucideIcon;
    /** Primary message. */
    title: string;
    /** Optional supporting sentence. */
    description?: string;
    /** Optional call-to-action (button/link) shown below the message. */
    action?: React.ReactNode;
}

/**
 * Canonical empty-state block: dashed bordered surface, centered content and
 * an optional icon badge. Replaces the mix of `border-dashed` cards and bare
 * `py-12 text-center text-muted-foreground` blocks scattered across lists.
 */
export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    className,
    ...props
}: EmptyStateProps) {
    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center border-2 border-dashed border-endurix-black/15 bg-endurix-black/5 px-6 py-20 text-center dark:border-white/15 dark:bg-white/5',
                className,
            )}
            {...props}
        >
            {Icon && (
                <div className="mb-4 bg-endurix-black/8 p-4 dark:bg-white/8">
                    <Icon className="h-8 w-8 text-muted-foreground" />
                </div>
            )}
            <p className="font-medium text-muted-foreground">{title}</p>
            {description && (
                <p className="mt-1 max-w-md text-sm text-muted-foreground/80">{description}</p>
            )}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}
