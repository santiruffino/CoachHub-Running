import * as React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const FONT_MONO = { fontFamily: 'var(--font-ibm-plex-mono, monospace)' } as const;
const FONT_DISPLAY = { fontFamily: 'var(--font-exo-2, sans-serif)' } as const;

export function StatCardSkeleton({ className }: { className?: string }) {
    return (
        <article
            className={cn(
                'border border-endurix-black/20 dark:border-white/20 bg-white dark:bg-white/5 p-4',
                className,
            )}
            aria-hidden
        >
            <div className="flex items-start justify-between gap-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="mt-3 h-9 w-16" />
        </article>
    );
}

export function SectionHeaderSkeleton({
    size = 'md',
    withAction = false,
    className,
}: {
    size?: 'sm' | 'md' | 'lg';
    withAction?: boolean;
    className?: string;
}) {
    const titleClass = size === 'sm' ? 'h-6 w-40' : size === 'lg' ? 'h-10 w-64' : 'h-8 w-48';
    return (
        <div className={cn('flex items-end justify-between gap-4 mb-3', className)} aria-hidden>
            <div>
                <Skeleton className="h-3 w-20 mb-2" />
                <Skeleton className={titleClass} />
            </div>
            {withAction && <Skeleton className="h-7 w-28" />}
        </div>
    );
}

export function TimelineItemSkeleton({ className }: { className?: string }) {
    return (
        <div
            className={cn('border-l-2 border-endurix-orange pl-4 py-2', className)}
            aria-hidden
        >
            <Skeleton className="h-3 w-12" style={FONT_MONO} />
            <Skeleton className="mt-2 h-3.5 w-32" style={FONT_MONO} />
            <Skeleton className="mt-1 h-3 w-44" style={FONT_MONO} />
        </div>
    );
}

export function GroupStatusCardSkeleton({ className }: { className?: string }) {
    return (
        <div
            className={cn(
                'border border-endurix-black/10 dark:border-border bg-endurix-paper dark:bg-card p-4',
                className,
            )}
            aria-hidden
        >
            <div className="flex items-start justify-between mb-3 gap-3">
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-3/4" style={FONT_DISPLAY} />
                    <Skeleton className="h-2.5 w-1/2" style={FONT_MONO} />
                </div>
                <Skeleton className="h-8 w-12" style={FONT_DISPLAY} />
            </div>
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-2.5 w-20" style={FONT_MONO} />
                    <Skeleton className="h-2.5 w-16" style={FONT_MONO} />
                </div>
                <Skeleton className="h-1.5 w-full" />
            </div>
        </div>
    );
}

export function PriorityRosterRowSkeleton() {
    return (
        <tr className="border-b border-endurix-black/8 dark:border-border" aria-hidden>
            <td className="px-4 py-2">
                <Skeleton className="h-3.5 w-28" />
            </td>
            <td className="px-4 py-2">
                <Skeleton className="h-3 w-32" />
            </td>
            <td className="px-4 py-2">
                <Skeleton className="h-3 w-36" />
            </td>
            <td className="px-4 py-2">
                <div className="flex items-center gap-2">
                    <Skeleton className="h-3.5 w-8" />
                    <Skeleton className="h-2.5 w-6" />
                    <Skeleton className="h-3.5 w-8" />
                    <Skeleton className="h-2.5 w-6" />
                </div>
            </td>
            <td className="px-4 py-2">
                <div className="flex flex-col gap-1 min-w-[120px]">
                    <Skeleton className="h-2.5 w-20" style={FONT_MONO} />
                    <Skeleton className="h-1 w-full" />
                </div>
            </td>
        </tr>
    );
}

