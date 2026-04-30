'use client';

import { format, addDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Training, TrainingAssignment } from '@/interfaces/training';
import { AthleteRace } from '@/interfaces/race';
import { Activity } from '@/interfaces/activity';
import { Moon, Trophy } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { normalizeActivityType } from '@/utils/activity-utils';

interface AthleteWeeklyCalendarProps {
    weekStart: Date;
    assignments: TrainingAssignment[];
    activities: Activity[];
    races?: AthleteRace[];
}

const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
};

const activityTypeLabel: Record<string, string> = {
    Run: 'RUNNING',
    WeightTraining: 'STRENGTH',
    Workout: 'STRENGTH',
    Ride: 'CYCLING',
    VirtualRide: 'CYCLING',
    Swim: 'SWIMMING',
};

// ─── Card variants ────────────────────────────────────────────────────────────
// completed (green): planned workout matched with a Strava activity
// planned (gray): planned workout, not yet completed
// standalone (orange): Strava activity with no matching planned workout

function CompletedCard({ assignment, activity }: { assignment: TrainingAssignment; activity: Activity }) {
    const t = useTranslations();
    const typeText = assignment.training.type;
    const nameText = assignment.workout_name || assignment.training.title;

    return (
        <Link href={`/activities/${activity.id}`} className="block group">
            <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden transition-all group-hover:border-emerald-300 dark:group-hover:border-emerald-400/60 group-hover:-translate-y-0.5 group-hover:shadow-lg group-hover:shadow-emerald-100 dark:group-hover:shadow-emerald-900/20">
                {/* Left accent */}
                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-emerald-500 dark:bg-emerald-400" />

                {/* Header row */}
                <div className="flex items-center justify-between pl-2">
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                        {typeText}
                    </span>
                    <span className="text-[8px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                        {t('calendar.done')}
                    </span>
                </div>

                <h4 className="text-sm font-bold text-foreground leading-tight px-2 line-clamp-2">
                    {nameText}
                </h4>

                <p className="text-[11px] text-muted-foreground px-2 line-clamp-2 leading-relaxed">
                    {assignment.training.description || t('calendar.customWorkout')}
                </p>

                {/* Progress bar – full */}
                <div className="mt-1 px-2">
                    <div className="h-0.5 w-full bg-emerald-200 dark:bg-emerald-900 rounded-full overflow-hidden">
                        <div className="h-full w-full bg-emerald-500 dark:bg-emerald-400 rounded-full" />
                    </div>
                </div>

                {/* Activity stats */}
                <div className="px-2 flex items-center gap-3 text-[10px] text-emerald-700 dark:text-emerald-400/80 font-medium">
                    {activity.distance > 0 && <span>{t('common.distance_km', { distance: (activity.distance / 1000).toFixed(2) })}</span>}
                    {activity.duration > 0 && <span>{formatDuration(activity.duration)}</span>}
                </div>
            </div>
        </Link>
    );
}

function PlannedCard({ assignment }: { assignment: TrainingAssignment }) {
    const t = useTranslations();
    const typeText = assignment.training.type;
    const nameText = assignment.workout_name || assignment.training.title;

    return (
        <Link href={`/workouts/${assignment.id}`} className="block group">
            <div className="bg-card dark:bg-card border border-border/40 dark:border-white/5 rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden transition-all group-hover:border-primary/40 group-hover:-translate-y-0.5 group-hover:shadow-lg">
                {/* Left accent */}
                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-muted-foreground/30" />

                {/* Header row */}
                <div className="flex items-center justify-between pl-2">
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest bg-muted text-muted-foreground">
                        {typeText}
                    </span>
                </div>

                <h4 className="text-sm font-bold text-foreground leading-tight px-2 line-clamp-2">
                    {nameText}
                </h4>

                <p className="text-[11px] text-muted-foreground px-2 line-clamp-2 leading-relaxed">
                    {assignment.training.description || t('calendar.customWorkout')}
                </p>

                {/* Progress bar – empty */}
                <div className="mt-1 px-2">
                    <div className="h-0.5 w-full bg-muted rounded-full" />
                </div>
            </div>
        </Link>
    );
}

function StandaloneActivityCard({ activity }: { activity: Activity }) {
    const t = useTranslations();
    const label = activityTypeLabel[activity.type] || activity.type.toUpperCase();

    return (
        <Link href={`/activities/${activity.id}`} className="block group">
            <div className="bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-500/30 rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden transition-all group-hover:border-orange-300 dark:group-hover:border-orange-400/60 group-hover:-translate-y-0.5 group-hover:shadow-lg group-hover:shadow-orange-100 dark:group-hover:shadow-orange-900/20">
                {/* Left accent */}
                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-orange-500 dark:bg-orange-400" />

                {/* Header row */}
                <div className="flex items-center justify-between pl-2">
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300">
                        {label}
                    </span>
                    <span className="text-[8px] font-bold uppercase tracking-widest text-orange-600 dark:text-orange-400">
                        {t('calendar.strava')}
                    </span>
                </div>

                <h4 className="text-sm font-bold text-foreground leading-tight px-2 line-clamp-2">
                    {activity.title}
                </h4>

                <div className="px-2 flex items-center gap-3 text-[10px] text-orange-700 dark:text-orange-400/80 font-medium">
                    {activity.distance > 0 && <span>{t('common.distance_km', { distance: (activity.distance / 1000).toFixed(2) })}</span>}
                    {activity.duration > 0 && <span>{formatDuration(activity.duration)}</span>}
                </div>
            </div>
        </Link>
    );
}

