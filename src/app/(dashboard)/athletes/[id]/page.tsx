'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { format, startOfWeek, endOfWeek, isWithinInterval, eachDayOfInterval, startOfDay, isToday, subWeeks } from 'date-fns';
import { User } from '@/features/auth/types';
import { Training } from '@/features/trainings/types';
import api from '@/lib/axios';
import { WeekCalendar } from '@/features/calendar/components/WeekCalendar';
import { Activity as ActivityIcon, Calendar as CalendarIcon, FileText, CheckCircle2, TrendingUp, Plus, Trash, Clock } from 'lucide-react';
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

interface Activity {
    id: string;
    external_id: string;
    title: string;
    distance: number;
    duration: number;
    start_date: string;  // snake_case to match database
    type: string;
}

interface TrainingAssignment {
    id: string;
    scheduled_date: string;
    completed: boolean;
    training: Training;
    workout_name?: string | null; // Custom workout name
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
    const params = useParams();
    const id = params.id as string;

    const [athlete, setAthlete] = useState<AthleteDetails | null>(null);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [assignments, setAssignments] = useState<TrainingAssignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [weeklyData, setWeeklyData] = useState<{ day: string; value: number }[]>([]);
    const [performanceData, setPerformanceData] = useState<{ week: string; value: number }[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // Parallel fetch
                const [detailsRes, activitiesRes, calendarRes] = await Promise.all([
                    api.get<AthleteDetails>(`/v2/users/${id}/details`),
                    api.get<Activity[]>(`/v2/users/${id}/activities`),
                    api.get<TrainingAssignment[]>(`/v2/trainings/calendar?studentIds=${id}&startDate=${new Date(new Date().setMonth(new Date().getMonth() - 2)).toISOString()}&endDate=${new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString()}`)
                ]);

                setAthlete(detailsRes.data);
                setActivities(activitiesRes.data);
                setAssignments(calendarRes.data);

                // Calculate weekly data for charts
                const now = new Date();
                const weekStart = startOfWeek(now, { weekStartsOn: 1 });
                const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

                // Weekly workouts chart data
                const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
                const weeklyWorkouts = weekDays.map(day => {
                    const dayStart = startOfDay(day);
                    const dayEnd = new Date(dayStart);
                    dayEnd.setHours(23, 59, 59, 999);

                    // Compare date strings to avoid timezone issues
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

                // Performance trend data (last 6 weeks)
                const performanceWeeks = [];

                // Helper function to check if assignment is completed (moved outside loop for reuse)
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

    const handleDeleteAssignment = async (assignmentId: string) => {
        if (!confirm('Are you sure you want to delete this workout assignment?')) return;

        try {
            await trainingsService.deleteAssignment(assignmentId);
            setAssignments(prev => prev.filter(a => a.id !== assignmentId));
        } catch (error) {
            console.error('Failed to delete assignment:', error);
            alert('Failed to delete assignment. Please try again.');
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
            alert('Failed to update VAM. Please try again.');
        }
    };

    if (loading) {
        return (
            <div className="space-y-8 p-8">
                <Skeleton className="h-32 w-full" />
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-32" />
                    ))}
                </div>
            </div>
        );
    }

    if (!athlete) return <div className="p-8">Athlete not found</div>;

    // Calculate stats
    const totalTrainings = assignments.length;

