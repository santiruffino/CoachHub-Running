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
import { startOfWeek, format, subWeeks, isSameWeek } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useTranslations } from 'next-intl';

import { calculateTotals } from '@/features/trainings/components/builder/SessionSummary';
import { AthleteProfile, WorkoutBlock } from '@/features/trainings/components/builder/types';

interface WeeklyActivity {
    startDate: string;
    distance: number;
}

interface WeeklyAssignment {
    scheduledDate: string;
    training?: unknown;
}

interface WeeklyVolumeChartProps {
    activities: WeeklyActivity[];
    assignments: WeeklyAssignment[];
    athleteProfile?: AthleteProfile | null;
}

export function WeeklyVolumeChart({ activities, assignments, athleteProfile }: WeeklyVolumeChartProps) {
    const t = useTranslations('strava.weeklyVolume');

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
                const training = assign.training as any;
                let dist = 0;
                
                if (training.stats?.distance) {
                    dist = training.stats.distance / 1000;
                } else if (Array.isArray(training.blocks)) {
                    const totals = calculateTotals(training.blocks as WorkoutBlock[], athleteProfile);
                    dist = totals.distance;
                }
                
                weekData.planned += dist;
            }
        });

        // Round decimals
        return volumeMap.map(d => ({
            ...d,
            planned: Math.round(d.planned * 10) / 10,
            actual: Math.round(d.actual * 10) / 10
        }));

    }, [activities, assignments, athleteProfile]);

    return (
            <Card className="bg-endurix-paper dark:bg-card border border-endurix-black/10 dark:border-border">
            <CardHeader className="pb-2 border-b border-endurix-black/10 dark:border-border">
                <CardTitle className="text-base uppercase tracking-widest" style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}>{t('title')}</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
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
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                            <XAxis
                                dataKey="name"
                                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontFamily: 'var(--font-plex-mono, monospace)' }}
                                axisLine={{ stroke: 'hsl(var(--border))' }}
                            />
                            <YAxis
                                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontFamily: 'var(--font-plex-mono, monospace)' }}
                                axisLine={{ stroke: 'hsl(var(--border))' }}
                                label={{ value: t('unitKm'), angle: -90, position: 'insideLeft', style: { fill: 'hsl(var(--muted-foreground))', fontFamily: 'var(--font-plex-mono, monospace)', fontSize: 10 } }}
                            />
                            <Tooltip
                                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    borderColor: 'hsl(var(--border))',
                                    borderRadius: '0px',
                                    color: 'hsl(var(--foreground))',
                                    boxShadow: 'none',
                                    fontFamily: 'var(--font-plex-mono, monospace)',
                                    fontSize: '11px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                }}
                                itemStyle={{ color: 'hsl(var(--foreground))' }}
                            />
                            <Legend wrapperStyle={{ paddingTop: '10px', fontFamily: 'var(--font-plex-mono, monospace)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                            <Bar dataKey="planned" name={t('planned')} fill="hsl(var(--muted))" radius={[2, 2, 0, 0]} />
                            <Bar dataKey="actual" name={t('completed')} fill="#EA580C" radius={[2, 2, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
