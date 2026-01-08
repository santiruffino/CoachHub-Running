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

    // Get all athletes for this coach with groups
    const { data: athletes, error } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        name,
        role,
        created_at,
        athlete_groups(
          id,
          group:groups(
            id,
            name
          )
        )
      `)
      .eq('role', 'ATHLETE')
      .eq('coach_id', user.id);

    if (error) {
      console.error('Failed to fetch athletes:', error);
      return NextResponse.json(
        { error: 'Failed to fetch athletes' },
        { status: 500 }
      );
    }

    if (!athletes || athletes.length === 0) {
      return NextResponse.json([]);
    }

    // Get all training assignments for these athletes in a single query
    const athleteIds = athletes.map(a => a.id);
    const { data: assignments, error: assignmentsError } = await supabase
      .from('training_assignments')
      .select('user_id, completed, scheduled_date')
      .in('user_id', athleteIds);

    if (assignmentsError) {
      console.error('Failed to fetch assignments:', assignmentsError);
      return NextResponse.json(
        { error: 'Failed to fetch assignments' },
        { status: 500 }
      );
    }

    // Aggregate stats per athlete
    const now = new Date();
    const statsMap = new Map<string, {
      totalAssignments: number;
      completedAssignments: number;
      plannedAssignments: number;
    }>();

    // Initialize stats for all athletes (even those with 0 assignments)
    athleteIds.forEach(id => {
      statsMap.set(id, {
        totalAssignments: 0,
        completedAssignments: 0,
        plannedAssignments: 0,
      });
    });

    // Aggregate assignment data
    (assignments || []).forEach(assignment => {
      const stats = statsMap.get(assignment.user_id)!;
      stats.totalAssignments++;

      if (assignment.completed) {
        stats.completedAssignments++;
      } else if (new Date(assignment.scheduled_date) >= now) {
        stats.plannedAssignments++;
      }
    });

    // Transform the data to include group information and stats
    const athletesWithData = athletes.map(athlete => {
      const stats = statsMap.get(athlete.id)!;
      const completionPercentage = stats.totalAssignments > 0
        ? Math.round((stats.completedAssignments / stats.totalAssignments) * 100)
        : 0;

      return {
        id: athlete.id,
        email: athlete.email,
        name: athlete.name,
        role: athlete.role,
        created_at: athlete.created_at,
        groups: athlete.athlete_groups?.map((ag: any) => ag.group).filter(Boolean) || [],
        hasGroups: (athlete.athlete_groups?.length || 0) > 0,
        stats: {
          totalAssignments: stats.totalAssignments,
          completedAssignments: stats.completedAssignments,
          plannedAssignments: stats.plannedAssignments,
          completionPercentage,
        },
      };
    });

    return NextResponse.json(athletesWithData);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

