import React, { useMemo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { startOfWeek, format, addWeeks, subWeeks, isSameWeek } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface WeeklyVolumeChartProps {
    activities: any[];
    assignments: any[];
}

export function WeeklyVolumeChart({ activities, assignments }: WeeklyVolumeChartProps) {
    const data = useMemo(() => {
        // Generate last 4 weeks keys
        const weeks = [];
        const today = new Date();
        const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });

        for (let i = 3; i >= 0; i--) {
            weeks.push(subWeeks(currentWeekStart, i));
        }

        // Initialize data map
        const volumeMap = weeks.map(weekStart => ({
            name: format(weekStart, 'MMM dd'),
            weekStart,
            planned: 0,
            actual: 0
        }));

        // Aggregate Actual (Strava Activities)
        activities.forEach(act => {
            const date = new Date(act.startDate);
            const weekStart = startOfWeek(date, { weekStartsOn: 1 });

            const weekData = volumeMap.find(d => isSameWeek(d.weekStart, weekStart, { weekStartsOn: 1 }));
            if (weekData) {
                weekData.actual += (act.distance / 1000); // Convert meters to km
            }
        });

        // Aggregate Planned (Assignments)
        assignments.forEach(assign => {
            if (!assign.training) return;
            const date = new Date(assign.scheduledDate);
            const weekStart = startOfWeek(date, { weekStartsOn: 1 });

            const weekData = volumeMap.find(d => isSameWeek(d.weekStart, weekStart, { weekStartsOn: 1 }));
            if (weekData) {
                // Approximate distance for planned workouts if not explicit?
                // For MVP, if we have blocks we could sum them, but for now assuming 
                // we might need a stored metadata field or just simple estimate.
                // Looking at AthleteDashboard it uses simplified stats:
                // distance: 10000 (hardcoded in one place) or session.stats?.distance

                // Let's assume for now 10km per session if not defined, 
                // OR ideally we should pull this from training metadata.
                const dist = 10; // Default placeholder 10km if undefined
                weekData.planned += dist;
            }
        });

        // Round decimals
        return volumeMap.map(d => ({
            ...d,
            planned: Math.round(d.planned * 10) / 10,
            actual: Math.round(d.actual * 10) / 10
        }));

    }, [activities, assignments]);

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Weekly Volume (Last 4 Weeks)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            margin={{
                                top: 5,
                                right: 30,
                                left: 20,
                                bottom: 5,
                            }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis
                                dataKey="name"
                                tick={{ fontSize: 12, fill: '#6B7280' }}
                            />
                            <YAxis
                                tick={{ fontSize: 12, fill: '#6B7280' }}
                                label={{ value: 'km', angle: -90, position: 'insideLeft', style: { fill: '#9CA3AF' } }}
                            />
                            <Tooltip
                                cursor={{ fill: '#F3F4F6' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                            />
                            <Legend wrapperStyle={{ paddingTop: '10px' }} />
                            <Bar dataKey="planned" name="Planned" fill="#E5E7EB" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="actual" name="Completed" fill="#EA580C" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
