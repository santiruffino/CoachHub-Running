import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

interface AthleteGroup {
  id: string;
  name: string;
}

interface AthleteGroupMembership {
  group: AthleteGroup | AthleteGroup[] | null;
}

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

    // Require COACH or ADMIN role using the helper or manual check
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, team_id')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'COACH' && profile?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only coaches or admins can access this endpoint' },
        { status: 403 }
      );
    }

    // Build query based on role
    let query = supabase
      .from('profiles')
      .select(`
        id,
        email,
        name,
        role,
        created_at,
        coach_id,
        coach:profiles!coach_id(
          id,
          name
        ),
        athlete_groups(
          id,
          group:groups(
            id,
            name
          )
        )
      `)
      .eq('role', 'ATHLETE');

    // Both COACH and ADMIN can see all athletes in their team
    if (profile.role === 'COACH' || profile.role === 'ADMIN') {
      query = query.eq('team_id', profile.team_id);
    }

    const { data: athletes, error } = await query;

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
    // Get today's date in UTC to match database dates (stored in UTC)
    const now = new Date();
    const todayUTC = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;

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
      } else {
        // Count as "planned" if scheduled for today or future
        // Extract date portion from scheduled_date (which is in UTC format: YYYY-MM-DDTHH:mm:ss)
        const scheduledDateUTC = assignment.scheduled_date.split('T')[0];

        // Compare date strings (YYYY-MM-DD format)
        if (scheduledDateUTC >= todayUTC) {
          stats.plannedAssignments++;
        }
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
        groups: ((athlete.athlete_groups || []) as AthleteGroupMembership[])
          .map((membership) => (Array.isArray(membership.group) ? membership.group[0] : membership.group))
          .filter((group): group is AthleteGroup => Boolean(group)),
        hasGroups: (athlete.athlete_groups?.length || 0) > 0,
        coach: athlete.coach || null,
        stats: {
          totalAssignments: stats.totalAssignments,
          completedAssignments: stats.completedAssignments,
          plannedAssignments: stats.plannedAssignments,
          completionPercentage,
        },
      };
    });

    return NextResponse.json(athletesWithData);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
