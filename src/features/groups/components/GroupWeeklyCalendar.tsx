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
            <div className="bg-card dark:bg-card border border-border/40 dark:border-white/5 rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden transition-all group-hover:border-primary/40 group-hover:-translate-y-0.5 group-hover:shadow-lg">
                {/* Left accent */}
                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-primary" />

                {/* Header row */}
                <div className="flex items-center justify-between pl-2">
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest bg-primary/10 text-primary border border-primary/20">
                        {typeText}
                    </span>
                    <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                        <Users className="w-3 h-3" />
                        {affectedCount}
                    </div>
                </div>

                <h4 className="text-sm font-bold text-foreground leading-tight px-2 line-clamp-2">
                    {nameText}
                </h4>

                <p className="text-[11px] text-muted-foreground px-2 line-clamp-2 leading-relaxed">
                    {assignment.training.description || t('calendar.customWorkout')}
                </p>

                {/* Progress bar – partial/full? For group, maybe show % compliance? */}
                {/* For now, just a styled container */}
                <div className="mt-1 px-2">
                    <div className="h-0.5 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary/40 rounded-full" style={{ width: '100%' }} />
                    </div>
                </div>
            </div>
        </Link>
    );
}

export function GroupWeeklyCalendar({ groupId, assignments }: GroupWeeklyCalendarProps) {
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
            <div className="flex items-center justify-between bg-muted/30 p-2 rounded-lg border border-border/40">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => navigateWeek(-1)} className="h-8 w-8 rounded-full">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground min-w-[200px] text-center">
                        {format(weekStart, 'd MMM')} - {format(addDays(weekStart, 6), 'd MMM yyyy')}
                    </span>
                    <Button variant="ghost" size="icon" onClick={() => navigateWeek(1)} className="h-8 w-8 rounded-full">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))} className="h-8 text-[10px] font-bold uppercase tracking-wider">
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
                                    'flex flex-col gap-3 p-3 rounded-xl transition-colors min-h-[400px]',
                                    isToday ? 'bg-muted/30 border border-primary/10' : 'bg-muted/5 border border-transparent'
                                )}
                            >
                                {/* Day header */}
                                <div className="mb-2">
                                    <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider block leading-none mb-1">
                                        {format(day, 'EEE', { locale: es }).slice(0, 3)}
                                    </span>
                                    <span className={cn(
                                        'text-xl font-bold font-display leading-none',
                                        isToday ? 'text-primary' : 'text-foreground'
                                    )}>
                                        {format(day, 'd')}
                                    </span>
                                </div>

                                <div className="space-y-3 flex-1">
                                    {dayWorkouts.length === 0 ? (
                                        <div className="h-32 mt-6 rounded-xl border border-dashed border-border/40 flex flex-col gap-2 items-center justify-center bg-transparent opacity-50">
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
