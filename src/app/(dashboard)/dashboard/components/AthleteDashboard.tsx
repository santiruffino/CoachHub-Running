'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, startOfWeek, endOfWeek, subWeeks, addWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '@/lib/axios';
import { useTranslations } from 'next-intl';
import { Zap, ChevronLeft, ChevronRight, Plus } from 'lucide-react';

import { AthleteWeeklyCalendar } from '@/components/dashboard/AthleteWeeklyCalendar';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { PerformanceTrendChart } from '@/components/dashboard/PerformanceTrendChart';
import { CoachNotes } from '@/components/dashboard/CoachNotes';
import { HeartRateZones } from '@/features/profiles/components/HeartRateZones';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

import { stravaService } from '@/features/strava/services/strava.service';
import { racesService } from '@/features/races/services/races.service';
import { AssignRaceModal } from '@/features/races/components/AssignRaceModal';
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
    } | null;
}

interface PerformancePoint {
    week: string;
    value: number;
}

export default function AthleteDashboard({ user }: { user: User }) {
    const t = useTranslations();
    const userDisplayName = user.firstName || user.name?.split(' ')[0] || user.email.split('@')[0];
    const [loading, setLoading] = useState(true);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [assignments, setAssignments] = useState<TrainingAssignment[]>([]);
    const [races, setRaces] = useState<AthleteRace[]>([]);
    const [athleteDetails, setAthleteDetails] = useState<AthleteDetails | null>(null);
    const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [performanceData, setPerformanceData] = useState<PerformancePoint[]>([]);
    const [isAssignRaceModalOpen, setIsAssignRaceModalOpen] = useState(false);
    const [pendingFeedbackActivity, setPendingFeedbackActivity] = useState<Activity | null>(null);
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

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
                    console.error('Strava auto-sync failed', e);
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

            if (detailsRes.status === 'rejected') console.error('Failed to fetch athlete details:', detailsRes.reason);
            if (activitiesRes.status === 'rejected') console.error('Failed to fetch activities:', activitiesRes.reason);
            if (calendarRes.status === 'rejected') console.error('Failed to fetch calendar assignments:', calendarRes.reason);
            if (racesRes.status === 'rejected') console.error('Failed to fetch races:', racesRes.reason);

            setAthleteDetails(detailsData);
            setActivities(activitiesData);
            setAssignments(assignmentsData);
            setRaces(racesData);

            // Calculate Performance Trend (Last 6 weeks)
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
            setPerformanceData(trend);

        } catch (error) {
            console.error('Failed to fetch dashboard data', error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

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

    if (loading) return <div className="p-8"><Skeleton className="h-64 w-full rounded-3xl" /></div>;

    return (
        <div className="space-y-8 p-4 md:p-8 max-w-[1400px] mx-auto pb-20 bg-background min-h-screen">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                <div className="flex items-center gap-6">
                    <div className="relative">
                        <div className="h-20 w-20 rounded-2xl bg-primary/10 overflow-hidden flex items-center justify-center text-2xl font-display font-medium text-primary shadow-sm">
                            {user.firstName?.charAt(0) || user.name?.charAt(0)}
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-primary p-1 rounded-lg text-primary-foreground">
                            <Zap className="h-3 w-3" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-foreground">
                            {t('dashboard.messages.hi', { name: userDisplayName })}
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {format(new Date(), 'EEEE, d MMMM', { locale: es })}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-4">
                    <MetricCard title={t('athletes.detail.weeklyVolume')} value={weeklyStats.distance} />
                    <MetricCard title={t('athletes.detail.weeklyTime')} value={weeklyStats.time} />
                    <MetricCard title={t('activities.detail.metrics.elevationGain')} value={weeklyStats.elevation} />
                    <MetricCard title={t('athletes.detail.complianceRate')} value={weeklyStats.compliance} />
                </div>
            </div>

            <div className="flex justify-between items-center mt-10 mb-4">
                <div className="flex items-center bg-card rounded-lg p-1 shadow-sm border border-border/40">
                    <Button variant="ghost" size="icon" onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, -1))}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="px-4 font-semibold text-sm w-36 text-center capitalize">
                        {format(currentWeekStart, 'MMMM yyyy', { locale: es })}
                    </span>
                    <Button variant="ghost" size="icon" onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
                        {t('common.today')}
                    </Button>
                    <Button size="sm" onClick={() => setIsAssignRaceModalOpen(true)} className="gap-2">
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

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-12">
                <div className="lg:col-span-7">
                    <div className="bg-muted/50 rounded-3xl p-6 h-full">
                        <CoachNotes 
                            athleteId={user.id} 
                            initialNotes={athleteDetails?.athleteProfile?.coachNotes} 
                            readOnly 
                        />
                    </div>
                </div>

                <div className="lg:col-span-5">
                    <NextRaces athleteRaces={races} />
                </div>
            </div>

            <div className="mt-16 bg-card border border-border/40 p-8 md:p-10 rounded-[2rem] shadow-sm">
                <h3 className="text-[22px] font-display font-bold tracking-tight mb-8 text-foreground">{t('athletes.detail.performanceAndZones')}</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
                    <PerformanceTrendChart data={performanceData} className="bg-background/50 border-border/40" />
                    <div className="rounded-2xl border border-border/40 bg-muted/20 p-5 sm:p-6">
                        <h4 className="mb-6 text-lg font-semibold text-foreground">{t('activities.detail.zones.hrTitle')}</h4>
                        {athleteDetails?.athleteProfile?.hrZones ? (
                            <HeartRateZones zones={athleteDetails.athleteProfile.hrZones} />
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                {t('activities.detail.zones.noHrData')}
                            </p>
                        )}
                    </div>
                </div>
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
    );
}
