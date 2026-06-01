'use client';

import { Calendar, dateFnsLocalizer, View, EventProps } from 'react-big-calendar';
import { format } from 'date-fns/format';
import { parse } from 'date-fns/parse';
import { startOfWeek } from 'date-fns/startOfWeek';
import { getDay } from 'date-fns/getDay';
import { enUS } from 'date-fns/locale/en-US';
import { es } from 'date-fns/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useState } from 'react';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { Trophy } from 'lucide-react';
import { useLocale } from 'next-intl';

const locales = {
    'en-US': enUS,
    'es': es,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

const DragAndDropCalendar = withDragAndDrop<CalendarEvent, object>(Calendar);

export interface CalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    resource?: {
        type: 'PLANNED' | 'COMPLETED' | 'RACE';
        description?: string;
        details?: unknown;
    };
}

interface CalendarDropArgs {
    event: CalendarEvent;
    start: Date | string;
}

interface CalendarViewProps {
    events: CalendarEvent[];
    onDateChange: (range: { start: Date; end: Date }) => void;
    onEventDrop?: (args: CalendarDropArgs) => void;
    onSelectEvent?: (event: CalendarEvent) => void;
}

const CustomEvent = ({ event }: EventProps<CalendarEvent>) => {
    const isRace = event.resource?.type === 'RACE';
    
    return (
        <div className="flex items-center gap-1 overflow-hidden">
            {isRace && <Trophy className="h-3 w-3 shrink-0" />}
            <span className="truncate">{event.title}</span>
        </div>
    );
};

export function CalendarView({ events, onDateChange, onEventDrop, onSelectEvent }: CalendarViewProps) {
    const locale = useLocale();
    const [view, setView] = useState<View>('week');
    const [date, setDate] = useState(new Date());

    const handleNavigate = (newDate: Date) => {
        setDate(newDate);
        const start = new Date(newDate.getFullYear(), newDate.getMonth(), 1);
        const end = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0);
        onDateChange({ start, end });
    };

    const handleViewChange = (newView: View) => {
        setView(newView);
    };

    const eventStyleGetter = (event: CalendarEvent) => {
        const type = event.resource?.type;
        let backgroundColor = '#1A1A1A';

        if (type === 'COMPLETED') {
            backgroundColor = '#FF6800';
        } else if (type === 'RACE') {
            backgroundColor = '#1A1A1A';
        }

        return {
            style: {
                backgroundColor,
                borderRadius: '2px',
                opacity: 1,
                color: 'white',
                border: '0px',
                display: 'block',
                fontWeight: type === 'RACE' ? '700' : '500',
                borderLeft: type === 'RACE' ? '3px solid #FF6800' : 'none',
                fontFamily: 'var(--font-ibm-plex-mono, monospace)',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                padding: '2px 4px',
            }
        };
    };

    return (
        <div className="h-[calc(100vh-200px)] w-full bg-endurix-paper dark:bg-card p-4 border border-endurix-black/10 dark:border-border">
            <DragAndDropCalendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                view={view}
                date={date}
                culture={locale}
                onNavigate={handleNavigate}
                onView={handleViewChange}
                views={['month', 'week', 'day']}
                selectable
                onEventDrop={onEventDrop}
                onSelectEvent={onSelectEvent}
                eventPropGetter={eventStyleGetter}
                resizable={false}
                components={{
                    event: CustomEvent
                }}
            />
        </div>
    );
}
