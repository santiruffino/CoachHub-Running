import * as React from 'react';
import { cn } from '@/lib/utils';

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
    /**
     * Max width of the content column. Defaults to `default` (7xl) which fits
     * list and dashboard views. Use `narrow` for single-column forms/settings.
     */
    width?: 'narrow' | 'default' | 'wide' | 'full';
}

const widthMap = {
    narrow: 'max-w-3xl',
    default: 'max-w-7xl',
    wide: 'max-w-[96rem]',
    full: 'max-w-none',
} as const;

/**
 * Standard page shell: consistent max-width, horizontal centering and page
 * padding across every dashboard screen. Replaces the ad-hoc mix of
 * `p-4 sm:p-6 lg:p-8`, `container mx-auto`, `p-0`, `max-w-*` wrappers.
 */
export function PageContainer({
    width = 'default',
    className,
    children,
    ...props
}: PageContainerProps) {
    return (
        <div
            className={cn(
                'mx-auto w-full p-4 sm:p-6 lg:p-8',
                widthMap[width],
                className,
            )}
            {...props}
        >
            {children}
        </div>
    );
}
