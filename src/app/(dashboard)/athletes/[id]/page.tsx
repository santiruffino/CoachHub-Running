'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { format, startOfWeek, endOfWeek, isWithinInterval, eachDayOfInterval, startOfDay, isToday, subWeeks, addWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import { User } from '@/features/auth/types';
import { Training } from '@/features/trainings/types';
import api from '@/lib/axios';
import { WeekCalendar } from '@/features/calendar/components/WeekCalendar';
import { Activity as ActivityIcon, Calendar as CalendarIcon, FileText, CheckCircle2, TrendingUp, Plus, Trash, Clock, Zap, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { trainingsService } from '@/features/trainings/services/trainings.service';
import { athletesService } from '@/features/users/services/athletes.service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/dashboard/StatCard';
import { WeeklyWorkoutsChart } from '@/components/dashboard/WeeklyWorkoutsChart';
import { PerformanceTrendChart } from '@/components/dashboard/PerformanceTrendChart';
import { Skeleton } from '@/components/ui/skeleton';
import { HeartRateZones } from '@/features/profiles/components/HeartRateZones';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VAM_LEVELS } from '@/features/profiles/constants/vam';
import { AlertDialog, useAlertDialog } from '@/components/ui/AlertDialog';
import { useTranslations } from 'next-intl';
import { AthleteWeeklyCalendar } from '@/components/dashboard/AthleteWeeklyCalendar';
import { CoachNotes } from '@/components/dashboard/CoachNotes';
import { NextCompetition } from '@/components/dashboard/NextCompetition';

interface Activity {
    id: string;
    external_id: string;
    title: string;
    distance: number;
    duration: number;
    start_date: string;
    type: string;
}

interface TrainingAssignment {
    id: string;
    scheduled_date: string;
    completed: boolean;
    training: Training;
    workout_name?: string | null;
}

interface AthleteDetails extends User {
    athleteProfile?: {
        height?: number;
        weight?: number;
        injuries?: string;
        restHR?: number;
        maxHR?: number;
        vam?: string;
        uan?: string;
        dob?: string;
        coachNotes?: string;
        hrZones?: {
            zones: Array<{ min: number; max: number }>;
            custom_zones?: boolean;
        };
    };
    athleteGroups?: Array<{
        group: {
            name: string;
        };
    }>;
}

