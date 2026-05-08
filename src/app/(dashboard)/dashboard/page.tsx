'use client';

import { useAuth } from '@/features/auth/hooks/useAuth';

import CoachDashboard from './components/CoachDashboard';
import AthleteDashboard from './components/AthleteDashboard';
import AdminDashboard from './components/AdminDashboard';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { trackDashboardViewed } from '@/lib/analytics/events';

export default function DashboardPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (!loading && user) {
            const storageKey = `dashboard_seen_${user.id}`;
            const hasSeen = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
            const visitType = hasSeen ? 'returning' : 'new';
            trackDashboardViewed({ role: user.role, visitType });
            if (!hasSeen && typeof window !== 'undefined') {
                window.localStorage.setItem(storageKey, '1');
            }
        }
    }, [loading, user]);

    if (loading) {
        return <div className="p-10"><Skeleton className="h-8 w-48" /></div>;
    }

    if (!user) return null;

    if (user.role === 'ADMIN') {
        return <AdminDashboard user={user} />;
    }

    if (user.role === 'ATHLETE') {
        return <AthleteDashboard user={user} />;
    }

    return <CoachDashboard user={user} />;
}
