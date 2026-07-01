import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createRequestLogger } from '@/lib/logger';
import { apiError } from '@/lib/api/error-response';

interface AthleteGroup {
  id: string;
  name: string;
}

interface AthleteGroupMembership {
  group: AthleteGroup | AthleteGroup[] | null;
}

export async function GET(request: Request) {
  const { requestId, logger } = createRequestLogger('/api/v2/users/athletes', request);
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const scopeParam = searchParams.get('scope');
    const scope = scopeParam === 'team' ? 'team' : 'mine';

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(apiError('AUTH_UNAUTHORIZED'),
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
      return NextResponse.json(apiError('AUTH_COACH_OR_ADMIN_ONLY'),
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

    // Always scope to the coach's team as the outer boundary
    if (profile.team_id) {
      query = query.eq('team_id', profile.team_id);
    }

    // For COACHes with scope='mine', further narrow to only their directly assigned athletes
    if (profile.role === 'COACH' && scope === 'mine') {
      query = query.eq('coach_id', user.id);
    }

    // Safety cap: guards against an unbounded response for an unusually large team.
    const { data: athletes, error } = await query.limit(1000);

    if (error) {
      logger.error('Failed to fetch athletes', { error: error });
      return NextResponse.json(apiError('FAILED_TO_FETCH_ATHLETES'),
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
      logger.error('Failed to fetch assignments', { error: assignmentsError });
      return NextResponse.json(apiError('FAILED_TO_FETCH_ASSIGNMENTS'),
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
    logger.error('Get athletes error', { error });
    Sentry.captureException(error, {
      tags: { route: '/api/v2/users/athletes', requestId },
    });
    return NextResponse.json(apiError('INTERNAL_SERVER_ERROR'),
      { status: 500 }
    );
  }
}
