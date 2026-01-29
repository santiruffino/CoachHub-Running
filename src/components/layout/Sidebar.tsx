'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, UsersRound, Calendar, TrendingUp, Settings, Menu, X, Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['COACH', 'ATHLETE'] },
    { name: 'Athletes', href: '/athletes', icon: Users, roles: ['COACH'] },
    { name: 'Groups', href: '/groups', icon: UsersRound, roles: ['COACH'] },
    { name: 'Workout Library', href: '/workouts/library', icon: Dumbbell, roles: ['COACH'] },
    { name: 'Trainings', href: '/trainings', icon: Calendar, roles: ['COACH'] },
    { name: 'Calendar', href: '/dashboard/calendar', icon: Calendar, roles: ['COACH', 'ATHLETE'] },
    { name: 'Progress', href: '#', icon: TrendingUp, roles: ['COACH', 'ATHLETE'] },
];

export function Sidebar() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const pathname = usePathname();
    const { user, loading } = useAuth();

    if (loading) return null;

    const userRole = user?.role || '';

    const closeMobileMenu = () => setIsMobileMenuOpen(false);

    return (
        <>
            {/* Mobile menu button */}
            <button
                type="button"
                className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-background border border-border shadow-lg hover:bg-muted transition-colors"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle menu"
            >
                {isMobileMenuOpen ? (
                    <X className="h-6 w-6" />
                ) : (
                    <Menu className="h-6 w-6" />
                )}
            </button>

            {/* Overlay for mobile */}
            {isMobileMenuOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-30"
                    onClick={closeMobileMenu}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar */}
            <div
                className={cn(
                    "flex h-full w-64 flex-col bg-background border-r border-border",
                    "fixed lg:relative inset-y-0 left-0 z-40",
                    "transition-transform duration-300 ease-in-out lg:translate-x-0",
                    isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {/* Header */}
                <div className="flex flex-col px-6 py-6 border-b border-border mt-16 lg:mt-0">
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
                                        onClick={closeMobileMenu}
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
                        onClick={closeMobileMenu}
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
        </>
    );
}
