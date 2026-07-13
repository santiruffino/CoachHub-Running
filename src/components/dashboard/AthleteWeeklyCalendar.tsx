'use client';

import { format, isSameDay, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { TrainingAssignment } from '@/interfaces/training';
import { AthleteRace } from '@/interfaces/race';
import { Activity } from '@/interfaces/activity';
import { ChevronLeft, ChevronRight, CalendarDays, CircleCheckBig, ActivitySquare, Medal, Plus } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { normalizeActivityType } from '@/utils/activity-utils';
import { MonospaceLabel } from '@/components/dashboard';
import { CalendarDayColumn } from '@/components/calendar/CalendarDayColumn';
import { CalendarRestDayPlaceholder } from '@/components/calendar/CalendarRestDayPlaceholder';
import { useCalendarView, CALENDAR_WEEK_START, type CalendarView } from '@/components/calendar/useCalendarView';
import { WeekClipboardControls } from '@/features/plans/components/WeekClipboardControls';
import { startOfWeek } from 'date-fns';
import type { ReactNode } from 'react';

const FONT_MONO = { fontFamily: 'var(--font-ibm-plex-mono, monospace)' } as const;
const FONT_DISPLAY = { fontFamily: 'var(--font-exo-2, sans-serif)' } as const;
interface AthleteWeeklyCalendarProps {
    weekStart?: Date;
    athleteId?: string;
    assignments: TrainingAssignment[];
    activities: Activity[];
    races?: AthleteRace[];
    /** Coach-facing: enables the copy/paste-week controls. */
    canManage?: boolean;
}

const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
};

function CompactMonthCard({
    href,
    label,
    title,
    meta,
    tone,
    icon,
}: {
    href?: string;
    label: string;
    title: string;
    meta?: string;
    tone: 'planned' | 'completed' | 'activity' | 'race';
    icon: ReactNode;
}) {
    const content = (
        <div
            className={cn(
                'rounded-none border p-2 text-left flex flex-col gap-1 transition-colors min-h-[76px]',
                tone === 'completed' && 'bg-white dark:bg-card border-endurix-orange/30 border-l-2 border-l-endurix-orange',
                tone === 'planned' && 'bg-endurix-paper/60 dark:bg-muted/50 border-endurix-black/10 dark:border-border',
                tone === 'activity' && 'bg-endurix-paper/60 dark:bg-muted/50 border-endurix-orange/30 border-l-2 border-l-endurix-orange',
                tone === 'race' && 'bg-endurix-orange/10 border-endurix-orange/30 border-l-2 border-l-endurix-orange',
            )}
        >
            <div className="flex items-center justify-between gap-2">
                <span className="text-[8px] font-bold uppercase tracking-widest" style={FONT_MONO}>
                    {label}
                </span>
                <span className="text-endurix-orange shrink-0">{icon}</span>
            </div>
            <div className="text-[11px] font-semibold text-endurix-black dark:text-foreground leading-tight line-clamp-2 uppercase" style={FONT_DISPLAY}>
                {title}
            </div>
            {meta && <div className="text-[9px] text-endurix-black/60 dark:text-muted-foreground uppercase tracking-wider line-clamp-1" style={FONT_MONO}>{meta}</div>}
        </div>
    );

    return href ? (
        <Link href={href} className="block group">
            {content}
        </Link>
    ) : content;
}

