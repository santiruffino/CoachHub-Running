import { useState, useEffect, useMemo } from 'react';
import api from '@/lib/axios';
import { isSameDay, startOfWeek, endOfWeek, isWithinInterval, format } from 'date-fns';
import { WeekCalendar } from '@/features/calendar/components/WeekCalendar';
import { SessionList, SessionData } from '@/features/calendar/components/SessionList';
import { WeeklySummary } from '@/features/calendar/components/WeeklySummary';
import { WeeklyVolumeChart } from '@/features/strava/components/WeeklyVolumeChart';
import { matchingService } from '@/features/trainings/services/matching.service';
import { WorkoutMatch } from '@/features/trainings/types';
import { cacheService } from '@/lib/cache.service';

export default function AthleteDashboard({ user }: { user: any }) {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [allSessions, setAllSessions] = useState<SessionData[]>([]);
    const [eventsIndicator, setEventsIndicator] = useState<{
        date: Date;
        hasPlanned?: boolean;
        hasCompleted?: boolean;
    }[]>([]);
    const [isFetching, setIsFetching] = useState(false);

    const fetchData = async (useCache = true) => {
        if (!user || isFetching) return;

        try {
            setIsFetching(true);
            const activitiesKey = cacheService.generateApiKey(`activities_${user.id}`);
            const assignmentsKey = cacheService.generateApiKey('assignments');

            // 1. Try to load from cache first for immediate UI update
            if (useCache) {
                const cachedActivities = cacheService.get<any[]>(activitiesKey);
                const cachedAssignments = cacheService.get<any[]>(assignmentsKey);

                if (cachedActivities && cachedAssignments) {
                    await processAndSetSessions(cachedActivities, cachedAssignments);
                    // Continue to fetch in background to ensure data is fresh
                }
            }

            const [activitiesRes, assignmentsRes] = await Promise.all([
                api.get(`/v2/users/${user.id}/activities`),
                api.get(`/v2/users/assignments`)
            ]);

            // Update cache
            cacheService.set(activitiesKey, activitiesRes.data, 600); // 10 min
            cacheService.set(assignmentsKey, assignmentsRes.data, 600); // 10 min

            await processAndSetSessions(activitiesRes.data, assignmentsRes.data);

        } catch (error) {
            console.error('Failed to fetch dashboard data', error);
        } finally {
            setIsFetching(false);
        }
    };

    const processAndSetSessions = async (activities: any[], assignments: any[]) => {
        // Process activities and fetch match data for those with corresponding assignments
        const activitySessions: SessionData[] = await Promise.all(
            activities.map(async (act: any) => {
                const activityDate = format(new Date(act.start_date), 'yyyy-MM-dd');

                // Find assignment on the same date
                const matchingAssignment = assignments.find((assign: any) => {
                    const assignDate = assign.scheduled_date.split('T')[0];
                    return assignDate === activityDate;
                });

                let matchData: WorkoutMatch | undefined;
                if (matchingAssignment) {
                    const matchKey = `match_${matchingAssignment.id}`;
                    // Try cache for match data
                    const cachedMatch = cacheService.get<WorkoutMatch>(matchKey);

                    if (cachedMatch) {
                        matchData = cachedMatch;
                    } else {
                        try {
                            matchData = await matchingService.getMatch(matchingAssignment.id);
                            // Cache match data for 1 hour as it's less likely to change frequently
                            cacheService.set(matchKey, matchData, 3600);
                        } catch (err) {
                            console.error('Failed to fetch match for assignment', matchingAssignment.id, err);
                        }
                    }
                }

                return {
                    id: `act-${act.id}`,
                    type: 'COMPLETED' as const,
                    title: act.title,
                    subtitle: act.type,
                    date: new Date(act.start_date),
                    external_id: act.external_id,
                    assignmentId: matchingAssignment?.id,
                    match: matchData,
                    stats: {
                        distance: act.distance,
                        duration: act.duration,
                        pace: act.distance > 0 ? `${Math.floor(act.duration / (act.distance / 1000) / 60)}:${Math.floor((act.duration / (act.distance / 1000)) % 60).toString().padStart(2, '0')}` : '0:00',
                        elevation: act.elevation_gain || 0,
                        average_heartrate: act.avg_hr,
                        effort_score: act.effort_score
                    }
                };
            })
        );

        const assignmentSessions: SessionData[] = assignments.map((assign: any) => {
            // Helper function to parse pace string (e.g., "3:30" -> 210 seconds/km)
            const parsePace = (paceStr: string): number => {
                if (!paceStr || typeof paceStr !== 'string') return 300; // Default 5:00 min/km
                const parts = paceStr.split(':');
                if (parts.length !== 2) return 300;
                const mins = parseInt(parts[0]);
                const secs = parseInt(parts[1]);
                if (isNaN(mins) || isNaN(secs)) return 300;
                return mins * 60 + secs;
            };

            // Helper function to get average pace from block target
            const getBlockPace = (block: any): number => {
                if (block.target?.type === 'pace' && block.target.min && block.target.max) {
                    const minPace = parsePace(block.target.min);
                    const maxPace = parsePace(block.target.max);
                    return (minPace + maxPace) / 2; // Average of min and max
                }
                return 300; // Default 5:00 min/km if no pace target
            };

            // Calculate actual workout duration from blocks if available
            let estimatedDuration = 3600; // Default 60 minutes
            let estimatedDistance = 10000; // Default 10km

            if (assign.training.blocks && Array.isArray(assign.training.blocks)) {
                const blocks = assign.training.blocks;
                estimatedDuration = 0;
                estimatedDistance = 0;

                // Calculate duration and distance from blocks
                const processedGroupIds = new Set<string>();

                blocks.forEach((block: any) => {
                    // Skip if this block's group has already been processed
                    if (block.group?.id && processedGroupIds.has(block.group.id)) {
                        return;
                    }

                    if (block.group?.id) {
                        processedGroupIds.add(block.group.id);
                        const groupBlocks = blocks.filter((b: any) => b.group?.id === block.group?.id);
                        const reps = block.group.reps || 1;

                        groupBlocks.forEach((b: any) => {
                            let blockDuration: number;
                            if (b.duration.type === 'time') {
                                blockDuration = b.duration.value;
                            } else {
                                // Distance-based: use target pace to estimate duration
                                const paceSecondsPerKm = getBlockPace(b);
                                blockDuration = (b.duration.value / 1000) * paceSecondsPerKm;
                            }
                            const blockDistance = b.duration.type === 'distance' ? b.duration.value : 0;

                            estimatedDuration += blockDuration * reps;
                            estimatedDistance += blockDistance * reps;
                        });
                    } else {
                        let blockDuration: number;
                        if (block.duration.type === 'time') {
                            blockDuration = block.duration.value;
                        } else {
                            // Distance-based: use target pace to estimate duration
                            const paceSecondsPerKm = getBlockPace(block);
                            blockDuration = (block.duration.value / 1000) * paceSecondsPerKm;
                        }
                        const blockDistance = block.duration.type === 'distance' ? block.duration.value : 0;

                        estimatedDuration += blockDuration;
                        estimatedDistance += blockDistance;
                    }
                });
            }

            return {
                id: assign.id,
                type: 'PLANNED' as const,
                title: assign.workout_name || assign.training.title, // Use custom workout name if available
                subtitle: assign.training.type,
                description: assign.training.description,
                assignmentId: assign.id,
                // Parse UTC date string components to create Local Date at midnight
                date: (() => {
                    const [y, m, d] = assign.scheduled_date.split('T')[0].split('-').map(Number);
                    return new Date(y, m - 1, d);
                })(),
                stats: {
                    distance: estimatedDistance,
                    duration: estimatedDuration
                }
            };
        });

        const merged = [...activitySessions, ...assignmentSessions];
        setAllSessions(merged);

        // Pre-calculate days with events for the calendar indicators
        const eventsByDate = new Map<string, { hasPlanned: boolean; hasCompleted: boolean }>();

        merged.forEach(session => {
            const dateStr = format(session.date as Date, 'yyyy-MM-dd');
            const existing = eventsByDate.get(dateStr) || { hasPlanned: false, hasCompleted: false };

            if (session.type === 'PLANNED') {
                existing.hasPlanned = true;
            } else {
                existing.hasCompleted = true;
            }

            eventsByDate.set(dateStr, existing);
        });

        const indicators = Array.from(eventsByDate.entries()).map(([dateStr, types]) => {
            const [y, m, d] = dateStr.split('-').map(Number);
            return {
                date: new Date(y, m - 1, d),
                hasPlanned: types.hasPlanned,
                hasCompleted: types.hasCompleted
            };
        });

        setEventsIndicator(indicators);
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
        <div className="space-y-4 sm:space-y-6 max-w-md mx-auto sm:max-w-full px-4 sm:px-0 pb-20">
            <div className="flex items-center justify-between">
                <h1 className="text-xl sm:text-2xl font-bold">Entrenamiento</h1>
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

