'use client';
import { appLogger } from '@/lib/app-logger';


import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { format, startOfWeek, endOfWeek, subWeeks, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '@/lib/axios';
import { useTranslations } from 'next-intl';
import { Zap } from 'lucide-react';

import { AthleteWeeklyCalendar } from '@/components/dashboard/AthleteWeeklyCalendar';
import { StatCard, DashboardCard, DashboardCardHeaderDots, MonospaceLabel } from '@/components/dashboard';
import { PerformanceTrendChart } from '@/components/dashboard/PerformanceTrendChart';
import { LoadMetricsTrendChart } from '@/components/dashboard/LoadMetricsTrendChart';
import { WeeklyLoadChart } from '@/components/dashboard/WeeklyLoadChart';
import { StatCardSkeleton } from '@/components/dashboard/skeletons';
import { CareerProgressSummary } from '@/features/profiles/components/CareerProgressSummary';
import { CoachAthleteChat } from '@/components/dashboard/CoachAthleteChat';
import { HeartRateZones } from '@/features/profiles/components/HeartRateZones';
import { PaceZones } from '@/features/profiles/components/PaceZones';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TooltipProvider } from '@/components/ui/tooltip';

import { stravaService } from '@/features/strava/services/strava.service';
import { racesService } from '@/features/races/services/races.service';
import { AssignRaceModal } from '@/features/races/components/AssignRaceModal';
import { athletesService, LoadMetricsRange, LoadMetricsResponse, WeeklyLoadResponse } from '@/features/users/services/athletes.service';
import { subscribeToTableChanges } from '@/lib/supabase/realtime';
import { normalizeActivityType } from '@/utils/activity-utils';
import { NextRaces } from './NextRaces';
import { NewActivityFeedbackModal } from './NewActivityFeedbackModal';
import { User } from '@/interfaces/auth';
import { Activity } from '@/interfaces/activity';
import { TrainingAssignment } from '@/interfaces/training';
import { AthleteRace } from '@/interfaces/race';
import { HeartRateZones as HeartRateZonesType } from '@/interfaces/athlete';

interface AthleteDetails {
    athleteProfile?: {
        hrZones?: HeartRateZonesType;
        vam?: string;
    } | null;
}

interface PerformancePoint {
    week: string;
    value: number;
}

type DashboardSection = 'overview' | 'fitness' | 'compliance' | 'chat' | 'zones';

const DASHBOARD_TAB_VALUES: DashboardSection[] = ['overview', 'fitness', 'compliance', 'zones', 'chat'];

const TAB_TRIGGER_CLASS =
    'flex-1 shrink-0 text-[9px] font-bold uppercase tracking-widest py-2 px-2 text-center text-endurix-black/60 dark:text-muted-foreground transition-colors hover:text-endurix-black dark:hover:text-foreground data-[state=active]:bg-endurix-orange data-[state=active]:text-white data-[state=active]:shadow-sm';

const FEEDBACK_MODAL_SEEN_STORAGE_KEY = 'endurix.dashboard.athlete.feedbackModal.seenActivities';

function readSeenFeedbackActivityIds(): Set<string> {
    if (typeof window === 'undefined') {
        return new Set<string>();
    }

    try {
        const raw = window.localStorage.getItem(FEEDBACK_MODAL_SEEN_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []);
    } catch {
        return new Set<string>();
    }
}

function markFeedbackActivitySeen(activityId: string) {
    if (typeof window === 'undefined') {
        return;
    }

    const next = readSeenFeedbackActivityIds();
    next.add(activityId);
    window.localStorage.setItem(FEEDBACK_MODAL_SEEN_STORAGE_KEY, JSON.stringify(Array.from(next)));
}

interface AthleteDashboardProps {
    user: User;
    initialData?: {
        details: AthleteDetails | null;
        activities: Activity[];
        assignments: TrainingAssignment[];
        races: AthleteRace[];
    } | null;
}