export function AthleteWeeklyCalendar({ weekStart, athleteId, assignments, activities, races = [], canManage = false }: AthleteWeeklyCalendarProps) {
    const t = useTranslations();
    const { view, anchorDate, visibleDays, monthLabel, weekLabel, updateCalendar, navigate, goToday } = useCalendarView({
        fallbackDate: weekStart,
    });
    const targetAthleteId = athleteId || assignments[0]?.athlete?.id || assignments[0]?.user?.id || null;
    const visibleWeekMonday = format(startOfWeek(anchorDate, CALENDAR_WEEK_START), 'yyyy-MM-dd');
    const addWorkoutHref = (date: string) => (
        targetAthleteId
            ? `/workouts/assign?athleteId=${encodeURIComponent(targetAthleteId)}&date=${date}`
            : `/workouts/assign?date=${date}`
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 bg-endurix-black/5 dark:bg-white/5 p-2 border border-endurix-black/10 dark:border-border flex-wrap">
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                        <button type="button" onClick={() => navigate(-1)} className="h-8 w-8 border border-endurix-black/10 dark:border-border flex items-center justify-center hover:border-endurix-orange/40 transition-colors" aria-label={t('common.previous')}>
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => navigate(1)} className="h-8 w-8 border border-endurix-black/10 dark:border-border flex items-center justify-center hover:border-endurix-orange/40 transition-colors" aria-label={t('common.next')}>
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                    <span className="text-xs font-bold tracking-widest uppercase text-endurix-black dark:text-foreground min-w-[220px] text-center" style={FONT_DISPLAY}>
                        {view === 'month' ? monthLabel : weekLabel}
                    </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap justify-end">
                    <div className="inline-flex border border-endurix-black/10 dark:border-border overflow-hidden">
                        <button
                            type="button"
                            onClick={() => updateCalendar('week', anchorDate)}
                            className={cn('h-8 px-3 text-[10px] font-bold uppercase tracking-widest', view === 'week' ? 'bg-endurix-orange text-white' : 'bg-transparent text-muted-foreground')}
                            style={FONT_MONO}
                        >
                            {t('calendar.week')}
                        </button>
                        <button
                            type="button"
                            onClick={() => updateCalendar('month', anchorDate)}
                            className={cn('h-8 px-3 text-[10px] font-bold uppercase tracking-widest border-l border-endurix-black/10 dark:border-border', view === 'month' ? 'bg-endurix-orange text-white' : 'bg-transparent text-muted-foreground')}
                            style={FONT_MONO}
                        >
                            {t('calendar.month')}
                        </button>
                    </div>
                    <button type="button" onClick={goToday} className="h-8 px-3 border border-endurix-black/10 dark:border-border text-[10px] font-bold uppercase tracking-widest hover:border-endurix-orange/40 transition-colors" style={FONT_MONO}>
                        {t('common.today')}
                    </button>
                    {canManage && view === 'week' && targetAthleteId && (
                        <WeekClipboardControls
                            sourceUserId={targetAthleteId}
                            weekStartStr={visibleWeekMonday}
                            athleteLabel={assignments[0]?.athlete?.name || assignments[0]?.user?.name || undefined}
                        />
                    )}
                </div>
            </div>

            <div className="w-full overflow-x-auto pb-4">
                <div className="min-w-[1024px]">
                    {view === 'month' && (
                        <div className="grid grid-cols-7 gap-px bg-endurix-black/10 dark:bg-border">
                            {Array.from({ length: 7 }, (_, index) => format(new Date(2024, 0, 1 + index), 'EEE', { locale: es })).map((label) => (
                                <div key={label} className="bg-endurix-paper dark:bg-card px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground text-center" style={FONT_MONO}>
                                    {label}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className={view === 'month' ? 'grid grid-cols-7 gap-px bg-endurix-black/10 dark:bg-border' : 'grid grid-cols-7 gap-4'}>
                        {visibleDays.map((day) => {
                            const isToday = isSameDay(day, new Date());
                            const isCurrentMonth = view === 'month' ? isSameMonth(day, anchorDate) : true;
                            const dayStr = format(day, 'yyyy-MM-dd');

                            const dayTrainings = assignments.filter((a) => {
                                const dateValue = a.scheduled_date || a.scheduledDate;
                                return dateValue.split('T')[0] === dayStr;
                            });

                            const dayRaces = races.filter((r) => r.date.split('T')[0] === dayStr);

                            const dayActivities = Array.from(
                                new Map(
                                    activities
                                        .filter((act) => format(new Date(act.start_date), 'yyyy-MM-dd') === dayStr)
                                        .map((act) => [String(act.id), act]),
                                ).values(),
                            );

                            const totalDistance = dayActivities.reduce((acc, act) => acc + (act.distance / 1000), 0);

                            const matchedActivityIds = new Set<string>();
                            const enrichedTrainings = dayTrainings.map((assignment) => {
                                const matchingActivity = dayActivities.find(
                                    (act) => !matchedActivityIds.has(String(act.id)) && normalizeActivityType(act.type) === assignment.training.type,
                                );

                                if (matchingActivity) matchedActivityIds.add(String(matchingActivity.id));

                                return {
                                    assignment,
                                    matchingActivity: matchingActivity ?? null,
                                    isCompleted: assignment.completed || !!matchingActivity,
                                };
                            });

                            const standaloneActivities = dayActivities.filter((act) => !matchedActivityIds.has(String(act.id)));
                            const monthItems = [
                                ...dayRaces.map((race) => ({ type: 'race' as const, race, id: `race-${race.id}` })),
                                ...enrichedTrainings.map((item) => ({ type: 'training' as const, ...item, id: `assignment-${item.assignment.id}` })),
                                ...standaloneActivities.map((activity) => ({ type: 'activity' as const, activity, id: `activity-${activity.id}` })),
                            ];

                            const isEmpty = monthItems.length === 0;

                            const renderCompactItem = (item: (typeof monthItems)[number]) => {
                                if (item.type === 'race') {
                                    const raceName = item.race.name_override || item.race.race?.name || t('races.athlete.defaultRaceName');
                                    return (
                                        <CompactMonthCard
                                            key={item.id}
                                            tone="race"
                                            label={t('calendar.race')}
                                            title={raceName}
                                            meta={item.race.target_time ? t('races.athlete.target', { time: item.race.target_time }) : undefined}
                                            icon={<Medal className="h-3 w-3" />}
                                        />
                                    );
                                }

                                if (item.type === 'training') {
                                    const nameText = item.assignment.workout_name || item.assignment.training.title;
                                    return item.isCompleted && item.matchingActivity ? (
                                        <CompactMonthCard
                                            key={item.id}
                                            href={`/activities/${item.matchingActivity.id}`}
                                            tone="completed"
                                            label={t('calendar.done')}
                                            title={nameText}
                                            meta={item.matchingActivity.duration > 0 ? formatDuration(item.matchingActivity.duration) : undefined}
                                            icon={<CircleCheckBig className="h-3 w-3" />}
                                        />
                                    ) : (
                                        <CompactMonthCard
                                            key={item.id}
                                            href={`/workouts/${item.assignment.id}`}
                                            tone="planned"
                                            label={t(`dashboard.trainingTypes.${item.assignment.training.type}`)}
                                            title={nameText}
                                            icon={<CalendarDays className="h-3 w-3" />}
                                        />
                                    );
                                }

                                return (
                                    <CompactMonthCard
                                        key={item.id}
                                        href={`/activities/${item.activity.id}`}
                                        tone="activity"
                                        label={t('calendar.strava')}
                                        title={item.activity.title}
                                        meta={item.activity.duration > 0 ? formatDuration(item.activity.duration) : undefined}
                                        icon={<ActivitySquare className="h-3 w-3" />}
                                    />
                                );
                            };

                            const header = (
                                <div className="flex justify-between items-baseline mb-2">
                                    <div>
                                        <MonospaceLabel color="muted" size="sm" className="block leading-none mb-1">
                                            {format(day, 'EEE', { locale: es }).slice(0, 3)}
                                        </MonospaceLabel>
                                        <span
                                            className={cn(
                                                view === 'month' ? 'text-lg leading-none' : 'text-xl sm:text-2xl leading-none',
                                                isToday ? 'text-endurix-orange' : 'text-endurix-black dark:text-foreground',
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
                            );

                            const monthContent = (
                                <div className="space-y-2 flex-1">
                                    {isEmpty ? (
                                        <CalendarRestDayPlaceholder
                                            className="min-h-[92px] border border-dashed border-endurix-black/15 dark:border-border flex flex-col gap-2 items-center justify-center bg-transparent"
                                            iconClassName="w-4 h-4 text-endurix-black/30 dark:text-muted-foreground/50"
                                        label={
                                                <div className="flex flex-col items-center gap-2">
                                                    <MonospaceLabel color="muted" size="xs">
                                                        {t('calendar.restDay')}
                                                    </MonospaceLabel>
                                                    <Button asChild size="sm" variant="outline" className="h-6 min-w-16 px-3 rounded-sm border-endurix-orange/30 text-endurix-orange hover:bg-endurix-orange/10">
                                                        <Link href={addWorkoutHref(dayStr)} aria-label={t('common.addWorkout')} title={t('common.addWorkout')}>
                                                            <Plus className="h-3.5 w-3.5" />
                                                        </Link>
                                                    </Button>
                                                </div>
                                            }
                                        />
                                    ) : (
                                        <>
                                            <div className="space-y-2">
                                                {monthItems.slice(0, 3).map((item) => renderCompactItem(item))}
                                            </div>
                                            {monthItems.length > 3 && (
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground" style={FONT_MONO}>
                                                    {t('calendar.moreItems', { count: monthItems.length - 3 })}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            );

                            const weekContent = (
                                <div className="space-y-3 flex-1">
                                    {monthItems.map((item) => renderCompactItem(item))}

                                    {isEmpty && (
                                        <CalendarRestDayPlaceholder
                                            className="h-32 mt-6 border border-dashed border-endurix-black/15 dark:border-border flex flex-col gap-2 items-center justify-center bg-transparent"
                                            iconClassName="w-5 h-5 text-endurix-black/30 dark:text-muted-foreground/50"
                                            label={
                                                <div className="flex flex-col items-center gap-2">
                                                    <MonospaceLabel color="muted" size="xs">
                                                        {t('calendar.restDay')}
                                                    </MonospaceLabel>
                                                    <Button asChild size="sm" variant="outline" className="h-6 min-w-16 px-3 rounded-sm border-endurix-orange/30 text-endurix-orange hover:bg-endurix-orange/10">
                                                        <Link href={addWorkoutHref(dayStr)} aria-label={t('common.addWorkout')} title={t('common.addWorkout')}>
                                                            <Plus className="h-3.5 w-3.5" />
                                                        </Link>
                                                    </Button>
                                                </div>
                                            }
                                        />
                                    )}
                                </div>
                            );

                            return (
                                <CalendarDayColumn
                                    key={day.toISOString()}
                                    className={cn(
                                        'flex flex-col gap-3 p-3 border transition-colors min-h-[400px]',
                                        view === 'month'
                                            ? 'bg-endurix-paper dark:bg-card min-h-[165px] border-0'
                                            : isToday
                                                ? 'bg-endurix-paper dark:bg-muted border-endurix-black/15 dark:border-border'
                                                : 'bg-transparent border-endurix-black/8 dark:border-border',
                                    )}
                                    style={view === 'month' && !isCurrentMonth ? { opacity: 0.45 } : undefined}
                                    view={view as CalendarView}
                                    header={header}
                                    monthContent={monthContent}
                                    weekContent={weekContent}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
