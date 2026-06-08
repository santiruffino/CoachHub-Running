'use client';
import { appLogger } from '@/lib/app-logger';


import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, startOfWeek, endOfWeek, subWeeks, addWeeks, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '@/lib/axios';
import { useTranslations } from 'next-intl';
import { Zap, ChevronLeft, ChevronRight, Plus } from 'lucide-react';

import { AthleteWeeklyCalendar } from '@/components/dashboard/AthleteWeeklyCalendar';
import { StatCard, DashboardCard, DashboardCardHeaderDots, MonospaceLabel } from '@/components/dashboard';
import { PerformanceTrendChart } from '@/components/dashboard/PerformanceTrendChart';
import { LoadMetricsTrendChart } from '@/components/dashboard/LoadMetricsTrendChart';
import { CoachNotes } from '@/components/dashboard/CoachNotes';
import { HeartRateZones } from '@/features/profiles/components/HeartRateZones';
import { PaceZones } from '@/features/profiles/components/PaceZones';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

import { stravaService } from '@/features/strava/services/strava.service';
import { racesService } from '@/features/races/services/races.service';
import { AssignRaceModal } from '@/features/races/components/AssignRaceModal';
import { athletesService, LoadMetricsRange, LoadMetricsResponse } from '@/features/users/services/athletes.service';
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
        coachNotes?: string;
        hrZones?: HeartRateZonesType;
        vam?: string;
    } | null;
}

