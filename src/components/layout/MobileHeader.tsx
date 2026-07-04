'use client';

import Link from 'next/link';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';

const FONT_DISPLAY = { fontFamily: 'var(--font-exo-2, sans-serif)' } as const;

export function MobileHeader() {
    return (
        <header
            className="md:hidden flex items-center justify-between px-4 border-b border-endurix-black/10 dark:border-border bg-endurix-paper/95 dark:bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-endurix-paper/80 dark:supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40"
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)', height: 'calc(3.5rem + env(safe-area-inset-top, 0px))' }}
        >
            <Link href="/dashboard" className="flex items-center gap-2">
                <div className="w-2 h-2 bg-endurix-orange" />
                <span
                    className="font-bold text-sm uppercase tracking-widest text-endurix-black dark:text-foreground"
                    style={FONT_DISPLAY}
                >
                    Endurix
                </span>
            </Link>

            <div className="flex items-center gap-1">
                <NotificationBell />
                <ThemeToggle />
            </div>
        </header>
    );
}
