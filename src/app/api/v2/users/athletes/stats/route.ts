import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const supabase = await createClient();

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Check if user is a coach
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'COACH') {
            return NextResponse.json(
                { error: 'Only coaches can access this endpoint' },
                { status: 403 }
            );
        }

        // Calculate current week (Monday to Sunday)
        const now = new Date();
        const dayOfWeek = now.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() + diff);
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        // Get all athletes for this coach
        const { data: athletes, error: athletesError } = await supabase
            .from('profiles')
            .select('id, email, name, role, created_at')
            .eq('role', 'ATHLETE')
            .eq('coach_id', user.id);

        if (athletesError) {
            console.error('Failed to fetch athletes:', athletesError);
            return NextResponse.json(
                { error: 'Failed to fetch athletes' },
                { status: 500 }
            );
        }

        if (!athletes || athletes.length === 0) {
            return NextResponse.json([]);
        }

        const athleteIds = athletes.map(a => a.id);

        // Get all training assignments for these athletes in the current week
        const { data: assignments, error: assignmentsError } = await supabase
            .from('training_assignments')
            .select('user_id, completed')
            .in('user_id', athleteIds)
            .gte('scheduled_date', weekStart.toISOString())
            .lte('scheduled_date', weekEnd.toISOString());

        if (assignmentsError) {
            console.error('Failed to fetch assignments:', assignmentsError);
            return NextResponse.json(
                { error: 'Failed to fetch assignments' },
                { status: 500 }
            );
        }

        // Aggregate stats per athlete
        const statsMap = new Map<string, { planned: number; completed: number }>();

        (assignments || []).forEach(assignment => {
            const existing = statsMap.get(assignment.user_id) || { planned: 0, completed: 0 };
            existing.planned++;
            if (assignment.completed) {
                existing.completed++;
            }
            statsMap.set(assignment.user_id, existing);
        });

        // Combine athletes with their weekly stats
        const athletesWithStats = athletes.map(athlete => {
            const stats = statsMap.get(athlete.id) || { planned: 0, completed: 0 };
            const completionRate = stats.planned > 0
                ? Math.round((stats.completed / stats.planned) * 100)
                : 0;

            return {
                ...athlete,
                weeklyStats: {
                    planned: stats.planned,
                    completed: stats.completed,
                    completionRate,
                },
            };
        });

        return NextResponse.json(athletesWithStats);
    } catch (error: any) {
        console.error('Error in athletes/stats route:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
