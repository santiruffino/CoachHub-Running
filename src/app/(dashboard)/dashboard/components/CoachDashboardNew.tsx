'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import api from '@/lib/axios';
import { appLogger } from '@/lib/app-logger';
import { GroupStatusCard } from '@/components/dashboard/GroupStatusCard';
import { StatCard, SectionHeader, TimelineItem, CoachDashboardSkeleton, ConversationList } from '@/components/dashboard';
import { PendingMatchReview } from '@/features/trainings/components/PendingMatchReview';
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
    content?: string;
}

interface PriorityRosterGroup {
    key: string;
    id: string;
    name: string;
    scope: 'athlete' | 'group';
    alerts: DashboardAlertItem[];
    primaryAlert: DashboardAlertItem;
    score: number;
}

const DISMISSED_ROSTER_ALERTS_STORAGE_KEY = 'endurix.dashboard.coach.dismissedRosterAlerts';

function getDismissedRosterAlertsStorageKey(scope: 'mine' | 'team') {
    return `${DISMISSED_ROSTER_ALERTS_STORAGE_KEY}:${scope}`;
}

function readDismissedRosterAlertIds(scope: 'mine' | 'team') {
    if (typeof window === 'undefined') {
        return new Set<string>();
    }

    try {
        const raw = window.localStorage.getItem(getDismissedRosterAlertsStorageKey(scope));
        const parsed = raw ? JSON.parse(raw) : [];
        return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []);
    } catch {
        return new Set<string>();
    }
}

function writeDismissedRosterAlertIds(scope: 'mine' | 'team', ids: Set<string>) {
    if (typeof window === 'undefined') {
        return;
    }

    window.localStorage.setItem(getDismissedRosterAlertsStorageKey(scope), JSON.stringify(Array.from(ids)));
}

const DASHBOARD_SCOPE_STORAGE_KEY = 'endurix.dashboard.coach.scope';

function readStoredScope(): 'mine' | 'team' {
    if (typeof window === 'undefined') {
        return 'mine';
    }

    const stored = window.localStorage.getItem(DASHBOARD_SCOPE_STORAGE_KEY);
    return stored === 'team' ? 'team' : 'mine';
}