export default function AthleteDetailPage() {
    const t = useTranslations();
    const params = useParams();
    const id = params.id as string;

    const [athlete, setAthlete] = useState<AthleteDetails | null>(null);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [assignments, setAssignments] = useState<TrainingAssignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [weeklyData, setWeeklyData] = useState<{ day: string; value: number }[]>([]);
    const [performanceData, setPerformanceData] = useState<{ week: string; value: number }[]>([]);
    const [pendingDeleteAssignment, setPendingDeleteAssignment] = useState<string | null>(null);
    const { alertState, showAlert, closeAlert } = useAlertDialog();

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [detailsRes, activitiesRes, calendarRes] = await Promise.all([
                    api.get<AthleteDetails>(`/v2/users/${id}/details`),
                    api.get<Activity[]>(`/v2/users/${id}/activities`),
                    api.get<TrainingAssignment[]>(`/v2/trainings/calendar?studentIds=${id}&startDate=${new Date(new Date().setMonth(new Date().getMonth() - 2)).toISOString()}&endDate=${new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString()}`)
                ]);

                setAthlete(detailsRes.data);
                setActivities(activitiesRes.data);
                setAssignments(calendarRes.data);

                const now = new Date();
                const weekStart = startOfWeek(now, { weekStartsOn: 1 });
                const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

                const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
                const weeklyWorkouts = weekDays.map(day => {
                    const dayStart = startOfDay(day);
                    const dayEnd = new Date(dayStart);
                    dayEnd.setHours(23, 59, 59, 999);

                    const dayStr = format(day, 'yyyy-MM-dd');

                    const assignmentCount = calendarRes.data.filter((a: TrainingAssignment) => {
                        const assignmentDateStr = a.scheduled_date.split('T')[0];
                        return assignmentDateStr === dayStr;
                    }).length;

                    const activityCount = activitiesRes.data.filter((a: Activity) => {
                        const activityDate = new Date(a.start_date);
                        return activityDate >= dayStart && activityDate <= dayEnd;
                    }).length;

                    return {
                        day: format(day, 'EEE').slice(0, 3),
                        value: assignmentCount + activityCount,
                    };
                });
                setWeeklyData(weeklyWorkouts);

                const performanceWeeks = [];

                const isAssignmentCompleted = (assignment: TrainingAssignment, activitiesList: Activity[]): boolean => {
                    if (assignment.completed) return true;

                    const assignmentDateStr = assignment.scheduled_date.split('T')[0];
                    const assignmentType = assignment.training.type;

                    return activitiesList.some(activity => {
                        const activityDateStr = format(new Date(activity.start_date), 'yyyy-MM-dd');
                        const normalizeType = (type: string): string => {
                            const typeMap: Record<string, string> = {
                                'Run': 'RUNNING',
                                'WeightTraining': 'STRENGTH',
                                'Workout': 'STRENGTH',
                                'Ride': 'CYCLING',
                                'VirtualRide': 'CYCLING',
                                'Swim': 'SWIMMING',
                            };
                            return typeMap[type] || 'OTHER';
                        };
                        const activityType = normalizeType(activity.type);

                        return activityDateStr === assignmentDateStr && activityType === assignmentType;
                    });
                };

                for (let i = 5; i >= 0; i--) {
                    const week = subWeeks(now, i);
                    const weekStart = startOfWeek(week, { weekStartsOn: 1 });
                    const weekEnd = endOfWeek(week, { weekStartsOn: 1 });

                    const weekStartStr = format(weekStart, 'yyyy-MM-dd');
                    const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

                    const weekAssignments = calendarRes.data.filter((a: TrainingAssignment) => {
                        const assignmentDateStr = a.scheduled_date.split('T')[0];
                        return assignmentDateStr >= weekStartStr && assignmentDateStr <= weekEndStr;
                    });

                    const weekCompleted = weekAssignments.filter((a: TrainingAssignment) =>
                        isAssignmentCompleted(a, activitiesRes.data)
                    ).length;
                    const weekTotal = weekAssignments.length;

                    const rate = weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : 0;

                    performanceWeeks.push({
                        week: `Sem ${6 - i}`,
                        value: rate,
                    });
                }
                setPerformanceData(performanceWeeks);
            } catch (error) {
                console.error('Failed to fetch athlete data:', error);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchData();
    }, [id]);

    const handleSaveNotes = async (notes: string) => {
        try {
            await athletesService.updateProfile(id, { coachNotes: notes });
            setAthlete(prev => prev ? {
                ...prev,
                athleteProfile: {
                    ...prev.athleteProfile,
                    coachNotes: notes
                }
            } : null);
        } catch (error) {
            console.error('Failed to save notes:', error);
            showAlert('error', 'Error al guardar las notas');
        }
    };

    const handleDeleteAssignment = (assignmentId: string) => {
        setPendingDeleteAssignment(assignmentId);
    };

    const doDeleteAssignment = async () => {
        if (!pendingDeleteAssignment) return;
        try {
            await trainingsService.deleteAssignment(pendingDeleteAssignment);
            setAssignments(prev => prev.filter(a => a.id !== pendingDeleteAssignment));
        } catch (error) {
            console.error('Failed to delete assignment:', error);
            showAlert('error', t?.('deleteAssignmentError') || 'Error al eliminar');
        } finally {
            setPendingDeleteAssignment(null);
        }
    };

    const handleUpdateVAM = async (pace: string) => {
        try {
            await athletesService.updateProfile(id, { vam: pace });
            setAthlete(prev => prev ? {
                ...prev,
                athleteProfile: {
                    ...prev.athleteProfile,
                    vam: pace
                }
            } : null);
        } catch (error) {
            console.error('Failed to update VAM:', error);
            showAlert('error', t?.('updateVAMError') || 'Error al actualizar VAM');
        }
    };

    const handlePrevWeek = () => {
        setCurrentWeekStart(prev => addWeeks(prev, -1));
    };

    const handleNextWeek = () => {
        setCurrentWeekStart(prev => addWeeks(prev, 1));
    };

    if (loading) {
        return (
            <div className="space-y-8 p-8 max-w-[1400px] mx-auto min-h-screen bg-background">
                <Skeleton className="h-32 w-full rounded-2xl" />
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-32 rounded-2xl" />
                    ))}
                </div>
            </div>
        );
    }

    if (!athlete) return <div className="p-8">Athlete not found</div>;

    const totalTrainings = assignments.length;

    const normalizeActivityType = (activityType: string): string => {
        const typeMap: Record<string, string> = {
            'Run': 'RUNNING',
            'WeightTraining': 'STRENGTH',
            'Workout': 'STRENGTH',
            'Ride': 'CYCLING',
            'VirtualRide': 'CYCLING',
            'Swim': 'SWIMMING',
        };
        return typeMap[activityType] || 'OTHER';
    };

    const completedTrainings = assignments.filter(assignment => {
        if (assignment.completed) return true;

        const assignmentDateStr = assignment.scheduled_date.split('T')[0];
        const assignmentType = assignment.training.type;

        return activities.some(activity => {
            const activityDateStr = format(new Date(activity.start_date), 'yyyy-MM-dd');
            const activityType = normalizeActivityType(activity.type);
            return activityDateStr === assignmentDateStr && activityType === assignmentType;
        });
    }).length;

    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    const weekStartStr = format(weekStart, 'yyyy-MM-dd');
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

    const thisWeekTrainings = assignments.filter((a) => {
        const assignmentDateStr = a.scheduled_date.split('T')[0];
        return assignmentDateStr >= weekStartStr && assignmentDateStr <= weekEndStr;
    }).length;

    const completionRate = totalTrainings > 0
        ? Math.round((completedTrainings / totalTrainings) * 100)
        : 0;

    let totalWeeklyDistance = 0;
    const currentWeekStartStr = format(currentWeekStart, 'yyyy-MM-dd');
    const currentWeekEndStr = format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const weeklyActivities = activities.filter(act => {
        const dStr = format(new Date(act.start_date), 'yyyy-MM-dd');
        return dStr >= currentWeekStartStr && dStr <= currentWeekEndStr;
    });
    weeklyActivities.forEach(act => totalWeeklyDistance += (act.distance / 1000));
    
    let totalWeeklyDuration = 0; 
    weeklyActivities.forEach(act => totalWeeklyDuration += act.duration);
    const hrs = Math.floor(totalWeeklyDuration / 3600);
    const mins = Math.floor((totalWeeklyDuration % 3600) / 60);

    return (
        <div className="space-y-8 p-4 md:p-8 max-w-[1400px] mx-auto pb-20 bg-background min-h-screen">
            {/* Header - Designer Layout */}
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
                        <div className="flex gap-8">
                            <div>
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">{t("athletes.detail.complianceRate")}</p>
                                <p className="text-foreground font-medium text-sm">{completionRate}%</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Header Stats */}
                <div className="flex gap-8 bg-card dark:border dark:border-white/5 p-6 rounded-2xl shadow-[0_20px_40px_rgba(43,52,55,0.02)]">
                    <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">{t("athletes.detail.weeklyVolume")}</p>
                        <div className="flex items-baseline gap-1.5">
                            <p className="text-[40px] leading-none font-display font-light text-foreground">{totalWeeklyDistance.toFixed(1)}</p>
                            <span className="text-sm font-medium text-muted-foreground">km</span>
                        </div>
                    </div>
                    <div className="w-px bg-border/40 my-2" />
                    <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">{t("athletes.detail.weeklyTime")}</p>
                        <div className="flex items-baseline gap-1.5">
                            <p className="text-[40px] leading-none font-display font-light text-foreground">{hrs.toString().padStart(2, '0')}:{mins.toString().padStart(2, '0')}</p>
                            <span className="text-sm font-medium text-muted-foreground">hr</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Athlete Physiological Metrics Strip */}
            <div className="bg-card rounded-2xl shadow-[0_4px_24px_rgba(43,52,55,0.04)] dark:border dark:border-white/5 overflow-hidden mt-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-y lg:divide-y-0 divide-muted dark:divide-white/5">
                    <div className="p-5 flex flex-col gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{t("athletes.detail.height")}</span>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-extrabold font-display text-foreground leading-none">
                                {athlete.athleteProfile?.height ?? '—'}
                            </span>
                            {athlete.athleteProfile?.height && (
                                <span className="text-xs font-semibold text-muted-foreground">cm</span>
                            )}
                        </div>
                    </div>

                    {/* Weight */}
                    <div className="p-5 flex flex-col gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{t("athletes.detail.weight")}</span>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-extrabold font-display text-foreground leading-none">
                                {athlete.athleteProfile?.weight ?? '—'}
                            </span>
                            {athlete.athleteProfile?.weight && (
                                <span className="text-xs font-semibold text-muted-foreground">kg</span>
                            )}
                        </div>
                    </div>

                    {/* Resting HR */}
                    <div className="p-5 flex flex-col gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{t("athletes.detail.restHR")}</span>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-extrabold font-display text-foreground leading-none">
                                {athlete.athleteProfile?.restHR ?? '—'}
                            </span>
                            {athlete.athleteProfile?.restHR && (
                                <span className="text-xs font-semibold text-muted-foreground">bpm</span>
                            )}
                        </div>
                    </div>

                    {/* Max HR */}
                    <div className="p-5 flex flex-col gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{t("athletes.detail.maxHR")}</span>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-extrabold font-display text-foreground leading-none">
                                {athlete.athleteProfile?.maxHR ?? '—'}
                            </span>
                            {athlete.athleteProfile?.maxHR && (
                                <span className="text-xs font-semibold text-muted-foreground">bpm</span>
                            )}
                        </div>
                    </div>

                    {/* VAM Test */}
                    <div className="p-5 flex flex-col gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{t("athletes.detail.testVAM")}</span>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-extrabold text-foreground leading-none font-mono">
                                {athlete.athleteProfile?.vam ?? '—'}
                            </span>
                            {athlete.athleteProfile?.vam && (
                                <span className="text-xs font-semibold text-muted-foreground">min/km</span>
                            )}
                        </div>
                        {athlete.athleteProfile?.vam && (
                            <Select
                                value={athlete.athleteProfile.vam}
                                onValueChange={handleUpdateVAM}
                            >
                                <SelectTrigger className="h-6 text-[10px] font-bold uppercase tracking-wider text-primary bg-muted dark:bg-white/5 border-0 rounded px-2 w-fit gap-1 focus:ring-0 mt-1">
                                    <SelectValue placeholder="Assign level" />
                                </SelectTrigger>
                                <SelectContent>
                                    {VAM_LEVELS.map((level) => (
                                        <SelectItem key={level.pace} value={level.pace}>
                                            {level.name} ({level.pace})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                        {!athlete.athleteProfile?.vam && (
                            <Select onValueChange={handleUpdateVAM}>
                                <SelectTrigger className="h-6 text-[10px] font-bold uppercase tracking-wider text-primary bg-muted dark:bg-white/5 border-0 rounded px-2 w-fit gap-1 focus:ring-0 mt-1">
                                    <SelectValue placeholder="Assign level" />
                                </SelectTrigger>
                                <SelectContent>
                                    {VAM_LEVELS.map((level) => (
                                        <SelectItem key={level.pace} value={level.pace}>
                                            {level.name} ({level.pace})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>

                    {/* UAN Test */}
                    <div className="p-5 flex flex-col gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{t("athletes.detail.testUAN")}</span>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-extrabold text-foreground leading-none font-mono">
                                {athlete.athleteProfile?.uan ?? '—'}
                            </span>
                            {athlete.athleteProfile?.uan && (
                                <span className="text-xs font-semibold text-muted-foreground">min/km</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Date Navigation & Actions Row */}
            <div className="flex flex-col sm:flex-row justify-between items-center bg-transparent mt-10 mb-6 w-full gap-4 sm:gap-0">
                <div className="flex items-center bg-card dark:border dark:border-white/5 rounded-lg shadow-[0_20px_40px_rgba(43,52,55,0.02)] p-1 md:w-auto w-full justify-between sm:justify-start">
                    <Button variant="ghost" onClick={handlePrevWeek} size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="px-5 font-semibold text-[13px] tracking-wide w-40 text-center text-foreground capitalize">
                        {format(currentWeekStart, 'MMMM yyyy')}
                    </span>
                    <Button variant="ghost" onClick={handleNextWeek} size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                    <div className="h-4 w-px bg-border/50 mx-1" />
                    <Button variant="ghost" onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))} className="px-3 h-8 text-[11px] font-bold tracking-wider uppercase text-primary">
                        {t("common.today")}
                    </Button>
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

            {/* Weekly Calendar Full View */}
            <div className="mb-12 w-full">
                <AthleteWeeklyCalendar 
                    weekStart={currentWeekStart}
                    assignments={assignments}
                    activities={activities}
                />
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 w-full items-stretch relative">
                
                {/* Coach's Analysis (with notes) */}
                <div className="lg:col-span-4 h-full">
                    <div className="bg-muted dark:bg-muted rounded-3xl p-6 h-full flex flex-col pt-7 pb-6 relative group overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white to-transparent opacity-50" />
                        <h3 className="text-xl font-display font-medium mb-6 text-foreground px-2 flex items-center justify-between">
                            {t("athletes.detail.coachComments")}
                            <MessageSquare className="w-4 h-4 text-muted-foreground/60" />
                        </h3>
                        <div className="flex-1 w-full bg-transparent mb-6 overflow-hidden [&_.bg-card]:bg-transparent [&_.bg-card]:border-0 [&_.bg-card]:shadow-none [&_.p-6]:px-0 pl-0 [&_.p-6]:py-0 [&_h3]:hidden">
                            <CoachNotes
                                athleteId={id}
                                initialNotes={athlete.athleteProfile?.coachNotes || ''}
                                onSave={handleSaveNotes}
                            />
                        </div>
                    </div>
                </div>

                {/* Upcoming Goal */}
                <div className="lg:col-span-4 h-full">
                    <div className="bg-primary dark:bg-primary/80 text-primary-foreground rounded-3xl p-8 shadow-[0_20px_40px_rgba(108,126,142,0.2)] border-0 h-full flex flex-col relative overflow-hidden text-left min-h-[280px]">
                        <div className="relative z-10 flex-1 flex flex-col">
                            <div>
                                <h3 className="text-xl font-display font-medium mb-1">Upcoming Goal</h3>
                                <p className="text-sm opacity-90 font-medium tracking-wide">Valencia Marathon</p>
                            </div>
                            
                            <div className="mt-auto mb-8">
                                <p className="text-[10px] uppercase tracking-widest font-bold opacity-70 mb-2">COUNT DOWN</p>
                                <div className="flex items-baseline gap-3">
                                    <span className="text-4xl font-display leading-[0.8] tracking-tight">42</span>
                                    <span className="text-sm opacity-90 font-medium">Days Left</span>
                                </div>
                            </div>
                            
                            <Button className="w-full bg-card text-primary hover:bg-muted dark:border dark:border-white/5 shadow-sm border-0 font-semibold h-12">
                                View Prep Strategy
                            </Button>
                        </div>
                        <div className="absolute right-[-24px] top-6 opacity-30 pointer-events-none text-white mix-blend-overlay">
                            <MessageSquare className="w-32 h-32" />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Extra Tools and charts - accessible further down */}
            <div className="mt-20 bg-card dark:border dark:border-white/5 p-8 md:p-12 rounded-[2rem] shadow-[0_20px_40px_rgba(43,52,55,0.02)] border border-muted">
                <h3 className="text-[22px] font-display font-medium mb-10 text-foreground">Performance & Zones</h3>
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
                title={pendingDeleteAssignment ? t?.('deleteAssignmentTitle') : alertState.title}
                message={pendingDeleteAssignment ? t?.('deleteAssignmentConfirm') : alertState.message}
                confirmText={pendingDeleteAssignment ? t?.('deleteAssignmentButton') : alertState.confirmText}
            />
        </div>
    );
}

// Helper to calculate duration from blocks
const calculateDuration = (blocks: any): string => {
    if (!blocks || !Array.isArray(blocks)) return '- min';

    let totalSeconds = 0;

    blocks.forEach(block => {
        if (block.duration?.type === 'time' && block.duration.value) {
            totalSeconds += block.duration.value;
        }
        else if (block.type === 'repeat' && block.steps && Array.isArray(block.steps)) {
            let repeatDuration = 0;
            block.steps.forEach((step: any) => {
                if (step.duration?.type === 'time' && step.duration.value) {
                    repeatDuration += step.duration.value;
                }
            });
            totalSeconds += repeatDuration * (block.reps || 1);
        }
    });

    if (totalSeconds === 0) return 'Distancia';

    return `${Math.round(totalSeconds / 60)} min`;
};
