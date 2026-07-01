import { Calendar, LayoutDashboard, Shield, Trophy, Users, UsersRound } from 'lucide-react';

type Translator = (key: string) => string;

export type NavigationItem = {
    name: string;
    href: string;
    icon: typeof LayoutDashboard;
    roles: string[];
};

export const buildNavigation = (t: Translator): NavigationItem[] => [
    { name: t('dashboard'), href: '/dashboard', icon: LayoutDashboard, roles: ['COACH', 'ATHLETE', 'ADMIN'] },
    { name: t('athletes'), href: '/athletes', icon: Users, roles: ['COACH', 'ADMIN'] },
    { name: t('groups'), href: '/groups', icon: UsersRound, roles: ['COACH', 'ADMIN'] },
    { name: t('coaches'), href: '/coaches', icon: Users, roles: ['ADMIN'] },
    { name: t('trainings'), href: '/trainings', icon: Calendar, roles: ['COACH', 'ADMIN'] },
    { name: t('races'), href: '/races', icon: Trophy, roles: ['COACH', 'ATHLETE', 'ADMIN'] },
    { name: t('auditLogs'), href: '/settings/audit-logs', icon: Shield, roles: ['ADMIN'] },
];

export function getSettingsPathForRole(): string {
    return '/settings';
}