interface PerformancePoint {
    week: string;
    value: number;
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
    const [loading, setLoading] = useState(!initialData);
    const [activities, setActivities] = useState<Activity[]>(initialData?.activities || []);
    const [assignments, setAssignments] = useState<TrainingAssignment[]>(initialData?.assignments || []);
    const [races, setRaces] = useState<AthleteRace[]>(initialData?.races || []);
    const [athleteDetails, setAthleteDetails] = useState<AthleteDetails | null>(initialData?.details || null);
    const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [performanceData, setPerformanceData] = useState<PerformancePoint[]>([]);
    const [isAssignRaceModalOpen, setIsAssignRaceModalOpen] = useState(false);
    const [pendingFeedbackActivity, setPendingFeedbackActivity] = useState<Activity | null>(null);
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
    const [loadMetricsData, setLoadMetricsData] = useState<LoadMetricsResponse | null>(null);
    const [loadRange, setLoadRange] = useState<LoadMetricsRange>(30);
    const [loadMetricsLoading, setLoadMetricsLoading] = useState(true);
    const [isSwitchingLoadRange, setIsSwitchingLoadRange] = useState(false);

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
        if (!user) return;
        let cancelled = false;
        const load = async () => {
            try {
                setLoadMetricsLoading(true);
                const res = await athletesService.getLoadMetrics(user.id, loadRange);
                if (!cancelled) setLoadMetricsData(res.data);
            } catch (error) {
                appLogger.error('Failed to fetch load metrics:', error);
            } finally {
                if (!cancelled) {
                    setLoadMetricsLoading(false);
                    setIsSwitchingLoadRange(false);
                }
            }
        };
        void load();
        return () => {
            cancelled = true;
        };
    }, [user, loadRange]);

    useEffect(() => {
        if (!activities.length) {
            setPendingFeedbackActivity(null);
            setIsFeedbackModalOpen(false);
            return;
        }

        const nextPendingActivity = activities.find((activity) => !activity.hasFeedback) || null;

        if (!nextPendingActivity) {
            setPendingFeedbackActivity(null);
            setIsFeedbackModalOpen(false);
            return;
        }

        const dismissedKey = `feedback_modal_dismissed_${nextPendingActivity.id}`;
        const wasDismissed = sessionStorage.getItem(dismissedKey) === 'true';

        setPendingFeedbackActivity(nextPendingActivity);
        setIsFeedbackModalOpen(!wasDismissed);
    }, [activities]);

    const handleFeedbackModalOpenChange = (open: boolean) => {
        setIsFeedbackModalOpen(open);

        if (!open && pendingFeedbackActivity) {
            sessionStorage.setItem(`feedback_modal_dismissed_${pendingFeedbackActivity.id}`, 'true');
        }
    };

    const handleFeedbackSubmitted = () => {
        if (pendingFeedbackActivity) {
            sessionStorage.removeItem(`feedback_modal_dismissed_${pendingFeedbackActivity.id}`);
        }
        void fetchData();
    };

    const weeklyStats = useMemo(() => {
        const wEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
        const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd');
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
    }, [activities, assignments, currentWeekStart]);

    const loadMetrics = useMemo(() => {
        const riskKey = loadMetricsData?.current.risk || 'insufficientData';
        const riskClassName =
            riskKey === 'high'
                ? 'bg-red-500/10 text-red-600 dark:text-red-300'
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
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {showLoadSkeleton ? (
                                Array.from({ length: 4 }).map((_, idx) => (
                                    <Skeleton
                                        key={`fitness-skeleton-${idx}`}
                                        className="h-[112px] border border-endurix-black/20 dark:border-white/20 bg-white dark:bg-white/5"
                                    />
                                ))
                            ) : (
                                <>
                                    <StatCard
                                        label={t('dashboard.fitness.fitnessCard')}
                                        value={loadMetrics.ctl.toFixed(1)}
                                    />
                                    <StatCard
                                        label={t('dashboard.fitness.fatigueCard')}
                                        value={loadMetrics.atl.toFixed(1)}
                                    />
                                    <StatCard
                                        label={t('dashboard.fitness.formCard')}
                                        value={formatTsb(loadMetrics.tsb)}
                                        chipColor={
                                            loadMetrics.tsb > 5
                                                ? 'green'
                                                : loadMetrics.tsb < -5
                                                    ? 'red'
                                                    : 'orange'
                                        }
                                    />
                                    <StatCard
                                        label={t('dashboard.fitness.riskCard')}
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
                                    />
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-1 border border-endurix-black/15 dark:border-border bg-endurix-paper dark:bg-muted p-1">
                        <Button variant="ghost" size="icon" onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, -1))} className="h-8 w-8">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="px-4 text-xs font-bold tracking-widest uppercase text-endurix-black dark:text-foreground w-40 text-center" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>
                            {format(currentWeekStart, 'MMMM yyyy', { locale: es })}
                        </span>
                        <Button variant="ghost" size="icon" onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))} className="h-8 w-8">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline-brand" size="xs" onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))} className="uppercase tracking-widest">
                            {t('common.today')}
                        </Button>
                        <Button variant="orange" size="xs" onClick={() => setIsAssignRaceModalOpen(true)} className="gap-2 uppercase tracking-widest">
                            <Plus className="h-4 w-4" />
                            {t('races.athlete.addRace')}
                        </Button>
                    </div>
                </div>

                <div className="w-full">
                    <AthleteWeeklyCalendar
                        weekStart={currentWeekStart}
                        assignments={assignments}
                        activities={activities}
                        races={races}
                    />
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    <div className="lg:col-span-7">
                        <DashboardCard
                            headerLabel="Coach Notes"
                            headerAccessory={<DashboardCardHeaderDots />}
                            className="h-full"
                        >
                            <CoachNotes
                                athleteId={user.id}
                                initialNotes={athleteDetails?.athleteProfile?.coachNotes}
                                readOnly
                            />
                        </DashboardCard>
                    </div>

                    <div className="lg:col-span-5">
                        <NextRaces athleteRaces={races} />
                    </div>
                </div>

                <DashboardCard
                    headerLabel="Fitness"
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
                    headerLabel="Performance"
                    headerAccessory={<DashboardCardHeaderDots />}
                    bodyClassName="p-0"
                >
                    <div className="px-6 pt-4">
                        <h3
                            className="text-xl lg:text-2xl font-bold text-endurix-black dark:text-foreground uppercase tracking-tight"
                            style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                        >
                            {t('athletes.detail.performanceAndZones')}
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:divide-x divide-endurix-black/8 dark:divide-border mt-4">
                        <div className="p-6">
                            <PerformanceTrendChart data={performanceData} />
                        </div>
                        <div className="p-6 space-y-8 divide-y divide-endurix-black/8 dark:divide-border">
                            <div>
                                <h4
                                    className="mb-6 text-lg font-bold uppercase tracking-tight text-endurix-black dark:text-foreground"
                                    style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                                >
                                    {t('dashboard.fitness.hrZonesTitle')}
                                </h4>
                                {athleteDetails?.athleteProfile?.hrZones ? (
                                    <HeartRateZones zones={athleteDetails.athleteProfile.hrZones} />
                                ) : (
                                    <p className="text-sm text-endurix-black/50 dark:text-muted-foreground">
                                        {t('activities.detail.zones.noHrData')}
                                    </p>
                                )}
                            </div>
                            <div className="pt-6">
                                <h4
                                    className="mb-6 text-lg font-bold uppercase tracking-tight text-endurix-black dark:text-foreground"
                                    style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                                >
                                    {t('dashboard.fitness.paceZonesTitle')}
                                </h4>
                                <PaceZones vam={athleteDetails?.athleteProfile?.vam} />
                            </div>
                        </div>
                    </div>
                </DashboardCard>

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
