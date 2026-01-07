'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, UsersRound, Calendar, TrendingUp, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['COACH', 'ATHLETE'] },
    { name: 'Athletes', href: '/athletes', icon: Users, roles: ['COACH'] },
    { name: 'Groups', href: '/groups', icon: UsersRound, roles: ['COACH'] },
    { name: 'Trainings', href: '/trainings', icon: Calendar, roles: ['COACH'] },
    { name: 'Calendar', href: '/dashboard/calendar', icon: Calendar, roles: ['COACH', 'ATHLETE'] },
    { name: 'Progress', href: '#', icon: TrendingUp, roles: ['COACH', 'ATHLETE'] },
];

export function Sidebar() {
    const pathname = usePathname();
    const { user, loading } = useAuth();

    if (loading) return null;

    const userRole = user?.role || '';

    return (
        <div className="flex h-full w-64 flex-col bg-background border-r border-border">
            {/* Header */}
            <div className="flex flex-col px-6 py-6 border-b border-border">
                <h1 className="text-xl font-bold tracking-tight">
                    Coach Hub
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Gestión de Atletas
                </p>
            </div>

            {/* Navigation */}
            <div className="flex flex-1 flex-col overflow-y-auto pt-6">
                <nav className="flex-1 space-y-1 px-4">
                    {navigation
                        .filter(item => item.roles.includes(userRole))
                        .map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={cn(
                                        isActive
                                            ? 'bg-muted text-foreground'
                                            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                                        'group flex items-center rounded-md px-3 py-2.5 text-sm font-medium transition-colors'
                                    )}
                                >
                                    <item.icon
                                        className={cn(
                                            'mr-3 h-5 w-5 flex-shrink-0'
                                        )}
                                        aria-hidden="true"
                                    />
                                    {item.name}
                                </Link>
                            );
                        })}
                </nav>
            </div>

            {/* Settings */}
            <div className="p-4 border-t border-border">
                <Link
                    href="/profile"
                    className={cn(
                        pathname === '/profile'
                            ? 'bg-muted text-foreground'
                            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                        'group flex items-center rounded-md px-3 py-2.5 text-sm font-medium transition-colors'
                    )}
                >
                    <Settings className="mr-3 h-5 w-5 flex-shrink-0" />
                    Settings
                </Link>
            </div>
        </div>
    );
}
