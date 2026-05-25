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
import { Plus, Zap, ChevronLeft, ChevronRight, MessageSquare, Trophy, ArrowLeft } from 'lucide-react';
import { trainingsService } from '@/features/trainings/services/trainings.service';
import { athletesService, LoadMetricsRange, LoadMetricsResponse } from '@/features/users/services/athletes.service';
import { racesService } from '@/features/races/services/races.service';
import { AssignRaceModal } from '@/features/races/components/AssignRaceModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PerformanceTrendChart } from '@/components/dashboard/PerformanceTrendChart';
import { LoadMetricsTrendChart } from '@/components/dashboard/LoadMetricsTrendChart';
import { HeartRateZones } from '@/features/profiles/components/HeartRateZones';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VAM_LEVELS } from '@/features/profiles/constants/vam';
import { AlertDialog, useAlertDialog } from '@/components/ui/AlertDialog';
import { useTranslations } from 'next-intl';
import { AthleteWeeklyCalendar } from '@/components/dashboard/AthleteWeeklyCalendar';
import { CoachNotes } from '@/components/dashboard/CoachNotes';
import { normalizeActivityType } from '@/utils/activity-utils';
import { useRouter } from 'next/navigation';

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
                if (!cancelled) setLoadMetricsLoading(false);
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

    return (
        <div className="space-y-8 p-4 md:p-8 max-w-[1400px] mx-auto pb-20 bg-background min-h-screen">
            <div className="flex items-center gap-2 mb-2">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
            </div>

            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                <div className="flex items-center gap-6">
                    <div className="relative">
                        <div className="h-24 w-24 rounded-2xl bg-primary/10 overflow-hidden flex items-center justify-center text-3xl font-display font-medium text-primary shadow-sm">
                            {athlete.name?.charAt(0) || athlete.email.charAt(0)}
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-primary p-1.5 rounded-lg text-primary-foreground shadow-md">
                            <Zap className="h-4 w-4" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-4xl font-display font-medium text-foreground mb-3">{athlete.name || athlete.email}</h1>
                        <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">{t("athletes.detail.complianceRate")}</p>
                            <p className="text-foreground font-medium text-sm">{completionRate}%</p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-8 bg-card dark:border dark:border-white/5 p-6 rounded-2xl shadow-[0_20px_40px_rgba(43,52,55,0.02)]">
                    <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">{t("athletes.detail.weeklyVolume")}</p>
                        <div className="flex items-baseline gap-1.5">
                            <p className="text-[40px] leading-none font-display font-light text-foreground">{stats.distance.toFixed(1)}</p>
                            <span className="text-sm font-medium text-muted-foreground">{tUnits('km')}</span>
                        </div>
                    </div>
                    <div className="w-px bg-border/40 my-2" />
                    <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">{t("athletes.detail.weeklyTime")}</p>
                        <div className="flex items-baseline gap-1.5">
                            <p className="text-[40px] leading-none font-display font-light text-foreground">{stats.h.toString().padStart(2, '0')}:{stats.m.toString().padStart(2, '0')}</p>
                            <span className="text-sm font-medium text-muted-foreground">{tUnits('h')}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-card rounded-2xl shadow-[0_4px_24px_rgba(43,52,55,0.04)] dark:border dark:border-white/5 overflow-hidden mt-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 divide-x divide-y lg:divide-y-0 divide-muted dark:divide-white/5">

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
                                <span className="text-2xl font-extrabold font-display text-foreground leading-none">{m.value ?? '—'}</span>
                                {m.value && <span className="text-xs font-semibold text-muted-foreground">{m.unit}</span>}
                            </div>
                        </div>
                    ))}
                    <div className="p-5 flex flex-col gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{t("athletes.detail.testVAM")}</span>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-extrabold text-foreground leading-none font-mono">{athlete.athleteProfile?.vam ?? '—'}</span>
                            {athlete.athleteProfile?.vam && <span className="text-xs font-semibold text-muted-foreground">{tUnits('minPerKm')}</span>}
                        </div>
                        {!athlete.athleteProfile?.vam && (
                            <Select onValueChange={handleUpdateVAM}>
                                <SelectTrigger className="h-6 text-[10px] font-bold uppercase tracking-wider text-primary bg-muted dark:bg-white/5 border-0 rounded px-2 w-fit gap-1 focus:ring-0 mt-1">
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
                            <span className="text-2xl font-extrabold text-foreground leading-none font-mono">{athlete.athleteProfile?.uan ?? '—'}</span>
                            {athlete.athleteProfile?.uan && <span className="text-xs font-semibold text-muted-foreground">{tUnits('minPerKm')}</span>}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-card rounded-2xl shadow-[0_4px_24px_rgba(43,52,55,0.04)] dark:border dark:border-white/5 overflow-hidden">
                <div className="px-5 pt-5 pb-4 border-b border-border/40 flex items-center justify-between gap-3">
                    <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{tAthlete('loadMonitoringTitle')}</p>
                        <p className="text-sm text-foreground font-medium mt-1">{tAthlete('loadMonitoringSubtitle')}</p>
                    </div>
                    <Badge className={`${loadMetrics.riskClassName} border-0 text-[10px] uppercase tracking-wider`}>
                        {tAthlete(`loadRisk.${loadMetrics.riskKey}`)}
                    </Badge>
                </div>
                <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                        {[7, 30, 90].map((range) => (
                            <Button
                                key={range}
                                type="button"
                                variant={loadRange === range ? 'default' : 'outline'}
                                className="h-7 px-3 text-[10px] font-bold tracking-wider"
                                onClick={() => setLoadRange(range as LoadMetricsRange)}
                            >
                                {range}D
                            </Button>
                        ))}
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {loadMetricsLoading
                            ? tAthlete('loadStatus.loading')
                            : loadMetrics.backfillStatus === 'queued' || loadMetrics.backfillStatus === 'running'
                                ? tAthlete('loadStatus.syncing')
                                : loadMetrics.partial
                                    ? tAthlete('loadStatus.partial', { days: loadMetrics.historyDaysAvailable })
                                    : tAthlete('loadStatus.ready')}
                    </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-y sm:divide-y-0 divide-muted dark:divide-white/5">
                    {[
                        { label: 'CTL', value: loadMetrics.ctl },
                        { label: 'ATL', value: loadMetrics.atl },
                        { label: 'TSB', value: loadMetrics.tsb },
                        { label: 'ACWR', value: loadMetrics.acwr, decimals: 2 },
                        { label: tAthlete('todayLoad'), value: loadMetrics.todayLoad },
                        { label: tAthlete('last7DaysAvg'), value: loadMetrics.sevenDayAvg },
                    ].map((metric) => (
                        <div key={metric.label} className="p-5 flex flex-col gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{metric.label}</span>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-2xl font-extrabold font-display text-foreground leading-none">{metric.decimals ? metric.value.toFixed(metric.decimals) : Math.round(metric.value)}</span>
                                <span className="text-xs font-semibold text-muted-foreground">{metric.label === 'ACWR' ? '' : tAthlete('loadPoints')}</span>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="px-5 py-4 border-t border-border/40">
                    <LoadMetricsTrendChart data={loadTrendData} />
                </div>
                <div className="px-5 py-4 border-t border-border/40">
                    <p className="text-xs text-muted-foreground leading-relaxed">{tAthlete('loadRiskHint', { tsb: Math.round(loadMetrics.tsb), atl: Math.round(loadMetrics.atl), ctl: Math.round(loadMetrics.ctl), acwr: loadMetrics.acwr.toFixed(2) })}</p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center bg-transparent mt-10 mb-6 w-full gap-4 sm:gap-0">
                <div className="flex items-center bg-card dark:border dark:border-white/5 rounded-lg shadow-[0_20px_40px_rgba(43,52,55,0.02)] p-1 md:w-auto w-full justify-between sm:justify-start">
                    <Button variant="ghost" onClick={() => setCurrentWeekStart(prev => addWeeks(prev, -1))} size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"><ChevronLeft className="w-4 h-4" /></Button>
                    <span className="px-5 font-semibold text-[13px] tracking-wide w-40 text-center text-foreground capitalize">{format(currentWeekStart, 'MMMM yyyy', { locale: es })}</span>
                    <Button variant="ghost" onClick={() => setCurrentWeekStart(prev => addWeeks(prev, 1))} size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"><ChevronRight className="w-4 h-4" /></Button>
                    <div className="h-4 w-px bg-border/50 mx-1" />
                    <Button variant="ghost" onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))} className="px-3 h-8 text-[11px] font-bold tracking-wider uppercase text-primary">{t("common.today")}</Button>
                </div>
                <div className="flex items-center gap-3">
                    <Link href={'/workouts/assign?athleteId=' + id}>
                        <Button className="bg-primary hover:bg-primary/90 shadow-[0_10px_20px_rgba(78,96,115,0.15)] gap-2 text-primary-foreground border-0 font-medium px-5">
                            <Plus className="h-4 w-4" />
                            {t("trainings.assign.assignWorkout")}
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="mb-12 w-full">
                <AthleteWeeklyCalendar weekStart={currentWeekStart} assignments={assignments} activities={activities} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 w-full items-stretch relative">
                <div className="lg:col-span-4 h-full">
                    <div className="bg-muted dark:bg-muted rounded-3xl p-6 h-full flex flex-col pt-7 pb-6 relative group overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white to-transparent opacity-50" />
                        <h3 className="text-xl font-display font-bold tracking-tight mb-6 text-foreground px-2 flex items-center justify-between">
                            {t("athletes.detail.coachComments")}
                            <MessageSquare className="w-4 h-4 text-muted-foreground/60" />
                        </h3>
                        <div className="flex-1 w-full bg-transparent mb-6 overflow-hidden [&_.bg-card]:bg-transparent [&_.bg-card]:border-0 [&_.bg-card]:shadow-none [&_.p-6]:px-0 pl-0 [&_.p-6]:py-0 [&_h3]:hidden">
                            <CoachNotes athleteId={id} initialNotes={athlete.athleteProfile?.coachNotes || ''} onSave={handleSaveNotes} />
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-8 h-full">
                    <div className="flex flex-col gap-4 h-full">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xl font-display font-medium text-foreground px-2">{t("races.athlete.upcomingTitle")}</h3>
                            <Button variant="ghost" size="sm" onClick={() => setIsAssignRaceModalOpen(true)} className="text-primary font-bold text-[10px] uppercase tracking-wider gap-1.5"><Plus className="h-3 w-3" />{t("races.athlete.addRace")}</Button>
                        </div>

                        {upcomingRaces.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {upcomingRaces.slice(0, 2).map((race, index) => {
                                    const raceDate = parseISO(race.date);
                                    const daysLeft = differenceInDays(raceDate, startOfDay(new Date()));
                                    return (
                                        <div key={race.id} className={`${index === 0 ? 'bg-primary dark:bg-primary/80 text-primary-foreground shadow-[0_20px_40px_rgba(108,126,142,0.2)]' : 'bg-card dark:border dark:border-white/5 text-card-foreground shadow-sm'} rounded-3xl p-6 relative overflow-hidden flex flex-col min-h-[180px]`}>
                                            <div className="relative z-10 flex-1 flex flex-col">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h4 className={`text-lg font-display font-medium mb-0.5 ${index === 0 ? 'text-white' : 'text-foreground'}`}>{race.name_override || race.race?.name || tRaces('defaultRaceName')}</h4>
                                                        <p className={`text-xs ${index === 0 ? 'text-white/80' : 'text-muted-foreground'} font-medium`}>{format(raceDate, "d 'de' MMMM, yyyy", { locale: es })}{race.race?.distance && ` • ${race.race.distance}`}</p>
                                                    </div>
                                                    <Badge className={`${index === 0 ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-primary/10 text-primary hover:bg-primary/20'} border-none font-bold text-[10px]`}>{t("races.athlete.priority", { priority: race.priority })}</Badge>
                                                </div>
                                                <div className="mt-auto flex justify-between items-end">
                                                    <div>
                                                        <p className={`text-[9px] uppercase tracking-widest font-bold ${index === 0 ? 'text-white/60' : 'text-muted-foreground'} mb-1`}>{daysLeft > 0 ? tRaces('countdownLabel') : tRaces('todayLabel')}</p>
                                                        <div className="flex items-baseline gap-2">
                                                            <span className="text-3xl font-display leading-none tracking-tight">{Math.max(0, daysLeft)}</span>
                                                            <span className={`text-xs ${index === 0 ? 'text-white/80' : 'text-muted-foreground'} font-medium`}>{tRaces('daysLeftLabel')}</span>
                                                        </div>
                                                    </div>
                                                    {race.target_time && (
                                                        <div className="text-right">
                                                            <p className={`text-[9px] uppercase tracking-widest font-bold ${index === 0 ? 'text-white/60' : 'text-muted-foreground'} mb-1`}>{tRaces('targetLabel')}</p>
                                                            <p className="text-sm font-mono font-bold">{race.target_time}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {index === 0 && (
                                                <>
                                                    <div className="absolute right-[-16px] top-4 opacity-20 pointer-events-none text-white mix-blend-overlay"><Trophy className="w-24 h-24" /></div>
                                                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="bg-muted/50 dark:bg-white/5 rounded-3xl p-8 flex flex-col items-center justify-center text-center min-h-[200px] border-2 border-dashed border-muted/50">
                                <Trophy className="w-12 h-12 text-muted-foreground/30 mb-4" />
                                <h4 className="text-foreground font-medium mb-2">{t("races.athlete.noRaces")}</h4>
                                <Button variant="outline" onClick={() => setIsAssignRaceModalOpen(true)} className="mt-2 border-primary/20 text-primary font-bold text-xs uppercase tracking-wider">{t("races.athlete.addRace")}</Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-20 bg-card dark:border dark:border-white/5 p-8 md:p-12 rounded-[2rem] shadow-[0_20px_40px_rgba(43,52,55,0.02)] border border-muted">
                <h3 className="text-[22px] font-display font-bold tracking-tight mb-10 text-foreground">{tAthlete('performanceAndZones')}</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <PerformanceTrendChart data={performanceData} />
                    {athlete.athleteProfile?.hrZones && (
                        <HeartRateZones zones={athlete.athleteProfile.hrZones} />
                    )}
                </div>
            </div>

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
