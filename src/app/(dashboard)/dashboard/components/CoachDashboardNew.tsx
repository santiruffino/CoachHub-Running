'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import api from '@/lib/axios';
import { appLogger } from '@/lib/app-logger';
import { Skeleton } from '@/components/ui/skeleton';
import { CriticalAlertItem } from '@/components/dashboard/CriticalAlertItem';
import { GroupStatusCard } from '@/components/dashboard/GroupStatusCard';
import { User } from '@/interfaces/auth';
import { DashboardStats, LowCompliance, MissingWorkout, RPEMismatch, SmartAlert, TimelineEvent } from '../types';
import { NextRaces } from './NextRaces';

interface DashboardAlertItem {
    alertId?: string;
    id: string;
    name: string;
    type: 'zone_violation' | 'new_feedback' | 'rpe_mismatch' | 'low_compliance' | 'missing_workout' | 'training_load';
    time: string;
    message: string;
    details: string;
    priority?: 'P1' | 'P2' | 'P3' | 'P4';
    score?: number;
    recommendedAction?: string;
}

interface ZoneViolation {
    alertId?: string;
    id: string;
    name: string;
    time: string;
    details: string;
}

interface RecentFeedbackItem {
    athleteId: string;
    athleteName: string;
    activityName: string;
    timestamp?: string;
}

interface DashboardData {
    stats: DashboardStats;
    alerts: {
        rpeMismatches: RPEMismatch[];
        lowCompliance: LowCompliance[];
        missingWorkouts: MissingWorkout[];
        recentFeedback: RecentFeedbackItem[];
        zoneViolations: ZoneViolation[];
        smartAlerts: SmartAlert[];
    };
    groupCompliance: { groupId: string; groupName: string; athleteCount: number; completionRate: number }[];
    activityTimeline: TimelineEvent[];
}

interface CoachDashboardNewProps {
    user: User;
}

