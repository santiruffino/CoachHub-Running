'use client';

import { useEffect } from 'react';
import { trackDashboardViewed } from '@/lib/analytics/events';
import { User } from '@/interfaces/auth';

interface DashboardClientProps {
    user: User;
    children: React.ReactNode;
}

export function DashboardClient({ user, children }: DashboardClientProps) {
    useEffect(() => {
        const storageKey = `dashboard_seen_${user.id}`;
        const hasSeen = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
        const visitType = hasSeen ? 'returning' : 'new';
        trackDashboardViewed({ role: user.role, visitType });
        if (!hasSeen && typeof window !== 'undefined') {
            window.localStorage.setItem(storageKey, '1');
        }
    }, [user]);

    return <>{children}</>;
}
