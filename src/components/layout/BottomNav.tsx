'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Calendar, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';

const mobileNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['COACH', 'ATHLETE'] },
    { name: 'Athletes', href: '/athletes', icon: Users, roles: ['COACH'] },
    { name: 'Calendar', href: '/dashboard/calendar', icon: Calendar, roles: ['COACH', 'ATHLETE'] },
    { name: 'Profile', href: '/profile', icon: User, roles: ['COACH', 'ATHLETE'] },
];

export function BottomNav() {
    const pathname = usePathname();
    const { user, loading } = useAuth();

    if (loading) return null;

    const userRole = user?.role || '';

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex justify-around items-center h-16 px-2">
                {mobileNavigation
                    .filter(item => item.roles.includes(userRole))
                    .map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    'flex flex-col items-center justify-center gap-1 transition-colors min-w-[60px] py-2',
                                    isActive
                                        ? 'text-foreground'
                                        : 'text-muted-foreground'
                                )}
                            >
                                <Icon className={cn(
                                    'h-5 w-5',
                                    isActive && 'text-primary'
                                )} />
                                <span className={cn(
                                    'text-xs font-medium',
                                    isActive && 'text-primary'
                                )}>
                                    {item.name}
                                </span>
                            </Link>
                        );
                    })}
            </div>
        </nav>
    );
}
