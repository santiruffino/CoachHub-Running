'use client';

import { useMemo } from 'react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { es } from 'date-fns/locale';

interface WeekCalendarProps {
    date: Date;
    onDateSelect: (date: Date) => void;
    events: {
        date: Date;
        hasPlanned?: boolean;
        hasCompleted?: boolean;
    }[];
}

export function WeekCalendar({ date, onDateSelect, events }: WeekCalendarProps) {
    const currentWeekStart = useMemo(() => startOfWeek(date, { weekStartsOn: 1 }), [date]);

    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));

    const handlePrevWeek = () => onDateSelect(addDays(date, -7));
    const handleNextWeek = () => onDateSelect(addDays(date, 7));

    return (
        <div className="bg-endurix-paper dark:bg-card p-3 sm:p-4 border border-endurix-black/10 dark:border-border">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
                <span
                    className="text-lg font-semibold capitalize text-endurix-black dark:text-foreground"
                    style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                >
                    {format(currentWeekStart, 'MMMM yyyy', { locale: es })}
                </span>
                <div className="flex gap-2">
                    <button onClick={handlePrevWeek} className="p-1 hover:bg-endurix-black/8 dark:hover:bg-white/8">
                        <ChevronLeft className="w-5 h-5 text-muted-foreground" />
                    </button>
                    <button onClick={handleNextWeek} className="p-1 hover:bg-endurix-black/8 dark:hover:bg-white/8">
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-1">
                {weekDays.map((day) => {
                    const isSelected = isSameDay(day, date);
                    const isToday = isSameDay(day, new Date());

                    // Find events for this day
                    const dayEvents = events.filter(e => isSameDay(e.date, day));
                    const hasPlanned = dayEvents.some(e => e.hasPlanned);
                    const hasCompleted = dayEvents.some(e => e.hasCompleted);

                    return (
                        <div key={day.toISOString()} className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => onDateSelect(day)}>
                            <span
                                className="text-xs text-muted-foreground capitalize uppercase tracking-wider"
                                style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                            >
                                {format(day, 'EEEEE', { locale: es })}
                            </span>
                            <div className={cn(
                                "flex flex-col items-center justify-center w-9 h-9 sm:w-10 sm:h-10 transition-all relative",
                                isSelected
                                    ? "bg-endurix-orange text-white"
                                    : "text-endurix-black dark:text-foreground hover:bg-endurix-black/8 dark:hover:bg-white/8",
                                isToday && !isSelected && "bg-endurix-orange/10 text-endurix-orange font-bold border border-endurix-orange/30"
                            )}>
                                <span
                                    className="text-sm font-medium"
                                    style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                                >
                                    {format(day, 'd')}
                                </span>

                                {/* Event indicators - show both if both exist */}
                                {!isSelected && (hasPlanned || hasCompleted) && (
                                    <div className="absolute -bottom-1 flex gap-0.5">
                                        {hasPlanned && (
                                            <div className="w-1 h-1 bg-endurix-black" />
                                        )}
                                        {hasCompleted && (
                                            <div className="w-1 h-1 bg-endurix-orange" />
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
