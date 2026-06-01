'use client';

import { format, addDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { TrainingAssignment } from '@/interfaces/training';
import { AthleteRace } from '@/interfaces/race';
import { Activity } from '@/interfaces/activity';
import { Moon, Trophy } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { normalizeActivityType } from '@/utils/activity-utils';
import { MonospaceLabel } from '@/components/dashboard';

const FONT_MONO = { fontFamily: 'var(--font-ibm-plex-mono, monospace)' } as const;
const FONT_DISPLAY = { fontFamily: 'var(--font-exo-2, sans-serif)' } as const;

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

function CompletedCard({ assignment, activity }: { assignment: TrainingAssignment; activity: Activity }) {
    const t = useTranslations();
    const typeText = assignment.training.type;
    const nameText = assignment.workout_name || assignment.training.title;

    return (
        <Link href={`/activities/${activity.id}`} className="block group">
            <div className="bg-white dark:bg-card border border-endurix-black/12 dark:border-border border-l-2 border-l-endurix-orange p-4 flex flex-col gap-2 transition-colors hover:border-endurix-orange/50">
                <div className="flex items-center justify-between">
                    <span
                        className="text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 bg-endurix-orange/10 text-endurix-orange"
                        style={FONT_MONO}
                    >
                        {typeText}
                    </span>
                    <span
                        className="text-[8px] font-bold tracking-widest uppercase text-endurix-orange"
                        style={FONT_MONO}
                    >
                        {t('calendar.done')}
                    </span>
                </div>

                <h4
                    className="text-sm font-bold text-endurix-black dark:text-foreground leading-tight line-clamp-2"
                    style={FONT_DISPLAY}
                >
                    {nameText}
                </h4>

                <p className="text-[11px] text-endurix-black/50 dark:text-muted-foreground line-clamp-2 leading-relaxed">
                    {assignment.training.description || t('calendar.customWorkout')}
                </p>

                <div className="h-px bg-endurix-black/8 dark:border-border" />

                <div className="flex items-center gap-3 text-[10px] text-endurix-black/70 dark:text-muted-foreground">
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
            <div className="bg-endurix-paper/50 dark:bg-muted/50 border border-endurix-black/8 dark:border-border border-l-2 border-l-endurix-black/30 p-4 flex flex-col gap-2 transition-colors hover:border-endurix-orange/50">
                <div className="flex items-center justify-between">
                    <span
                        className="text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 bg-endurix-black/8 dark:bg-white/8 text-endurix-black/70 dark:text-muted-foreground"
                        style={FONT_MONO}
                    >
                        {typeText}
                    </span>
                </div>

                <h4
                    className="text-sm font-bold text-endurix-black dark:text-foreground leading-tight line-clamp-2"
                    style={FONT_DISPLAY}
                >
                    {nameText}
                </h4>

                <p className="text-[11px] text-endurix-black/50 dark:text-muted-foreground line-clamp-2 leading-relaxed">
                    {assignment.training.description || t('calendar.customWorkout')}
                </p>
            </div>
        </Link>
    );
}

function StandaloneActivityCard({ activity }: { activity: Activity }) {
    const t = useTranslations();
    const label = activityTypeLabel[activity.type] || activity.type.toUpperCase();

    return (
        <Link href={`/activities/${activity.id}`} className="block group">
            <div className="bg-endurix-paper/50 dark:bg-muted/50 border border-endurix-black/8 dark:border-border border-l-2 border-l-endurix-orange p-4 flex flex-col gap-2 transition-colors hover:border-endurix-orange">
                <div className="flex items-center justify-between">
                    <span
                        className="text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 bg-endurix-orange/10 text-endurix-orange"
                        style={FONT_MONO}
                    >
                        {label}
                    </span>
                    <span
                        className="text-[8px] font-bold tracking-widest uppercase text-endurix-orange"
                        style={FONT_MONO}
                    >
                        {t('calendar.strava')}
                    </span>
                </div>

                <h4
                    className="text-sm font-bold text-endurix-black dark:text-foreground leading-tight line-clamp-2"
                    style={FONT_DISPLAY}
                >
                    {activity.title}
                </h4>

                <div className="flex items-center gap-3 text-[10px] text-endurix-black/70 dark:text-muted-foreground">
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
        <div className="bg-endurix-paper/50 dark:bg-muted/50 border border-endurix-black/8 dark:border-border border-l-2 border-l-endurix-orange p-4 flex flex-col gap-2 transition-colors hover:border-endurix-orange">
            <div className="flex items-center justify-between">
                <span
                    className="text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 bg-endurix-orange/10 text-endurix-orange flex items-center gap-1"
                    style={FONT_MONO}
                >
                    <Trophy className="h-2 w-2" />
                    {t('groups.targetRace')}
                </span>
                <span
                    className={cn(
                        'text-[8px] font-bold px-1.5 py-0.5 border tracking-widest uppercase',
                        race.priority === 'A'
                            ? 'text-endurix-orange border-endurix-orange/30'
                            : race.priority === 'B'
                                ? 'text-endurix-black/70 dark:text-muted-foreground border-endurix-black/20 dark:border-border'
                                : 'text-endurix-black/50 dark:text-muted-foreground border-endurix-black/15 dark:border-border',
                    )}
                    style={FONT_MONO}
                >
                    PRIO {race.priority}
                </span>
            </div>

            <h4
                className="text-sm font-bold text-endurix-black dark:text-foreground leading-tight line-clamp-2"
                style={FONT_DISPLAY}
            >
                {name}
            </h4>

            {race.target_time && (
                <p className="text-[10px] text-endurix-orange font-medium">
                    {t('races.athlete.target', { time: race.target_time })}
                </p>
            )}

            {race.status === 'COMPLETED' && race.result_time && (
                <div className="mt-1 py-1 px-2 bg-endurix-orange/10 text-[10px] font-bold text-endurix-orange">
                    {t('races.athlete.resultTime')}: {race.result_time}
                </div>
            )}
        </div>
    );
}

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
                        const dateValue = r.date;
                        return dateValue.split('T')[0] === dayStr;
                    });

                    const dayActivities = activities.filter(
                        (act) => format(new Date(act.start_date), 'yyyy-MM-dd') === dayStr,
                    );

                    let totalDistance = 0;
                    dayActivities.forEach((act) => { totalDistance += act.distance / 1000; });

                    const matchedActivityIds = new Set<string>();
                    const enrichedTrainings = dayTrainings.map((assignment) => {
                        const matchingActivity = dayActivities.find(
                            (act) =>
                                !matchedActivityIds.has(String(act.id)) &&
                                normalizeActivityType(act.type) === assignment.training.type,
                        );
                        if (matchingActivity) matchedActivityIds.add(String(matchingActivity.id));
                        const isCompleted = assignment.completed || !!matchingActivity;
                        return { assignment, matchingActivity: matchingActivity ?? null, isCompleted };
                    });

                    const standaloneActivities = dayActivities.filter((act) => !matchedActivityIds.has(String(act.id)));

                    const isEmpty = dayTrainings.length === 0 && standaloneActivities.length === 0 && dayRaces.length === 0;

                    return (
                        <div
                            key={day.toISOString()}
                            className={cn(
                                'flex flex-col gap-3 p-3 border transition-colors min-h-[400px]',
                                isToday
                                    ? 'bg-endurix-paper dark:bg-muted border-endurix-black/15 dark:border-border'
                                    : 'bg-transparent border-endurix-black/8 dark:border-border',
                            )}
                        >
                            <div className="flex justify-between items-baseline mb-2">
                                <div>
                                    <MonospaceLabel color="muted" size="sm" className="block leading-none mb-1">
                                        {format(day, 'EEE', { locale: es }).slice(0, 3)}
                                    </MonospaceLabel>
                                    <span
                                        className={cn(
                                            'text-xl sm:text-2xl leading-none',
                                            isToday
                                                ? 'text-endurix-orange'
                                                : 'text-endurix-black dark:text-foreground',
                                        )}
                                        style={FONT_DISPLAY}
                                    >
                                        {format(day, 'd')}
                                    </span>
                                </div>
                                <MonospaceLabel color="muted" size="xs">
                                    {totalDistance > 0
                                        ? t('common.distance_km', { distance: totalDistance.toFixed(1) })
                                        : t('common.distance_km', { distance: '0.0' })}
                                </MonospaceLabel>
                            </div>

                            <div className="space-y-3 flex-1">
                                {dayRaces.map((race) => (
                                    <RaceCard key={race.id} race={race} />
                                ))}

                                {isEmpty && (
                                    <div className="h-32 mt-6 border border-dashed border-endurix-black/15 dark:border-border flex flex-col gap-2 items-center justify-center bg-transparent">
                                        <Moon className="w-5 h-5 text-endurix-black/30 dark:text-muted-foreground/50" />
                                        <MonospaceLabel color="muted" size="xs">
                                            {t('calendar.restDay')}
                                        </MonospaceLabel>
                                    </div>
                                )}

                                {enrichedTrainings.map(({ assignment, matchingActivity, isCompleted }) =>
                                    isCompleted && matchingActivity ? (
                                        <CompletedCard
                                            key={assignment.id}
                                            assignment={assignment}
                                            activity={matchingActivity}
                                        />
                                    ) : (
                                        <PlannedCard key={assignment.id} assignment={assignment} />
                                    ),
                                )}

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
