'use client';
import { appLogger } from '@/lib/app-logger';


import { useEffect, useState, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Activity } from 'lucide-react';
import api from '@/lib/axios';
import { useLocale, useTranslations } from 'next-intl';

import { Coach } from '@/interfaces/coach';
import { User } from '@/interfaces/auth';
import { StatCard, SectionHeader, DashboardCard, DashboardCardHeaderDots, MonospaceLabel } from '@/components/dashboard';

const FONT_DISPLAY = { fontFamily: 'var(--font-exo-2, sans-serif)' } as const;

interface AdminData {
    metrics: {
        totalAthletes: number;
        totalCoaches: number;
        totalGroups: number;
    };
    coaches: Coach[];
}

interface AdminDashboardProps {
    user: User;
    initialData?: AdminData | null;
}

export default function AdminDashboard({ user, initialData = null }: AdminDashboardProps) {
    void user;
    const [data, setData] = useState<AdminData | null>(initialData);
    const [loading, setLoading] = useState(!initialData);
    const t = useTranslations();
    const locale = useLocale();

    const fetchDashboard = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/v2/dashboard/admin');
            setData(res.data);
        } catch (error) {
            appLogger.error('Failed to fetch admin dashboard data', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!initialData) {
            void fetchDashboard();
        }
    }, [fetchDashboard, initialData]);

    if (loading || !data) {
        return (
            <div className="min-h-screen bg-endurix-paper dark:bg-background">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                    <div>
                        <Skeleton className="h-10 w-72 mb-2" />
                        <Skeleton className="h-3 w-48" />
                    </div>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-28" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-endurix-paper dark:bg-background">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                <div>
                    <h1
                        className="text-4xl lg:text-5xl font-bold text-endurix-black dark:text-foreground leading-[1.05] tracking-tight uppercase"
                        style={FONT_DISPLAY}
                    >
                        {t('dashboard.admin.title')}
                    </h1>
                    <p className="mt-2 text-sm text-endurix-black/50 dark:text-muted-foreground">
                        {t('dashboard.admin.welcome')}
                    </p>
                </div>

                <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    <StatCard
                        label={t('dashboard.admin.metrics.totalAthletes')}
                        value={data.metrics.totalAthletes}
                    />
                    <StatCard
                        label={t('dashboard.admin.metrics.totalGroups')}
                        value={data.metrics.totalGroups}
                    />
                    <StatCard
                        label={t('dashboard.admin.metrics.activeCoaches')}
                        value={data.metrics.totalCoaches}
                    />
                </section>

                <DashboardCard
                    headerLabel="Coaches"
                    headerAccessory={<DashboardCardHeaderDots />}
                >
                    <SectionHeader
                        eyebrow="Activity"
                        title={t('dashboard.admin.coachesActivity')}
                        size="sm"
                    />
                    <div className="divide-y divide-endurix-black/8 dark:divide-border">
                        {data.coaches.map((coach) => (
                            <div key={coach.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 bg-endurix-black/8 dark:bg-white/8 flex items-center justify-center text-endurix-black dark:text-foreground font-semibold">
                                        {coach.name ? coach.name.charAt(0).toUpperCase() : 'C'}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-endurix-black dark:text-foreground">
                                            {coach.name || t('dashboard.admin.noName')}
                                        </p>
                                        <p className="text-xs text-endurix-black/50 dark:text-muted-foreground">
                                            {coach.email}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right text-sm">
                                    <p className="flex items-center gap-2 justify-end text-endurix-black dark:text-foreground">
                                        <Users className="h-3 w-3" />
                                        <span>{t('dashboard.admin.athletesCount', { count: coach.totalAthletes || 0 })}</span>
                                    </p>
                                    <p className="flex items-center gap-2 justify-end mt-1 text-endurix-black/50 dark:text-muted-foreground">
                                        <Activity className="h-3 w-3" />
                                        <span>
                                            {coach.lastActivity
                                                ? new Date(coach.lastActivity).toLocaleDateString(locale)
                                                : t('dashboard.admin.noActivity')}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        ))}

                        {data.coaches.length === 0 && (
                            <div className="py-6 text-center">
                                <MonospaceLabel color="muted">{t('dashboard.admin.noCoaches')}</MonospaceLabel>
                            </div>
                        )}
                    </div>
                </DashboardCard>
            </div>
        </div>
    );
}
