'use client';

import { Calendar, dateFnsLocalizer, View, EventProps } from 'react-big-calendar';
import { format } from 'date-fns/format';
import { parse } from 'date-fns/parse';
import { startOfWeek } from 'date-fns/startOfWeek';
import { getDay } from 'date-fns/getDay';
import { enUS } from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useState } from 'react';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { Trophy } from 'lucide-react';

const locales = {
    'en-US': enUS,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

const DragAndDropCalendar = withDragAndDrop(Calendar);

export interface CalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    resource?: {
        type: 'PLANNED' | 'COMPLETED' | 'RACE';
        description?: string;
        details?: any;
    };
}

interface CalendarViewProps {
    events: CalendarEvent[];
    onDateChange: (range: { start: Date; end: Date }) => void;
    onEventDrop?: (args: any) => void;
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
        let backgroundColor = '#3b82f6'; // Default Blue for Planned
        
        if (type === 'COMPLETED') {
            backgroundColor = '#f97316'; // Orange for Completed
        } else if (type === 'RACE') {
            backgroundColor = '#8b5cf6'; // Violet for Race
        }

        return {
            style: {
                backgroundColor,
                borderRadius: '4px',
                opacity: 0.9,
                color: 'white',
                border: '0px',
                display: 'block',
                fontWeight: type === 'RACE' ? '700' : '400'
            }
        };
    };

    return (
        <div className="h-[calc(100vh-200px)] w-full bg-white p-4 rounded-lg shadow-sm">
            <DragAndDropCalendar
                localizer={localizer}
                events={events}
                startAccessor={(event: any) => event.start}
                endAccessor={(event: any) => event.end}
                style={{ height: '100%' }}
                view={view}
                date={date}
                onNavigate={handleNavigate}
                onView={handleViewChange}
                views={['month', 'week', 'day']}
                selectable
                onEventDrop={onEventDrop}
                onSelectEvent={onSelectEvent as any}
                eventPropGetter={eventStyleGetter as any}
                resizable={false}
                components={{
                    event: CustomEvent
                }}
            />
        </div>
    );
}
