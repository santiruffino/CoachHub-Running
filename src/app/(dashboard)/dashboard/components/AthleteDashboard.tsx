import { useState, useEffect, useMemo } from 'react';
import api from '@/lib/axios';
import { isSameDay, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { WeekCalendar } from '@/features/calendar/components/WeekCalendar';
import { SessionList, SessionData } from '@/features/calendar/components/SessionList';
import { WeeklySummary } from '@/features/calendar/components/WeeklySummary';
import { WeeklyVolumeChart } from '@/features/strava/components/WeeklyVolumeChart';

export default function AthleteDashboard({ user }: { user: any }) {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [allSessions, setAllSessions] = useState<SessionData[]>([]);
    const [eventsIndicator, setEventsIndicator] = useState<{ date: Date; hasEvent: boolean }[]>([]);

    const fetchData = async () => {
        try {
            const [activitiesRes, assignmentsRes] = await Promise.all([
                api.get(`/v2/users/${user.id}/activities`),
                api.get(`/v2/users/assignments`)
            ]);


            const activitySessions: SessionData[] = activitiesRes.data.map((act: any) => ({
                id: `act-${act.id}`,
                type: 'COMPLETED',
                title: act.title,
                subtitle: act.type,
                date: new Date(act.start_date),
                stats: {
                    distance: act.distance,
                    duration: act.duration,
                    pace: act.distance > 0 ? `${Math.floor(act.duration / (act.distance / 1000) / 60)}:${Math.floor((act.duration / (act.distance / 1000)) % 60).toString().padStart(2, '0')}` : '0:00',
                    elevation: act.elevation_gain || 0
                }
            }));

            const assignmentSessions: SessionData[] = assignmentsRes.data.map((assign: any) => ({
                id: assign.id,
                type: 'PLANNED',
                title: assign.training.title,
                subtitle: assign.training.type,
                description: assign.training.description,
                // Parse UTC date string components to create Local Date at midnight
                date: (() => {
                    const [y, m, d] = assign.scheduled_date.split('T')[0].split('-').map(Number);
                    return new Date(y, m - 1, d);
                })(),
                stats: {
                    distance: 10000,
                    duration: 3600
                }
            }));


            const merged = [...activitySessions, ...assignmentSessions];
            setAllSessions(merged);

            // Pre-calculate days with events for the calendar indicators
            setEventsIndicator(merged.map(s => ({ date: s.date as Date, hasEvent: true })));

        } catch (error) {
            console.error('Failed to fetch dashboard data', error);
        }
    };

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    // Calculate Weekly Summary
    const weeklyStats = useMemo(() => {
        const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
        const end = endOfWeek(selectedDate, { weekStartsOn: 1 });

        const weekSessions = allSessions.filter(s =>
            // @ts-ignore
            isWithinInterval(s.date, { start, end })
        );

        return weekSessions.reduce((acc, session) => {
            if (session.type === 'PLANNED') {
                acc.distance.planned += (session.stats?.distance || 0) / 1000;
                acc.duration.planned += (session.stats?.duration || 0) / 60;
            } else {
                acc.distance.completed += (session.stats?.distance || 0) / 1000;
                acc.duration.completed += (session.stats?.duration || 0) / 60;
                acc.elevation.completed += (session.stats?.elevation || 0);
            }
            return acc;
        }, {
            distance: { planned: 0, completed: 0 },
            duration: { planned: 0, completed: 0 },
            elevation: { completed: 0 }
        });
    }, [allSessions, selectedDate]);

    // Filter sessions for the selected date
    const dailySessions = allSessions.filter(session =>
        // @ts-ignore
        isSameDay(session.date, selectedDate)
    );

    return (
        <div className="space-y-6 max-w-md mx-auto sm:max-w-full pb-20">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Entrenamiento</h1>
            </div>

            <WeeklyVolumeChart
                activities={allSessions.filter(s => s.type === 'COMPLETED').map(s => ({
                    startDate: s.date,
                    distance: s.stats?.distance || 0
                }))}
                assignments={allSessions.filter(s => s.type === 'PLANNED').map(s => ({
                    scheduledDate: s.date,
                    training: { /* mock or minimal training obj */ }
                }))}
            />

            <WeeklySummary summary={weeklyStats} />
            <WeekCalendar
                date={selectedDate}
                onDateSelect={setSelectedDate}
                events={eventsIndicator}
            />
            <SessionList sessions={dailySessions} />
        </div>
    );
}