function writeStoredScope(scope: 'mine' | 'team') {
    if (typeof window === 'undefined') {
        return;
    }

    window.localStorage.setItem(DASHBOARD_SCOPE_STORAGE_KEY, scope);
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

export default function CoachDashboardNew({ user }: CoachDashboardNewProps) {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const hasLoadedRef = useRef(false);
    const [scope, setScope] = useState<'mine' | 'team'>('mine');
    const scopeHydratedRef = useRef(false);
    const [expandedRosterKeys, setExpandedRosterKeys] = useState<Set<string>>(new Set());
    const [dismissedRosterAlertIds, setDismissedRosterAlertIds] = useState<Set<string>>(new Set());
    const [pendingRosterAlertIds, setPendingRosterAlertIds] = useState<Set<string>>(new Set());
    const [readTimelineIds, setReadTimelineIds] = useState<Set<string>>(new Set());
    const rosterDismissalsHydratedRef = useRef(false);
    const t = useTranslations();
    const format = useFormatter();
    const userDisplayName = user.firstName || user.name?.split(' ')[0] || user.email.split('@')[0];

    useEffect(() => {
        const storedScope = readStoredScope();
        scopeHydratedRef.current = true;
        if (storedScope !== scope) {
            setScope(storedScope);
        }
        // Runs once on mount only — restores the coach's last chosen scope.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!scopeHydratedRef.current) return;
        writeStoredScope(scope);
    }, [scope]);

    useEffect(() => {
        rosterDismissalsHydratedRef.current = false;
        setExpandedRosterKeys(new Set());
        setDismissedRosterAlertIds(readDismissedRosterAlertIds(scope));
        setPendingRosterAlertIds(new Set());
    }, [scope]);

    useEffect(() => {
        if (!rosterDismissalsHydratedRef.current) {
            rosterDismissalsHydratedRef.current = true;
            return;
        }

        writeDismissedRosterAlertIds(scope, dismissedRosterAlertIds);
    }, [scope, dismissedRosterAlertIds]);

    const handleMarkTimelineRead = (itemId: string) => {
        setReadTimelineIds((prev) => new Set(prev).add(itemId));
    };

    function LocalTimelineItem({ item, warning }: { item: TimelineEvent; warning: boolean }) {
        return (
            <TimelineItem
                time={new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                athleteName={item.athleteName}
                activityName={item.activityName}
                activityId={item.activityId}
                content={item.content}
                warning={warning}
                onMarkRead={() => handleMarkTimelineRead(item.id)}
                isRead={readTimelineIds.has(item.id)}
            />
        );
    }

    const fetchDashboard = useCallback(async () => {
        // Only show the full-page skeleton on the very first load. Subsequent
        // fetches (e.g. switching the scope toggle) refresh in place so the
        // header + scope toggle stay visible instead of being unmounted.
        try {
            if (hasLoadedRef.current) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            const res = await api.get('/v2/dashboard/coach', { params: { scope } });
            setData(res.data as DashboardData);
            hasLoadedRef.current = true;
        } catch (error) {
            appLogger.error('Failed to fetch new dashboard data', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [scope]);

    const fetchDashboardSilently = useCallback(async () => {
        try {
            const res = await api.get('/v2/dashboard/coach', { params: { scope } });
            setData(res.data as DashboardData);
        } catch (error) {
            appLogger.error('Failed to fetch new dashboard data', error);
        }
    }, [scope]);

    useEffect(() => {
        void fetchDashboard();
    }, [fetchDashboard]);

    const activeAthletes = data?.stats?.activeAthletes ?? 0;
    const completedToday = data?.stats?.completedToday ?? 0;
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
        content: alert.content,
    }));

    const visibleAlerts = useMemo(
        () => allAlerts.filter((alert) => !dismissedRosterAlertIds.has(alert.id)),
        [allAlerts, dismissedRosterAlertIds]
    );

    const priorityRosterItems = useMemo<PriorityRosterGroup[]>(() => {
        const rankPriority = (priority?: 'P1' | 'P2' | 'P3' | 'P4') => {
            switch (priority) {
                case 'P1':
                    return 0;
                case 'P2':
                    return 1;
                case 'P3':
                    return 2;
                case 'P4':
                default:
                    return 3;
            }
        };

        const grouped = new Map<string, PriorityRosterGroup>();

        visibleAlerts.forEach((alert) => {
            const scope = alert.scope ?? 'athlete';
            const key = `${scope}:${alert.id}`;
            const existing = grouped.get(key);

            if (existing) {
                existing.alerts.push(alert);
                return;
            }

            grouped.set(key, {
                key,
                id: alert.id,
                name: alert.name,
                scope,
                alerts: [alert],
                primaryAlert: alert,
                score: alert.score ?? 0,
            });
        });

        return Array.from(grouped.values())
            .map((group) => {
                const alerts = [...group.alerts].sort((a, b) => {
                    const priorityDelta = rankPriority(a.priority) - rankPriority(b.priority);
                    if (priorityDelta !== 0) return priorityDelta;

                    const scoreDelta = (b.score ?? 0) - (a.score ?? 0);
                    if (scoreDelta !== 0) return scoreDelta;

                    return new Date(b.time).getTime() - new Date(a.time).getTime();
                });

                return {
                    ...group,
                    alerts,
                    primaryAlert: alerts[0],
                    score: Math.max(...alerts.map((alert) => alert.score ?? 0)),
                };
            })
            .sort((a, b) => {
                const priorityDelta = rankPriority(a.primaryAlert.priority) - rankPriority(b.primaryAlert.priority);
                if (priorityDelta !== 0) return priorityDelta;

                return new Date(b.primaryAlert.time).getTime() - new Date(a.primaryAlert.time).getTime();
            });
    }, [visibleAlerts]);

    const toggleRosterGroup = useCallback((key: string) => {
        setExpandedRosterKeys((prev) => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    }, []);

    const dismissRosterAlerts = useCallback(
        async (alerts: DashboardAlertItem[]) => {
            const alertKeys = Array.from(new Set(alerts.map((alert) => alert.id)));
            const backendAlertIds = Array.from(new Set(alerts.map((alert) => alert.alertId).filter((id): id is string => Boolean(id))));

            if (alertKeys.length === 0) {
                return;
            }

            setPendingRosterAlertIds((prev) => {
                const next = new Set(prev);
                alertKeys.forEach((id) => next.add(id));
                return next;
            });

            try {
                if (backendAlertIds.length > 0) {
                    await api.post('/v2/dashboard/coach/alerts/read', { scope, alertIds: backendAlertIds });
                }

                setDismissedRosterAlertIds((prev) => {
                    const next = new Set(prev);
                    alertKeys.forEach((id) => next.add(id));
                    return next;
                });

                await fetchDashboardSilently();
            } catch (error) {
                appLogger.error('Failed to dismiss roster alert', error);
            } finally {
                setPendingRosterAlertIds((prev) => {
                    const next = new Set(prev);
                    alertKeys.forEach((id) => next.delete(id));
                    return next;
                });
            }
        },
        [fetchDashboardSilently, scope]
    );

    const markAllRosterAlertsRead = useCallback(async () => {
        await dismissRosterAlerts(visibleAlerts);
    }, [dismissRosterAlerts, visibleAlerts]);

    const groupComplianceData = data?.groupCompliance ?? [];

    const filteredTimeline = useMemo(() => {
        const items = data?.activityTimeline?.filter((item) => {
            const hasFeedback = item.content && item.content.trim().length > 0;
            const isRPEMismatch = data?.alerts?.rpeMismatches?.some(
                (mismatch) => mismatch.athleteName === item.athleteName && mismatch.workoutType === item.activityName
            );
            return hasFeedback || isRPEMismatch;
        }) || [];
        return items.filter((item) => !readTimelineIds.has(item.id));
    }, [data, readTimelineIds]);

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

                {/* Content (refreshes in place on scope switch; header stays mounted) */}
                <div
                    aria-busy={refreshing}
                    className={`transition-opacity duration-200 ${refreshing ? 'opacity-60' : 'opacity-100'}`}
                >
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
                                onClick={markAllRosterAlertsRead}
                                disabled={pendingRosterAlertIds.size > 0 || visibleAlerts.length === 0}
                                className="inline-flex items-center justify-center gap-1.5 bg-endurix-orange text-white text-[10px] font-bold tracking-widest px-4 py-2 transition-all hover:bg-endurix-orange/90 disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                            >
                                {pendingRosterAlertIds.size > 0 ? t('common.loading') : t('dashboard.alerts.markAsRead')}
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
                                    {priorityRosterItems.slice(0, 6).map((item) => {
                                        const score = Math.max(0, Math.min(100, item.score));
                                        const band = getRiskBand(item.primaryAlert.priority);
                                        const ctl = item.primaryAlert.fitness ? Math.round(item.primaryAlert.fitness.ctl) : null;
                                        const tsb = item.primaryAlert.fitness ? Math.round(item.primaryAlert.fitness.tsb) : null;
                                        const isExpanded = expandedRosterKeys.has(item.key);

                                        return (
                                            <Fragment key={item.key}>
                                                <tr
                                                    className="border-b border-endurix-black/8 dark:border-border text-xs"
                                                >
                                                    <td className="px-4 py-2 font-semibold text-endurix-black dark:text-foreground align-top">
                                                        <div className="flex items-center gap-2">
                                                            {item.alerts.length > 1 ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleRosterGroup(item.key)}
                                                                    className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-endurix-black/10 dark:border-border bg-endurix-paper dark:bg-muted text-endurix-black/70 dark:text-muted-foreground hover:text-endurix-black dark:hover:text-foreground hover:bg-endurix-black/5 dark:hover:bg-white/10 transition-colors"
                                                                    aria-expanded={isExpanded}
                                                                    aria-label={isExpanded ? t('builder.collapse') : t('builder.expand')}
                                                                >
                                                                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                                                </button>
                                                            ) : (
                                                                <span className="inline-flex h-6 w-6 items-center justify-center" />
                                                            )}
                                                            <Link
                                                                href={getEntityHref(item.primaryAlert)}
                                                                className="hover:text-endurix-orange hover:underline transition-colors"
                                                            >
                                                                {item.name}
                                                            </Link>
                                                            {item.alerts.length > 1 && (
                                                                <span className="inline-flex items-center rounded-full border border-endurix-black/10 dark:border-border bg-endurix-paper dark:bg-muted px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-endurix-black/60 dark:text-muted-foreground align-middle">
                                                                    {item.alerts.length}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2 text-endurix-black/70 dark:text-muted-foreground align-top">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="flex min-w-0 flex-col gap-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span
                                                                        className="inline-flex shrink-0 items-center rounded-full bg-endurix-black/5 dark:bg-white/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest"
                                                                        title={t(`dashboard.alertTypes.${item.primaryAlert.type}`)}
                                                                    >
                                                                        {t(`dashboard.alertTypes.${item.primaryAlert.type}`)}
                                                                    </span>
                                                                    <span className="leading-snug text-[11px] text-endurix-black/75 dark:text-muted-foreground">
                                                                        {item.primaryAlert.details}
                                                                    </span>
                                                                </div>
                                                                {item.primaryAlert.type === 'new_feedback' && item.primaryAlert.content && (
                                                                    <p className="line-clamp-2 text-[11px] italic leading-snug text-endurix-black/60 dark:text-muted-foreground">
                                                                        “{item.primaryAlert.content}”
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => dismissRosterAlerts([item.primaryAlert])}
                                                                disabled={pendingRosterAlertIds.has(item.primaryAlert.id)}
                                                                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-endurix-black/10 dark:border-border bg-endurix-paper dark:bg-muted text-endurix-black/50 dark:text-muted-foreground hover:text-destructive dark:hover:text-destructive hover:bg-endurix-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-40"
                                                                title={t('dashboard.alerts.markAsRead')}
                                                                aria-label={t('dashboard.alerts.markAsRead')}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2 text-endurix-black/70 dark:text-muted-foreground align-top">
                                                        {item.primaryAlert.recommendedAction || t('dashboard.priorityRoster.operational')}
                                                    </td>
                                                    <td className="px-4 py-2 text-endurix-black dark:text-foreground align-top">
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
                                                    <td className="px-4 py-2 align-top">
                                                        <RiskBar score={score} band={band} label={t(band.labelKey)} />
                                                    </td>
                                                </tr>
                                                {isExpanded && item.alerts.length > 1 && (
                                                    <tr key={`${item.key}-details`} className="border-b border-endurix-black/8 dark:border-border bg-endurix-paper/50 dark:bg-muted/30">
                                                        <td colSpan={5} className="px-4 py-3">
                                                            <div className="space-y-2">
                                                                {item.alerts.map((alert, index) => (
                                                                    <div
                                                                        key={`${item.key}-${alert.alertId ?? alert.id}-${index}`}
                                                                        className="flex items-start justify-between gap-3 rounded-md border border-endurix-black/10 dark:border-border bg-white dark:bg-card px-3 py-2"
                                                                    >
                                                                        <div className="min-w-0 flex-1">
                                                                            <div className="flex flex-wrap items-center gap-2">
                                                                                <span className="inline-flex items-center rounded-full bg-endurix-black/5 dark:bg-white/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest">
                                                                                    {t(`dashboard.alertTypes.${alert.type}`)}
                                                                                </span>
                                                                                <span className="text-[10px] uppercase tracking-widest text-endurix-black/40 dark:text-muted-foreground">
                                                                                    {alert.priority}
                                                                                </span>
                                                                            </div>
                                                                            <p className="mt-1 text-xs text-endurix-black/80 dark:text-muted-foreground">
                                                                                {alert.details}
                                                                            </p>
                                                                            {alert.type === 'new_feedback' && alert.content && (
                                                                                <p className="mt-1 text-xs italic text-endurix-black/60 dark:text-muted-foreground">
                                                                                    “{alert.content}”
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => dismissRosterAlerts([alert])}
                                                                            disabled={pendingRosterAlertIds.has(alert.id)}
                                                                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-endurix-black/10 dark:border-border bg-endurix-paper dark:bg-muted text-endurix-black/50 dark:text-muted-foreground hover:text-destructive dark:hover:text-destructive hover:bg-endurix-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-40"
                                                                            title={t('dashboard.alerts.markAsRead')}
                                                                            aria-label={t('dashboard.alerts.markAsRead')}
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        );
                                    })}
                                    {priorityRosterItems.length === 0 && (
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
                <section className="mb-5 w-full">
                    <article className="w-full border border-endurix-black/12 dark:border-border bg-white dark:bg-card">
                        <div className="flex items-center justify-between px-4 py-2 bg-endurix-paper dark:bg-muted border-b border-endurix-black/8 dark:border-border">
                            <SectionHeader eyebrow={t('dashboard.recentActivity.eyebrow')} title={t('dashboard.alerts.recentActivity')} />
                        </div>
                        <div className="space-y-2 p-4">
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

                {/* Pending Match Review */}
                <section className="mb-5 w-full">
                    <article className="w-full border border-endurix-black/12 dark:border-border bg-white dark:bg-card">
                        <div className="flex items-center justify-between px-4 py-2 bg-endurix-paper dark:bg-muted border-b border-endurix-black/8 dark:border-border">
                            <SectionHeader eyebrow={t('dashboard.matching.eyebrow')} title={t('dashboard.matching.title')} />
                        </div>
                        <PendingMatchReview />
                    </article>
                </section>

                {/* Conversations */}
                <section className="mb-5 w-full">
                    <article className="w-full border border-endurix-black/12 dark:border-border bg-white dark:bg-card">
                        <div className="flex items-center justify-between px-4 py-2 bg-endurix-paper dark:bg-muted border-b border-endurix-black/8 dark:border-border">
                            <SectionHeader eyebrow={t('dashboard.chat.eyebrow')} title={t('dashboard.chat.title')} />
                        </div>
                        <ConversationList />
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
            return { labelKey: 'dashboard.risk.critical', barClass: 'bg-destructive', textClass: 'text-destructive' };
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