function RaceCard({ race }: { race: AthleteRace }) {
    const t = useTranslations();
    const name = race.name_override || race.race?.name || t('races.athlete.defaultRaceName');
    
    return (
        <div className="bg-violet-50 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-500/30 rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden transition-all hover:border-violet-300 dark:hover:border-violet-400/60 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-violet-100 dark:hover:shadow-violet-900/20">
            {/* Left accent */}
            <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-violet-500 dark:bg-violet-400" />

            {/* Header row */}
            <div className="flex items-center justify-between pl-2">
                <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 flex items-center gap-1">
                    <Trophy className="h-2 w-2" />
                    {t('groups.targetRace')}
                </span>
                <span className={cn(
                    "text-[8px] font-bold px-1.5 py-0.5 rounded",
                    race.priority === 'A' ? "bg-red-100 text-red-700" : 
                    race.priority === 'B' ? "bg-orange-100 text-orange-700" : 
                    "bg-blue-100 text-blue-700"
                )}>
                    PRIO {race.priority}
                </span>
            </div>

            <h4 className="text-sm font-bold text-foreground leading-tight px-2 line-clamp-2">
                {name}
            </h4>

            {race.target_time && (
                <p className="text-[10px] text-violet-700 dark:text-violet-300 font-medium px-2">
                    {t('races.athlete.target', { time: race.target_time })}
                </p>
            )}

            {race.status === 'COMPLETED' && race.result_time && (
                <div className="mt-1 px-2 py-1 bg-emerald-100/50 dark:bg-emerald-900/30 rounded text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                    {t('races.athlete.resultTime')}: {race.result_time}
                </div>
            )}
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function AthleteWeeklyCalendar({ weekStart, assignments, activities, races = [] }: AthleteWeeklyCalendarProps) {
    const t = useTranslations();
    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

    return (
        <div className="w-full overflow-x-auto pb-4">
            <div className="min-w-[1024px] grid grid-cols-7 gap-4">
                {weekDays.map((day) => {
                    const isToday = isSameDay(day, new Date());
                    const dayStr = format(day, 'yyyy-MM-dd');

                    const dayTrainings = assignments.filter((a) => {
                        const dateValue = a.scheduled_date || a.scheduledDate;
                        return dateValue.split('T')[0] === dayStr;
                    });

                    const dayRaces = races.filter((r) => {
                        const dateValue = r.date; // AthleteRace date is required
                        return dateValue.split('T')[0] === dayStr;
                    });

                    const dayActivities = activities.filter(
                        (act) => format(new Date(act.start_date), 'yyyy-MM-dd') === dayStr
                    );

                    let totalDistance = 0;
                    dayActivities.forEach((act) => { totalDistance += act.distance / 1000; });

                    // Match activities → assignments by type
                    const matchedActivityIds = new Set<string>();
                    const enrichedTrainings = dayTrainings.map((assignment) => {
                        const matchingActivity = dayActivities.find(
                            (act) =>
                                !matchedActivityIds.has(String(act.id)) &&
                                normalizeActivityType(act.type) === assignment.training.type
                        );
                        if (matchingActivity) matchedActivityIds.add(String(matchingActivity.id));
                        const isCompleted = assignment.completed || !!matchingActivity;
                        return { assignment, matchingActivity: matchingActivity ?? null, isCompleted };
                    });

                    // Standalone activities (no planned workout that day)
                    const standaloneActivities = dayActivities.filter((act) => !matchedActivityIds.has(String(act.id)));

                    const isEmpty = dayTrainings.length === 0 && standaloneActivities.length === 0 && dayRaces.length === 0;
                    const hasRace = dayRaces.length > 0;

                    return (
                        <div
                            key={day.toISOString()}
                            className={cn(
                                'flex flex-col gap-3 p-3 rounded-xl transition-colors min-h-[400px]',
                                isToday ? 'bg-muted/30' : '',
                                hasRace ? 'bg-violet-500/[0.03] dark:bg-violet-500/[0.05]' : ''
                            )}
                        >
                            {/* Day header */}
                            <div className="flex justify-between items-baseline mb-2">
                                <div>
                                    <span className="text-[10px] sm:text-xs text-muted-foreground uppercase font-semibold tracking-wider block leading-none mb-1">
                                        {format(day, 'EEE', { locale: es }).slice(0, 3)}
                                    </span>
                                    <span className={cn(
                                        'text-xl sm:text-2xl font-bold font-display leading-none',
                                        isToday ? 'text-primary' : 'text-foreground'
                                    )}>
                                        {format(day, 'd')}
                                    </span>
                                </div>
                                <span className="text-[10px] font-semibold text-muted-foreground">
                                    {totalDistance > 0 ? t('common.distance_km', { distance: totalDistance.toFixed(1) }) : t('common.distance_km', { distance: '0.0' })}
                                </span>
                            </div>

                            <div className="space-y-3 flex-1">
                                {/* Races */}
                                {dayRaces.map((race) => (
                                    <RaceCard key={race.id} race={race} />
                                ))}

                                {/* Rest day */}
                                {isEmpty && (
                                    <div className="h-32 mt-6 rounded-xl border border-dashed border-border flex flex-col gap-2 items-center justify-center bg-transparent">
                                        <Moon className="w-5 h-5 text-muted-foreground/50" />
                                        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">{t("calendar.restDay")}</span>
                                    </div>
                                )}

                                {/* Planned workout cards (completed green, pending gray) */}
                                {enrichedTrainings.map(({ assignment, matchingActivity, isCompleted }) =>
                                    isCompleted && matchingActivity ? (
                                        <CompletedCard
                                            key={assignment.id}
                                            assignment={assignment}
                                            activity={matchingActivity}
                                        />
                                    ) : (
                                        <PlannedCard key={assignment.id} assignment={assignment} />
                                    )
                                )}

                                {/* Standalone Strava activities (orange) */}
                                {standaloneActivities.map((act) => (
                                    <StandaloneActivityCard key={act.id} activity={act} />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