export function PriorityRosterSkeleton({ rows = 6 }: { rows?: number }) {
    return (
        <article
            className="border border-endurix-black/12 dark:border-border bg-white dark:bg-card"
            aria-hidden
        >
            <div className="flex items-center justify-between px-4 py-2 bg-endurix-paper dark:bg-muted border-b border-endurix-black/8 dark:border-border">
                <SectionHeaderSkeleton size="sm" />
                <Skeleton className="h-7 w-28" />
            </div>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left">
                    <thead
                        className="border-b border-endurix-black/10 dark:border-border bg-muted text-[9px] uppercase tracking-[0.14em] text-endurix-black/50 dark:text-muted-foreground"
                        style={FONT_MONO}
                    >
                        <tr>
                            <th className="px-4 py-2"><Skeleton className="h-2.5 w-12" /></th>
                            <th className="px-4 py-2"><Skeleton className="h-2.5 w-14" /></th>
                            <th className="px-4 py-2"><Skeleton className="h-2.5 w-10" /></th>
                            <th className="px-4 py-2"><Skeleton className="h-2.5 w-14" /></th>
                            <th className="px-4 py-2"><Skeleton className="h-2.5 w-10" /></th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: rows }).map((_, i) => (
                            <PriorityRosterRowSkeleton key={i} />
                        ))}
                    </tbody>
                </table>
            </div>
        </article>
    );
}

export function RecentActivitySkeleton({ rows = 4 }: { rows?: number }) {
    return (
        <article
            className="border border-endurix-black/12 dark:border-border bg-white dark:bg-card p-4"
            aria-hidden
        >
            <SectionHeaderSkeleton size="sm" />
            <div className="space-y-2">
                {Array.from({ length: rows }).map((_, i) => (
                    <TimelineItemSkeleton key={i} />
                ))}
            </div>
        </article>
    );
}

export function GroupStatusGridSkeleton({ rows = 4 }: { rows?: number }) {
    return (
        <article
            className="xl:col-span-7 border border-endurix-black/12 dark:border-border bg-white dark:bg-card p-4"
            aria-hidden
        >
            <SectionHeaderSkeleton size="sm" />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {Array.from({ length: rows }).map((_, i) => (
                    <GroupStatusCardSkeleton key={i} />
                ))}
            </div>
        </article>
    );
}

export function NextRacesSkeleton() {
    return (
        <div className="xl:col-span-5" aria-hidden>
            <article className="border border-endurix-black/12 dark:border-border bg-white dark:bg-card">
                <div className="flex items-center justify-between px-4 py-2.5 bg-endurix-paper dark:bg-muted border-b border-endurix-black/8 dark:border-border">
                    <Skeleton className="h-2.5 w-20" style={FONT_MONO} />
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-endurix-orange/40" />
                        <div className="w-2 h-2 rounded-full bg-endurix-black/20 dark:bg-white/20" />
                        <div className="w-2 h-2 rounded-full bg-endurix-stone/40" />
                    </div>
                </div>
                <div className="p-4 space-y-3">
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-32" style={FONT_DISPLAY} />
                        <Skeleton className="h-3 w-48" style={FONT_MONO} />
                    </div>
                    <div className="space-y-3">
                        {Array.from({ length: 2 }).map((_, i) => (
                            <div
                                key={i}
                                className="p-4 border border-endurix-black/8 dark:border-border bg-endurix-paper/50 dark:bg-muted/50"
                            >
                                <div className="flex items-start gap-3">
                                    <Skeleton className="h-8 w-8" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-3.5 w-3/4" />
                                        <div className="flex gap-3">
                                            <Skeleton className="h-3 w-16" style={FONT_MONO} />
                                            <Skeleton className="h-3 w-12" style={FONT_MONO} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </article>
        </div>
    );
}

export function CoachDashboardSkeleton() {
    return (
        <div
            className="min-h-screen bg-endurix-paper dark:bg-background"
            role="status"
            aria-live="polite"
            aria-label="Cargando panel"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6 space-y-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-72" style={FONT_DISPLAY} />
                        <Skeleton className="h-3 w-40" style={FONT_MONO} />
                    </div>
                    <Skeleton className="h-9 w-44" />
                </div>

                {/* Stats Grid */}
                <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <StatCardSkeleton />
                    <StatCardSkeleton />
                    <StatCardSkeleton />
                    <StatCardSkeleton />
                </section>

                {/* Program Control removed; Group Status card below carries group compliance. */}

                {/* Priority Roster */}
                <PriorityRosterSkeleton rows={6} />

                {/* Recent Activity */}
                <RecentActivitySkeleton rows={4} />

                {/* Group Status + Next Races */}
                <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
                    <GroupStatusGridSkeleton rows={4} />
                    <NextRacesSkeleton />
                </section>
            </div>
        </div>
    );
}
