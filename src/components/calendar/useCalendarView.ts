'use client';

import { addDays, addMonths, format, parseISO, startOfMonth, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export const CALENDAR_VIEW_PARAM = 'calendarView';
export const CALENDAR_DATE_PARAM = 'calendarDate';
export const CALENDAR_WEEK_START = { weekStartsOn: 1 } as const;

export type CalendarView = 'week' | 'month';

interface UseCalendarViewOptions {
    fallbackDate?: Date;
}

export function useCalendarView({ fallbackDate }: UseCalendarViewOptions = {}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const view: CalendarView = searchParams.get(CALENDAR_VIEW_PARAM) === 'month' ? 'month' : 'week';

    const anchorDate = useMemo(() => {
        const rawDate = searchParams.get(CALENDAR_DATE_PARAM);
        if (!rawDate) return fallbackDate ?? new Date();

        const parsed = parseISO(rawDate);
        return Number.isNaN(parsed.getTime()) ? (fallbackDate ?? new Date()) : parsed;
    }, [fallbackDate, searchParams]);

    const updateCalendar = useCallback(
        (nextView: CalendarView, nextDate: Date) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set(CALENDAR_VIEW_PARAM, nextView);
            params.set(CALENDAR_DATE_PARAM, format(nextDate, 'yyyy-MM-dd'));
            router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        },
        [pathname, router, searchParams],
    );

    const visibleStart = view === 'month'
        ? startOfWeek(startOfMonth(anchorDate), CALENDAR_WEEK_START)
        : startOfWeek(anchorDate, CALENDAR_WEEK_START);

    const visibleDays = useMemo(
        () => Array.from({ length: view === 'month' ? 42 : 7 }, (_, index) => addDays(visibleStart, index)),
        [view, visibleStart],
    );

    const monthLabel = format(anchorDate, 'MMMM yyyy', { locale: es });
    const weekLabel = `${format(visibleStart, 'd MMM', { locale: es })} - ${format(addDays(visibleStart, 6), 'd MMM yyyy', { locale: es })}`;

    const navigate = useCallback(
        (direction: number) => {
            const nextDate = view === 'month' ? addMonths(anchorDate, direction) : addDays(anchorDate, direction * 7);
            updateCalendar(view, nextDate);
        },
        [anchorDate, updateCalendar, view],
    );

    const goToday = useCallback(() => updateCalendar(view, new Date()), [updateCalendar, view]);

    return {
        view,
        anchorDate,
        visibleStart,
        visibleDays,
        monthLabel,
        weekLabel,
        updateCalendar,
        navigate,
        goToday,
    };
}
