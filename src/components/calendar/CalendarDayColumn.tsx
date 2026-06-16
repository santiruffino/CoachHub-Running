'use client';

import type { CSSProperties, ReactNode } from 'react';
import type { CalendarView } from './useCalendarView';

interface CalendarDayColumnProps {
    className: string;
    style?: CSSProperties;
    view: CalendarView;
    header: ReactNode;
    monthContent: ReactNode;
    weekContent: ReactNode;
}

export function CalendarDayColumn({
    className,
    style,
    view,
    header,
    monthContent,
    weekContent,
}: CalendarDayColumnProps) {
    return (
        <div className={className} style={style}>
            {header}
            {view === 'month' ? monthContent : weekContent}
        </div>
    );
}
