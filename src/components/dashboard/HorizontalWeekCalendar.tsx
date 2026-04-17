'use client';

import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface HorizontalWeekCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  weekStart: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  events?: {
    date: Date;
    hasEvent?: boolean;
    type?: 'planned' | 'completed';
  }[];
}

export function HorizontalWeekCalendar({
  selectedDate,
  onDateSelect,
  weekStart,
  onPrevWeek,
  onNextWeek,
  events = [],
}: HorizontalWeekCalendarProps) {
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  return (
    <div className="flex items-center justify-between gap-4">
      <button
        onClick={onPrevWeek}
        className="p-1 hover:bg-muted rounded-full transition-colors"
      >
        <ChevronLeft className="w-5 h-5 text-muted-foreground" />
      </button>

      <div className="flex-1 grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());
          const hasEvent = events.some((e) => isSameDay(e.date, day));

          return (
            <button
              key={day.toISOString()}
              onClick={() => onDateSelect(day)}
              className={cn(
                'flex flex-col items-center gap-1 py-2 rounded-lg transition-all',
                isSelected && 'bg-primary text-primary-foreground',
                !isSelected && 'hover:bg-muted'
              )}
            >
              <span className={cn(
                'text-xs uppercase font-medium',
                isSelected ? 'text-primary-foreground' : 'text-muted-foreground'
              )}>
                {format(day, 'EEE', { locale: es }).slice(0, 3)}
              </span>
              <span className={cn(
                'text-lg font-bold',
                isToday && !isSelected && 'text-primary'
              )}>
                {format(day, 'd')}
              </span>
              <div className="flex gap-1 mt-1">
                {events
                  .filter(e => isSameDay(e.date, day))
                  .map((e, i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        e.type === 'completed' ? "bg-blue-500" : "bg-orange-500"
                      )}
                    />
                  ))}
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={onNextWeek}
        className="p-1 hover:bg-muted rounded-full transition-colors"
      >
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </button>
    </div>
  );
}
