'use client';
import { appLogger } from '@/lib/app-logger';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { format, startOfWeek, endOfWeek, subWeeks, startOfDay, differenceInDays, parseISO, addWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import { TrainingAssignment } from '@/interfaces/training';
import { Activity } from '@/interfaces/activity';
import { AthleteDetails } from '@/interfaces/athlete';
import { AthleteRace } from '@/interfaces/race';
import { Plus, Zap, ChevronLeft, ChevronRight, MessageSquare, Trophy, Info } from 'lucide-react';
import { BackButton } from '@/components/ui/BackButton';
import { trainingsService } from '@/features/trainings/services/trainings.service';
import { athletesService, LoadMetricsRange, LoadMetricsResponse } from '@/features/users/services/athletes.service';
import { racesService } from '@/features/races/services/races.service';
import { AssignRaceModal } from '@/features/races/components/AssignRaceModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PerformanceTrendChart } from '@/components/dashboard/PerformanceTrendChart';
import { LoadMetricsTrendChart } from '@/components/dashboard/LoadMetricsTrendChart';
import { HeartRateZones } from '@/features/profiles/components/HeartRateZones';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VAM_LEVELS } from '@/features/profiles/constants/vam';
import { AlertDialog, useAlertDialog } from '@/components/ui/AlertDialog';
import { useTranslations } from 'next-intl';
import { AthleteWeeklyCalendar } from '@/components/dashboard/AthleteWeeklyCalendar';
import { CoachNotes } from '@/components/dashboard/CoachNotes';
import { StatCard, SectionHeader, MonospaceLabel } from '@/components/dashboard';
import { normalizeActivityType } from '@/utils/activity-utils';
import { useRouter } from 'next/navigation';

const FONT_MONO = { fontFamily: 'var(--font-ibm-plex-mono, monospace)' } as const;

type AthleteSection = 'training' | 'overview' | 'health' | 'racesNotes' | 'trend';

const ATHLETE_TABS: Array<{ value: AthleteSection; labelKey: 'trainingTab' | 'overviewTab' | 'healthTab' | 'racesNotesTab' | 'trendTab' }> = [
    { value: 'training', labelKey: 'trainingTab' },
    { value: 'overview', labelKey: 'overviewTab' },
    { value: 'health', labelKey: 'healthTab' },
    { value: 'trend', labelKey: 'trendTab' },
    { value: 'racesNotes', labelKey: 'racesNotesTab' },
];

const TAB_TRIGGER_CLASS = 'text-[10px] font-bold uppercase tracking-widest py-2 text-endurix-black/60 dark:text-muted-foreground transition-colors hover:text-endurix-black dark:hover:text-foreground data-[state=active]:bg-endurix-orange data-[state=active]:text-white data-[state=active]:shadow-sm';

interface AthleteDetailsViewProps {
    id: string;
    initialAthlete: AthleteDetails;
    initialActivities: Activity[];
    initialAssignments: TrainingAssignment[];
    initialRaces: AthleteRace[];
}

