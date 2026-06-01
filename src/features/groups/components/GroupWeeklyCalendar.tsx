'use client';

import { format, addDays, isSameDay, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { TrainingAssignment } from '@/interfaces/training';
import { Moon, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';

interface GroupWeeklyCalendarProps {
    groupId: string;
    assignments: TrainingAssignment[];
}

function GroupWorkoutCard({
    assignment,
    affectedCount
}: {
    assignment: TrainingAssignment;
    affectedCount: number
}) {
    const t = useTranslations();
    const typeText = assignment.training.type;
    const nameText = assignment.workout_name || assignment.training.title;

    return (
        <Link href={`/workouts/${assignment.id}?fromGroup=true`} className="block group">
            <div className="bg-endurix-paper dark:bg-card border border-endurix-black/10 dark:border-border p-4 flex flex-col gap-2 relative overflow-hidden transition-colors group-hover:border-endurix-orange/40">
                {/* Left accent */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-endurix-orange" />

                {/* Header row */}
                <div className="flex items-center justify-between pl-2">
                    <span
                        className="px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest bg-endurix-orange/10 text-endurix-orange border border-endurix-orange/30"
                        style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                    >
                        {typeText}
                    </span>
                    <div
                        className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground uppercase tracking-wider"
                        style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                    >
                        <Users className="w-3 h-3" />
                        {affectedCount}
                    </div>
                </div>

                <h4
                    className="text-sm font-medium text-foreground leading-tight px-2 line-clamp-2 uppercase"
                    style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                >
                    {nameText}
                </h4>

                <p className="text-[11px] text-muted-foreground px-2 line-clamp-2 leading-relaxed">
                    {assignment.training.description || t('calendar.customWorkout')}
                </p>

                <div className="mt-1 px-2">
                    <div className="h-0.5 w-full bg-endurix-black/10 dark:bg-border">
                        <div className="h-full bg-endurix-orange/60" style={{ width: '100%' }} />
                    </div>
                </div>
            </div>
        </Link>
    );
}

export function GroupWeeklyCalendar({ groupId, assignments }: GroupWeeklyCalendarProps) {
    void groupId;
    const t = useTranslations();
    const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    
    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

    // Aggregate assignments by day and source_group_id/training_id
    const aggregatedAssignments = useMemo(() => {
        const result: Record<string, { assignment: TrainingAssignment; count: number }[]> = {};

        assignments.forEach((a) => {
            const dateValue = a.scheduled_date || a.scheduledDate;
            if (!dateValue) return;
            
            const dayStr = dateValue.split('T')[0];
            if (!result[dayStr]) result[dayStr] = [];

            // Find if we already have this group workout for this day
            // We identify group workouts by source_group_id and training_id
            const existing = result[dayStr].find(
                (item) => 
                    item.assignment.source_group_id === a.source_group_id && 
                    item.assignment.training.id === a.training.id
            );

            if (existing) {
                existing.count += 1;
            } else {
                result[dayStr].push({ assignment: a, count: 1 });
            }
        });

        return result;
    }, [assignments]);

    const navigateWeek = (direction: number) => {
        setWeekStart(prev => addDays(prev, direction * 7));
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between bg-endurix-black/5 dark:bg-white/5 p-2 border border-endurix-black/10 dark:border-border">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => navigateWeek(-1)} className="h-8 w-8">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span
                        className="text-xs font-bold uppercase tracking-widest text-muted-foreground min-w-[200px] text-center"
                        style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                    >
                        {format(weekStart, 'd MMM')} - {format(addDays(weekStart, 6), 'd MMM yyyy')}
                    </span>
                    <Button variant="ghost" size="icon" onClick={() => navigateWeek(1)} className="h-8 w-8">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                <Button variant="outline-brand" size="sm" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))} className="h-8 text-[10px] font-bold uppercase tracking-wider">
                    {t('common.today')}
                </Button>
            </div>

            <div className="w-full overflow-x-auto pb-4">
                <div className="min-w-[1024px] grid grid-cols-7 gap-4">
                    {weekDays.map((day) => {
                        const isToday = isSameDay(day, new Date());
                        const dayStr = format(day, 'yyyy-MM-dd');
                        const dayWorkouts = aggregatedAssignments[dayStr] || [];

                        return (
                            <div
                                key={day.toISOString()}
                                className={cn(
                                    'flex flex-col gap-3 p-3 transition-colors min-h-[400px] border-l-2',
                                    isToday ? 'bg-endurix-black/5 dark:bg-white/5 border-l-endurix-orange' : 'bg-transparent border-l-transparent'
                                )}
                            >
                                {/* Day header */}
                                <div className="mb-2">
                                    <span
                                        className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider block leading-none mb-1"
                                        style={{ fontFamily: 'var(--font-plex-mono, monospace)' }}
                                    >
                                        {format(day, 'EEE', { locale: es }).slice(0, 3)}
                                    </span>
                                    <span className={cn(
                                        'text-xl font-medium leading-none',
                                        isToday ? 'text-endurix-orange' : 'text-foreground'
                                    )}
                                        style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                                    >
                                        {format(day, 'd')}
                                    </span>
                                </div>

                                <div className="space-y-3 flex-1">
                                    {dayWorkouts.length === 0 ? (
                                        <div className="h-32 mt-6 border border-dashed border-endurix-black/15 dark:border-white/15 flex flex-col gap-2 items-center justify-center bg-transparent opacity-50">
                                            <Moon className="w-4 h-4 text-muted-foreground/30" />
                                            <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-widest">{t("calendar.restDay")}</span>
                                        </div>
                                    ) : (
                                        dayWorkouts.map(({ assignment, count }) => (
                                            <GroupWorkoutCard
                                                key={assignment.id}
                                                assignment={assignment}
                                                affectedCount={count}
                                            />
                                        ))
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
