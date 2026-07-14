'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { Languages, LogOut, Moon, Settings, Sun, User } from 'lucide-react';
import { useTransition, type MouseEvent } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getSettingsPathForRole } from './navigation';
import type { Locale } from '@/i18n/config';
import type { TeamBranding } from '@/features/settings/services/team-branding.server';

const FONT_DISPLAY = { fontFamily: 'var(--font-exo-2, sans-serif)' } as const;

export function MobileHeader({ branding }: { branding?: TeamBranding }) {
    const router = useRouter();
    const { user, logout } = useAuth();
    const t = useTranslations('nav');
    const locale = useLocale();
    const { resolvedTheme, setTheme } = useTheme();
    const [, startLocaleTransition] = useTransition();

    const userInitials = user?.name
        ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
        : 'U';

    const settingsPath = getSettingsPathForRole();

    const switchLocale = () => {
        const next: Locale = locale === 'es' ? 'en' : 'es';
        document.cookie = `NEXT_LOCALE=${next};path=/;max-age=31536000;SameSite=Lax`;
        startLocaleTransition(() => {
            router.refresh();
        });
    };

    const toggleTheme = (e: MouseEvent) => {
        const nextTheme = (resolvedTheme ?? 'light') === 'dark' ? 'light' : 'dark';

        if (!document.startViewTransition) {
            setTheme(nextTheme);
            return;
        }

        document.documentElement.style.setProperty('--x', `${e.clientX}px`);
        document.documentElement.style.setProperty('--y', `${e.clientY}px`);

        document.startViewTransition(() => {
            setTheme(nextTheme);
        });
    };

    const handleLogout = async () => {
        await logout();
    };

    return (
        <header
            className="md:hidden flex items-center justify-between px-4 border-b border-endurix-black/10 dark:border-border bg-endurix-paper/95 dark:bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-endurix-paper/80 dark:supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40"
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)', height: 'calc(3.5rem + env(safe-area-inset-top, 0px))' }}
        >
            <Link href="/dashboard" className="flex items-center gap-2">
                {branding?.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- team-supplied external URL, not a bundled asset
                    <img
                        src={branding.logoUrl}
                        alt={branding.teamName || 'Endurix'}
                        className="h-6 w-auto max-w-[120px] object-contain"
                    />
                ) : (
                    <div
                        className="w-2 h-2 bg-endurix-orange"
                        style={branding?.primaryColor ? { backgroundColor: branding.primaryColor } : undefined}
                    />
                )}
                <span
                    className="font-bold text-sm uppercase tracking-widest text-endurix-black dark:text-foreground"
                    style={FONT_DISPLAY}
                >
                    {branding?.teamName || 'Endurix'}
                </span>
            </Link>

            <div className="flex items-center gap-1">
                <NotificationBell />
                <DropdownMenu>
                    <DropdownMenuTrigger className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                        <Avatar className="h-8 w-8">
                            <AvatarFallback>{userInitials}</AvatarFallback>
                        </Avatar>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium">{user?.name}</p>
                                <p className="text-xs text-muted-foreground">{user?.email}</p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => router.push('/profile')}>
                            <User className="mr-2 h-4 w-4" />
                            {t('profile')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(settingsPath)}>
                            <Settings className="mr-2 h-4 w-4" />
                            {t('settings')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                            {locale === 'es' ? 'Preferencias' : 'Preferences'}
                        </DropdownMenuLabel>
                        <DropdownMenuItem onClick={switchLocale}>
                            <Languages className="mr-2 h-4 w-4" />
                            {locale === 'es' ? 'English' : 'Español'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={toggleTheme}>
                            {(resolvedTheme ?? 'light') === 'dark' ? (
                                <Sun className="mr-2 h-4 w-4" />
                            ) : (
                                <Moon className="mr-2 h-4 w-4" />
                            )}
                            {(resolvedTheme ?? 'light') === 'dark'
                                ? (locale === 'es' ? 'Tema claro' : 'Light theme')
                                : (locale === 'es' ? 'Tema oscuro' : 'Dark theme')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                            <LogOut className="mr-2 h-4 w-4" />
                            {t('logout')}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