function TimelineItem({ item, warning }: { item: TimelineEvent; warning: boolean }) {
    return (
        <div className="border-l-2 border-endurix-orange pl-3 py-1">
            <p
                className="text-[9px] uppercase tracking-[0.12em] text-endurix-black/50 dark:text-muted-foreground"
                style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
            >
                {new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-xs font-semibold text-endurix-black dark:text-foreground mt-0.5">
                {item.athleteName}
            </p>
            <p className="text-xs text-endurix-black/80 dark:text-muted-foreground">
                {item.activityName}
            </p>
            <p className="text-xs mt-0.5 text-endurix-black/60 dark:text-muted-foreground">
                {warning ? `\u26A0 ${item.content || 'RPE mismatch detected'}` : `"${item.content}"`}
            </p>
        </div>
    );
}

function StatCard({ label, value, chip, chipColor }: {
    label: string;
    value: number;
    chip: string;
    chipColor?: 'orange' | 'green' | 'red';
}) {
    const colorMap = {
        orange: 'text-endurix-orange border-endurix-orange/30',
        green: 'text-green-600 dark:text-green-500 border-green-500/30',
        red: 'text-red-600 dark:text-red-500 border-red-500/30',
    };
    const chipClass = colorMap[chipColor ?? 'orange'];

    return (
        <article className="border border-endurix-black/12 dark:border-border bg-white dark:bg-card p-3">
            <div className="flex items-start justify-between gap-2">
                <span
                    className="text-[9px] text-endurix-black/50 dark:text-muted-foreground tracking-widest font-semibold uppercase"
                    style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                >
                    {label}
                </span>
                <span
                    className={`text-[8px] font-bold tracking-wider border px-1.5 py-0.5 ${chipClass}`}
                    style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                >
                    {chip}
                </span>
            </div>
            <p
                className="mt-2 text-3xl font-bold text-endurix-black dark:text-foreground leading-none"
                style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
            >
                {value}
            </p>
            <p
                className="mt-2 border-t border-endurix-black/8 dark:border-border pt-1.5 text-[8px] text-endurix-black/40 dark:text-muted-foreground tracking-widest uppercase"
                style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
            >
                Live operating signal
            </p>
        </article>
    );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
    return (
        <div className="mb-2">
            <span
                className="inline-block text-[9px] text-endurix-black/50 dark:text-muted-foreground tracking-widest mb-1"
                style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
            >
                {eyebrow}
            </span>
            <h3
                className="font-bold text-endurix-black dark:text-foreground text-xl lg:text-2xl leading-[1.0] tracking-tight uppercase"
                style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
            >
                {title}
            </h3>
        </div>
    );
}

export default function CoachDashboardNew({ user }: CoachDashboardNewProps) {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [markingRead, setMarkingRead] = useState(false);
    const [scope, setScope] = useState<'mine' | 'team'>('mine');
    const t = useTranslations();
    const format = useFormatter();
    const userDisplayName = user.firstName || user.name?.split(' ')[0] || user.email.split('@')[0];

    const fetchDashboard = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/v2/dashboard/coach', { params: { scope } });
            setData(res.data as DashboardData);
        } catch (error) {
            appLogger.error('Failed to fetch new dashboard data', error);
        } finally {
            setLoading(false);
        }
    }, [scope]);

    useEffect(() => {
        void fetchDashboard();
    }, [fetchDashboard]);

    const activeAthletes = data?.stats?.activeAthletes ?? 0;
    const completedToday = data?.stats?.completedToday ?? 0;
    const rpeCount = data?.alerts?.rpeMismatches?.length ?? 0;
    const missingCount = data?.alerts?.missingWorkouts?.length ?? 0;
    const lowComplianceCount = data?.alerts?.lowCompliance?.length ?? 0;
    const zoneViolationCount = data?.alerts?.zoneViolations?.length ?? 0;
    const pendingActionCount =
        data?.alerts?.smartAlerts?.filter((alert) => alert.priority === 'P1' || alert.priority === 'P2').length ??
        (rpeCount + missingCount + lowComplianceCount + zoneViolationCount);
    const groupCount = data?.stats?.totalGroups ?? 0;

    const allAlerts: DashboardAlertItem[] = (data?.alerts?.smartAlerts || []).map((alert) => ({
        alertId: alert.alertId,
        id: alert.athleteId,
        name: alert.athleteName,
        type: alert.type,
        time: new Date(alert.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        message: t(`dashboard.alertTypes.${alert.type}`),
        details: alert.details,
        priority: alert.priority,
        score: alert.score,
        recommendedAction: t(`dashboard.alertActions.recommended.${alert.recommendedActionKey}`),
    }));

    const groupComplianceData = data?.groupCompliance ?? [];

    const filteredTimeline = useMemo(() => {
        return (
            data?.activityTimeline?.filter((item) => {
                const hasFeedback = item.content && item.content.trim().length > 0;
                const isRPEMismatch = data?.alerts?.rpeMismatches?.some(
                    (mismatch) => mismatch.athleteName === item.athleteName && mismatch.workoutType === item.activityName
                );
                return hasFeedback || isRPEMismatch;
            }) || []
        );
    }, [data]);

    const handleMarkAsRead = async () => {
        try {
            setMarkingRead(true);
            await api.post('/v2/dashboard/coach/alerts/read', { scope });
            await fetchDashboard();
        } catch (error) {
            appLogger.error('Failed to mark dashboard alerts as read', error);
        } finally {
            setMarkingRead(false);
        }
    };

    const handleMarkSingleAlertAsRead = async (alert?: DashboardAlertItem) => {
        if (!alert || alert.type !== 'zone_violation' || !alert.alertId) return;
        try {
            await api.post('/v2/dashboard/coach/alerts/read', {
                scope,
                alertIds: [alert.alertId],
            });
            setData((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    alerts: {
                        ...prev.alerts,
                        zoneViolations: prev.alerts.zoneViolations.filter((z) => z.alertId !== alert.alertId),
                    },
                };
            });
        } catch (error) {
            appLogger.error('Failed to mark alert as read', error);
        }
    };

    const handleResolveAlert = async (alert?: DashboardAlertItem) => {
        if (!alert?.alertId) return;
        try {
            await api.post('/v2/dashboard/coach/alerts/read', {
                scope,
                action: 'resolve',
                alertIds: [alert.alertId],
            });
            await fetchDashboard();
        } catch (error) {
            appLogger.error('Failed to resolve alert', error);
        }
    };

    const handleSnoozeAlert = async (alert?: DashboardAlertItem) => {
        if (!alert?.alertId) return;
        try {
            await api.post('/v2/dashboard/coach/alerts/read', {
                scope,
                action: 'snooze',
                snoozeHours: 24,
                alertIds: [alert.alertId],
            });
            await fetchDashboard();
        } catch (error) {
            appLogger.error('Failed to snooze alert', error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-endurix-paper dark:bg-background">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6 space-y-4">
                    <div>
                        <Skeleton className="h-8 w-64 mb-2" />
                        <Skeleton className="h-3 w-36" />
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {[1, 2, 3, 4].map((i) => (
                            <Skeleton key={i} className="h-24" />
                        ))}
                    </div>
                    <Skeleton className="h-36" />
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        <Skeleton className="h-56" />
                        <Skeleton className="h-56" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-endurix-paper dark:bg-background">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
                    <div>
                        <h1
                            className="font-bold text-endurix-black dark:text-foreground text-2xl lg:text-3xl tracking-tight uppercase leading-[1.05]"
                            style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                        >
                            {t('dashboard.messages.hi', { name: userDisplayName })}
                        </h1>
                        <p className="mt-1 text-xs text-endurix-black/50 dark:text-muted-foreground">
                            {format.dateTime(new Date(), { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^\w/, (char) => char.toUpperCase())}
                        </p>
                    </div>

                    {/* Scope Toggle */}
                    <div className="flex items-center gap-1.5 border border-endurix-black/15 dark:border-border bg-endurix-paper dark:bg-muted p-0.5">
                        <button
                            type="button"
                            onClick={() => setScope('mine')}
                            className={`px-3 py-1.5 text-[10px] font-bold tracking-widest transition-all ${
                                scope === 'mine'
                                    ? 'bg-endurix-black dark:bg-white text-white dark:text-endurix-black'
                                    : 'text-endurix-black/60 dark:text-muted-foreground hover:text-endurix-black dark:hover:text-foreground'
                            }`}
                            style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                        >
                            {t('dashboard.alerts.myAthletes')}
                        </button>
                        <button
                            type="button"
                            onClick={() => setScope('team')}
                            className={`px-3 py-1.5 text-[10px] font-bold tracking-widest transition-all ${
                                scope === 'team'
                                    ? 'bg-endurix-black dark:bg-white text-white dark:text-endurix-black'
                                    : 'text-endurix-black/60 dark:text-muted-foreground hover:text-endurix-black dark:hover:text-foreground'
                            }`}
                            style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                        >
                            {t('dashboard.alerts.teamView')}
                        </button>
                    </div>
                </div>

                {/* Stats Grid */}
                <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                    <StatCard
                        label={t('dashboard.metrics.activeAthletes')}
                        value={activeAthletes}
                        chip="+12.4%"
                        chipColor="green"
                    />
                    <StatCard
                        label={t('dashboard.metrics.completedToday')}
                        value={completedToday}
                        chip="+8.1%"
                        chipColor="green"
                    />
                    <StatCard
                        label={t('dashboard.metrics.totalGroups')}
                        value={groupCount}
                        chip={`${data?.stats?.completionRate ?? 0}%`}
                    />
                    <StatCard
                        label={t('dashboard.metrics.actionNeeded')}
                        value={pendingActionCount}
                        chip={`${pendingActionCount > 0 ? '-' : '+'}${Math.min(8, pendingActionCount || 1)}.2%`}
                        chipColor={pendingActionCount > 0 ? 'red' : 'green'}
                    />
                </section>

                {/* Program Control — Dark Hero */}
                <section className="mb-5">
                    <article className="border border-endurix-black dark:border-border bg-endurix-black dark:bg-card p-4 text-white dark:text-foreground">
                        <span
                            className="text-[9px] text-white/50 dark:text-muted-foreground tracking-widest uppercase"
                            style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                        >
                            Program Control
                        </span>
                        <h3
                            className="mt-1 text-2xl lg:text-3xl font-bold uppercase leading-[0.95] tracking-tight"
                            style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                        >
                            Active Blocks
                        </h3>
                        <div className="mt-3 space-y-1.5">
                            {groupComplianceData.slice(0, 4).map((group) => (
                                <div
                                    key={group.groupId}
                                    className="border border-white/10 dark:border-border bg-white/5 dark:bg-muted p-2.5 flex items-center justify-between"
                                >
                                    <div>
                                        <p className="text-xs font-semibold">{group.groupName}</p>
                                        <p className="text-[10px] text-white/50 dark:text-muted-foreground">
                                            {group.athleteCount} athletes
                                        </p>
                                    </div>
                                    <span
                                        className="text-endurix-orange text-base font-bold"
                                        style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                                    >
                                        {group.completionRate}%
                                    </span>
                                </div>
                            ))}
                            {!loading && groupComplianceData.length === 0 && (
                                <p className="text-xs text-white/60 dark:text-muted-foreground">No active blocks</p>
                            )}
                        </div>
                    </article>
                </section>

                {/* Athlete Intelligence — Priority Roster */}
                <section className="mb-5">
                    <article className="border border-endurix-black/12 dark:border-border bg-white dark:bg-card">
                        {/* Card Header */}
                        <div className="flex items-center justify-between px-4 py-2 bg-endurix-paper dark:bg-muted border-b border-endurix-black/8 dark:border-border">
                            <SectionHeader eyebrow="Athlete Intelligence" title="Priority Roster" />
                            <button
                                type="button"
                                onClick={handleMarkAsRead}
                                disabled={markingRead || zoneViolationCount === 0}
                                className="inline-flex items-center justify-center gap-1.5 bg-endurix-orange text-white text-[10px] font-bold tracking-widest px-4 py-2 transition-all hover:bg-endurix-orange/90 disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                            >
                                {markingRead ? t('common.loading') : t('dashboard.alerts.markAsRead')}
                            </button>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[760px] text-left">
                                <thead
                                    className="border-b border-endurix-black/10 dark:border-border bg-muted text-[9px] uppercase tracking-[0.14em] text-endurix-black/50 dark:text-muted-foreground"
                                    style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                                >
                                    <tr>
                                        <th className="px-4 py-2">Athlete</th>
                                        <th className="px-4 py-2">Program</th>
                                        <th className="px-4 py-2">Load</th>
                                        <th className="px-4 py-2">Score</th>
                                        <th className="px-4 py-2">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allAlerts.slice(0, 6).map((alert, idx) => {
                                        const status = alert.priority === 'P1' ? 'Flagged' : alert.priority === 'P2' ? 'Monitor' : 'Ready';
                                        const statusColor =
                                            alert.priority === 'P1'
                                                ? 'text-red-600 dark:text-red-500'
                                                : alert.priority === 'P2'
                                                    ? 'text-endurix-orange'
                                                    : 'text-green-600 dark:text-green-500';
                                        return (
                                            <tr
                                                key={`${alert.id}-${idx}`}
                                                className="border-b border-endurix-black/8 dark:border-border text-xs"
                                            >
                                                <td className="px-4 py-2 font-semibold text-endurix-black dark:text-foreground">
                                                    {alert.name}
                                                </td>
                                                <td className="px-4 py-2 text-endurix-black/70 dark:text-muted-foreground">
                                                    {alert.message}
                                                </td>
                                                <td className="px-4 py-2 text-endurix-black/70 dark:text-muted-foreground">
                                                    {alert.recommendedAction || 'Operational'}
                                                </td>
                                                <td
                                                    className="px-4 py-2 font-bold text-endurix-black dark:text-foreground"
                                                    style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                                                >
                                                    {alert.score ?? 0}
                                                </td>
                                                <td className={`px-4 py-2 font-semibold ${statusColor}`}>
                                                    {status}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {allAlerts.length === 0 && (
                                        <tr>
                                            <td
                                                className="px-4 py-3 text-xs text-endurix-black/40 dark:text-muted-foreground"
                                                colSpan={5}
                                            >
                                                {t('dashboard.alerts.noCurrentAlerts')}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </article>
                </section>

                {/* Compliance Alerts + Recent Activity */}
                <section className="grid grid-cols-1 gap-4 xl:grid-cols-12 mb-5">
                    {/* Athletes Compliance */}
                    <article className="xl:col-span-7 border border-endurix-black/12 dark:border-border bg-white dark:bg-card p-4">
                        <SectionHeader eyebrow="Compliance" title={t('dashboard.alerts.athletesCompliance')} />
                        <div className="space-y-1.5">
                            {allAlerts.slice(0, 6).map((alert, idx) => (
                                <CriticalAlertItem
                                    key={`alert-card-${idx}`}
                                    athleteId={alert.id}
                                    athleteName={alert.name}
                                    alertType={alert.type}
                                    timestamp={alert.time}
                                    message={alert.message}
                                    details={alert.details}
                                    priority={alert.priority}
                                    score={alert.score}
                                    recommendedAction={alert.recommendedAction}
                                    onMarkAsRead={() => void handleMarkSingleAlertAsRead(alert)}
                                    canMarkAsRead={alert.type === 'zone_violation' && Boolean(alert.alertId)}
                                    canResolve={Boolean(alert.alertId)}
                                    onResolve={() => void handleResolveAlert(alert)}
                                    canSnooze={Boolean(alert.alertId)}
                                    onSnooze={() => void handleSnoozeAlert(alert)}
                                />
                            ))}
                            {allAlerts.length === 0 && (
                                <p className="text-xs text-endurix-black/40 dark:text-muted-foreground">
                                    {t('dashboard.alerts.noCurrentAlerts')}
                                </p>
                            )}
                        </div>
                    </article>

                    {/* Recent Activity */}
                    <article className="xl:col-span-5 border border-endurix-black/12 dark:border-border bg-white dark:bg-card p-4">
                        <SectionHeader eyebrow="Timeline" title={t('dashboard.alerts.recentActivity')} />
                        <div className="space-y-2">
                            {filteredTimeline.slice(0, 6).map((item) => {
                                const hasFeedback = item.content && item.content.trim().length > 0;
                                return <TimelineItem key={item.id} item={item} warning={!hasFeedback} />;
                            })}
                            {filteredTimeline.length === 0 && (
                                <p className="text-xs text-endurix-black/40 dark:text-muted-foreground">
                                    {t('dashboard.alerts.noRecentActivity')}
                                </p>
                            )}
                        </div>
                    </article>
                </section>

                {/* Group Status + Next Races */}
                <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
                    {/* Group Status */}
                    <article className="xl:col-span-7 border border-endurix-black/12 dark:border-border bg-white dark:bg-card p-4">
                        <SectionHeader eyebrow="Groups" title={t('dashboard.alerts.groupStatus')} />
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {groupComplianceData.map((group) => (
                                <GroupStatusCard
                                    key={group.groupId}
                                    groupId={group.groupId}
                                    groupName={group.groupName}
                                    athleteCount={group.athleteCount}
                                    completionRate={group.completionRate}
                                />
                            ))}
                            {groupComplianceData.length === 0 && (
                                <p className="text-xs text-endurix-black/40 dark:text-muted-foreground">
                                    No group data available
                                </p>
                            )}
                        </div>
                    </article>

                    {/* Next Races */}
                    <article className="xl:col-span-5 border border-endurix-black/12 dark:border-border bg-white dark:bg-card p-4">
                        <SectionHeader eyebrow="Upcoming" title={t('dashboard.alerts.nextRaces')} />
                        <div className="[&>div]:p-0 [&>div]:bg-transparent [&_.rounded-2xl]:rounded-none [&_.bg-muted]:bg-transparent [&_h2]:hidden">
                            <NextRaces />
                        </div>
                    </article>
                </section>
            </div>
        </div>
    );
}
