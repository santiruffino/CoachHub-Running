'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, subWeeks, addWeeks, eachDayOfInterval, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '@/lib/axios';
import { useTranslations } from 'next-intl';
import { Zap, ChevronLeft, ChevronRight, MessageSquare, TrendingUp } from 'lucide-react';

import { AthleteWeeklyCalendar } from '@/components/dashboard/AthleteWeeklyCalendar';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { PerformanceTrendChart } from '@/components/dashboard/PerformanceTrendChart';
import { CoachNotes } from '@/components/dashboard/CoachNotes';
import { HeartRateZones } from '@/features/profiles/components/HeartRateZones';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

import { stravaService } from '@/features/strava/services/strava.service';
import { racesService } from '@/features/races/services/races.service';
import { cacheService } from '@/lib/cache.service';
import { normalizeActivityType } from '@/utils/activity-utils';
import { NextRaces } from './NextRaces';

export default function AthleteDashboard({ user }: { user: any }) {
    const t = useTranslations();
    const [loading, setLoading] = useState(true);
    const [activities, setActivities] = useState<any[]>([]);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [races, setRaces] = useState<any[]>([]);
    const [athleteDetails, setAthleteDetails] = useState<any>(null);
    const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [performanceData, setPerformanceData] = useState<any[]>([]);

    const fetchData = async () => {
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

            // Parallel fetching with cache awareness
            const [detailsRes, activitiesRes, calendarRes, racesRes] = await Promise.all([
                api.get(`/v2/users/${user.id}/details`),
                api.get(`/v2/users/${user.id}/activities`),
                api.get(`/v2/trainings/calendar?studentIds=${user.id}&startDate=${subWeeks(new Date(), 8).toISOString()}&endDate=${addWeeks(new Date(), 4).toISOString()}`),
                racesService.findByUser(user.id)
            ]);

            setAthleteDetails(detailsRes.data);
            setActivities(activitiesRes.data);
            setAssignments(calendarRes.data);
            setRaces(racesRes.data);

            // Calculate Performance Trend (Last 6 weeks)
            const trend = [];
            for (let i = 5; i >= 0; i--) {
                const week = subWeeks(new Date(), i);
                const wStart = startOfWeek(week, { weekStartsOn: 1 });
                const wEnd = endOfWeek(week, { weekStartsOn: 1 });
                
                const weekAssignments = calendarRes.data.filter((a: any) => {
                    const d = a.scheduled_date.split('T')[0];
                    return d >= format(wStart, 'yyyy-MM-dd') && d <= format(wEnd, 'yyyy-MM-dd');
                });

                const completed = weekAssignments.filter((a: any) => {
                    if (a.completed) return true;
                    return activitiesRes.data.some((act: any) => 
                        format(new Date(act.start_date), 'yyyy-MM-dd') === a.scheduled_date.split('T')[0] &&
                        normalizeActivityType(act.type) === a.training.type
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
    };

    useEffect(() => {
        fetchData();
    }, [user]);

    const weeklyStats = useMemo(() => {
        const wEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
        const weekActs = activities.filter(act => {
            const d = format(new Date(act.start_date), 'yyyy-MM-dd');
            return d >= format(currentWeekStart, 'yyyy-MM-dd') && d <= format(wEnd, 'yyyy-MM-dd');
        });

        const distance = weekActs.reduce((acc, act) => acc + (act.distance / 1000), 0);
        const duration = weekActs.reduce((acc, act) => acc + act.duration, 0);
        const hrs = Math.floor(duration / 3600);
        const mins = Math.floor((duration % 3600) / 60);

        return {
            distance: distance.toFixed(1),
            time: `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
        };
    }, [activities, currentWeekStart]);

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
                        <h1 className="text-3xl font-display font-medium text-foreground">
                            {t('dashboard.messages.hi', { name: user.firstName || user.name?.split(' ')[0] })}
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {format(new Date(), 'EEEE, d MMMM', { locale: es })}
                        </p>
                    </div>
                </div>

                <div className="flex gap-4">
                    <MetricCard title={t('athletes.detail.weeklyVolume')} value={weeklyStats.distance} />
                    <MetricCard title={t('athletes.detail.weeklyTime')} value={weeklyStats.time} />
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
                <Button variant="outline" size="sm" onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
                    {t('common.today')}
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-9">
                    <AthleteWeeklyCalendar 
                        weekStart={currentWeekStart}
                        assignments={assignments}
                        activities={activities}
                        races={races}
                    />
                </div>
                <div className="lg:col-span-3">
                    <NextRaces athleteRaces={races} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-12">
                <div className="lg:col-span-5">
                    <div className="bg-muted/50 rounded-3xl p-6 h-full">
                        <CoachNotes 
                            athleteId={user.id} 
                            initialNotes={athleteDetails?.athleteProfile?.coachNotes} 
                            readOnly 
                        />
                    </div>
                </div>
                <div className="lg:col-span-7">
                    <div className="bg-card border border-border/40 p-8 rounded-[2rem] shadow-sm">
                        <h3 className="text-xl font-display font-medium mb-8">{t('dashboard.performanceTrend.title')}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <PerformanceTrendChart data={performanceData} />
                            {athleteDetails?.athleteProfile?.hrZones && (
                                <HeartRateZones zones={athleteDetails.athleteProfile.hrZones} />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