export default function AthleteDashboard({ user, initialData = null }: AthleteDashboardProps) {
    const t = useTranslations();
    const userDisplayName = user.firstName || user.name?.split(' ')[0] || user.email.split('@')[0];
    const realtimeRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [loading, setLoading] = useState(!initialData);
    const [activities, setActivities] = useState<Activity[]>(initialData?.activities || []);
    const [assignments, setAssignments] = useState<TrainingAssignment[]>(initialData?.assignments || []);
    const [races, setRaces] = useState<AthleteRace[]>(initialData?.races || []);
    const [athleteDetails, setAthleteDetails] = useState<AthleteDetails | null>(initialData?.details || null);
    const [performanceData, setPerformanceData] = useState<PerformancePoint[]>([]);
    const [isAssignRaceModalOpen, setIsAssignRaceModalOpen] = useState(false);
    const [pendingFeedbackActivity, setPendingFeedbackActivity] = useState<Activity | null>(null);
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
    const [loadMetricsData, setLoadMetricsData] = useState<LoadMetricsResponse | null>(null);
    const [loadRange, setLoadRange] = useState<LoadMetricsRange>(30);
    const [loadMetricsLoading, setLoadMetricsLoading] = useState(true);
    const [isSwitchingLoadRange, setIsSwitchingLoadRange] = useState(false);
    const [weeklyLoadData, setWeeklyLoadData] = useState<WeeklyLoadResponse | null>(null);
    const [weeklyLoadLoading, setWeeklyLoadLoading] = useState(true);
    const [activeSection, setActiveSection] = useState<DashboardSection>('overview');

    const calculatePerformanceTrend = useCallback((assignmentsData: TrainingAssignment[], activitiesData: Activity[]) => {
        const trend = [];
        for (let i = 5; i >= 0; i--) {
            const week = subWeeks(new Date(), i);
            const wStart = startOfWeek(week, { weekStartsOn: 1 });
            const wEnd = endOfWeek(week, { weekStartsOn: 1 });
            
            const weekAssignments = assignmentsData.filter((assignment) => {
                const dateValue = assignment.scheduled_date || assignment.scheduledDate;
                const d = dateValue.split('T')[0];
                return d >= format(wStart, 'yyyy-MM-dd') && d <= format(wEnd, 'yyyy-MM-dd');
            });

            const completed = weekAssignments.filter((assignment) => {
                if (assignment.completed) return true;
                const dateValue = assignment.scheduled_date || assignment.scheduledDate;
                return activitiesData.some((activity) => 
                    format(new Date(activity.start_date), 'yyyy-MM-dd') === dateValue.split('T')[0] &&
                    normalizeActivityType(activity.type) === assignment.training.type
                );
            }).length;

            trend.push({
                week: format(wStart, 'dd/MM'),
                value: weekAssignments.length > 0 ? Math.round((completed / weekAssignments.length) * 100) : 0
            });
        }
        return trend;
    }, []);

    // Set initial trend if data exists
    useEffect(() => {
        if (initialData?.assignments && initialData?.activities) {
            setPerformanceData(calculatePerformanceTrend(initialData.assignments, initialData.activities));
        }
    }, [initialData, calculatePerformanceTrend]);

    const fetchData = useCallback(async () => {
        if (!user) return;
        try {
            setLoading(true);

            // Strava Sync Logic
            const hasSynced = sessionStorage.getItem('strava_synced_this_session');
            if (!hasSynced) {
                try {
                    await stravaService.sync();
                    sessionStorage.setItem('strava_synced_this_session', 'true');
                } catch (e) {
                    appLogger.error('Strava auto-sync failed', e);
                }
            }

            const [detailsRes, activitiesRes, calendarRes, racesRes] = await Promise.allSettled([
                api.get(`/v2/users/${user.id}/details`),
                api.get(`/v2/users/${user.id}/activities`),
                api.get('/v2/users/assignments'),
                racesService.findByUser(user.id)
            ]);

            const detailsData = detailsRes.status === 'fulfilled' ? (detailsRes.value.data as AthleteDetails) : null;
            const activitiesData = activitiesRes.status === 'fulfilled' ? (activitiesRes.value.data as Activity[]) : [];
            const assignmentsData = calendarRes.status === 'fulfilled' ? (calendarRes.value.data as TrainingAssignment[]) : [];
            const racesData = racesRes.status === 'fulfilled' ? (racesRes.value.data as AthleteRace[]) : [];

            if (detailsRes.status === 'rejected') appLogger.error('Failed to fetch athlete details:', detailsRes.reason);
            if (activitiesRes.status === 'rejected') appLogger.error('Failed to fetch activities:', activitiesRes.reason);
            if (calendarRes.status === 'rejected') appLogger.error('Failed to fetch calendar assignments:', calendarRes.reason);
            if (racesRes.status === 'rejected') appLogger.error('Failed to fetch races:', racesRes.reason);

            setAthleteDetails(detailsData);
            setActivities(activitiesData);
            setAssignments(assignmentsData);
            setRaces(racesData);

            setPerformanceData(calculatePerformanceTrend(assignmentsData, activitiesData));

        } catch (error) {
            appLogger.error('Failed to fetch dashboard data', error);
        } finally {
            setLoading(false);
        }
    }, [user, calculatePerformanceTrend]);

    useEffect(() => {
        if (!initialData) {
            void fetchData();
        }
    }, [fetchData, initialData]);

    useEffect(() => {
        if (!user?.id) return;

        const scheduleRefresh = () => {
            if (realtimeRefreshTimeoutRef.current) {
                clearTimeout(realtimeRefreshTimeoutRef.current);
            }

            // Plan assignments can insert several rows in quick succession; collapse
            // them into a single dashboard refresh.
            realtimeRefreshTimeoutRef.current = setTimeout(() => {
                realtimeRefreshTimeoutRef.current = null;
                void fetchData();
            }, 300);
        };

        const unsubscribe = subscribeToTableChanges(
            `athlete-dashboard-assignments-${user.id}`,
            { event: '*', schema: 'public', table: 'training_assignments', filter: `user_id=eq.${user.id}` },
            scheduleRefresh,
        );

        return () => {
            unsubscribe();
            if (realtimeRefreshTimeoutRef.current) {
                clearTimeout(realtimeRefreshTimeoutRef.current);
                realtimeRefreshTimeoutRef.current = null;
            }
        };
    }, [fetchData, user?.id]);

    const fetchLoadMetrics = useCallback(async () => {
        if (!user) return;
        try {
            setLoadMetricsLoading(true);
            const res = await athletesService.getLoadMetrics(user.id, loadRange);
            setLoadMetricsData(res.data);
        } catch (error) {
            appLogger.error('Failed to fetch load metrics:', error);
        } finally {
            setLoadMetricsLoading(false);
            setIsSwitchingLoadRange(false);
        }
    }, [user, loadRange]);

    useEffect(() => {
        void fetchLoadMetrics();
    }, [fetchLoadMetrics]);

    const backfillStatus = loadMetricsData?.meta.backfillStatus;
    useEffect(() => {
        if (backfillStatus !== 'queued' && backfillStatus !== 'running') return;

        // The Strava backfill runs in the background (see /api/cron/strava-backfill),
        // so poll until it finishes instead of leaving "Sincronizando..." stuck on
        // screen after the job actually completes.
        const interval = setInterval(() => {
            void fetchLoadMetrics();
        }, 10000);

        return () => clearInterval(interval);
    }, [backfillStatus, fetchLoadMetrics]);

    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        const load = async () => {
            try {
                setWeeklyLoadLoading(true);
                const res = await athletesService.getWeeklyLoad(user.id);
                if (!cancelled) setWeeklyLoadData(res.data);
            } catch (error) {
                appLogger.error('Failed to fetch weekly load:', error);
            } finally {
                if (!cancelled) setWeeklyLoadLoading(false);
            }
        };
        void load();
        return () => {
            cancelled = true;
        };
    }, [user]);

    useEffect(() => {
        if (!activities.length) {
            setPendingFeedbackActivity(null);
            setIsFeedbackModalOpen(false);
            return;
        }

        const latestActivity = [...activities].sort(
            (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
        )[0] || null;

        if (!latestActivity || latestActivity.hasFeedback) {
            setPendingFeedbackActivity(null);
            setIsFeedbackModalOpen(false);
            return;
        }

        const seenActivityIds = readSeenFeedbackActivityIds();
        const activityId = String(latestActivity.id);

        if (seenActivityIds.has(activityId)) {
            setPendingFeedbackActivity(null);
            setIsFeedbackModalOpen(false);
            return;
        }

        setPendingFeedbackActivity(latestActivity);
        setIsFeedbackModalOpen(true);
        markFeedbackActivitySeen(activityId);
    }, [activities]);

    const handleFeedbackModalOpenChange = (open: boolean) => {
        setIsFeedbackModalOpen(open);
    };

    const handleFeedbackSubmitted = () => {
        void fetchData();
    };

    const weeklyStats = useMemo(() => {
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
        const wEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const weekStartStr = format(weekStart, 'yyyy-MM-dd');
        const weekEndStr = format(wEnd, 'yyyy-MM-dd');

        const weekActs = activities.filter(act => {
            const d = format(new Date(act.start_date), 'yyyy-MM-dd');
            return d >= weekStartStr && d <= weekEndStr;
        });

        const weekAssignments = assignments.filter((assignment) => {
            const dateValue = assignment.scheduled_date || assignment.scheduledDate;
            if (!dateValue) return false;
            const d = dateValue.split('T')[0];
            return d >= weekStartStr && d <= weekEndStr;
        });

        const completedAssignments = weekAssignments.filter((assignment) => {
            if (assignment.completed) return true;

            const dateValue = assignment.scheduled_date || assignment.scheduledDate;
            if (!dateValue) return false;
            const assignmentDate = dateValue.split('T')[0];

            return weekActs.some((activity) => {
                const activityDate = format(new Date(activity.start_date), 'yyyy-MM-dd');
                return activityDate === assignmentDate && normalizeActivityType(activity.type) === assignment.training.type;
            });
        }).length;

        const distance = weekActs.reduce((acc, act) => acc + (act.distance / 1000), 0);
        const duration = weekActs.reduce((acc, act) => acc + act.duration, 0);
        const elevation = weekActs.reduce((acc, act) => acc + (act.elevation_gain || 0), 0);
        const compliance = weekAssignments.length > 0
            ? Math.round((completedAssignments / weekAssignments.length) * 100)
            : 0;

        const hrs = Math.floor(duration / 3600);
        const mins = Math.floor((duration % 3600) / 60);

        return {
            distance: distance.toFixed(1),
            time: `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`,
            elevation: `${Math.round(elevation)} m`,
            compliance: `${compliance}%`
        };
    }, [activities, assignments]);

    const loadMetrics = useMemo(() => {
        const riskKey = loadMetricsData?.current.risk || 'insufficientData';
        const riskClassName =
            riskKey === 'high'
                ? 'bg-destructive/10 text-destructive'
                : riskKey === 'moderate'
                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                    : riskKey === 'lowStimulus'
                        ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300'
                        : riskKey === 'balanced'
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                            : 'bg-muted text-muted-foreground';

        return {
            ctl: loadMetricsData?.current.ctl ?? 0,
            atl: loadMetricsData?.current.atl ?? 0,
            tsb: loadMetricsData?.current.tsb ?? 0,
            acwr: loadMetricsData?.current.acwr ?? 0,
            riskKey,
            riskClassName,
            partial: loadMetricsData?.meta.partial ?? false,
            backfillStatus: loadMetricsData?.meta.backfillStatus ?? 'idle',
            historyDaysAvailable: loadMetricsData?.meta.historyDaysAvailable ?? 0,
        };
    }, [loadMetricsData]);

    const loadTrendData = useMemo(
        () => (loadMetricsData?.series || []).map((point) => ({
            ...point,
            date: format(parseISO(point.date), 'd MMM', { locale: es }),
        })),
        [loadMetricsData]
    );

    const weeklyLoadChartData = useMemo(
        () => (weeklyLoadData?.series || []).map((point) => ({
            weekLabel: format(parseISO(point.weekStart), 'd MMM', { locale: es }),
            km: point.km,
            minutes: point.minutes,
            tss: point.tss,
        })),
        [weeklyLoadData]
    );

    const showWeeklyLoadSkeleton = weeklyLoadLoading && !weeklyLoadData;

    const handleLoadRangeChange = (nextRange: LoadMetricsRange) => {
        if (nextRange === loadRange) return;
        setIsSwitchingLoadRange(true);
        setLoadRange(nextRange);
    };

    const showLoadSkeleton = loadMetricsLoading && !loadMetricsData;

    const formatTsb = (tsb: number) => (tsb > 0 ? `+${tsb.toFixed(1)}` : tsb.toFixed(1));

    if (loading) {
        return (
            <div className="min-h-screen bg-endurix-paper dark:bg-background">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <Skeleton className="h-40 w-full" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-endurix-paper dark:bg-background">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                    <div className="flex items-center gap-6">
                        <div className="relative">
                            <div className="h-20 w-20 bg-endurix-black/8 dark:bg-white/8 overflow-hidden flex items-center justify-center text-2xl font-bold text-endurix-black dark:text-foreground" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>
                                {user.firstName?.charAt(0) || user.name?.charAt(0)}
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-endurix-orange p-1.5 text-white">
                                <Zap className="h-3 w-3" />
                            </div>
                        </div>
                        <div>
                            <MonospaceLabel color="muted" size="sm" className="block mb-1">
                                {format(new Date(), 'EEEE, d MMMM', { locale: es })}
                            </MonospaceLabel>
                            <h1
                                className="text-3xl lg:text-4xl font-bold text-endurix-black dark:text-foreground leading-[1.05] tracking-tight uppercase"
                                style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                            >
                                {t('dashboard.messages.hi', { name: userDisplayName })}
                            </h1>
                        </div>
                    </div>

                    <div className="space-y-4 w-full xl:w-auto">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard label={t('athletes.detail.weeklyVolume')} value={weeklyStats.distance} />
                            <StatCard label={t('athletes.detail.weeklyTime')} value={weeklyStats.time} />
                            <StatCard label={t('activities.detail.metrics.elevationGain')} value={weeklyStats.elevation} />
                            <StatCard label={t('athletes.detail.complianceRate')} value={weeklyStats.compliance} />
                        </div>
                    </div>
                </div>

                <div className="bg-endurix-paper dark:bg-card border border-endurix-black/10 dark:border-border p-3">
                    <Tabs value={activeSection} onValueChange={(value) => setActiveSection(value as DashboardSection)}>
                        <TabsList className="flex h-auto w-full flex-nowrap gap-1 overflow-x-auto bg-endurix-black/8 p-1 dark:bg-white/8">
                            {DASHBOARD_TAB_VALUES.map((tab) => (
                                <TabsTrigger key={tab} value={tab} className={TAB_TRIGGER_CLASS}>
                                    {t(`dashboard.athlete.tabs.${tab}`)}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        <TabsContent value="overview" className="mt-6 space-y-8">
                            <div className="w-full">
                                <AthleteWeeklyCalendar
                                    athleteId={user.id}
                                    assignments={assignments}
                                    activities={activities}
                                    races={races}
                                />
                            </div>

                            <DashboardCard
                                headerLabel={t('dashboard.careerProgress.title')}
                                headerAccessory={<DashboardCardHeaderDots />}
                            >
                                <CareerProgressSummary athleteId={user.id} />
                            </DashboardCard>

                            <NextRaces athleteRaces={races} />
                        </TabsContent>

                        <TabsContent value="fitness" className="mt-6 space-y-8">
                            <TooltipProvider delayDuration={150}>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    {showLoadSkeleton ? (
                                        Array.from({ length: 4 }).map((_, idx) => (
                                            <StatCardSkeleton
                                                key={`fitness-skeleton-${idx}`}
                                                className="min-h-[112px]"
                                            />
                                        ))
                                    ) : (
                                        <>
                                            <StatCard
                                                label="CTL"
                                                value={loadMetrics.ctl.toFixed(1)}
                                                tooltip={t('athletes.detail.metricTooltip.ctl')}
                                            />
                                            <StatCard
                                                label="ATL"
                                                value={loadMetrics.atl.toFixed(1)}
                                                tooltip={t('athletes.detail.metricTooltip.atl')}
                                            />
                                            <StatCard
                                                label="TSB"
                                                value={formatTsb(loadMetrics.tsb)}
                                                chipColor={
                                                    loadMetrics.tsb > 5
                                                        ? 'green'
                                                        : loadMetrics.tsb < -5
                                                            ? 'red'
                                                            : 'orange'
                                                }
                                                tooltip={t('athletes.detail.metricTooltip.tsb')}
                                            />
                                            <StatCard
                                                label="ACWR"
                                                value={loadMetrics.acwr.toFixed(2)}
                                                chip={t(`dashboard.fitness.loadRisk.${loadMetrics.riskKey}`)}
                                                chipColor={
                                                    loadMetrics.riskKey === 'high'
                                                        ? 'red'
                                                        : loadMetrics.riskKey === 'moderate'
                                                            ? 'orange'
                                                            : loadMetrics.riskKey === 'balanced'
                                                                ? 'green'
                                                                : 'neutral'
                                                }
                                                tooltip={t('athletes.detail.metricTooltip.acwr')}
                                            />
                                        </>
                                    )}
                                </div>
                            </TooltipProvider>

                            <DashboardCard
                                headerLabel={t('dashboard.fitness.fitnessCard')}
                                headerAccessory={<DashboardCardHeaderDots />}
                                bodyClassName="p-0"
                            >
                                <div className="px-6 pt-4 flex flex-wrap items-end justify-between gap-3">
                                    <div>
                                        <MonospaceLabel color="muted" size="sm" className="block mb-1">
                                            {t('dashboard.fitness.loadChartSubtitle')}
                                        </MonospaceLabel>
                                        <h3
                                            className="text-xl lg:text-2xl font-bold text-endurix-black dark:text-foreground uppercase tracking-tight"
                                            style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                                        >
                                            {t('dashboard.fitness.loadChartTitle')}
                                        </h3>
                                    </div>
                                    <span
                                        className={`text-[10px] font-bold tracking-widest uppercase border px-2 py-0.5 ${loadMetrics.riskClassName}`}
                                        style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                                    >
                                        {t(`dashboard.fitness.loadRisk.${loadMetrics.riskKey}`)}
                                    </span>
                                </div>
                                <div className="px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
                                    <div className="flex items-center gap-2">
                                        {([7, 30, 90] as const).map((range) => (
                                            <Button
                                                key={range}
                                                type="button"
                                                variant={loadRange === range ? 'orange' : 'outline-brand'}
                                                size="xs"
                                                className="uppercase tracking-widest"
                                                onClick={() => handleLoadRangeChange(range)}
                                                disabled={isSwitchingLoadRange}
                                            >
                                                {range}D
                                            </Button>
                                        ))}
                                    </div>
                                    <span
                                        className="text-[10px] text-muted-foreground tracking-widest uppercase"
                                        style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                                    >
                                        {showLoadSkeleton
                                            ? t('dashboard.fitness.loadStatus.loading')
                                            : loadMetrics.backfillStatus === 'queued' || loadMetrics.backfillStatus === 'running'
                                                ? t('dashboard.fitness.loadStatus.syncing')
                                                : loadMetrics.partial
                                                    ? t('dashboard.fitness.loadStatus.partial', { days: loadMetrics.historyDaysAvailable })
                                                    : t('dashboard.fitness.loadStatus.ready')}
                                    </span>
                                </div>
                                <div className="px-2 pb-4">
                                    {showLoadSkeleton ? (
                                        <Skeleton className="h-72 w-full" />
                                    ) : (
                                        <LoadMetricsTrendChart data={loadTrendData} />
                                    )}
                                </div>
                            </DashboardCard>

                            <DashboardCard
                                headerLabel={t('dashboard.fitness.weeklyLoadChartTitle')}
                                headerAccessory={<DashboardCardHeaderDots />}
                                bodyClassName="p-0"
                            >
                                <div className="px-6 pt-4">
                                    <MonospaceLabel color="muted" size="sm" className="block mb-1">
                                        {t('dashboard.fitness.weeklyLoadChartSubtitle')}
                                    </MonospaceLabel>
                                </div>
                                <div className="px-2 pb-4">
                                    {showWeeklyLoadSkeleton ? (
                                        <Skeleton className="h-72 w-full" />
                                    ) : (
                                        <WeeklyLoadChart data={weeklyLoadChartData} />
                                    )}
                                </div>
                                <p className="px-6 pb-4 text-[11px] text-endurix-black/50 dark:text-muted-foreground">
                                    {t('dashboard.fitness.weeklyLoadHrTssNote')}
                                </p>
                            </DashboardCard>
                        </TabsContent>

                        <TabsContent value="compliance" className="mt-6 space-y-8">
                            <DashboardCard
                              headerLabel={t('dashboard.performanceTrend.title')}
                              headerAccessory={<DashboardCardHeaderDots />}
                              bodyClassName="p-0"
                            >
                                <div className="p-6">
                                    <PerformanceTrendChart data={performanceData} />
                                </div>
                            </DashboardCard>
                        </TabsContent>

                        <TabsContent value="zones" className="mt-6 space-y-8">
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                <DashboardCard
                                    headerLabel={t('dashboard.fitness.hrZonesTitle')}
                                    headerAccessory={<DashboardCardHeaderDots />}
                                    bodyClassName="p-6"
                                >
                                    {athleteDetails?.athleteProfile?.hrZones ? (
                                        <HeartRateZones zones={athleteDetails.athleteProfile.hrZones} />
                                    ) : (
                                        <p className="text-sm text-endurix-black/50 dark:text-muted-foreground">
                                            {t('activities.detail.zones.noHrData')}
                                        </p>
                                    )}
                                </DashboardCard>

                                <DashboardCard
                                    headerLabel={t('dashboard.fitness.paceZonesTitle')}
                                    headerAccessory={<DashboardCardHeaderDots />}
                                    bodyClassName="p-6"
                                >
                                    <PaceZones vam={athleteDetails?.athleteProfile?.vam} />
                                </DashboardCard>
                            </div>
                        </TabsContent>

                        <TabsContent value="chat" className="mt-6 h-[calc(100vh-18rem)] min-h-[34rem]">
                            <CoachAthleteChat athleteId={user.id} className="h-full" />
                        </TabsContent>
                    </Tabs>
                </div>

                <AssignRaceModal
                    open={isAssignRaceModalOpen}
                    onOpenChange={setIsAssignRaceModalOpen}
                    athleteId={user.id}
                    onSuccess={fetchData}
                />

                <NewActivityFeedbackModal
                    open={isFeedbackModalOpen}
                    activity={pendingFeedbackActivity}
                    onOpenChange={handleFeedbackModalOpenChange}
                    onSubmitted={handleFeedbackSubmitted}
                />
            </div>
        </div>
    );
}
