'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Languages, Moon, Settings, LogOut, Sun, User } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useTransition, type MouseEvent } from 'react';
import { cn } from '@/lib/utils';
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
import { buildNavigation, getSettingsPathForRole } from './navigation';
import type { Locale } from '@/i18n/config';

const FONT_DISPLAY = { fontFamily: 'var(--font-exo-2, sans-serif)' } as const;

export function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, loading, logout } = useAuth();
    const t = useTranslations('nav');
    const locale = useLocale();
    const { resolvedTheme, setTheme } = useTheme();
    const [, startLocaleTransition] = useTransition();

    if (loading) {
        return (
            <nav
                aria-hidden="true"
                className="hidden md:flex h-16 border-b border-endurix-black/10 dark:border-border bg-endurix-paper/95 dark:bg-background/95"
            />
        );
    }

    const navigation = buildNavigation(t);

    const userRole = user?.role || '';
    const settingsPath = getSettingsPathForRole();
    const userInitials = user?.name
        ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
        : 'U';

    const handleLogout = async () => {
        await logout();
    };

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

    const currentTheme = resolvedTheme ?? 'light';

    return (
        <nav className="hidden md:flex h-16 border-b border-endurix-black/10 dark:border-border bg-endurix-paper/95 dark:bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-endurix-paper/80 dark:supports-[backdrop-filter]:bg-background/60">
            <div className="w-full px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    <div className="flex items-center gap-8">
                        <Link href="/dashboard" className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-endurix-orange" />
                            <span
                                className="font-bold text-base uppercase tracking-widest text-endurix-black dark:text-foreground"
                                style={FONT_DISPLAY}
                            >
                                {t('brand')}
                            </span>
                        </Link>

                        <div className="hidden lg:flex items-center gap-1">
                            {navigation
                                .filter((item) => item.roles.includes(userRole))
                                .map((item) => {
                                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                                    const Icon = item.icon;
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={cn(
                                                'flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors',
                                                isActive
                                                    ? 'bg-endurix-black/8 dark:bg-white/8 text-endurix-black dark:text-foreground'
                                                    : 'text-endurix-black/60 dark:text-muted-foreground hover:bg-endurix-black/5 dark:hover:bg-white/5 hover:text-endurix-black dark:hover:text-foreground',
                                            )}
                                        >
                                            <Icon className="h-4 w-4" />
                                            <span>{item.name}</span>
                                        </Link>
                                    );
                                })}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <NotificationBell />
                        <DropdownMenu>
                            <DropdownMenuTrigger className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback>{userInitials}</AvatarFallback>
                                </Avatar>
                                <span className="hidden lg:block text-sm font-medium">
                                    {user?.name || t('userFallback')}
                                </span>
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
                                    {currentTheme === 'dark' ? (
                                        <Sun className="mr-2 h-4 w-4" />
                                    ) : (
                                        <Moon className="mr-2 h-4 w-4" />
                                    )}
                                    {currentTheme === 'dark'
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
                </div>
            </div>
        </nav>
    );
}
