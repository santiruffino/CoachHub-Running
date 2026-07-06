'use client';

import { addDays, addMonths, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { TrainingAssignment } from '@/interfaces/training';
import { Loader2, Users, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CalendarDayColumn } from '@/components/calendar/CalendarDayColumn';
import { CalendarRestDayPlaceholder } from '@/components/calendar/CalendarRestDayPlaceholder';
import { CALENDAR_WEEK_START, useCalendarView, type CalendarView } from '@/components/calendar/useCalendarView';

interface GroupWeeklyCalendarProps {
    groupId: string;
    assignments: TrainingAssignment[];
}

function GroupWorkoutCard({
    assignment,
    affectedCount,
    compact = false,
}: {
    assignment: TrainingAssignment;
    affectedCount: number
    compact?: boolean;
}) {
    const t = useTranslations();
    const typeText = assignment.training.type;
    const nameText = assignment.workout_name || assignment.training.title;

    return (
        <Link href={`/workouts/${assignment.id}?fromGroup=true`} className="block group">
            <div className={cn(
                'bg-endurix-paper dark:bg-card border border-endurix-black/10 dark:border-border flex flex-col gap-2 relative overflow-hidden transition-colors group-hover:border-endurix-orange/40',
                compact ? 'p-2' : 'p-4',
            )}>
                {/* Left accent */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-endurix-orange" />

                {/* Header row */}
                <div className={cn('flex items-center justify-between pl-2', compact && 'pl-1')}>
                    <span
                        className="px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest bg-endurix-orange/10 text-endurix-orange border border-endurix-orange/30"
                        style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                    >
                        {typeText}
                    </span>
                    <div
                        className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground uppercase tracking-wider"
                        style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                    >
                        <Users className="w-3 h-3" />
                        {affectedCount}
                    </div>
                </div>

                <h4
                    className={cn('font-medium text-foreground leading-tight px-2 line-clamp-2 uppercase', compact ? 'text-[10px]' : 'text-sm')}
                    style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                >
                    {nameText}
                </h4>

                <p className={cn('text-[11px] text-muted-foreground px-2 line-clamp-2 leading-relaxed', compact && 'text-[10px] line-clamp-1')}>
                    {assignment.training.description || t('calendar.customWorkout')}
                </p>

                <div className="mt-1 px-2">
                    <div className="h-0.5 w-full bg-endurix-black/10 dark:bg-border">
                        <div className="h-full bg-endurix-orange/60" style={{ width: '100%' }} />
                    </div>
                </div>
            </div>
        </Link>
    );
}

export function GroupWeeklyCalendar({ groupId, assignments }: GroupWeeklyCalendarProps) {
    const t = useTranslations();
    const { view, anchorDate, updateCalendar } = useCalendarView();

    const [calendarView, setCalendarView] = useState<CalendarView>(view);
    const [calendarAnchorDate, setCalendarAnchorDate] = useState(anchorDate);
    const [isSwitchingView, setIsSwitchingView] = useState(false);

    useEffect(() => {
        setCalendarView(view);
        setCalendarAnchorDate(anchorDate);
        setIsSwitchingView(false);
    }, [view, anchorDate]);

    const visibleStart = calendarView === 'month'
        ? startOfWeek(startOfMonth(calendarAnchorDate), CALENDAR_WEEK_START)
        : startOfWeek(calendarAnchorDate, CALENDAR_WEEK_START);

    const visibleDays = useMemo(
        () => Array.from({ length: calendarView === 'month' ? 42 : 7 }, (_, index) => addDays(visibleStart, index)),
        [calendarView, visibleStart],
    );

    const monthLabel = format(calendarAnchorDate, 'MMMM yyyy', { locale: es });
    const weekLabel = `${format(visibleStart, 'd MMM', { locale: es })} - ${format(addDays(visibleStart, 6), 'd MMM yyyy', { locale: es })}`;

    const handleUpdateCalendar = (nextView: CalendarView, nextDate: Date) => {
        setIsSwitchingView(true);
        setCalendarView(nextView);
        setCalendarAnchorDate(nextDate);
        updateCalendar(nextView, nextDate);
    };

    const handleNavigate = (direction: number) => {
        const nextDate = calendarView === 'month' ? addMonths(calendarAnchorDate, direction) : addDays(calendarAnchorDate, direction * 7);
        handleUpdateCalendar(calendarView, nextDate);
    };

    const handleToday = () => handleUpdateCalendar(calendarView, new Date());

    const addWorkoutHref = (date: string) => `/workouts/assign?groupId=${encodeURIComponent(groupId)}&date=${date}`;

    // Aggregate assignments by day and source_group_id/training_id
    const aggregatedAssignments = useMemo(() => {
        const result: Record<string, { assignment: TrainingAssignment; count: number }[]> = {};

        assignments.forEach((a) => {
            const dateValue = a.scheduled_date || a.scheduledDate;
            if (!dateValue) return;
            
            const dayStr = dateValue.split('T')[0];
            if (!result[dayStr]) result[dayStr] = [];

            // Find if we already have this group workout for this day
            // We identify group workouts by source_group_id and training_id
            const existing = result[dayStr].find(
                (item) => 
                    item.assignment.source_group_id === a.source_group_id && 
                    item.assignment.training.id === a.training.id
            );

            if (existing) {
                existing.count += 1;
            } else {
                result[dayStr].push({ assignment: a, count: 1 });
            }
        });

        return result;
    }, [assignments]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-3 bg-endurix-black/5 dark:bg-white/5 p-2 border border-endurix-black/10 dark:border-border flex-wrap">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleNavigate(-1)} className="h-8 w-8 border border-endurix-black/10 dark:border-border">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span
                        className="text-xs font-bold uppercase tracking-widest text-endurix-black dark:text-foreground min-w-[220px] text-center"
                        style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                    >
                        {calendarView === 'month' ? monthLabel : weekLabel}
                    </span>
                    <Button variant="ghost" size="icon" onClick={() => handleNavigate(1)} className="h-8 w-8 border border-endurix-black/10 dark:border-border">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                    <div className="inline-flex border border-endurix-black/10 dark:border-border overflow-hidden">
                        <button
                            type="button"
                            onClick={() => handleUpdateCalendar('week', calendarAnchorDate)}
                            disabled={isSwitchingView}
                            className={cn('h-8 px-3 text-[10px] font-bold uppercase tracking-widest inline-flex items-center gap-1 disabled:opacity-70', calendarView === 'week' ? 'bg-endurix-orange text-white' : 'bg-transparent text-muted-foreground')}
                            style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                        >
                            {isSwitchingView && calendarView === 'week' && <Loader2 className="h-3 w-3 animate-spin" />}
                            {t('calendar.week')}
                        </button>
                        <button
                            type="button"
                            onClick={() => handleUpdateCalendar('month', calendarAnchorDate)}
                            disabled={isSwitchingView}
                            className={cn('h-8 px-3 text-[10px] font-bold uppercase tracking-widest border-l border-endurix-black/10 dark:border-border inline-flex items-center gap-1 disabled:opacity-70', calendarView === 'month' ? 'bg-endurix-orange text-white' : 'bg-transparent text-muted-foreground')}
                            style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                        >
                            {isSwitchingView && calendarView === 'month' && <Loader2 className="h-3 w-3 animate-spin" />}
                            {t('calendar.month')}
                        </button>
                    </div>
                    <Button variant="outline-brand" size="sm" onClick={handleToday} className="h-8 text-[10px] font-bold uppercase tracking-wider">
                        {t('common.today')}
                    </Button>
                </div>
            </div>

            <div className="w-full overflow-x-auto pb-4">
                <div className="min-w-[1024px]">
                    {calendarView === 'month' && (
                        <div className="grid grid-cols-7 gap-px bg-endurix-black/10 dark:bg-border">
                            {Array.from({ length: 7 }, (_, index) => format(new Date(2024, 0, 1 + index), 'EEE', { locale: es })).map((label) => (
                                <div key={label} className="bg-endurix-paper dark:bg-card px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground text-center" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                                    {label}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className={calendarView === 'month' ? 'grid grid-cols-7 gap-px bg-endurix-black/10 dark:bg-border' : 'grid grid-cols-7 gap-4'}>
                        {visibleDays.map((day) => {
                            const isToday = isSameDay(day, new Date());
                            const isCurrentMonth = calendarView === 'month' ? isSameMonth(day, calendarAnchorDate) : true;
                            const dayStr = format(day, 'yyyy-MM-dd');
                            const dayWorkouts = aggregatedAssignments[dayStr] || [];

                            const header = (
                                <div className="mb-2">
                                    <span
                                        className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider block leading-none mb-1"
                                        style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                                    >
                                        {format(day, 'EEE', { locale: es }).slice(0, 3)}
                                    </span>
                                    <span
                                        className={cn(
                                            calendarView === 'month' ? 'text-lg font-medium leading-none' : 'text-xl font-medium leading-none',
                                            isToday ? 'text-endurix-orange' : 'text-foreground',
                                        )}
                                        style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                                    >
                                        {format(day, 'd')}
                                    </span>
                                </div>
                            );

                            const monthContent = (
                                <div className="space-y-2 flex-1">
                                    {dayWorkouts.length === 0 ? (
                                        <CalendarRestDayPlaceholder
                                            className="min-h-[92px] border border-dashed border-endurix-black/15 dark:border-white/15 flex flex-col gap-2 items-center justify-center bg-transparent opacity-50"
                                            iconClassName="w-4 h-4 text-muted-foreground/30"
                                            label={
                                                <div className="flex flex-col items-center gap-2">
                                                    <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-widest">{t('calendar.restDay')}</span>
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
                                                {dayWorkouts.slice(0, 2).map(({ assignment, count }) => (
                                                    <GroupWorkoutCard
                                                        key={assignment.id}
                                                        assignment={assignment}
                                                        affectedCount={count}
                                                        compact
                                                    />
                                                ))}
                                            </div>
                                            {dayWorkouts.length > 2 && (
                                                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground" style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}>
                                                    +{dayWorkouts.length - 2} more
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            );

                            const weekContent = (
                                <div className="space-y-3 flex-1">
                                    {dayWorkouts.length === 0 ? (
                                        <CalendarRestDayPlaceholder
                                            className="h-32 mt-6 border border-dashed border-endurix-black/15 dark:border-white/15 flex flex-col gap-2 items-center justify-center bg-transparent opacity-50"
                                            iconClassName="w-4 h-4 text-muted-foreground/30"
                                            label={
                                                <div className="flex flex-col items-center gap-2">
                                                    <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-widest">{t('calendar.restDay')}</span>
                                                    <Button asChild size="sm" variant="outline" className="h-6 min-w-16 px-3 rounded-sm border-endurix-orange/30 text-endurix-orange hover:bg-endurix-orange/10">
                                                        <Link href={addWorkoutHref(dayStr)} aria-label={t('common.addWorkout')} title={t('common.addWorkout')}>
                                                            <Plus className="h-3.5 w-3.5" />
                                                        </Link>
                                                    </Button>
                                                </div>
                                            }
                                        />
                                    ) : (
                                        dayWorkouts.map(({ assignment, count }) => (
                                            <GroupWorkoutCard
                                                key={assignment.id}
                                                assignment={assignment}
                                                affectedCount={count}
                                                compact
                                            />
                                        ))
                                    )}
                                </div>
                            );

                            return (
                                <CalendarDayColumn
                                    key={day.toISOString()}
                                    className={cn(
                                        'flex flex-col gap-3 p-3 transition-colors min-h-[400px] border-l-2',
                                        calendarView === 'month'
                                            ? 'bg-endurix-paper dark:bg-card min-h-[165px] border-l-0 border'
                                            : isToday ? 'bg-endurix-black/5 dark:bg-white/5 border-l-endurix-orange' : 'bg-transparent border-l-transparent',
                                    )}
                                    style={calendarView === 'month' && !isCurrentMonth ? { opacity: 0.45 } : undefined}
                                    view={calendarView}
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