    // Helper function to normalize activity type to match training type
    const normalizeActivityType = (activityType: string): string => {
        // Strava activity types to our training types mapping
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

    // Count assignments as completed if they have a matching activity on the same date with the same type
    const completedTrainings = assignments.filter(assignment => {
        // If already marked as completed, count it
        if (assignment.completed) return true;

        const assignmentDateStr = assignment.scheduled_date.split('T')[0];
        const assignmentType = assignment.training.type;

        // Check if there's a matching activity on the same date with the same type
        const hasMatchingActivity = activities.some(activity => {
            const activityDateStr = format(new Date(activity.start_date), 'yyyy-MM-dd');
            const activityType = normalizeActivityType(activity.type);

            return activityDateStr === assignmentDateStr && activityType === assignmentType;
        });

        return hasMatchingActivity;
    }).length;

    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    const weekStartStr = format(weekStart, 'yyyy-MM-dd');
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
    const todayStr = format(now, 'yyyy-MM-dd');

    const thisWeekTrainings = assignments.filter((a) => {
        const assignmentDateStr = a.scheduled_date.split('T')[0];
        return assignmentDateStr >= weekStartStr && assignmentDateStr <= weekEndStr;
    }).length;

    const completedToday = assignments.filter((a) => {
        const assignmentDateStr = a.scheduled_date.split('T')[0];
        return assignmentDateStr === todayStr && a.completed;
    }).length;

    const completionRate = totalTrainings > 0
        ? Math.round((completedTrainings / totalTrainings) * 100)
        : 0;

    // Combine events for calendar dots
    const events = [
        ...activities.map(a => ({ date: new Date(a.start_date), hasEvent: true })),
        ...assignments.map(a => ({ date: new Date(a.scheduled_date), hasEvent: true }))
    ];

    // Get recent activities (combined assignments and activities)
    const recentItems = [
        ...assignments.slice(0, 5).map(a => ({
            id: a.id,
            title: a.workout_name || a.training.title, // Use custom name if available
            type: a.training.type,
            date: new Date(a.scheduled_date),
            completed: a.completed,
            isActivity: false,
        })),
        ...activities.slice(0, 5).map(a => ({
            id: a.id,
            title: a.title,
            type: a.type,
            date: new Date(a.start_date),
            completed: true,
            isActivity: true,
            distance: a.distance,
            duration: a.duration,
        }))
    ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);

    // Mock change values (would need historical data for real changes)
    const totalChange = '+3';
    const completedChange = '+5';
    const thisWeekChange = '+2';
    const completionRateChange = '+2%';

    return (
        <div className="space-y-8 p-8">
            {/* Header - Athlete Info */}
            <Card>
                <CardContent className="p-6 flex flex-col md:flex-row justify-between items-start gap-4">
                    <div className="flex flex-col gap-4">
                        <div>
                            <h1 className="text-2xl font-bold">{athlete.name || athlete.email}</h1>
                            <p className="text-muted-foreground">{athlete.email}</p>
                            <div className="mt-2 flex gap-2">
                                {athlete.athleteGroups?.map((ag, i) => (
                                    <Badge key={i} variant="secondary">
                                        {ag.group.name}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        <Link href={`/workouts/assign?athleteId=${id}`}>
                            <Button className="w-fit">
                                <Plus className="h-4 mr-2" />
                                Asignar entrenamiento
                            </Button>
                        </Link>
                    </div>

                    {/* Profile Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm w-full">
                        <div className="bg-muted p-3 rounded-lg text-center">
                            <span className="block text-muted-foreground text-xs">Altura</span>
                            <span className="font-semibold">{athlete.athleteProfile?.height || '-'} cm</span>
                        </div>
                        <div className="bg-muted p-3 rounded-lg text-center">
                            <span className="block text-muted-foreground text-xs">Peso</span>
                            <span className="font-semibold">{athlete.athleteProfile?.weight || '-'} kg</span>
                        </div>
                        <div className="bg-muted p-3 rounded-lg text-center">
                            <span className="block text-muted-foreground text-xs">FC Reposo</span>
                            <span className="font-semibold">{athlete.athleteProfile?.restHR || '-'} bpm</span>
                        </div>
                        <div className="bg-muted p-3 rounded-lg text-center">
                            <span className="block text-muted-foreground text-xs">FC Max</span>
                            <span className="font-semibold">{athlete.athleteProfile?.maxHR || '-'} bpm</span>
                        </div>
                        <div className="bg-muted p-3 rounded-lg text-center relative group">
                            <span className="block text-muted-foreground text-xs">Test VAM</span>
                            <div className="flex flex-col items-center gap-1">
                                <span className="font-semibold">{athlete.athleteProfile?.vam || '-'}</span>
                                <Select onValueChange={handleUpdateVAM}>
                                    <SelectTrigger className="h-6 w-fit text-[10px] px-2 py-0">
                                        <SelectValue placeholder="Asignar nivel" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {VAM_LEVELS.map(level => (
                                            <SelectItem key={level.id} value={level.pace}>
                                                {level.name} ({level.pace})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="bg-muted p-3 rounded-lg text-center">
                            <span className="block text-muted-foreground text-xs">Test UAN</span>
                            <span className="font-semibold">{athlete.athleteProfile?.uan || '-'}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Total Entrenamientos"
                    value={totalTrainings}
                    change={totalChange}
                    icon={FileText}
                />
                <StatCard
                    title="Completados"
                    value={completedTrainings}
                    change={completedChange}
                    icon={CheckCircle2}
                />
                <StatCard
                    title="Esta Semana"
                    value={thisWeekTrainings}
                    change={thisWeekChange}
                    icon={CalendarIcon}
                />
                <StatCard
                    title="Tasa de Cumplimiento"
                    value={`${completionRate}%`}
                    change={completionRateChange}
                    icon={TrendingUp}
                />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <WeeklyWorkoutsChart data={weeklyData} />
                <PerformanceTrendChart data={performanceData} />
            </div>

            {/* Heart Rate Zones */}
            {athlete.athleteProfile?.hrZones && (
                <HeartRateZones zones={athlete.athleteProfile.hrZones} />
            )}

            {/* Calendar and Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content: Calendar & Planned */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <CalendarIcon className="w-5 h-5 mr-2" />
                                Planned & Completed Training
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <WeekCalendar
                                date={selectedDate}
                                onDateSelect={setSelectedDate}
                                events={events}
                            />

                            <div className="mt-6 space-y-4">
                                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                    Schedule for {format(selectedDate, 'MMM d, yyyy')}
                                </h3>

                                {assignments.filter(a => a.scheduled_date.split('T')[0] === format(selectedDate, 'yyyy-MM-dd')).length === 0 &&
                                    activities.filter(a => a.start_date && !isNaN(new Date(a.start_date).getTime()) && format(new Date(a.start_date), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')).length === 0 && (
                                        <p className="text-sm text-muted-foreground italic">No training scheduled or completed.</p>
                                    )}

                                {/* Assignments */}
                                {assignments
                                    .filter(a => a.scheduled_date.split('T')[0] === format(selectedDate, 'yyyy-MM-dd'))
                                    .map(assignment => (
                                        <Link
                                            key={assignment.id}
                                            href={`/workouts/${assignment.id}`}
                                            className="block"
                                        >
                                            <div className="flex items-center p-3 bg-muted/50 rounded-lg border border-border hover:bg-muted transition-colors cursor-pointer">
                                                <div className="p-2 bg-muted rounded-full mr-3">
                                                    <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-medium">{assignment.workout_name || assignment.training.title}</p>
                                                    <p className="text-xs text-muted-foreground">{assignment.training.type}</p>
                                                </div>
                                                <Badge variant="outline" className="ml-auto capitalize">
                                                    {assignment.completed ? 'Completed' : 'Planned'}
                                                </Badge>
                                                {!assignment.completed && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleDeleteAssignment(assignment.id);
                                                        }}
                                                        className="ml-2 p-1 text-muted-foreground hover:text-destructive transition-colors"
                                                        title="Delete Assignment"
                                                    >
                                                        <Trash className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </Link>
                                    ))
                                }

                                {/* Activities */}
                                {activities
                                    .filter(a => a.start_date && !isNaN(new Date(a.start_date).getTime()) && format(new Date(a.start_date), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd'))
                                    .map(activity => (
                                        <Link
                                            key={activity.id}
                                            href={`/activities/${activity.external_id}`}
                                            className="flex items-center p-3 bg-muted/50 rounded-lg border border-border hover:bg-muted transition-colors cursor-pointer"
                                        >
                                            <div className="p-2 bg-muted rounded-full mr-3">
                                                <ActivityIcon className="w-4 h-4 text-muted-foreground" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium">{activity.title}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {(activity.distance / 1000).toFixed(2)} km • {(activity.duration / 60).toFixed(0)} min
                                                </p>
                                            </div>
                                            <Badge variant="outline" className="ml-auto capitalize">
                                                Completed
                                            </Badge>
                                        </Link>
                                    ))
                                }
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar: Recent Activity */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Actividad Reciente</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {recentItems.length > 0 ? (
                                <div className="divide-y">
                                    {recentItems.map((item) => (
                                        <div key={item.id} className="flex items-start gap-4 py-4">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted flex-shrink-0">
                                                {item.isActivity ? (
                                                    <ActivityIcon className="h-5 w-5 text-muted-foreground" />
                                                ) : (
                                                    <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm">{item.title}</p>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                                    <span>{item.type}</span>
                                                    {item.isActivity && 'distance' in item && (
                                                        <>
                                                            <span>•</span>
                                                            <span>{(item.distance / 1000).toFixed(2)} km</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                                <span className="text-xs text-muted-foreground">
                                                    {format(item.date, 'MMM d')}
                                                </span>
                                                <Badge variant="outline" className="text-xs">
                                                    {item.completed ? 'Completado' : 'Programado'}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground py-8 text-center">
                                    No hay actividad reciente
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
