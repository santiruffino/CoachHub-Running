import * as React from 'react';
import { cn } from '@/lib/utils';
import { BackButton } from '@/components/ui/BackButton';

const FONT_MONO = { fontFamily: 'var(--font-ibm-plex-mono, monospace)' } as const;
const FONT_DISPLAY = { fontFamily: 'var(--font-exo-2, sans-serif)' } as const;

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Main page title. Rendered as the page's single <h1>. */
    title: string;
    /** Small mono uppercase label above the title. */
    eyebrow?: string;
    /** Supporting sentence below the title. */
    description?: string;
    /** Right-aligned action(s), typically the primary CTA. */
    action?: React.ReactNode;
    /**
     * When set, a standardized "Volver" back link is rendered above the header.
     * Pass an explicit href to the parent screen (preferred over history.back()).
     */
    backHref?: string;
    /** Optional custom back handler (overrides backHref). */
    onBack?: () => void;
    /** Optional label for the back link. Defaults to "Volver". */
    backLabel?: string;
    /** Title scale. `md` for list/index pages, `lg` for detail pages. */
    size?: 'md' | 'lg';
}

const titleSizeMap = {
    md: 'text-2xl sm:text-3xl',
    lg: 'text-2xl sm:text-4xl lg:text-5xl',
} as const;

/**
 * Canonical page-level header. One <h1> per page, consistent typography,
 * optional eyebrow/description, right-aligned action slot and a standardized
 * back link. Use this for the top of every screen; use SectionHeader for
 * sub-sections within a page.
 */
export function PageHeader({
    title,
    eyebrow,
    description,
    action,
    backHref,
    onBack,
    backLabel,
    size = 'md',
    className,
    ...props
}: PageHeaderProps) {
    const showBack = backHref !== undefined || onBack !== undefined;

    return (
        <div className={cn('mb-8', className)} {...props}>
            {showBack && (
                <div className="mb-4">
                    <BackButton href={backHref} onClick={onBack} label={backLabel} showLabel />
                </div>
            )}
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    {eyebrow && (
                        <span
                            className="mb-1 inline-block text-[10px] uppercase tracking-widest text-endurix-black/50 dark:text-muted-foreground"
                            style={FONT_MONO}
                        >
                            {eyebrow}
                        </span>
                    )}
                    <h1
                        className={cn(
                            'font-bold uppercase tracking-tight text-endurix-black dark:text-foreground',
                            titleSizeMap[size],
                        )}
                        style={FONT_DISPLAY}
                    >
                        {title}
                    </h1>
                    {description && (
                        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
                    )}
                </div>
                {action && <div className="flex-shrink-0 sm:ml-auto">{action}</div>}
            </div>
        </div>
    );
}
