'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import api from '@/lib/axios';
import { appLogger } from '@/lib/app-logger';
import { GroupStatusCard } from '@/components/dashboard/GroupStatusCard';
import { StatCard, SectionHeader, TimelineItem, CoachDashboardSkeleton } from '@/components/dashboard';
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
    fitness?: { ctl: number; tsb: number };
    scope?: 'athlete' | 'group';
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

function LocalTimelineItem({ item, warning }: { item: TimelineEvent; warning: boolean }) {
    return (
        <TimelineItem
            time={new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            athleteName={item.athleteName}
            activityName={item.activityName}
            content={item.content}
            warning={warning}
        />
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
    const zoneViolationCount = data?.alerts?.zoneViolations?.length ?? 0;
    const groupCount = data?.stats?.totalGroups ?? 0;

    const smartAlertsList = data?.alerts?.smartAlerts ?? [];

    // Primary: backend's canonical count of P1/P2 alerts (covers both athlete and group scope).
    // Fallback: client-side P1/P2 filter (used when the backend does not return actionNeeded).
    const backendActionCount = data?.stats?.actionNeeded ?? 0;
    const fallbackHighPriorityCount = smartAlertsList.filter(
        (alert) => alert.priority === 'P1' || alert.priority === 'P2'
    ).length;
    const highPriorityCount = backendActionCount > 0 ? backendActionCount : fallbackHighPriorityCount;

    // Group-level actions the P1/P2 filter misses:
    //   - Group-scope P3 alerts (typically missing_workout for groups — scored P3 by design,
    //     but still actionable for the coach because a group = multiple athletes).
    //   - Groups with no next-week assignment (clear, separate action item).
    const groupScopeP3Count = smartAlertsList.filter(
        (alert) => alert.scope === 'group' && alert.priority === 'P3'
    ).length;
    const groupsWithoutWeekCount = data?.stats?.groupsWithoutNextWeek ?? 0;

    const pendingActionCount =
        highPriorityCount + groupScopeP3Count + groupsWithoutWeekCount;

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
        fitness: alert.fitness,
        scope: alert.scope ?? 'athlete',
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

    if (loading) {
        return <CoachDashboardSkeleton />;
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
                        chipColor="green"
                    />
                    <StatCard
                        label={t('dashboard.metrics.completedToday')}
                        value={completedToday}
                        chipColor="green"
                    />
                    <StatCard
                        label={t('dashboard.metrics.totalGroups')}
                        value={groupCount}
                    />
                    <StatCard
                        label={t('dashboard.metrics.actionNeeded')}
                        value={pendingActionCount}
                    />
                </section>

                {/* Athlete Intelligence — Priority Roster */}
                <section className="mb-5">
                    <article className="border border-endurix-black/12 dark:border-border bg-white dark:bg-card">
                        {/* Card Header */}
                        <div className="flex items-center justify-between px-4 py-2 bg-endurix-paper dark:bg-muted border-b border-endurix-black/8 dark:border-border">
                            <SectionHeader
                                eyebrow={t('dashboard.priorityRoster.eyebrow')}
                                title={t('dashboard.priorityRoster.title')}
                            />
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
                                        <th className="px-4 py-2">{t('dashboard.priorityRoster.columns.athlete')}</th>
                                        <th className="px-4 py-2">{t('dashboard.priorityRoster.columns.program')}</th>
                                        <th className="px-4 py-2">{t('dashboard.priorityRoster.columns.load')}</th>
                                        <th className="px-4 py-2">{t('dashboard.priorityRoster.columns.fitness')}</th>
                                        <th className="px-4 py-2">{t('dashboard.priorityRoster.columns.risk')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allAlerts.slice(0, 6).map((alert, idx) => {
                                        const score = Math.max(0, Math.min(100, alert.score ?? 0));
                                        const band = getRiskBand(alert.priority);
                                        const ctl = alert.fitness ? Math.round(alert.fitness.ctl) : null;
                                        const tsb = alert.fitness ? Math.round(alert.fitness.tsb) : null;
                                        return (
                                            <tr
                                                key={`${alert.id}-${idx}`}
                                                className="border-b border-endurix-black/8 dark:border-border text-xs"
                                            >
                                                <td className="px-4 py-2 font-semibold text-endurix-black dark:text-foreground">
                                                    <Link
                                                        href={getEntityHref(alert)}
                                                        className="hover:text-endurix-orange hover:underline transition-colors"
                                                    >
                                                        {alert.name}
                                                    </Link>
                                                </td>
                                                <td className="px-4 py-2 text-endurix-black/70 dark:text-muted-foreground">
                                                    {alert.message}
                                                </td>
                                                <td className="px-4 py-2 text-endurix-black/70 dark:text-muted-foreground">
                                                    {alert.recommendedAction || t('dashboard.priorityRoster.operational')}
                                                </td>
                                                <td className="px-4 py-2 text-endurix-black dark:text-foreground">
                                                    {ctl !== null && tsb !== null ? (
                                                        <div className="flex items-center gap-2 leading-tight">
                                                            <span
                                                                className="font-bold"
                                                                style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                                                            >
                                                                {ctl}
                                                            </span>
                                                            <span className="text-[9px] uppercase tracking-widest text-endurix-black/40 dark:text-muted-foreground">
                                                                {t('dashboard.priorityRoster.ctl')}
                                                            </span>
                                                            <span
                                                                className={`font-bold ${tsb > 0 ? 'text-green-600 dark:text-green-500' : tsb < 0 ? 'text-endurix-orange' : 'text-endurix-black/40 dark:text-muted-foreground'}`}
                                                                style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                                                            >
                                                                {tsb > 0 ? `+${tsb}` : tsb}
                                                            </span>
                                                            <span className="text-[9px] uppercase tracking-widest text-endurix-black/40 dark:text-muted-foreground">
                                                                {t('dashboard.priorityRoster.tsb')}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-endurix-black/30 dark:text-muted-foreground">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2">
                                                    <RiskBar score={score} band={band} label={t(band.labelKey)} />
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

                {/* Recent Activity */}
                <section className="mb-5">
                    <article className="border border-endurix-black/12 dark:border-border bg-white dark:bg-card p-4">
                        <SectionHeader eyebrow={t('dashboard.recentActivity.eyebrow')} title={t('dashboard.alerts.recentActivity')} />
                        <div className="space-y-2">
                            {filteredTimeline.slice(0, 6).map((item) => {
                                const hasFeedback = item.content && item.content.trim().length > 0;
                                return <LocalTimelineItem key={item.id} item={item} warning={!hasFeedback} />;
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
                        <SectionHeader eyebrow={t('dashboard.groupStatus.eyebrow')} title={t('dashboard.alerts.groupStatus')} />
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
                                    {t('dashboard.groupStatus.noData')}
                                </p>
                            )}
                        </div>
                    </article>

                    {/* Next Races */}
                    <div className="xl:col-span-5">
                        <NextRaces />
                    </div>
                </section>
            </div>
        </div>
    );
}

type RiskBand = {
    labelKey: 'dashboard.risk.stable' | 'dashboard.risk.monitor' | 'dashboard.risk.atRisk' | 'dashboard.risk.critical';
    barClass: string;
    textClass: string;
};

function getEntityHref(alert: DashboardAlertItem): string {
    if (alert.scope === 'group') {
        const groupId = alert.id.startsWith('group:') ? alert.id.slice('group:'.length) : alert.id;
        return `/groups/${groupId}`;
    }
    return `/athletes/${alert.id}`;
}

function getRiskBand(priority?: 'P1' | 'P2' | 'P3' | 'P4'): RiskBand {
    switch (priority) {
        case 'P1':
            return { labelKey: 'dashboard.risk.critical', barClass: 'bg-red-500', textClass: 'text-red-600 dark:text-red-500' };
        case 'P2':
            return { labelKey: 'dashboard.risk.atRisk', barClass: 'bg-endurix-orange', textClass: 'text-endurix-orange' };
        case 'P3':
            return { labelKey: 'dashboard.risk.monitor', barClass: 'bg-yellow-500', textClass: 'text-yellow-600 dark:text-yellow-500' };
        case 'P4':
        default:
            return { labelKey: 'dashboard.risk.stable', barClass: 'bg-green-500', textClass: 'text-green-600 dark:text-green-500' };
    }
}

function RiskBar({ score, band, label }: { score: number; band: RiskBand; label: string }) {
    return (
        <div className="flex flex-col gap-1 min-w-[120px]">
            <span
                className={`text-[10px] font-bold uppercase tracking-widest ${band.textClass}`}
                style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
            >
                {label}
            </span>
            <div
                className="h-1 w-full bg-endurix-black/8 dark:bg-white/10 overflow-hidden"
                role="progressbar"
                aria-valuenow={score}
                aria-valuemin={0}
                aria-valuemax={100}
            >
                <div
                    className={`h-full ${band.barClass} transition-all`}
                    style={{ width: `${score}%` }}
                />
            </div>
        </div>
    );
}
