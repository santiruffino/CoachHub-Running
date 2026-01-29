'use client';

import { useState, useEffect } from 'react';
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
    const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

    // Sync internal state if external date changes significantly (optional, but good UX)
    useEffect(() => {
        const weekStart = startOfWeek(date, { weekStartsOn: 1 });
        if (format(weekStart, 'yyyy-MM-dd') !== format(currentWeekStart, 'yyyy-MM-dd')) {
            setCurrentWeekStart(weekStart);
        }
    }, [date, currentWeekStart]);

    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));

    const handlePrevWeek = () => setCurrentWeekStart(prev => addDays(prev, -7));
    const handleNextWeek = () => setCurrentWeekStart(prev => addDays(prev, 7));

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-3 sm:p-4 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
                <span className="text-lg font-semibold capitalize text-gray-900 dark:text-white">
                    {format(currentWeekStart, 'MMMM yyyy', { locale: es })}
                </span>
                <div className="flex gap-2">
                    <button onClick={handlePrevWeek} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                        <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                    <button onClick={handleNextWeek} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                        <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
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
                            <span className="text-xs text-gray-400 dark:text-gray-500 capitalize">
                                {format(day, 'EEEEE', { locale: es })}
                            </span>
                            <div className={cn(
                                "flex flex-col items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full transition-all relative",
                                isSelected ? "bg-orange-500 text-white shadow-md scale-110" : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700",
                                isToday && !isSelected && "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-bold"
                            )}>
                                <span className="text-sm font-medium">{format(day, 'd')}</span>

                                {/* Event indicators - show both if both exist */}
                                {!isSelected && (hasPlanned || hasCompleted) && (
                                    <div className="absolute -bottom-1 flex gap-0.5">
                                        {hasPlanned && (
                                            <div className="w-1 h-1 bg-blue-500 rounded-full" />
                                        )}
                                        {hasCompleted && (
                                            <div className="w-1 h-1 bg-orange-500 rounded-full" />
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