export function AthleteDetailsView({
    id,
    initialAthlete,
    initialActivities,
    initialAssignments,
    initialRaces
}: AthleteDetailsViewProps) {
    const t = useTranslations();
    const tAthlete = useTranslations('athletes.detail');
    const tRaces = useTranslations('races.athlete');
    const tUnits = useTranslations('common.units');
    const router = useRouter();

    const [athlete, setAthlete] = useState<AthleteDetails>(initialAthlete);
    const [activities] = useState<Activity[]>(initialActivities);
    const [assignments, setAssignments] = useState<TrainingAssignment[]>(initialAssignments);
    const [assignedRaces, setAssignedRaces] = useState<AthleteRace[]>(initialRaces);
    const [isAssignRaceModalOpen, setIsAssignRaceModalOpen] = useState(false);
    const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [pendingDeleteAssignment, setPendingDeleteAssignment] = useState<string | null>(null);
    const [loadRange, setLoadRange] = useState<LoadMetricsRange>(30);
    const [isSwitchingLoadRange, setIsSwitchingLoadRange] = useState(false);
    const [activeSection, setActiveSection] = useState<AthleteSection>('training');
    const [loadMetricsData, setLoadMetricsData] = useState<LoadMetricsResponse | null>(null);
    const [loadMetricsLoading, setLoadMetricsLoading] = useState(true);
    const { alertState, showAlert, closeAlert } = useAlertDialog();

    useEffect(() => {
        let cancelled = false;
        let pollTimer: ReturnType<typeof setTimeout> | null = null;

        const load = async () => {
            try {
                setLoadMetricsLoading(true);
                const res = await athletesService.getLoadMetrics(id, loadRange);
                if (cancelled) return;
                setLoadMetricsData(res.data);

                const status = res.data.meta.backfillStatus;
                if (status === 'queued' || status === 'running') {
                    pollTimer = setTimeout(() => {
                        void load();
                    }, 20000);
                }
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
            if (pollTimer) clearTimeout(pollTimer);
        };
    }, [id, loadRange]);

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
            ctl: loadMetricsData?.current.ctl || 0,
            atl: loadMetricsData?.current.atl || 0,
            tsb: loadMetricsData?.current.tsb || 0,
            acwr: loadMetricsData?.current.acwr || 0,
            todayLoad: loadMetricsData?.current.todayLoad || 0,
            sevenDayAvg: loadMetricsData?.current.avg7d || 0,
            riskKey,
            riskClassName,
            partial: loadMetricsData?.meta.partial || false,
            backfillStatus: loadMetricsData?.meta.backfillStatus || 'idle',
            historyDaysAvailable: loadMetricsData?.meta.historyDaysAvailable || 0,
        };
    }, [loadMetricsData]);

    const loadTrendData = useMemo(
        () => (loadMetricsData?.series || []).map((point) => ({
            ...point,
            date: format(parseISO(point.date), 'd MMM', { locale: es }),
        })),
        [loadMetricsData]
    );

    const isInitialLoadMetricsLoading = loadMetricsLoading && !loadMetricsData;
    const showLoadSkeleton = isInitialLoadMetricsLoading || isSwitchingLoadRange;

    const handleLoadRangeChange = (nextRange: LoadMetricsRange) => {
        if (nextRange === loadRange) return;
        setIsSwitchingLoadRange(true);
        setLoadRange(nextRange);
    };

    const fetchRaces = async () => {
        try {
            const res = await racesService.findByUser(id);
            setAssignedRaces(res.data);
        } catch (error) {
            appLogger.error('Failed to fetch races:', error);
        }
    };

    const performanceData = useMemo(() => {
        const performanceWeeks = [];
        const now = new Date();

        const isAssignmentCompleted = (assignment: TrainingAssignment, activitiesList: Activity[]): boolean => {
            if (assignment.completed) return true;
            const dateValue = assignment.scheduled_date || assignment.scheduledDate;
            const assignmentDateStr = dateValue.split('T')[0];
            const assignmentType = assignment.training.type;

            return activitiesList.some(activity => {
                const activityDateStr = format(new Date(activity.start_date), 'yyyy-MM-dd');
                const activityType = normalizeActivityType(activity.type);
                return activityDateStr === assignmentDateStr && activityType === assignmentType;
            });
        };

        for (let i = 5; i >= 0; i--) {
            const week = subWeeks(now, i);
            const weekStart = startOfWeek(week, { weekStartsOn: 1 });
            const weekEnd = endOfWeek(week, { weekStartsOn: 1 });

            const weekStartStr = format(weekStart, 'yyyy-MM-dd');
            const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

            const weekAssignments = assignments.filter((a: TrainingAssignment) => {
                const dateValue = a.scheduled_date || a.scheduledDate;
                const assignmentDateStr = dateValue.split('T')[0];
                return assignmentDateStr >= weekStartStr && assignmentDateStr <= weekEndStr;
            });

            const weekCompleted = weekAssignments.filter((a: TrainingAssignment) =>
                isAssignmentCompleted(a, activities)
            ).length;
            
            const rate = weekAssignments.length > 0 ? Math.round((weekCompleted / weekAssignments.length) * 100) : 0;

            performanceWeeks.push({
                week: `Sem ${6 - i}`,
                value: rate,
            });
        }
        return performanceWeeks;
    }, [assignments, activities]);

    const handleSaveNotes = async (notes: string) => {
        try {
            await athletesService.updateProfile(id, { coachNotes: notes });
            setAthlete(prev => ({
                ...prev,
                athleteProfile: {
                    ...prev.athleteProfile,
                    coachNotes: notes
                }
            }));
        } catch (error) {
            appLogger.error('Failed to save notes:', error);
            showAlert('error', t('profile.errorUpdate'));
        }
    };

    const doDeleteAssignment = async () => {
        if (!pendingDeleteAssignment) return;
        try {
            await trainingsService.deleteAssignment(pendingDeleteAssignment);
            setAssignments(prev => prev.filter(a => a.id !== pendingDeleteAssignment));
        } catch (error) {
            appLogger.error('Failed to delete assignment:', error);
            showAlert('error', tAthlete('deleteAssignmentError'));
        } finally {
            setPendingDeleteAssignment(null);
        }
    };

    const handleUpdateVAM = async (pace: string) => {
        try {
            await athletesService.updateProfile(id, { vam: pace });
            setAthlete(prev => ({
                ...prev,
                athleteProfile: {
                    ...prev.athleteProfile,
                    vam: pace
                }
            }));
        } catch (error) {
            appLogger.error('Failed to update VAM:', error);
            showAlert('error', tAthlete('updateVAMError'));
        }
    };

    const totalTrainings = assignments.length;
    const completedTrainingsCount = assignments.filter(assignment => {
        if (assignment.completed) return true;
        const dateValue = assignment.scheduled_date || assignment.scheduledDate;
        const assignmentDateStr = dateValue.split('T')[0];
        const assignmentType = assignment.training.type;

        return activities.some(activity => {
            const activityDateStr = format(new Date(activity.start_date), 'yyyy-MM-dd');
            const activityType = normalizeActivityType(activity.type);
            return activityDateStr === assignmentDateStr && activityType === assignmentType;
        });
    }).length;

    const completionRate = totalTrainings > 0 ? Math.round((completedTrainingsCount / totalTrainings) * 100) : 0;

    const stats = useMemo(() => {
        let distance = 0;
        const start = format(currentWeekStart, 'yyyy-MM-dd');
        const end = format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        const weekly = activities.filter(act => {
            const dStr = format(new Date(act.start_date), 'yyyy-MM-dd');
            return dStr >= start && dStr <= end;
        });
        weekly.forEach(act => distance += (act.distance / 1000));
        
        let duration = 0; 
        weekly.forEach(act => duration += act.duration);
        const h = Math.floor(duration / 3600);
        const m = Math.floor((duration % 3600) / 60);

        return { distance, h, m };
    }, [activities, currentWeekStart]);

    const upcomingRaces = assignedRaces
        .filter(r => new Date(r.date) >= startOfDay(new Date()))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const nextRace = upcomingRaces[0] || null;
    const nextRaceDays = nextRace ? Math.max(0, differenceInDays(parseISO(nextRace.date), startOfDay(new Date()))) : null;

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center gap-2">
                <BackButton />
            </div>

            <div className="bg-endurix-paper dark:bg-card border border-endurix-black/10 dark:border-border p-5 md:p-6">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-5">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="h-20 w-20 bg-endurix-black/8 dark:bg-white/10 overflow-hidden flex items-center justify-center text-3xl font-medium text-endurix-black dark:text-foreground"
                                style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>
                                {athlete.name?.charAt(0) || athlete.email.charAt(0)}
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-endurix-orange p-1.5 text-white">
                                <Zap className="h-4 w-4" />
                            </div>
                        </div>
                        <div>
                            <h1
                                className="text-3xl font-medium text-endurix-black dark:text-foreground tracking-tight uppercase"
                                style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                            >
                                {athlete.name || athlete.email}
                            </h1>
                            <p className="text-sm text-muted-foreground">{athlete.email}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full xl:w-auto">
                        <StatCard
                            label={t("athletes.detail.complianceRate")}
                            value={`${completionRate}%`}
                        />
                        <StatCard
                            label={tAthlete('loadMonitoringTitle')}
                            value={loadMetrics.tsb > 0 ? `+${Math.round(loadMetrics.tsb)}` : Math.round(loadMetrics.tsb)}
                            chip={tAthlete(`loadRisk.${loadMetrics.riskKey}`)}
                            chipColor={
                                loadMetrics.riskKey === 'high'
                                    ? 'red'
                                    : loadMetrics.riskKey === 'moderate'
                                        ? 'orange'
                                        : loadMetrics.riskKey === 'lowStimulus'
                                            ? 'neutral'
                                            : loadMetrics.riskKey === 'balanced'
                                                ? 'green'
                                                : 'neutral'
                            }
                        />
                        <StatCard
                            label={t("athletes.detail.weeklyVolume")}
                            value={
                                <>
                                    {stats.distance.toFixed(1)} <span className="text-xs text-muted-foreground font-sans">{tUnits('km')}</span>
                                </>
                            }
                        />
                        <StatCard
                            label={tAthlete('nextRace')}
                            value={
                                <>
                                    {nextRaceDays ?? '-'} <span className="text-xs text-muted-foreground font-sans">{tAthlete('daysShort')}</span>
                                </>
                            }
                        />
                    </div>
                </div>
            </div>

            <div className="bg-endurix-paper dark:bg-card border border-endurix-black/10 dark:border-border p-3">
                <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <Link href={'/workouts/assign?athleteId=' + id}>
                            <Button variant="orange" size="sm" className="gap-2 uppercase tracking-widest text-[10px]">
                                <Plus className="h-4 w-4" />
                                {t("trainings.assign.assignWorkout")}
                            </Button>
                        </Link>
                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline-brand" size="sm" className="gap-2 uppercase tracking-widest text-[10px]" onClick={() => setIsAssignRaceModalOpen(true)}>
                                <Trophy className="h-4 w-4" />
                                {t("races.athlete.addRace")}
                            </Button>
                            <Button variant="outline-brand" size="sm" className="gap-2 uppercase tracking-widest text-[10px]" onClick={() => setActiveSection('racesNotes')}>
                                <MessageSquare className="h-4 w-4" />
                                {t("athletes.detail.coachComments")}
                            </Button>
                        </div>
                    </div>

                    <Tabs value={activeSection} onValueChange={(value) => setActiveSection(value as AthleteSection)}>
                        <TabsList className="w-full h-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1 bg-endurix-black/8 dark:bg-white/8 p-1 border border-endurix-black/10 dark:border-border">
                            {ATHLETE_TABS.map((tab) => (
                                <TabsTrigger
                                    key={tab.value}
                                    value={tab.value}
                                    className={TAB_TRIGGER_CLASS}
                                    style={FONT_MONO}
                                >
                                    {tAthlete(tab.labelKey)}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                </div>
            </div>

            {activeSection === 'overview' && (
                <div className="space-y-6">
                    <div className="bg-endurix-paper dark:bg-card border border-endurix-black/10 dark:border-border overflow-hidden">
                        <div className="px-5 py-4 border-b border-endurix-black/10 dark:border-border flex items-center justify-between gap-2">
                            <div>
                                <MonospaceLabel className="text-[10px]">{tAthlete('athleteProfileTitle')}</MonospaceLabel>
                                <p className="text-sm text-muted-foreground mt-1">{tAthlete('athleteProfileSubtitle')}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 divide-x divide-y lg:divide-y-0 divide-endurix-black/10 dark:divide-white/10">
                            {[
                                { label: t("athletes.detail.height"), value: athlete.athleteProfile?.height, unit: tUnits('cm') },
                                { label: t("athletes.detail.weight"), value: athlete.athleteProfile?.weight, unit: tUnits('kg') },
                                { label: t("athletes.detail.restHR"), value: athlete.athleteProfile?.restHR, unit: tUnits('bpm') },
                                { label: t("athletes.detail.maxHR"), value: athlete.athleteProfile?.maxHR, unit: tUnits('bpm') },
                                { label: t("athletes.detail.lthr"), value: athlete.athleteProfile?.lthr, unit: tUnits('bpm') },
                            ].map((m, i) => (
                                <div key={i} className="p-5 flex flex-col gap-2">
                                    <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{m.label}</span>
                                    <div className="flex items-baseline gap-1.5">
                                        <span
                                            className="text-2xl font-medium text-foreground leading-none"
                                            style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                                        >
                                            {m.value ?? '—'}
                                        </span>
                                        {m.value && <span className="text-xs font-semibold text-muted-foreground">{m.unit}</span>}
                                    </div>
                                </div>
                            ))}
                            <div className="p-5 flex flex-col gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{t("athletes.detail.testVAM")}</span>
                                <div className="flex items-baseline gap-1.5">
                                    <span
                                        className="text-2xl font-medium text-foreground leading-none"
                                        style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                                    >
                                        {athlete.athleteProfile?.vam ?? '—'}
                                    </span>
                                    {athlete.athleteProfile?.vam && <span className="text-xs font-semibold text-muted-foreground">{tUnits('minPerKm')}</span>}
                                </div>
                                {!athlete.athleteProfile?.vam && (
                                    <Select onValueChange={handleUpdateVAM}>
                                        <SelectTrigger className="h-6 text-[10px] font-bold uppercase tracking-wider text-endurix-orange bg-endurix-black/8 dark:bg-white/10 border-0 px-2 w-fit gap-1 focus:ring-0 mt-1">
                                            <SelectValue placeholder={tAthlete('assignLevel')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {VAM_LEVELS.map((level) => (
                                                <SelectItem key={level.pace} value={level.pace}>{level.name} ({level.pace})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                            <div className="p-5 flex flex-col gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{t("athletes.detail.testUAN")}</span>
                                <div className="flex items-baseline gap-1.5">
                                    <span
                                        className="text-2xl font-medium text-foreground leading-none"
                                        style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                                    >
                                        {athlete.athleteProfile?.uan ?? '—'}
                                    </span>
                                    {athlete.athleteProfile?.uan && <span className="text-xs font-semibold text-muted-foreground">{tUnits('minPerKm')}</span>}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-endurix-paper dark:bg-card border border-endurix-black/10 dark:border-border p-6">
                        <SectionHeader
                            title={tAthlete('performanceAndZones')}
                            size="sm"
                        />
                        <PerformanceTrendChart data={performanceData} />
                    </div>
                </div>
            )}

            {activeSection === 'training' && (
                <div className="space-y-6">
                    <div className="flex items-center bg-endurix-paper dark:bg-card border border-endurix-black/10 dark:border-border p-1 w-full sm:w-fit">
                        <Button variant="ghost" onClick={() => setCurrentWeekStart(prev => addWeeks(prev, -1))} size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"><ChevronLeft className="w-4 h-4" /></Button>
                        <span
                            className="px-5 font-semibold text-[13px] tracking-wide w-40 text-center text-foreground capitalize"
                            style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                        >
                            {format(currentWeekStart, 'MMMM yyyy', { locale: es })}
                        </span>
                        <Button variant="ghost" onClick={() => setCurrentWeekStart(prev => addWeeks(prev, 1))} size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"><ChevronRight className="w-4 h-4" /></Button>
                        <div className="h-4 w-px bg-endurix-black/15 dark:bg-border mx-1" />
                        <Button variant="ghost" onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))} className="px-3 h-8 text-[11px] font-bold tracking-wider uppercase text-endurix-orange">{t("common.today")}</Button>
                    </div>

                    <AthleteWeeklyCalendar weekStart={currentWeekStart} athleteId={id} assignments={assignments} activities={activities} />
                </div>
            )}

            {activeSection === 'health' && (
                <div className="bg-endurix-paper dark:bg-card border border-endurix-black/10 dark:border-border">
                    <div className="px-5 pt-5 pb-4 border-b border-endurix-black/10 dark:border-border flex items-center justify-between gap-3">
                        <div>
                            <MonospaceLabel className="text-[10px]">{tAthlete('loadMonitoringTitle')}</MonospaceLabel>
                            <p className="text-sm text-foreground font-medium mt-1">{tAthlete('loadMonitoringSubtitle')}</p>
                        </div>
                        <Badge className={`${loadMetrics.riskClassName} border-0 text-[10px] uppercase tracking-wider`}>
                            {tAthlete(`loadRisk.${loadMetrics.riskKey}`)}
                        </Badge>
                    </div>
                    <div className="px-5 py-3 border-b border-endurix-black/10 dark:border-border flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                            {[7, 30, 90].map((range) => (
                                <Button
                                    key={range}
                                    type="button"
                                    variant={loadRange === range ? 'orange' : 'outline-brand'}
                                    size="sm"
                                    className="h-7 px-3 text-[10px] font-bold tracking-wider uppercase"
                                    onClick={() => handleLoadRangeChange(range as LoadMetricsRange)}
                                    disabled={isSwitchingLoadRange}
                                >
                                    {range}D
                                </Button>
                            ))}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {showLoadSkeleton
                                ? tAthlete('loadStatus.loading')
                                : loadMetrics.backfillStatus === 'queued' || loadMetrics.backfillStatus === 'running'
                                    ? tAthlete('loadStatus.syncing')
                                    : loadMetrics.partial
                                        ? tAthlete('loadStatus.partial', { days: loadMetrics.historyDaysAvailable })
                                        : tAthlete('loadStatus.ready')}
                        </div>
                    </div>
                    {showLoadSkeleton ? (
                        <div className="px-5 py-4 border-t border-endurix-black/10 dark:border-border">
                            <div className="border border-endurix-black/10 dark:border-border bg-endurix-black/5 dark:bg-white/5 p-5 sm:p-6">
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
                                    {Array.from({ length: 6 }).map((_, idx) => (
                                        <div key={`load-skeleton-metric-${idx}`} className="bg-white/60 dark:bg-card/60 border border-endurix-black/10 dark:border-border p-3">
                                            <Skeleton className="h-3 w-14 mb-3" />
                                            <Skeleton className="h-8 w-20" />
                                        </div>
                                    ))}
                                </div>
                                <Skeleton className="h-72 w-full" />
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-y sm:divide-y-0 divide-endurix-black/10 dark:divide-white/10">
                                {[
                                    { label: 'CTL', value: loadMetrics.ctl, tooltip: tAthlete('metricTooltip.ctl') },
                                    { label: 'ATL', value: loadMetrics.atl, tooltip: tAthlete('metricTooltip.atl') },
                                    { label: 'TSB', value: loadMetrics.tsb, tooltip: tAthlete('metricTooltip.tsb') },
                                    { label: 'ACWR', value: loadMetrics.acwr, decimals: 2, tooltip: tAthlete('metricTooltip.acwr') },
                                    { label: tAthlete('todayLoad'), value: loadMetrics.todayLoad, tooltip: tAthlete('metricTooltip.todayLoad') },
                                    { label: tAthlete('last7DaysAvg'), value: loadMetrics.sevenDayAvg, tooltip: tAthlete('metricTooltip.last7DaysAvg') },
                                ].map((metric, metricIndex, metrics) => (
                                    <div key={metric.label} className="p-5 flex flex-col gap-2">
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                                            {metric.label}
                                            <span className="relative inline-flex items-center group">
                                                <Info className="h-3 w-3 text-muted-foreground/80 cursor-help" aria-label={metric.tooltip} />
                                                <span className={`pointer-events-none absolute top-full z-20 mt-2 w-52 bg-endurix-black dark:bg-foreground px-2 py-1.5 text-[10px] font-medium normal-case leading-relaxed text-white dark:text-background opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 ${
                                                    metricIndex === 0
                                                        ? 'left-0'
                                                        : metricIndex === metrics.length - 1
                                                            ? 'right-0'
                                                            : 'left-1/2 -translate-x-1/2'
                                                }`}>
                                                    {metric.tooltip}
                                                </span>
                                            </span>
                                        </span>
                                        <div className="flex items-baseline gap-1.5">
                                            <span
                                                className="text-2xl font-medium text-foreground leading-none"
                                                style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                                            >
                                                {metric.decimals ? metric.value.toFixed(metric.decimals) : Math.round(metric.value)}
                                            </span>
                                            <span className="text-xs font-semibold text-muted-foreground">{metric.label === 'ACWR' ? '' : tAthlete('loadPoints')}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="px-5 py-4 border-t border-endurix-black/10 dark:border-border">
                                <LoadMetricsTrendChart data={loadTrendData} />
                            </div>
                            <div className="px-5 pb-5">
                                {athlete.athleteProfile?.hrZones ? (
                                    <div className="bg-endurix-black/5 dark:bg-white/5 p-4">
                                        <HeartRateZones zones={athlete.athleteProfile.hrZones} />
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">{tAthlete('noHrZones')}</p>
                                )}
                            </div>
                        </>
                    )}
                    <div className="px-5 py-4 border-t border-endurix-black/10 dark:border-border">
                        <p className="text-xs text-muted-foreground leading-relaxed">{tAthlete('loadRiskHint', { tsb: Math.round(loadMetrics.tsb), atl: Math.round(loadMetrics.atl), ctl: Math.round(loadMetrics.ctl), acwr: loadMetrics.acwr.toFixed(2) })}</p>
                    </div>
                </div>
            )}

            {activeSection === 'trend' && (
                <div className="bg-endurix-paper dark:bg-card border border-endurix-black/10 dark:border-border p-6">
                    <SectionHeader
                        eyebrow={tAthlete('complianceTabSubtitle')}
                        title={tAthlete('trainingComplianceTrend')}
                        size="sm"
                    />
                    <PerformanceTrendChart data={performanceData} />
                </div>
            )}

            {activeSection === 'racesNotes' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 w-full items-stretch relative">
                    <div className="lg:col-span-4 h-full">
                        <div className="bg-endurix-black/5 dark:bg-white/5 p-6 h-full flex flex-col pt-7 pb-6 relative group overflow-hidden border border-endurix-black/10 dark:border-border">
                            <div className="absolute top-0 left-0 w-full h-1 bg-endurix-orange/60" />
                            <h3
                                className="text-xl font-medium tracking-tight mb-6 text-endurix-black dark:text-foreground px-2 flex items-center justify-between uppercase"
                                style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                            >
                                {t("athletes.detail.coachComments")}
                                <MessageSquare className="w-4 h-4 text-muted-foreground/60" />
                            </h3>
                            <div className="flex-1 w-full bg-transparent mb-6 overflow-hidden">
                                <CoachNotes athleteId={id} initialNotes={athlete.athleteProfile?.coachNotes || ''} onSave={handleSaveNotes} />
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-8 h-full">
                        <div className="flex items-center justify-between mb-2">
                            <h3
                                className="text-xl font-medium text-foreground px-2 uppercase"
                                style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                            >
                                {t("races.athlete.upcomingTitle")}
                            </h3>
                            <Button variant="ghost" size="sm" onClick={() => setIsAssignRaceModalOpen(true)} className="text-endurix-orange font-bold text-[10px] uppercase tracking-wider gap-1.5"><Plus className="h-3 w-3" />{t("races.athlete.addRace")}</Button>
                        </div>

                        {upcomingRaces.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {upcomingRaces.slice(0, 4).map((race, index) => {
                                    const raceDate = parseISO(race.date);
                                    const daysLeft = differenceInDays(raceDate, startOfDay(new Date()));
                                    return (
                                        <div key={race.id} className={`${index === 0 ? 'bg-endurix-orange text-white' : 'bg-endurix-paper dark:bg-card border border-endurix-black/10 dark:border-border text-card-foreground'} p-6 relative overflow-hidden flex flex-col min-h-[180px] ${index === 0 ? 'border-l-4 border-l-endurix-black/30' : ''}`}>
                                            <div className="relative z-10 flex-1 flex flex-col">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h4
                                                            className={`text-lg font-medium mb-0.5 ${index === 0 ? 'text-white' : 'text-foreground'}`}
                                                            style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                                                        >
                                                            {race.name_override || race.race?.name || tRaces('defaultRaceName')}
                                                        </h4>
                                                        <p className={`text-xs ${index === 0 ? 'text-white/85' : 'text-muted-foreground'} font-medium`}>{format(raceDate, "d 'de' MMMM, yyyy", { locale: es })}{race.race?.distance && ` • ${race.race.distance}`}</p>
                                                    </div>
                                                    <Badge className={`${index === 0 ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-endurix-orange/10 text-endurix-orange'} border-0 font-bold text-[10px]`}>{t("races.athlete.priority", { priority: race.priority })}</Badge>
                                                </div>
                                                <div className="mt-auto flex justify-between items-end">
                                                    <div>
                                                        <p className={`text-[9px] uppercase tracking-widest font-bold ${index === 0 ? 'text-white/80' : 'text-muted-foreground'} mb-1`}>{daysLeft > 0 ? tRaces('countdownLabel') : tRaces('todayLabel')}</p>
                                                        <div className="flex items-baseline gap-2">
                                                            <span
                                                                className="text-3xl leading-none tracking-tight"
                                                                style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                                                            >
                                                                {Math.max(0, daysLeft)}
                                                            </span>
                                                            <span className={`text-xs ${index === 0 ? 'text-white/85' : 'text-muted-foreground'} font-medium`}>{tRaces('daysLeftLabel')}</span>
                                                        </div>
                                                    </div>
                                                    {race.target_time && (
                                                        <div className="text-right">
                                                            <p className={`text-[9px] uppercase tracking-widest font-bold ${index === 0 ? 'text-white/80' : 'text-muted-foreground'} mb-1`}>{tRaces('targetLabel')}</p>
                                                            <p
                                                                className="text-sm font-bold"
                                                                style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                                                            >
                                                                {race.target_time}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {index === 0 && (
                                                <div className="absolute right-[-16px] top-4 opacity-20 pointer-events-none text-white"><Trophy className="w-24 h-24" /></div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="bg-endurix-black/5 dark:bg-white/5 p-8 flex flex-col items-center justify-center text-center min-h-[200px] border border-dashed border-endurix-black/15 dark:border-white/20">
                                <Trophy className="w-12 h-12 text-muted-foreground/30 mb-4" />
                                <h4 className="text-foreground font-medium mb-2">{t("races.athlete.noRaces")}</h4>
                                <Button variant="outline-brand" onClick={() => setIsAssignRaceModalOpen(true)} className="mt-2 uppercase tracking-wider">{t("races.athlete.addRace")}</Button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <AlertDialog
                open={alertState.open || pendingDeleteAssignment !== null}
                onClose={() => { closeAlert(); setPendingDeleteAssignment(null); }}
                onConfirm={pendingDeleteAssignment ? doDeleteAssignment : undefined}
                type={pendingDeleteAssignment ? 'warning' : alertState.type}
                title={pendingDeleteAssignment ? tAthlete('deleteAssignmentTitle') : alertState.title}
                message={pendingDeleteAssignment ? tAthlete('deleteAssignmentConfirm') : alertState.message}
                confirmText={pendingDeleteAssignment ? tAthlete('deleteAssignmentButton') : alertState.confirmText}
            />

            <AssignRaceModal open={isAssignRaceModalOpen} onOpenChange={setIsAssignRaceModalOpen} athleteId={id} onSuccess={fetchRaces} />
        </div>
    );
}
