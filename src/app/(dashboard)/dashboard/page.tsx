'use client';

import { useAuth } from '@/features/auth/hooks/useAuth';

import CoachDashboard from './components/CoachDashboard';
import AthleteDashboard from './components/AthleteDashboard';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading) {
        return <div className="p-10"><Skeleton className="h-8 w-48" /></div>;
    }

    if (!user) return null;

    if (user.role === 'ATHLETE') {
        return <AthleteDashboard user={user} />;
    }

    return <CoachDashboard user={user} />;
}
